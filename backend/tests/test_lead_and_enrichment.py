import pytest
from backend.app.models import Workspace, Lead, ICPProfile, Company, LeadEnrichment
from backend.app.services.lead_service import LeadService
from backend.app.services.enrichment_service import EnrichmentService

@pytest.mark.asyncio
async def test_lead_deduplication(db_session):
    ws = Workspace(name="Test Corp", slug="test-dedup-ws")
    db_session.add(ws)
    await db_session.flush()
    
    lead_data = {
        "full_name": "Elena Rostova",
        "email": "elena@techscale.io",
        "company_name": "TechScale",
        "company_domain": "techscale.io",
        "job_title": "VP Engineering",
        "source": "MANUAL"
    }
    
    # 1. Create first lead
    lead1, is_created1 = await LeadService.create_lead(db_session, ws.id, lead_data)
    assert is_created1 is True
    assert lead1.email == "elena@techscale.io"
    assert lead1.telegram_deep_link_token is not None
    
    # 2. Attempt duplicate lead creation with same email
    lead2, is_created2 = await LeadService.create_lead(db_session, ws.id, lead_data)
    assert is_created2 is False
    assert lead2.id == lead1.id

@pytest.mark.asyncio
async def test_decision_trace_generation(db_session):
    ws = Workspace(name="Test Corp 2", slug="test-trace-ws")
    db_session.add(ws)
    await db_session.flush()
    
    icp = ICPProfile(
        workspace_id=ws.id,
        name="Enterprise CTOs",
        target_job_titles=["CTO", "VP Engineering"],
        target_industries=["Software"],
        target_company_sizes=["51-200"],
        min_qualification_score=60
    )
    db_session.add(icp)
    await db_session.flush()
    
    lead_data = {
        "full_name": "Marcus Aurelius",
        "email": "marcus@rome.io",
        "job_title": "CTO",
        "company_name": "Rome Cloud",
        "industry": "Software",
        "employee_count": 150,
        "location": "Rome, Italy",
        "icp_profile_id": icp.id
    }
    lead, _ = await LeadService.create_lead(db_session, ws.id, lead_data)
    
    trace = await LeadService.get_decision_trace(db_session, lead.id, ws.id)
    assert trace["lead_id"] == lead.id
    assert trace["overall_score"] is not None
    assert len(trace["items"]) >= 3
    assert any(item["status"] == "MATCHED" for item in trace["items"])
    assert "Decision-Maker Title" in [item["label"] for item in trace["items"]]
