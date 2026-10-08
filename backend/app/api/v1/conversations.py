import json
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from backend.app.database import get_db
from backend.app.models import Conversation, Message, Lead, QualificationAnswer, Integration, WorkspaceMember
from backend.app.schemas import ConversationResponse, MessageCreate, MessageResponse
from backend.app.auth.dependencies import get_current_workspace_context, require_roles
from backend.app.services.conversation_service import ConversationService
from backend.app.services.ai_qualification_service import AIQualificationService
from backend.app.services.audit_service import AuditService
from backend.app.integrations import get_provider_instance
from backend.app.core.security import decrypt_secret

router = APIRouter(prefix="/conversations", tags=["Conversations"])

@router.get("", response_model=List[ConversationResponse])
async def list_conversations(
    state: Optional[str] = None,
    channel: Optional[str] = None,
    ai_paused: Optional[bool] = None,
    member: WorkspaceMember = Depends(get_current_workspace_context),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Conversation).where(Conversation.workspace_id == member.workspace_id)
    
    if state:
        stmt = stmt.where(Conversation.state == state)
    if channel:
        stmt = stmt.where(Conversation.channel == channel)
    if ai_paused is not None:
        stmt = stmt.where(Conversation.ai_paused == ai_paused)
        
    stmt = stmt.order_by(desc(Conversation.last_message_at), desc(Conversation.created_at))
    conversations = (await db.execute(stmt)).scalars().all()
    
    # Load relationships
    result = []
    for c in conversations:
        l_stmt = select(Lead).where(Lead.id == c.lead_id)
        lead = (await db.execute(l_stmt)).scalar_one_or_none()
        
        m_stmt = select(Message).where(Message.conversation_id == c.id).order_by(Message.created_at.asc())
        messages = (await db.execute(m_stmt)).scalars().all()
        
        q_stmt = select(QualificationAnswer).where(QualificationAnswer.conversation_id == c.id).order_by(QualificationAnswer.created_at.asc())
        answers = (await db.execute(q_stmt)).scalars().all()
        
        c.lead = lead
        c.messages = messages
        c.qualification_answers = answers
        result.append(c)
        
    return result

@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: str,
    member: WorkspaceMember = Depends(get_current_workspace_context),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Conversation).where(Conversation.id == conversation_id, Conversation.workspace_id == member.workspace_id)
    conv = (await db.execute(stmt)).scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    lead = (await db.execute(select(Lead).where(Lead.id == conv.lead_id))).scalar_one_or_none()
    messages = (await db.execute(select(Message).where(Message.conversation_id == conv.id).order_by(Message.created_at.asc()))).scalars().all()
    answers = (await db.execute(select(QualificationAnswer).where(QualificationAnswer.conversation_id == conv.id).order_by(QualificationAnswer.created_at.asc()))).scalars().all()
    
    conv.lead = lead
    conv.messages = messages
    conv.qualification_answers = answers
    return conv

@router.post("/{conversation_id}/messages", response_model=MessageResponse)
async def send_human_message(
    conversation_id: str,
    payload: MessageCreate,
    member: WorkspaceMember = Depends(require_roles(["OWNER", "ADMIN", "SALES_MANAGER", "SALES_REP"])),
    db: AsyncSession = Depends(get_db)
):
    """Send an outbound human message to a prospect and send via channel if connected."""
    stmt = select(Conversation).where(Conversation.id == conversation_id, Conversation.workspace_id == member.workspace_id)
    conv = (await db.execute(stmt)).scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    lead = (await db.execute(select(Lead).where(Lead.id == conv.lead_id))).scalar_one_or_none()
    
    raw_res = None
    delivery_status = "SENT"
    
    # If channel is Telegram and lead has opted in
    if conv.channel == "TELEGRAM" and lead and lead.telegram_chat_id:
        t_stmt = select(Integration).where(
            Integration.workspace_id == member.workspace_id,
            Integration.provider == "TELEGRAM",
            Integration.status == "CONNECTED"
        )
        t_int = (await db.execute(t_stmt)).scalar_one_or_none()
        if t_int and t_int.encrypted_credentials:
            creds = json.loads(decrypt_secret(t_int.encrypted_credentials))
            tg_client = get_provider_instance("TELEGRAM", creds)
            try:
                raw_res = await tg_client.send_message(lead.telegram_chat_id, payload.content)
            except Exception as e:
                delivery_status = "FAILED"
                
    msg = Message(
        conversation_id=conv.id,
        sender_type="HUMAN",
        sender_id=member.user_id,
        sender_name="Sales Representative",
        direction="OUTBOUND",
        channel=conv.channel,
        content=payload.content,
        raw_payload=raw_res,
        delivery_status=delivery_status,
        created_at=datetime.now(timezone.utc)
    )
    db.add(msg)
    
    conv.last_message_at = datetime.now(timezone.utc)
    conv.state = "CONTACTED" if conv.state == "NEW" else conv.state
    
    await AuditService.log_event(
        db=db,
        workspace_id=member.workspace_id,
        action="human_message_sent",
        actor_type="USER",
        actor_id=member.user_id,
        entity_type="MESSAGE",
        entity_id=msg.id
    )
    
    await db.commit()
    await db.refresh(msg)
    return msg

@router.post("/{conversation_id}/takeover", response_model=ConversationResponse)
async def human_takeover(
    conversation_id: str,
    member: WorkspaceMember = Depends(require_roles(["OWNER", "ADMIN", "SALES_MANAGER", "SALES_REP"])),
    db: AsyncSession = Depends(get_db)
):
    """Instantly pause AI automated responses and hand off conversation to human agent."""
    conv = await ConversationService.takeover_conversation(
        db=db,
        conversation_id=conversation_id,
        workspace_id=member.workspace_id,
        user_id=member.user_id
    )
    return await get_conversation(conv.id, member, db)

@router.post("/{conversation_id}/resume-ai", response_model=ConversationResponse)
async def resume_ai_control(
    conversation_id: str,
    member: WorkspaceMember = Depends(require_roles(["OWNER", "ADMIN", "SALES_MANAGER", "SALES_REP"])),
    db: AsyncSession = Depends(get_db)
):
    """Resume automated AI responses for conversation."""
    conv = await ConversationService.resume_ai(
        db=db,
        conversation_id=conversation_id,
        workspace_id=member.workspace_id,
        user_id=member.user_id
    )
    return await get_conversation(conv.id, member, db)

@router.post("/{conversation_id}/analyze", response_model=Dict[str, Any])
async def trigger_ai_analysis(
    conversation_id: str,
    member: WorkspaceMember = Depends(require_roles(["OWNER", "ADMIN", "SALES_MANAGER", "SALES_REP"])),
    db: AsyncSession = Depends(get_db)
):
    """Run AI qualification turn analysis manually."""
    res = await AIQualificationService.process_conversation_turn(
        db=db,
        conversation_id=conversation_id,
        workspace_id=member.workspace_id
    )
    return res
