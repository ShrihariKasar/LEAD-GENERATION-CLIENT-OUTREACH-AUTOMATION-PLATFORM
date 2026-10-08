import time
from datetime import datetime, timedelta, timezone, time as dtime
from typing import Dict, Any, Optional, List
import httpx
from backend.app.integrations.base import BaseIntegrationProvider, ProviderTestResult, DiagnosticInfo

class GoogleCalendarProvider(BaseIntegrationProvider):
    provider_name = "GOOGLE_CALENDAR"
    BASE_URL = "https://www.googleapis.com/calendar/v3"
    
    def __init__(self, access_token: Optional[str] = None, refresh_token: Optional[str] = None):
        self.access_token = access_token
        self.refresh_token = refresh_token
        
    async def test_connection(self, credentials: Dict[str, Any]) -> ProviderTestResult:
        access_token = credentials.get("access_token") or self.access_token
        if not access_token:
            return ProviderTestResult(
                provider="GOOGLE_CALENDAR",
                success=False,
                status="NOT_CONNECTED",
                message="Google Calendar OAuth access token is missing.",
                diagnostic=DiagnosticInfo(
                    cause="No active OAuth token found.",
                    action="Authorize Google Calendar using the OAuth Connect button in Integration Settings.",
                    technical_code="GOOGLE_TOKEN_MISSING",
                    timestamp=datetime.now(timezone.utc)
                )
            )
            
        start_time = time.time()
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                headers = {"Authorization": f"Bearer {access_token}"}
                response = await client.get(f"{self.BASE_URL}/users/me/calendarList", headers=headers)
                latency = int((time.time() - start_time) * 1000)
                
                if response.status_code == 200:
                    data = response.json()
                    items = data.get("items", [])
                    primary = next((cal for cal in items if cal.get("primary")), None)
                    primary_email = primary.get("id") if primary else (items[0].get("id") if items else "Google Account")
                    
                    return ProviderTestResult(
                        provider="GOOGLE_CALENDAR",
                        success=True,
                        status="CONNECTED",
                        message=f"Google Calendar connected ({primary_email}). {len(items)} calendars accessible.",
                        account_identifier=primary_email,
                        scopes=["https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/calendar.readonly"],
                        latency_ms=latency
                    )
                elif response.status_code == 401:
                    return ProviderTestResult(
                        provider="GOOGLE_CALENDAR",
                        success=False,
                        status="ERROR",
                        message="Google Calendar OAuth token has expired or is invalid.",
                        diagnostic=DiagnosticInfo(
                            cause="OAuth token expired or was revoked.",
                            action="Click Reconnect to refresh your Google Calendar OAuth authorization.",
                            technical_code="GOOGLE_OAUTH_EXPIRED",
                            timestamp=datetime.now(timezone.utc),
                            raw_message=response.text
                        ),
                        latency_ms=latency
                    )
                else:
                    return ProviderTestResult(
                        provider="GOOGLE_CALENDAR",
                        success=False,
                        status="ERROR",
                        message=f"Google Calendar returned HTTP {response.status_code}",
                        diagnostic=DiagnosticInfo(
                            cause=f"Google API HTTP {response.status_code}",
                            action="Check Google Cloud project quotas and OAuth consent screen.",
                            technical_code=f"GOOGLE_HTTP_{response.status_code}",
                            timestamp=datetime.now(timezone.utc),
                            raw_message=response.text
                        ),
                        latency_ms=latency
                    )
        except httpx.RequestError as exc:
            latency = int((time.time() - start_time) * 1000)
            return ProviderTestResult(
                provider="GOOGLE_CALENDAR",
                success=False,
                status="ERROR",
                message=f"Network error contacting Google APIs: {exc}",
                diagnostic=DiagnosticInfo(
                    cause="Could not connect to googleapis.com.",
                    action="Check network connectivity.",
                    technical_code="GOOGLE_NETWORK_ERROR",
                    timestamp=datetime.now(timezone.utc),
                    raw_message=str(exc)
                ),
                latency_ms=latency
            )

    async def query_freebusy(
        self,
        time_min: datetime,
        time_max: datetime,
        calendar_id: str = "primary"
    ) -> List[Dict[str, datetime]]:
        """Query Google Calendar FreeBusy API for busy intervals."""
        if not self.access_token:
            raise ValueError("Google Calendar access token is not configured.")
            
        payload = {
            "timeMin": time_min.isoformat(),
            "timeMax": time_max.isoformat(),
            "items": [{"id": calendar_id}]
        }
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            headers = {"Authorization": f"Bearer {self.access_token}", "Content-Type": "application/json"}
            response = await client.post(
                f"{self.BASE_URL}/freeBusy",
                json=payload,
                headers=headers
            )
            
            if response.status_code != 200:
                raise RuntimeError(f"Google FreeBusy query failed (HTTP {response.status_code}): {response.text}")
                
            data = response.json()
            calendar_data = data.get("calendars", {}).get(calendar_id, {})
            busy_list = calendar_data.get("busy", [])
            
            busy_intervals = []
            for b in busy_list:
                start_dt = datetime.fromisoformat(b["start"].replace("Z", "+00:00"))
                end_dt = datetime.fromisoformat(b["end"].replace("Z", "+00:00"))
                busy_intervals.append({"start": start_dt, "end": end_dt})
                
            return busy_intervals

    def calculate_available_slots(
        self,
        busy_intervals: List[Dict[str, datetime]],
        start_date: datetime,
        days_ahead: int = 5,
        duration_minutes: int = 30,
        buffer_minutes: int = 15,
        working_hours_start: int = 9,
        working_hours_end: int = 17,
        target_tz_offset_hours: int = 0
    ) -> List[Dict[str, Any]]:
        """Compute real conflict-free available meeting slots based on FreeBusy results."""
        available_slots = []
        slot_delta = timedelta(minutes=duration_minutes)
        buffer_delta = timedelta(minutes=buffer_minutes)
        
        now = datetime.now(timezone.utc)
        
        for day in range(days_ahead):
            current_day = (start_date + timedelta(days=day)).date()
            # Skip weekends (Saturday=5, Sunday=6)
            if current_day.weekday() >= 5:
                continue
                
            day_start = datetime(current_day.year, current_day.month, current_day.day, working_hours_start, 0, tzinfo=timezone.utc)
            day_end = datetime(current_day.year, current_day.month, current_day.day, working_hours_end, 0, tzinfo=timezone.utc)
            
            candidate_start = day_start
            while candidate_start + slot_delta <= day_end:
                candidate_end = candidate_start + slot_delta
                
                # Check if in future
                if candidate_start > now + timedelta(hours=2):
                    # Check conflict against all busy intervals
                    is_conflict = False
                    for b in busy_intervals:
                        b_start = b["start"] - buffer_delta
                        b_end = b["end"] + buffer_delta
                        if not (candidate_end <= b_start or candidate_start >= b_end):
                            is_conflict = True
                            break
                            
                    if not is_conflict:
                        formatted = candidate_start.strftime("%a, %b %d at %I:%M %p UTC")
                        available_slots.append({
                            "start_at": candidate_start,
                            "end_at": candidate_end,
                            "timezone": "UTC",
                            "formatted": formatted
                        })
                        
                candidate_start += slot_delta + buffer_delta
                
        return available_slots

    async def create_event(
        self,
        title: str,
        start_at: datetime,
        end_at: datetime,
        attendee_emails: List[str],
        description: Optional[str] = None,
        calendar_id: str = "primary",
        tz_name: str = "UTC"
    ) -> Dict[str, Any]:
        """Create a real event in Google Calendar with Google Meet video link."""
        if not self.access_token:
            raise ValueError("Google Calendar access token is not configured.")
            
        # Recheck availability for race condition prevention
        busy = await self.query_freebusy(start_at, end_at, calendar_id)
        if busy:
            raise RuntimeError("Selected slot is no longer available. A conflict was detected.")
            
        payload = {
            "summary": title,
            "description": description or "Scheduled via THREADLINE Revenue Operations Platform",
            "start": {
                "dateTime": start_at.isoformat(),
                "timeZone": tz_name
            },
            "end": {
                "dateTime": end_at.isoformat(),
                "timeZone": tz_name
            },
            "attendees": [{"email": email} for email in attendee_emails],
            "conferenceData": {
                "createRequest": {
                    "requestId": f"threadline_{int(time.time())}",
                    "conferenceSolutionKey": {"type": "hangoutsMeet"}
                }
            }
        }
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json"
            }
            response = await client.post(
                f"{self.BASE_URL}/calendars/{calendar_id}/events?conferenceDataVersion=1",
                json=payload,
                headers=headers
            )
            
            if response.status_code not in (200, 201):
                raise RuntimeError(f"Google Calendar event creation failed (HTTP {response.status_code}): {response.text}")
                
            data = response.json()
            meet_link = data.get("hangoutLink") or data.get("conferenceData", {}).get("entryPoints", [{}])[0].get("uri")
            
            return {
                "id": data.get("id"),
                "status": "CONFIRMED",
                "html_link": data.get("htmlLink"),
                "meeting_link": meet_link,
                "created": data.get("created"),
                "summary": data.get("summary")
            }
