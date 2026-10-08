import pytest
from sqlalchemy import select, func, or_
from backend.app.models import Workspace, Lead, ICPProfile, OutreachSequence, SequenceEnrollment, LeadEnrichment
from backend.app.services.scoring_engine import ScoringEngine
from backend.app.services.lead_service import LeadService
from backend.app.services.sequence_service import SequenceService

@pytest.mark.asyncio
async def test_tenant_isolation_and_filtered_counts(db_session):
    # Workspace A
    ws_a = Workspace(name="Workspace A", slug="ws-a-audit")
    # Workspace B
    ws_b = Workspace(name="Workspace B", slug="ws-b-audit")
    db_session.add_all([ws_a, ws_b])
    await db_session.flush()

    # Create leads for Workspace A
    l1 = Lead(workspace_id=ws_a.id, full_name="Alice Smith", email="alice@a.com", qualification_status="QUALIFIED", lead_status="QUALIFIED")
    l2 = Lead(workspace_id=ws_a.id, full_name="Bob Jones", email="bob@a.com", qualification_status="UNQUALIFIED", lead_status="NEW")
    
    # Create lead for Workspace B
    l3 = Lead(workspace_id=ws_b.id, full_name="Charlie Brown", email="charlie@b.com", qualification_status="QUALIFIED", lead_status="QUALIFIED")
    
    db_session.add_all([l1, l2, l3])
    await db_session.commit()

    # Query filtered count for Workspace A where qualification_status == "QUALIFIED"
    base_stmt_a = select(Lead).where(Lead.workspace_id == ws_a.id, Lead.qualification_status == "QUALIFIED")
    count_stmt_a = select(func.count(Lead.id)).where(base_stmt_a.whereclause)
    total_a_qualified = (await db_session.execute(count_stmt_a)).scalar()
    assert total_a_qualified == 1

    # Ensure Workspace B lead is not counted in Workspace A
    all_a_stmt = select(func.count(Lead.id)).where(Lead.workspace_id == ws_a.id)
    total_a = (await db_session.execute(all_a_stmt)).scalar()
    assert total_a == 2

@pytest.mark.asyncio
async def test_scoring_engine_with_null_and_mixed_criteria():
    icp = ICPProfile(
        name="Tech Execs",
        target_job_titles=["CTO", None, "VP Engineering", 123], # Mixed/null types
        target_industries=["SaaS", None],
        target_company_sizes=["11-50"],
        target_geographies=["United States"],
        negative_criteria={
            "excluded_titles": ["Intern", None],
            "excluded_industries": [None, "Retail"],
            "excluded_locations": []
        },
        weights={"title": 30, "industry": 30, "company_size": 20, "geography": 20},
        min_qualification_score=60,
        auto_qualification_threshold=80
    )

    lead_valid = Lead(
        job_title="CTO & Co-Founder",
        industry="SaaS",
        employee_count=25,
        location="Austin, Texas, United States"
    )

    eval_res = ScoringEngine.evaluate(lead_valid, icp)
    assert eval_res["score"] >= 80
    assert eval_res["auto_qualified"] is True
    assert len(eval_res["matched_criteria"]) >= 3

    # Negative filter check
    lead_intern = Lead(
        job_title="Engineering Intern",
        industry="SaaS",
        employee_count=25
    )
    eval_neg = ScoringEngine.evaluate(lead_intern, icp)
    assert eval_neg["score"] == 0
    assert any("excluded criteria" in f for f in eval_neg["failed_criteria"])
    assert "Disqualified" in eval_neg["explanation"]
