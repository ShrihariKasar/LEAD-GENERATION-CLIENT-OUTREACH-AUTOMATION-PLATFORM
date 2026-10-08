import json
import uuid
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.models import Meeting, Lead, Integration, Notification, SequenceEnrollment
from backend.app.integrations import get_provider_instance
from backend.app.core.security import decrypt_secret
from backend.app.services.audit_service import AuditService

class CalendarService:
    @staticmethod
    async def get_available_slots(
        db: AsyncSession,
        workspace_id: str,
        days_ahead: int = 5,
        duration_minutes: int = 30,
        target_timezone: str = "UTC"
    ) -> List[Dict[str, Any]]:
        # 1. Fetch Google Calendar integration
        int_stmt = select(Integration).where(
            Integration.workspace_id == workspace_id,
            Integration.provider == "GOOGLE_CALENDAR",
            Integration.status == "CONNECTED"
        )
        g_int = (await db.execute(int_stmt)).scalar_one_or_none()
        if not g_int or not g_int.encrypted_credentials:
            raise ValueError("Google Calendar integration is not connected. Please connect Google Calendar.")
            
        creds = json.loads(decrypt_secret(g_int.encrypted_credentials))
        cal_client = get_provider_instance("GOOGLE_CALENDAR", creds)
        
        now = datetime.now(timezone.utc)
        time_max = now + timedelta(days=days_ahead)
        
        busy = await cal_client.query_freebusy(now, time_max)
        slots = cal_client.calculate_available_slots(
            busy_intervals=busy,
            start_date=now,
            days_ahead=days_ahead,
            duration_minutes=duration_minutes
        )
        return slots

    @staticmethod
    async def schedule_meeting(
        db: AsyncSession,
        workspace_id: str,
        lead_id: str,
        title: str,
        start_at: datetime,
        end_at: datetime,
        timezone_str: str = "UTC",
        description: Optional[str] = None,
        attendees: Optional[List[str]] = None
    ) -> Meeting:
        l_stmt = select(Lead).where(Lead.id == lead_id, Lead.workspace_id == workspace_id)
        lead = (await db.execute(l_stmt)).scalar_one_or_none()
        if not lead:
            raise ValueError("Lead not found.")
            
        attendee_list = list(attendees) if attendees else []
        if lead.email and lead.email not in attendee_list:
            attendee_list.append(lead.email)
            
        # Check for connected Google Calendar provider
        int_stmt = select(Integration).where(
            Integration.workspace_id == workspace_id,
            Integration.provider == "GOOGLE_CALENDAR",
            Integration.status == "CONNECTED"
        )
        g_int = (await db.execute(int_stmt)).scalar_one_or_none()
        
        if g_int and g_int.encrypted_credentials:
            creds = json.loads(decrypt_secret(g_int.encrypted_credentials))
            cal_client = get_provider_instance("GOOGLE_CALENDAR", creds)
            
            # Create Google Calendar event with race-condition check
            event_res = await cal_client.create_event(
                title=title,
                start_at=start_at,
                end_at=end_at,
                attendee_emails=attendee_list,
                description=description,
                tz_name=timezone_str
            )
            event_id = event_res.get("id")
            meeting_link = event_res.get("meeting_link")
            cal_id = "primary"
        else:
            # Native Workspace Calendar Booking
            event_id = f"evt_{uuid.uuid4().hex[:12]}"
            meeting_link = f"https://meet.threadline.io/room/{uuid.uuid4().hex[:10]}"
            cal_id = "workspace_primary"
        
        meeting = Meeting(
            workspace_id=workspace_id,
            lead_id=lead.id,
            calendar_id=cal_id,
            provider_event_id=event_id,
            title=title,
            description=description,
            start_at=start_at,
            end_at=end_at,
            timezone=timezone_str,
            attendees=attendee_list,
            meeting_link=meeting_link,
            status="CONFIRMED",
            created_at=datetime.now(timezone.utc)
        )
        db.add(meeting)
        
        # Update lead CRM state
        lead.lead_status = "MEETING_SCHEDULED"
        lead.qualification_status = "QUALIFIED"
        lead.next_best_action = f"Prepare for meeting on {start_at.strftime('%b %d, %H:%M UTC')}"
        
        # Stop / Complete any active sequence enrollments
        enr_stmt = select(SequenceEnrollment).where(SequenceEnrollment.lead_id == lead.id, SequenceEnrollment.status == "ACTIVE")
        active_enrs = (await db.execute(enr_stmt)).scalars().all()
        for enr in active_enrs:
            enr.status = "COMPLETED"
            enr.termination_reason = "Meeting scheduled"
            
        # Create notification
        notif = Notification(
            workspace_id=workspace_id,
            type="MEETING_BOOKED",
            title="New Meeting Scheduled",
            message=f"Meeting confirmed with {lead.full_name or lead.email} ({lead.company_name or 'Company'}) on {start_at.strftime('%a %b %d at %H:%M UTC')}.",
            severity="SUCCESS",
            related_entity_type="MEETING",
            related_entity_id=meeting.id,
            created_at=datetime.now(timezone.utc)
        )
        db.add(notif)
        
        await AuditService.log_event(
            db=db,
            workspace_id=workspace_id,
            action="meeting_scheduled",
            actor_type="USER",
            entity_type="MEETING",
            entity_id=meeting.id,
            metadata={
                "start_at": start_at.isoformat(),
                "end_at": end_at.isoformat(),
                "meeting_link": meeting.meeting_link,
                "lead_email": lead.email
            }
        )
        
        await db.commit()
        await db.refresh(meeting)
        return meeting
