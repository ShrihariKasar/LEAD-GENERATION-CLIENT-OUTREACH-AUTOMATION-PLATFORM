from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from backend.app.models import Lead, Conversation, Message, Meeting, Integration, AIRun, OutreachSequence, SequenceEnrollment

class AnalyticsService:
    @staticmethod
    async def get_dashboard_overview(db: AsyncSession, workspace_id: str) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
        
        # 1. Total Leads & Leads by Stage
        lead_stage_stmt = select(Lead.lead_status, func.count(Lead.id)).where(
            Lead.workspace_id == workspace_id
        ).group_by(Lead.lead_status)
        stage_counts = dict((await db.execute(lead_stage_stmt)).all())
        total_leads = sum(stage_counts.values()) if stage_counts else 0
        
        # Qualified leads count
        qualified_leads = stage_counts.get("QUALIFIED", 0) + stage_counts.get("MEETING_SCHEDULED", 0)
        qualification_rate = round((qualified_leads / total_leads * 100), 1) if total_leads > 0 else 0.0
        
        # Qualified leads today
        q_today_stmt = select(func.count(Lead.id)).where(
            Lead.workspace_id == workspace_id,
            Lead.qualification_status == "QUALIFIED",
            Lead.updated_at >= today_start
        )
        qualified_leads_today = (await db.execute(q_today_stmt)).scalar() or 0
        
        # 2. Meetings
        meetings_today_stmt = select(func.count(Meeting.id)).where(
            Meeting.workspace_id == workspace_id,
            Meeting.start_at >= today_start,
            Meeting.start_at < today_start + timedelta(days=1)
        )
        meetings_today = (await db.execute(meetings_today_stmt)).scalar() or 0
        
        total_meetings_stmt = select(func.count(Meeting.id)).where(Meeting.workspace_id == workspace_id)
        total_meetings = (await db.execute(total_meetings_stmt)).scalar() or 0
        meeting_conversion_rate = round((total_meetings / total_leads * 100), 1) if total_leads > 0 else 0.0
        
        # 3. Conversations needing attention
        attention_conv_stmt = select(func.count(Conversation.id)).where(
            Conversation.workspace_id == workspace_id,
            Conversation.state == "HUMAN_REVIEW"
        )
        conversations_needing_attention = (await db.execute(attention_conv_stmt)).scalar() or 0
        
        # 4. Failed integrations
        pending_int_stmt = select(func.count(Integration.id)).where(
            Integration.workspace_id == workspace_id,
            Integration.status.in_(["ERROR", "NOT_CONNECTED"])
        )
        pending_integrations = (await db.execute(pending_int_stmt)).scalar() or 0
        
        # 5. Outreach health metrics
        sent_stmt = select(func.count(Message.id)).join(Conversation).where(
            Conversation.workspace_id == workspace_id,
            Message.direction == "OUTBOUND"
        )
        messages_sent_count = (await db.execute(sent_stmt)).scalar() or 0
        
        received_stmt = select(func.count(Message.id)).join(Conversation).where(
            Conversation.workspace_id == workspace_id,
            Message.direction == "INBOUND"
        )
        responses_received_count = (await db.execute(received_stmt)).scalar() or 0
        response_rate = round((responses_received_count / messages_sent_count * 100), 1) if messages_sent_count > 0 else 0.0
        
        # Positive responses (leads qualified or meeting booked among responded)
        positive_leads_stmt = select(func.count(Lead.id)).where(
            Lead.workspace_id == workspace_id,
            Lead.outreach_status == "REPLIED",
            Lead.qualification_status.in_(["QUALIFIED", "POTENTIAL"])
        )
        pos_leads = (await db.execute(positive_leads_stmt)).scalar() or 0
        positive_response_rate = round((pos_leads / responses_received_count * 100), 1) if responses_received_count > 0 else 0.0
        
        # Follow-ups due
        due_stmt = select(func.count(SequenceEnrollment.id)).join(OutreachSequence).where(
            OutreachSequence.workspace_id == workspace_id,
            SequenceEnrollment.status == "ACTIVE",
            SequenceEnrollment.next_execution_at <= now
        )
        follow_ups_due_count = (await db.execute(due_stmt)).scalar() or 0
        
        # 6. AI health
        ai_runs_stmt = select(AIRun).where(AIRun.workspace_id == workspace_id)
        ai_runs = (await db.execute(ai_runs_stmt)).scalars().all()
        ai_conversations_count = len(ai_runs)
        failed_ai_runs_count = sum(1 for r in ai_runs if not r.success)
        avg_confidence = round(sum((r.confidence or 0.8) for r in ai_runs) / len(ai_runs), 2) if ai_runs else 0.0
        
        # 7. Attention items list
        attention_items = []
        
        # Fetch actual conversations in HUMAN_REVIEW
        human_convs_stmt = select(Conversation, Lead).join(Lead, Conversation.lead_id == Lead.id).where(
            Conversation.workspace_id == workspace_id,
            Conversation.state == "HUMAN_REVIEW"
        ).limit(5)
        for conv, lead in (await db.execute(human_convs_stmt)).all():
            attention_items.append({
                "id": conv.id,
                "type": "NEEDS_HUMAN",
                "title": f"Human Takeover Required: {lead.full_name or lead.company_name or 'Lead'}",
                "description": f"AI requested human intervention. Intent: {conv.last_intent or 'Review needed'}",
                "severity": "WARNING",
                "entity_id": conv.id,
                "timestamp": conv.updated_at or conv.created_at
            })
            
        # Fetch today's meetings
        m_stmt = select(Meeting, Lead).join(Lead, Meeting.lead_id == Lead.id).where(
            Meeting.workspace_id == workspace_id,
            Meeting.start_at >= today_start,
            Meeting.start_at < today_start + timedelta(days=1)
        ).limit(5)
        for meet, lead in (await db.execute(m_stmt)).all():
            attention_items.append({
                "id": meet.id,
                "type": "MEETING_TODAY",
                "title": f"Meeting Today: {meet.title}",
                "description": f"Scheduled at {meet.start_at.strftime('%H:%M UTC')} with {lead.full_name or lead.email}",
                "severity": "INFO",
                "entity_id": meet.id,
                "timestamp": meet.start_at
            })
            
        return {
            "attention_items": attention_items,
            "conversations_needing_attention": conversations_needing_attention,
            "qualified_leads_today": qualified_leads_today,
            "meetings_today": meetings_today,
            "failed_automations_count": failed_ai_runs_count,
            "pending_integrations_count": pending_integrations,
            "total_leads": total_leads,
            "leads_by_stage": stage_counts,
            "qualification_rate": qualification_rate,
            "meeting_conversion_rate": meeting_conversion_rate,
            "messages_sent_count": messages_sent_count,
            "responses_received_count": responses_received_count,
            "response_rate": response_rate,
            "positive_response_rate": positive_response_rate,
            "follow_ups_due_count": follow_ups_due_count,
            "ai_conversations_count": ai_conversations_count,
            "human_handoff_count": conversations_needing_attention,
            "average_ai_confidence": avg_confidence,
            "failed_ai_runs_count": failed_ai_runs_count
        }
