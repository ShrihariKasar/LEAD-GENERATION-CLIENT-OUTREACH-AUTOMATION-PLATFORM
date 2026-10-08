from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from backend.app.database import get_db
from backend.app.models import Meeting, Lead, WorkspaceMember
from backend.app.schemas import MeetingResponse, MeetingCreateRequest, AvailableSlot
from backend.app.auth.dependencies import get_current_workspace_context, require_roles
from backend.app.services.calendar_service import CalendarService

router = APIRouter(prefix="/calendar", tags=["Calendar & Meetings"])

@router.get("/availability", response_model=List[AvailableSlot])
async def get_available_slots(
    days_ahead: int = Query(7, ge=1, le=14),
    duration_minutes: int = Query(30, ge=15, le=120),
    timezone: str = Query("UTC"),
    member: WorkspaceMember = Depends(get_current_workspace_context),
    db: AsyncSession = Depends(get_db)
):
    """Query real Google Calendar FreeBusy and return conflict-free slots."""
    try:
        slots = await CalendarService.get_available_slots(
            db=db,
            workspace_id=member.workspace_id,
            days_ahead=days_ahead,
            duration_minutes=duration_minutes,
            target_timezone=timezone
        )
        return slots
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Calendar provider error: {str(e)}")

@router.get("/meetings", response_model=List[MeetingResponse])
async def list_meetings(
    member: WorkspaceMember = Depends(get_current_workspace_context),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Meeting, Lead).join(Lead, Meeting.lead_id == Lead.id).where(
        Meeting.workspace_id == member.workspace_id
    ).order_by(desc(Meeting.start_at))
    
    results = (await db.execute(stmt)).all()
    meetings = []
    for meet, lead in results:
        meetings.append({
            "id": meet.id,
            "workspace_id": meet.workspace_id,
            "lead_id": meet.lead_id,
            "calendar_id": meet.calendar_id,
            "provider_event_id": meet.provider_event_id,
            "title": meet.title,
            "description": meet.description,
            "start_at": meet.start_at,
            "end_at": meet.end_at,
            "timezone": meet.timezone,
            "attendees": meet.attendees,
            "meeting_link": meet.meeting_link,
            "status": meet.status,
            "lead_name": lead.full_name or f"{lead.first_name or ''} {lead.last_name or ''}".strip(),
            "lead_email": lead.email,
            "lead_company": lead.company_name,
            "created_at": meet.created_at,
            "updated_at": meet.updated_at
        })
    return meetings

@router.post("/meetings", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
async def schedule_meeting(
    payload: MeetingCreateRequest,
    member: WorkspaceMember = Depends(require_roles(["OWNER", "ADMIN", "SALES_MANAGER", "SALES_REP"])),
    db: AsyncSession = Depends(get_db)
):
    """Schedule real calendar meeting with attendee invitations and conflict recheck."""
    try:
        meeting = await CalendarService.schedule_meeting(
            db=db,
            workspace_id=member.workspace_id,
            lead_id=payload.lead_id,
            title=payload.title,
            start_at=payload.start_at,
            end_at=payload.end_at,
            timezone_str=payload.timezone,
            description=payload.description,
            attendees=payload.attendees
        )
        
        lead = (await db.execute(select(Lead).where(Lead.id == meeting.lead_id))).scalar_one_or_none()
        return {
            "id": meeting.id,
            "workspace_id": meeting.workspace_id,
            "lead_id": meeting.lead_id,
            "calendar_id": meeting.calendar_id,
            "provider_event_id": meeting.provider_event_id,
            "title": meeting.title,
            "description": meeting.description,
            "start_at": meeting.start_at,
            "end_at": meeting.end_at,
            "timezone": meeting.timezone,
            "attendees": meeting.attendees,
            "meeting_link": meeting.meeting_link,
            "status": meeting.status,
            "lead_name": lead.full_name if lead else None,
            "lead_email": lead.email if lead else None,
            "lead_company": lead.company_name if lead else None,
            "created_at": meeting.created_at,
            "updated_at": meeting.updated_at
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to create Google Calendar event: {str(e)}")
