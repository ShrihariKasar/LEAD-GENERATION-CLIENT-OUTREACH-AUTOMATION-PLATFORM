import sys
import os
sys.path.insert(0, os.getcwd())

import asyncio
from httpx import AsyncClient, ASGITransport
from backend.app.main import app

async def test_demo_endpoints():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Login
        login_res = await client.post("/api/v1/auth/login", json={
            "email": "sarah.ops@threadline-test.com",
            "password": "SecurePassword2026!"
        })
        print("Login Status:", login_res.status_code)
        assert login_res.status_code == 200, login_res.text
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 2. Workspace
        ws_res = await client.get("/api/v1/workspaces/current", headers=headers)
        ws_data = ws_res.json()
        print("Workspace Company Name:", ws_data.get("company_name"))
        print("Workspace Website:", ws_data.get("website"))
        print("Workspace Industry:", ws_data.get("industry"))
        
        # 3. Setup Status
        setup_res = await client.get("/api/v1/setup/status", headers=headers)
        setup_data = setup_res.json()
        print("Setup Ready for Outreach:", setup_data.get("ready_for_outreach"))
        print("Setup Workspace Configured:", setup_data.get("workspace_configured"))
        print("Setup ICP Configured:", setup_data.get("icp_configured"))
        print("Setup Services:")
        for s in setup_data.get("services", []):
            print(f"  - {s['name']}: {s['status']}")
        
        # 4. Leads
        leads_res = await client.get("/api/v1/leads?limit=50", headers=headers)
        leads = leads_res.json().get("items", [])
        print(f"\nTotal Leads: {len(leads)}")
        for l in leads[:5]:
            print(f"  - {l.get('full_name')} ({l.get('job_title')} @ {l.get('company_name')}) -> Score: {l.get('icp_score')} | Status: {l.get('qualification_status')}")
            
        # 5. Conversations
        conv_res = await client.get("/api/v1/conversations", headers=headers)
        convs = conv_res.json()
        print(f"\nTotal Conversations: {len(convs)}")
        for c in convs:
            lead = c.get("lead") or {}
            msgs = c.get("messages", [])
            print(f"  - Lead: {lead.get('full_name')} | State: {c.get('state')} | Messages Count: {len(msgs)}")
            if lead.get("full_name") == "John Davis":
                print("    Conversation messages sample:")
                for m in msgs[:3]:
                    print(f"      [{m['sender_type']}]: {m['content'][:60]}...")
            
        # 6. Meetings
        meet_res = await client.get("/api/v1/calendar/meetings", headers=headers)
        meets = meet_res.json()
        print(f"\nTotal Meetings: {len(meets)}")
        for m in meets:
            print(f"  - Title: {m.get('title')}")
            print(f"    Prospect: {m.get('lead_name')} | Status: {m.get('status')} | Link: {m.get('meeting_link')}")
            
        # 7. Sequences
        seq_res = await client.get("/api/v1/sequences", headers=headers)
        seqs = seq_res.json()
        print(f"\nTotal Sequences: {len(seqs)}")
        for s in seqs:
            print(f"  - Sequence: '{s.get('name')}' (Active: {s.get('is_active')}) | Steps: {len(s.get('steps', []))}")
            
        # 8. Integrations
        int_res = await client.get("/api/v1/integrations", headers=headers)
        ints = int_res.json()
        print(f"\nTotal Integrations: {len(ints)}")
        for i in ints:
            print(f"  - {i.get('provider')}: {i.get('status')} ({i.get('account_identifier')})")

if __name__ == "__main__":
    asyncio.run(test_demo_endpoints())
