import pytest
from backend.app.models import Lead, ICPProfile, Company
from backend.app.services.scoring_engine import ScoringEngine

def test_deterministic_scoring_matched():
    icp = ICPProfile(
        name="Target Engineering Execs",
        target_job_titles=["VP Engineering", "CTO", "Head of Engineering"],
        target_industries=["Software", "Information Technology"],
        target_company_sizes=["11-50", "51-200"],
        target_geographies=["United States", "US", "UK"],
        target_technologies=["PostgreSQL", "Python", "Kubernetes"],
        weights={
            "title": 25,
            "industry": 20,
            "company_size": 15,
            "geography": 15,
            "technology": 15,
            "business_signal": 10
        },
        auto_qualification_threshold=80
    )
    
    lead = Lead(
        full_name="Alex Chen",
        job_title="VP Engineering",
        industry="Software",
        employee_count=120,
        location="San Francisco, US",
        email="alex@acmecorp.io"
    )
    
    company = Company(
        name="Acme Corp",
        technologies=["PostgreSQL", "Python", "Docker"]
    )
    
    res = ScoringEngine.evaluate(lead, icp, company)
    assert res["score"] >= 80
    assert res["auto_qualified"] is True
    assert len(res["matched_criteria"]) >= 4
    assert len(res["decision_trace_items"]) > 0
    assert "Job Title" in res["explanation"]

def test_deterministic_scoring_negative_filter():
    icp = ICPProfile(
        name="Enterprise Target",
        target_job_titles=["VP Engineering"],
        negative_criteria={
            "excluded_titles": ["Intern", "Student", "Assistant"],
            "excluded_industries": ["Gambling"]
        }
    )
    
    lead = Lead(
        full_name="Junior Candidate",
        job_title="Engineering Intern",
        email="intern@acme.io"
    )
    
    res = ScoringEngine.evaluate(lead, icp)
    assert res["score"] == 0
    assert res["auto_qualified"] is False
    assert len(res["failed_criteria"]) == 1
    assert "negative criteria" in res["explanation"].lower()
