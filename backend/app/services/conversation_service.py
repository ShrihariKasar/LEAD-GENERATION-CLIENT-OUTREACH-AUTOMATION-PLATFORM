import json
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.models import Conversation, Message, Lead, Workspace, Integration, Notification
from backend.app.integrations import get_provider_instance
from backend.app.core.security import decrypt_secret
from backend.app.services.audit_service import AuditService
from backend.app.services.ai_qualification_service import AIQualificationService

class ConversationService:
    @staticmethod
    async def get_or_create_conversation(
        db: AsyncSession,
        workspace_id: str,
        lead_id: str,
        channel: str = "TELEGRAM"
    ) -> Conversation:
        stmt = select(Conversation).where(
            Conversation.workspace_id == workspace_id,
            Conversation.lead_id == lead_id,
            Conversation.channel == channel
        )
        res = await db.execute(stmt)
        conv = res.scalar_one_or_none()
        if not conv:
            conv = Conversation(
                workspace_id=workspace_id,
                lead_id=lead_id,
                channel=channel,
                state="NEW",
                ai_paused=False,
                created_at=datetime.now(timezone.utc)
            )
            db.add(conv)
            await db.commit()
            await db.refresh(conv)
        return conv

    @staticmethod
    async def process_inbound_message(
        db: AsyncSession,
        workspace_id: str,
        channel: str,
        sender_id: str,
        content: str,
        raw_payload: Optional[Dict[str, Any]] = None,
        lead_id: Optional[str] = None
    ) -> Message:
        # 1. Identify Lead if not directly provided
        lead = None
        if lead_id:
            l_stmt = select(Lead).where(Lead.id == lead_id, Lead.workspace_id == workspace_id)
            lead = (await db.execute(l_stmt)).scalar_one_or_none()
        elif channel == "TELEGRAM":
            # Match by telegram_chat_id or deep link
            l_stmt = select(Lead).where(Lead.workspace_id == workspace_id, Lead.telegram_chat_id == sender_id)
            lead = (await db.execute(l_stmt)).scalar_one_or_none()
            
        if not lead:
            raise ValueError(f"Could not correlate inbound message from {sender_id} to an existing lead.")
            
        # 2. Get or create conversation
        conversation = await ConversationService.get_or_create_conversation(db, workspace_id, lead.id, channel)
        
        # 3. Create inbound message
        inbound_msg = Message(
            conversation_id=conversation.id,
            sender_type="PROSPECT",
            sender_id=sender_id,
            sender_name=lead.full_name or "Prospect",
            direction="INBOUND",
            channel=channel,
            content=content,
            raw_payload=raw_payload,
            delivery_status="RECEIVED",
            created_at=datetime.now(timezone.utc)
        )
        db.add(inbound_msg)
        
        conversation.last_message_at = datetime.now(timezone.utc)
        lead.outreach_status = "REPLIED"
        
        # 4. Check Opt-out Keywords
        w_stmt = select(Workspace).where(Workspace.id == workspace_id)
        workspace = (await db.execute(w_stmt)).scalar_one_or_none()
        opt_out_keywords = (workspace.settings or {}).get("opt_out_keywords", ["stop", "unsubscribe", "remove me", "opt out"])
        
        content_lower = content.lower().strip()
        is_opt_out = any(kw in content_lower for kw in opt_out_keywords)
        
        if is_opt_out:
            lead.do_not_contact = True
            lead.outreach_status = "OPTED_OUT"
            lead.lead_status = "DO_NOT_CONTACT"
            conversation.state = "OPTED_OUT"
            conversation.ai_paused = True
            
            # Create notification
            notif = Notification(
                workspace_id=workspace_id,
                type="OPT_OUT",
                title="Prospect Opt-Out Received",
                message=f"{lead.full_name or lead.email} requested to stop communications.",
                severity="WARNING",
                related_entity_type="LEAD",
                related_entity_id=lead.id,
                created_at=datetime.now(timezone.utc)
            )
            db.add(notif)
            
            await AuditService.log_event(
                db=db,
                workspace_id=workspace_id,
                action="lead_opted_out",
                actor_type="WEBHOOK",
                entity_type="LEAD",
                entity_id=lead.id,
                metadata={"reason": "Keyword detected", "text": content}
            )
            await db.commit()
            return inbound_msg
            
        await db.commit()
        
        # 5. Run AI Qualification & Intent Analysis
        ai_res = await AIQualificationService.process_conversation_turn(db, conversation.id, workspace_id)
        
        # 6. Auto-Reply Logic
        if (
            ai_res.get("success")
            and not conversation.ai_paused
            and conversation.state not in ("HUMAN_REVIEW", "OPTED_OUT", "CLOSED")
        ):
            structured = ai_res.get("structured", {})
            response_text = structured.get("response_message")
            
            if response_text and channel == "TELEGRAM" and lead.telegram_chat_id:
                # Send real message via Telegram
                int_stmt = select(Integration).where(
                    Integration.workspace_id == workspace_id,
                    Integration.provider == "TELEGRAM",
                    Integration.status == "CONNECTED"
                )
                t_int = (await db.execute(int_stmt)).scalar_one_or_none()
                if t_int and t_int.encrypted_credentials:
                    creds = json.loads(decrypt_secret(t_int.encrypted_credentials))
                    tg_client = get_provider_instance("TELEGRAM", creds)
                    try:
                        sent_data = await tg_client.send_message(lead.telegram_chat_id, response_text)
                        
                        # Persist outbound message
                        outbound_msg = Message(
                            conversation_id=conversation.id,
                            sender_type="AI",
                            sender_name="THREADLINE AI",
                            direction="OUTBOUND",
                            channel=channel,
                            content=response_text,
                            raw_payload=sent_data,
                            external_message_id=str(sent_data.get("message_id")),
                            delivery_status="SENT",
                            created_at=datetime.now(timezone.utc)
                        )
                        db.add(outbound_msg)
                        conversation.last_message_at = datetime.now(timezone.utc)
                        
                        await AuditService.log_event(
                            db=db,
                            workspace_id=workspace_id,
                            action="ai_message_sent",
                            actor_type="AI",
                            entity_type="MESSAGE",
                            entity_id=outbound_msg.id,
                            metadata={"content": response_text}
                        )
                        await db.commit()
                    except Exception as err:
                        # Log sending failure
                        fail_msg = Message(
                            conversation_id=conversation.id,
                            sender_type="AI",
                            direction="OUTBOUND",
                            channel=channel,
                            content=response_text,
                            delivery_status="FAILED",
                            error_details=str(err),
                            created_at=datetime.now(timezone.utc)
                        )
                        db.add(fail_msg)
                        conversation.state = "HUMAN_REVIEW"
                        conversation.ai_paused = True
                        await db.commit()
                        
        return inbound_msg

    @staticmethod
    async def takeover_conversation(
        db: AsyncSession,
        conversation_id: str,
        workspace_id: str,
        user_id: str
    ) -> Conversation:
        stmt = select(Conversation).where(Conversation.id == conversation_id, Conversation.workspace_id == workspace_id)
        conv = (await db.execute(stmt)).scalar_one_or_none()
        if not conv:
            raise ValueError("Conversation not found.")
            
        conv.ai_paused = True
        conv.state = "HUMAN_REVIEW"
        conv.human_assigned_to = user_id
        
        await AuditService.log_event(
            db=db,
            workspace_id=workspace_id,
            action="human_takeover",
            actor_type="USER",
            actor_id=user_id,
            entity_type="CONVERSATION",
            entity_id=conv.id
        )
        await db.commit()
        await db.refresh(conv)
        return conv

    @staticmethod
    async def resume_ai(
        db: AsyncSession,
        conversation_id: str,
        workspace_id: str,
        user_id: str
    ) -> Conversation:
        stmt = select(Conversation).where(Conversation.id == conversation_id, Conversation.workspace_id == workspace_id)
        conv = (await db.execute(stmt)).scalar_one_or_none()
        if not conv:
            raise ValueError("Conversation not found.")
            
        conv.ai_paused = False
        conv.state = "ENGAGED"
        
        await AuditService.log_event(
            db=db,
            workspace_id=workspace_id,
            action="ai_resumed",
            actor_type="USER",
            actor_id=user_id,
            entity_type="CONVERSATION",
            entity_id=conv.id
        )
        await db.commit()
        await db.refresh(conv)
        return conv
