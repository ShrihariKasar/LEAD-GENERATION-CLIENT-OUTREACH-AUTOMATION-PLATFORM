import pytest
from datetime import datetime, timezone, timedelta
from backend.app.integrations.google_calendar_provider import GoogleCalendarProvider

def test_available_slots_calculation():
    provider = GoogleCalendarProvider(access_token="test-token")
    
    # 2 days in future on a weekday
    base_time = datetime.now(timezone.utc) + timedelta(days=2)
    # Ensure weekday
    while base_time.weekday() >= 5:
        base_time += timedelta(days=1)
        
    busy_interval_1 = {
        "start": datetime(base_time.year, base_time.month, base_time.day, 10, 0, tzinfo=timezone.utc),
        "end": datetime(base_time.year, base_time.month, base_time.day, 11, 0, tzinfo=timezone.utc)
    }
    
    slots = provider.calculate_available_slots(
        busy_intervals=[busy_interval_1],
        start_date=base_time,
        days_ahead=3,
        duration_minutes=30,
        buffer_minutes=15,
        working_hours_start=9,
        working_hours_end=17
    )
    
    assert len(slots) > 0
    for s in slots:
        # Verify no slot overlaps with the busy block (10:00 - 11:00) with buffer
        start = s["start_at"]
        end = s["end_at"]
        assert not (start < busy_interval_1["end"] and end > busy_interval_1["start"])
