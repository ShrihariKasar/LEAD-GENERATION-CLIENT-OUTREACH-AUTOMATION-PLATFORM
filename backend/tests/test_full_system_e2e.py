import pytest
import io
import json
import uuid
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.database import init_db

@pytest.mark.asyncio
async def test_complete_threadline_e2e_workflow():
    # 1. Initialize database schema
    await init_db()

    run_id = uuid.uuid4().hex[:8]
    user_email = f"sarah.ops.{run_id}@threadline-test.com"
    lead_email = f"marcus.vance.{run_id}@techcorp.io"
    elena_email = f"elena.{run_id}@quantum-ai.com"
    david_email = f"david.{run_id}@finflow.io"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # --- HEALTH & ROOT ENDPOINTS ---
        res_health = await client.get("/health")
        assert res_health.status_code == 200
        assert res_health.json()["status"] == "healthy"

        res_root = await client.get("/")
        assert res_root.status_code == 200
        assert res_root.json()["project"] == "THREADLINE"

        # --- STEP 1: USER REGISTRATION ---
        reg_payload = {
            "email": user_email,
            "password": "SecurePassword2026!",
            "full_name": "Sarah Connor",
            "workspace_name": f"Cyberdyne RevOps {run_id}"
        }
        res_reg = await client.post("/api/v1/auth/register", json=reg_payload)
        assert res_reg.status_code == 200, res_reg.text
        auth_data = res_reg.json()
        token = auth_data["access_token"]
        workspace_id = auth_data["workspace"]["id"]
        assert token is not None
        assert workspace_id is not None

        headers = {
            "Authorization": f"Bearer {token}",
            "X-Workspace-Id": workspace_id
        }

        # --- STEP 2: VERIFY AUTH / ME ---
        res_me = await client.get("/api/v1/auth/me", headers=headers)
        assert res_me.status_code == 200
        assert res_me.json()["email"] == user_email

        # --- STEP 3: WORKSPACE CONTEXT UPDATE ---
        ws_update = {
            "company_name": "Cyberdyne Systems",
            "product_description": "Autonomous AI revenue operations infrastructure and data pipeline orchestration",
            "industry": "Enterprise Software",
            "website": "https://cyberdyne-revops.io"
        }
        res_ws = await client.patch("/api/v1/workspaces/current", json=ws_update, headers=headers)
        assert res_ws.status_code == 200
        assert res_ws.json()["company_name"] == "Cyberdyne Systems"

        # --- STEP 4: SETUP WIZARD STATUS CHECK ---
        res_setup = await client.get("/api/v1/setup/status", headers=headers)
        assert res_setup.status_code == 200
        setup_data = res_setup.json()
        assert setup_data["database_ready"] is True
        assert setup_data["workspace_configured"] is True
        assert len(setup_data["services"]) >= 6

        # --- STEP 5: CREATE ICP PROFILE ---
        icp_payload = {
            "name": "VP of Engineering & CTO ICP",
            "description": "Mid-market B2B tech executives looking for workflow automation",
            "target_job_titles": ["VP Engineering", "Chief Technology Officer", "Head of Sales Ops", "CTO"],
            "target_industries": ["Software", "Enterprise Software", "SaaS", "Information Technology"],
            "target_company_sizes": ["11-50", "51-200", "201-500"],
            "target_geographies": ["United States", "Canada", "United Kingdom"],
            "negative_criteria": {
                "excluded_titles": ["Intern", "Student", "Assistant"],
                "excluded_industries": ["Retail", "Hospitality"],
                "excluded_locations": []
            },
            "weights": {
                "title": 30,
                "industry": 25,
                "company_size": 20,
                "geography": 15,
                "technology": 10
            },
            "min_qualification_score": 65,
            "auto_qualification_threshold": 80
        }
        res_icp = await client.post("/api/v1/icps", json=icp_payload, headers=headers)
        assert res_icp.status_code == 201
        icp_data = res_icp.json()
        icp_id = icp_data["id"]
        assert icp_id is not None

        # --- STEP 6: CREATE LEAD & DETERMINISTIC SCORING ---
        lead_payload = {
            "first_name": "Marcus",
            "last_name": "Vance",
            "full_name": "Marcus Vance",
            "job_title": "VP Engineering",
            "email": lead_email,
            "company_name": "TechCorp Global",
            "company_domain": "techcorp.io",
            "industry": "Enterprise Software",
            "employee_count": 120,
            "location": "San Francisco, CA, United States",
            "country": "United States",
            "source": "MANUAL",
            "icp_profile_id": icp_id
        }
        res_lead = await client.post("/api/v1/leads", json=lead_payload, headers=headers)
        assert res_lead.status_code == 201
        lead_data = res_lead.json()
        lead_id = lead_data["id"]
        assert lead_data["icp_score"] is not None
        assert lead_data["icp_score"] >= 80
        assert lead_data["qualification_status"] == "QUALIFIED"

        # --- STEP 7: CSV IMPORT BATCH LEADS ---
        csv_data = (
            "first_name,last_name,email,job_title,company_name,industry,location,employee_count\n"
            f"Elena,Rostova,{elena_email},Chief Technology Officer,Quantum AI,Software,London,85\n"
            f"David,Kim,{david_email},Head of Sales Ops,FinFlow,SaaS,New York,45\n"
        )
        files = {"file": ("prospects.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}
        res_csv = await client.post(f"/api/v1/leads/import-csv?icp_profile_id={icp_id}", files=files, headers={"Authorization": f"Bearer {token}", "X-Workspace-Id": workspace_id})
        assert res_csv.status_code == 200
        assert res_csv.json()["imported_count"] == 2

        # --- STEP 8: LEAD LIST & FILTERING ---
        res_list = await client.get("/api/v1/leads?query=Marcus", headers=headers)
        assert res_list.status_code == 200
        list_json = res_list.json()
        assert list_json["total"] == 1
        assert list_json["items"][0]["email"] == lead_email

        # --- STEP 9: DECISION TRACE INSPECTION ---
        res_trace = await client.get(f"/api/v1/leads/{lead_id}/decision-trace", headers=headers)
        assert res_trace.status_code == 200
        trace_json = res_trace.json()
        assert trace_json["overall_score"] >= 80
        assert len(trace_json["items"]) >= 3
        assert "Decision-Maker Title" in [item["label"] for item in trace_json["items"]]

        # --- STEP 10: TELEGRAM OPT-IN TRACKING LINK ---
        res_tg_link = await client.get(f"/api/v1/leads/{lead_id}/telegram-opt-in-link", headers=headers)
        assert res_tg_link.status_code == 200
        tg_token = res_tg_link.json()["token"]
        assert tg_token is not None

        # --- STEP 11: OUTREACH SEQUENCE BUILDER ---
        seq_payload = {
            "name": "B2B Tech Leadership Sequence",
            "description": "Multi-step automated sequence with reply stop-conditions",
            "is_active": True,
            "trigger_type": "MANUAL",
            "steps": [
                {
                    "step_number": 1,
                    "channel": "TELEGRAM",
                    "delay_hours": 0,
                    "condition_rule": "ALWAYS",
                    "template_content": "Hi {{first_name}}, noticed your work leading engineering at {{company}}. Would you be open to exploring revenue operations automation?"
                },
                {
                    "step_number": 2,
                    "channel": "TELEGRAM",
                    "delay_hours": 48,
                    "condition_rule": "IF_NO_REPLY",
                    "template_content": "Hi {{first_name}}, following up regarding {{company}}. Happy to share a quick 15-minute overview of our conflict-free scheduling engine."
                }
            ]
        }
        res_seq = await client.post("/api/v1/sequences", json=seq_payload, headers=headers)
        assert res_seq.status_code == 201
        seq_id = res_seq.json()["id"]

        # --- STEP 12: BULK ENROLL LEADS INTO SEQUENCE ---
        bulk_payload = {
            "lead_ids": [lead_id],
            "action": "ENROLL_SEQUENCE",
            "sequence_id": seq_id
        }
        res_bulk = await client.post("/api/v1/leads/bulk", json=bulk_payload, headers=headers)
        assert res_bulk.status_code == 200
        assert res_bulk.json()["affected_count"] == 1

        # Check sequence enrollments
        res_enr = await client.get(f"/api/v1/sequences/{seq_id}/enrollments", headers=headers)
        assert res_enr.status_code == 200
        assert len(res_enr.json()) == 1

        # --- STEP 13: TELEGRAM DEEP-LINK OPT-IN WEBHOOK ---
        webhook_optin_payload = {
            "update_id": 10001,
            "message": {
                "message_id": 501,
                "chat": {"id": 99887766, "type": "private"},
                "from": {"id": 99887766, "username": "marcus_vance", "first_name": "Marcus"},
                "text": f"/start lead_{tg_token}"
            }
        }
        res_webhook_optin = await client.post(f"/api/v1/webhooks/telegram/{workspace_id}", json=webhook_optin_payload)
        assert res_webhook_optin.status_code == 200
        assert res_webhook_optin.json()["status"] == "opted_in"

        # --- STEP 14: CONVERSATION LIST & DETAILS ---
        res_convs = await client.get("/api/v1/conversations", headers=headers)
        assert res_convs.status_code == 200
        convs = res_convs.json()
        assert len(convs) >= 1
        conv_id = convs[0]["id"]

        # --- STEP 15: HUMAN TAKEOVER & RESUME AI ---
        res_takeover = await client.post(f"/api/v1/conversations/{conv_id}/takeover", headers=headers)
        assert res_takeover.status_code == 200
        assert res_takeover.json()["ai_paused"] is True
        assert res_takeover.json()["state"] == "HUMAN_REVIEW"

        # Send human message
        msg_payload = {"content": "Hello Marcus! I am taking over directly to answer your questions."}
        res_msg = await client.post(f"/api/v1/conversations/{conv_id}/messages", json=msg_payload, headers=headers)
        assert res_msg.status_code == 200
        assert res_msg.json()["sender_type"] == "HUMAN"

        # Resume AI
        res_resume = await client.post(f"/api/v1/conversations/{conv_id}/resume-ai", headers=headers)
        assert res_resume.status_code == 200
        assert res_resume.json()["ai_paused"] is False

        # --- STEP 16: SCHEDULE CALENDAR MEETING ---
        meeting_payload = {
            "lead_id": lead_id,
            "title": "THREADLINE Architecture Deep Dive",
            "description": "Executive discovery call to review automation workflows",
            "start_at": "2026-10-15T14:00:00Z",
            "end_at": "2026-10-15T14:30:00Z",
            "timezone": "UTC",
            "attendees": [lead_email, user_email]
        }
        res_meet = await client.post("/api/v1/calendar/meetings", json=meeting_payload, headers=headers)
        assert res_meet.status_code == 201
        meet_data = res_meet.json()
        assert meet_data["status"] == "CONFIRMED"
        assert meet_data["lead_name"] == "Marcus Vance"

        # Verify lead status updated to MEETING_SCHEDULED
        res_lead_after = await client.get(f"/api/v1/leads/{lead_id}", headers=headers)
        assert res_lead_after.json()["lead_status"] == "MEETING_SCHEDULED"

        # --- STEP 17: DASHBOARD OVERVIEW AGGREGATION ---
        res_dash = await client.get("/api/v1/analytics/overview", headers=headers)
        assert res_dash.status_code == 200
        dash = res_dash.json()
        assert dash["total_leads"] >= 3
        assert dash["qualification_rate"] > 0
        assert "MEETING_SCHEDULED" in dash["leads_by_stage"]

        # --- STEP 18: GLOBAL SEARCH ---
        res_search = await client.get("/api/v1/search?q=Marcus", headers=headers)
        assert res_search.status_code == 200
        search_res = res_search.json()
        assert len(search_res["leads"]) >= 1
        assert search_res["leads"][0]["name"] == "Marcus Vance"

        # --- STEP 19: AUDIT LOGS INSPECTION ---
        res_audit = await client.get("/api/v1/audit/logs", headers=headers)
        assert res_audit.status_code == 200
        logs = res_audit.json()
        assert len(logs) >= 5
        actions = [l["action"] for l in logs]
        assert "lead_created" in actions
        assert "icp_created" in actions
        assert "human_takeover" in actions

        # --- STEP 20: INTEGRATION CENTER TESTING ---
        res_ints = await client.get("/api/v1/integrations", headers=headers)
        assert res_ints.status_code == 200
        assert len(res_ints.json()) == 7

        res_test_openai = await client.post("/api/v1/integrations/OPENAI/test", headers=headers)
        assert res_test_openai.status_code == 200
        test_json = res_test_openai.json()
        assert test_json["provider"] == "OPENAI"
        assert test_json["status"] in ("NOT_CONNECTED", "CONNECTED", "ERROR")
