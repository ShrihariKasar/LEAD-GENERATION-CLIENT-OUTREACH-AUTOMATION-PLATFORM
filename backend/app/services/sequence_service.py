import json
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from backend.app.models import OutreachSequence, SequenceStep, SequenceEnrollment, Lead, Workspace, Integration, Message, Conversation
from backend.app.services.audit_service import AuditService
from backend.app.services.conversation_service import ConversationService
from backend.app.integrations import get_provider_instance
from backend.app.core.security import decrypt_secret

class SequenceService:
    @staticmethod
    async def enroll_leads(
        db: AsyncSession,
        sequence_id: str,
        lead_ids: List[str],
        workspace_id: str
    ) -> List[SequenceEnrollment]:
        seq_stmt = select(OutreachSequence).where(OutreachSequence.id == sequence_id, OutreachSequence.workspace_id == workspace_id)
        sequence = (await db.execute(seq_stmt)).scalar_one_or_none()
        if not sequence:
            raise ValueError("Sequence not found.")
            
        enrollments = []
        for lid in lead_ids:
            # Check existing enrollment
            e_stmt = select(SequenceEnrollment).where(
                SequenceEnrollment.sequence_id == sequence_id,
                SequenceEnrollment.lead_id == lid
            )
            existing = (await db.execute(e_stmt)).scalar_one_or_none()
            if existing:
                continue
                
            lead_stmt = select(Lead).where(Lead.id == lid, Lead.workspace_id == workspace_id)
            lead = (await db.execute(lead_stmt)).scalar_one_or_none()
            if not lead or lead.do_not_contact:
                continue
                
            enrollment = SequenceEnrollment(
                sequence_id=sequence_id,
                lead_id=lid,
                current_step_number=1,
                status="ACTIVE",
                next_execution_at=datetime.now(timezone.utc),
                created_at=datetime.now(timezone.utc)
            )
            db.add(enrollment)
            lead.outreach_status = "ENROLLED"
            enrollments.append(enrollment)
            
        await AuditService.log_event(
            db=db,
            workspace_id=workspace_id,
            action="leads_enrolled_in_sequence",
            actor_type="USER",
            entity_type="SEQUENCE",
            entity_id=sequence_id,
            metadata={"count": len(enrollments), "lead_ids": lead_ids}
        )
        
        await db.commit()
        return enrollments

    @staticmethod
    async def execute_pending_steps(db: AsyncSession, workspace_id: str) -> int:
        """Process due sequence steps respecting safety constraints."""
        now = datetime.now(timezone.utc)
        
        w_stmt = select(Workspace).where(Workspace.id == workspace_id)
        workspace = (await db.execute(w_stmt)).scalar_one_or_none()
        settings = workspace.settings if workspace else {}
        
        # Check quiet hours
        if settings.get("quiet_hours_enabled"):
            current_hour = now.hour
            # e.g., 20:00 to 08:00
            if current_hour >= 20 or current_hour < 8:
                return 0
                
        # Check daily outreach limit
        max_daily = settings.get("max_daily_outreach", 50)
        today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
        
        sent_today_stmt = select(func.count(Message.id)).join(Conversation).where(
            Conversation.workspace_id == workspace_id,
            Message.direction == "OUTBOUND",
            Message.created_at >= today_start
        )
        sent_today = (await db.execute(sent_today_stmt)).scalar() or 0
        if sent_today >= max_daily:
            return 0
            
        # Query active enrollments that are due
        e_stmt = select(SequenceEnrollment).join(OutreachSequence).where(
            OutreachSequence.workspace_id == workspace_id,
            OutreachSequence.is_active == True,
            SequenceEnrollment.status == "ACTIVE",
            SequenceEnrollment.next_execution_at <= now
        ).limit(max_daily - sent_today)
        
        enrollments = (await db.execute(e_stmt)).scalars().all()
        executed_count = 0
        
        for enr in enrollments:
            lead = (await db.execute(select(Lead).where(Lead.id == enr.lead_id))).scalar_one_or_none()
            if not lead or lead.do_not_contact or lead.outreach_status in ("REPLIED", "OPTED_OUT"):
                enr.status = "TERMINATED"
                enr.termination_reason = f"Lead state: {lead.outreach_status if lead else 'missing'}"
                continue
                
            # Get current step
            step_stmt = select(SequenceStep).where(
                SequenceStep.sequence_id == enr.sequence_id,
                SequenceStep.step_number == enr.current_step_number
            )
            step = (await db.execute(step_stmt)).scalar_one_or_none()
            if not step:
                enr.status = "COMPLETED"
                lead.outreach_status = "COMPLETED"
                continue
                
            # Render personalized template
            content = step.template_content
            content = content.replace("{{first_name}}", lead.first_name or "there")
            content = content.replace("{{company}}", lead.company_name or "your team")
            content = content.replace("{{job_title}}", lead.job_title or "your role")
            
            conv = await ConversationService.get_or_create_conversation(db, workspace_id, lead.id, step.channel)
            
            # Channel sending execution
            sent_success = False
            if step.channel == "TELEGRAM" and lead.telegram_chat_id:
                t_stmt = select(Integration).where(
                    Integration.workspace_id == workspace_id,
                    Integration.provider == "TELEGRAM",
                    Integration.status == "CONNECTED"
                )
                t_int = (await db.execute(t_stmt)).scalar_one_or_none()
                if t_int and t_int.encrypted_credentials:
                    creds = json.loads(decrypt_secret(t_int.encrypted_credentials))
                    tg_client = get_provider_instance("TELEGRAM", creds)
                    try:
                        res = await tg_client.send_message(lead.telegram_chat_id, content)
                        out_msg = Message(
                            conversation_id=conv.id,
                            sender_type="AI",
                            sender_name="Outreach Sequence",
                            direction="OUTBOUND",
                            channel="TELEGRAM",
                            content=content,
                            raw_payload=res,
                            delivery_status="SENT",
                            created_at=datetime.now(timezone.utc)
                        )
                        db.add(out_msg)
                        sent_success = True
                    except Exception as exc:
                        pass
            elif step.channel == "TELEGRAM" and not lead.telegram_chat_id:
                # Awaiting opt-in
                enr.status = "WAITING"
                lead.outreach_status = "WAITING"
                continue
            else:
                # Log as manual task or email queued
                out_msg = Message(
                    conversation_id=conv.id,
                    sender_type="AI",
                    sender_name="Outreach Sequence",
                    direction="OUTBOUND",
                    channel=step.channel,
                    content=content,
                    delivery_status="SENT",
                    created_at=datetime.now(timezone.utc)
                )
                db.add(out_msg)
                sent_success = True
                
            if sent_success:
                executed_count += 1
                enr.last_executed_at = datetime.now(timezone.utc)
                
                # Check for next step
                next_step_stmt = select(SequenceStep).where(
                    SequenceStep.sequence_id == enr.sequence_id,
                    SequenceStep.step_number == enr.current_step_number + 1
                )
                next_step = (await db.execute(next_step_stmt)).scalar_one_or_none()
                if next_step:
                    enr.current_step_number += 1
                    enr.next_execution_at = datetime.now(timezone.utc) + timedelta(hours=next_step.delay_hours)
                else:
                    enr.status = "COMPLETED"
                    lead.outreach_status = "COMPLETED"
                    
        await db.commit()
        return executed_count
