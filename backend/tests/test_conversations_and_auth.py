import pytest
from backend.app.models import User, Workspace, WorkspaceMember, Lead, Conversation, Message
from backend.app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token
from backend.app.services.conversation_service import ConversationService

@pytest.mark.asyncio
async def test_auth_security():
    password = "StrongMasterPassword123!"
    hashed = get_password_hash(password)
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword", hashed) is False
    
    token = create_access_token({"sub": "user-uuid-123", "role": "OWNER"})
    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == "user-uuid-123"
    assert payload["role"] == "OWNER"

@pytest.mark.asyncio
async def test_conversation_takeover_and_optout(db_session):
    ws = Workspace(name="Test Workspace", slug="test-ws-conv")
    db_session.add(ws)
    await db_session.flush()
    
    lead = Lead(
        workspace_id=ws.id,
        full_name="Jordan Bell",
        email="jordan@company.com",
        telegram_chat_id="tg-998877",
        telegram_opt_in_status="OPTED_IN",
        lead_status="NEW"
    )
    db_session.add(lead)
    await db_session.flush()
    
    conv = await ConversationService.get_or_create_conversation(db_session, ws.id, lead.id, "TELEGRAM")
    assert conv.state == "NEW"
    assert conv.ai_paused is False
    
    # Test human takeover
    taken_over = await ConversationService.takeover_conversation(db_session, conv.id, ws.id, "user-rep-1")
    assert taken_over.ai_paused is True
    assert taken_over.state == "HUMAN_REVIEW"
    
    # Test resume AI
    resumed = await ConversationService.resume_ai(db_session, conv.id, ws.id, "user-rep-1")
    assert resumed.ai_paused is False
    assert resumed.state == "ENGAGED"
    
    # Test inbound Opt-Out detection
    msg = await ConversationService.process_inbound_message(
        db=db_session,
        workspace_id=ws.id,
        channel="TELEGRAM",
        sender_id="tg-998877",
        content="Please STOP contacting me and unsubscribe."
    )
    assert lead.do_not_contact is True
    assert lead.outreach_status == "OPTED_OUT"
    assert lead.lead_status == "DO_NOT_CONTACT"
    assert conv.state == "OPTED_OUT"
    assert conv.ai_paused is True
