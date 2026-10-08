from typing import Dict, Any, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.database import get_db
from backend.app.models import Lead, Conversation, Message, Integration
from backend.app.services.conversation_service import ConversationService
from backend.app.services.audit_service import AuditService
from backend.app.integrations import get_provider_instance
from backend.app.core.security import decrypt_secret
import json

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

@router.post("/telegram/{workspace_id}")
async def handle_telegram_webhook(
    workspace_id: str,
    request: Request,
    x_telegram_bot_api_secret_token: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    """Receive and process real Telegram Bot API updates."""
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
        
    message_data = payload.get("message")
    if not message_data:
        # e.g. edited_message, callback_query or my_chat_member
        return {"status": "ignored"}
        
    chat = message_data.get("chat", {})
    chat_id = str(chat.get("id"))
    from_user = message_data.get("from", {})
    username = from_user.get("username")
    text = (message_data.get("text") or "").strip()
    
    if not text or not chat_id:
        return {"status": "no_content"}
        
    # Check for Deep-Link /start lead_<token>
    if text.startswith("/start lead_"):
        token = text.replace("/start lead_", "").strip()
        lead_stmt = select(Lead).where(
            Lead.workspace_id == workspace_id,
            Lead.telegram_deep_link_token == token
        )
        lead = (await db.execute(lead_stmt)).scalar_one_or_none()
        
        if lead:
            lead.telegram_chat_id = chat_id
            lead.telegram_identifier = f"@{username}" if username else chat_id
            lead.telegram_opt_in_status = "OPTED_IN"
            lead.outreach_status = "ACTIVE"
            lead.lead_status = "ENGAGED" if lead.lead_status == "NEW" else lead.lead_status
            
            # Create conversation
            conv = await ConversationService.get_or_create_conversation(db, workspace_id, lead.id, "TELEGRAM")
            
            # Send initial greeting via Telegram
            int_stmt = select(Integration).where(
                Integration.workspace_id == workspace_id,
                Integration.provider == "TELEGRAM",
                Integration.status == "CONNECTED"
            )
            t_int = (await db.execute(int_stmt)).scalar_one_or_none()
            greeting = f"Hello {lead.first_name or 'there'}, thanks for connecting! I'm THREADLINE's operations assistant. How can we help your team today?"
            
            if t_int and t_int.encrypted_credentials:
                creds = json.loads(decrypt_secret(t_int.encrypted_credentials))
                tg_client = get_provider_instance("TELEGRAM", creds)
                try:
                    res = await tg_client.send_message(chat_id, greeting)
                    out_msg = Message(
                        conversation_id=conv.id,
                        sender_type="AI",
                        sender_name="THREADLINE AI",
                        direction="OUTBOUND",
                        channel="TELEGRAM",
                        content=greeting,
                        raw_payload=res,
                        delivery_status="SENT",
                        created_at=datetime.now(timezone.utc)
                    )
                    db.add(out_msg)
                except Exception:
                    pass
                    
            await AuditService.log_event(
                db=db,
                workspace_id=workspace_id,
                action="telegram_opt_in_confirmed",
                actor_type="WEBHOOK",
                entity_type="LEAD",
                entity_id=lead.id,
                metadata={"chat_id": chat_id, "username": username}
            )
            
            await db.commit()
            return {"status": "opted_in", "lead_id": lead.id}

    # Regular message from an opted-in prospect
    try:
        inbound_msg = await ConversationService.process_inbound_message(
            db=db,
            workspace_id=workspace_id,
            channel="TELEGRAM",
            sender_id=chat_id,
            content=text,
            raw_payload=payload
        )
        return {"status": "processed", "message_id": inbound_msg.id}
    except ValueError as e:
        # Unknown sender / lead not mapped
        return {"status": "unmapped_lead", "detail": str(e)}
