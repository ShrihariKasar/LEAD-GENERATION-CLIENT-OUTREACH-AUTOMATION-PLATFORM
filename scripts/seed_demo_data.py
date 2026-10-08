import json
import uuid
import sqlite3
from datetime import datetime, timezone, timedelta
from cryptography.fernet import Fernet

ENCRYPTION_KEY = "rVvQ1-7l2aP4_k_d0Q8i6M2R9w1T5v_7y9A1c4E3G2I="

def get_fernet():
    return Fernet(ENCRYPTION_KEY.encode())

def encrypt(data_str: str) -> str:
    return get_fernet().encrypt(data_str.encode()).decode()

def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S.%f")

def run_seed():
    db_path = "threadline.db"
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    print("Seeding database:", db_path)

    # 1. Fetch all workspaces
    workspaces = c.execute("SELECT id, name FROM workspaces").fetchall()
    if not workspaces:
        print("No workspaces found!")
        return

    print(f"Found {len(workspaces)} workspaces.")

    for ws_row in workspaces:
        ws_id = ws_row[0]
        print(f"\nProcessing workspace: {ws_id} ({ws_row[1]})")

        # A. Update Workspace metadata to Threadline AI
        c.execute("""
            UPDATE workspaces
            SET name = ?,
                company_name = ?,
                website = ?,
                industry = ?,
                company_description = ?,
                product_description = ?,
                target_geography = ?,
                target_company_size = ?,
                target_decision_makers = ?,
                updated_at = ?
            WHERE id = ?
        """, (
            "Threadline RevOps",
            "Threadline AI",
            "https://threadline.ai",
            "B2B SaaS / Revenue Operations & Sales Automation",
            "Threadline AI is an autonomous B2B revenue operations platform that accelerates pipeline velocity through continuous ICP discovery, qualification, and automated multi-channel client engagement.",
            "Threadline AI is an autonomous B2B revenue operations platform that identifies high-fit prospects, executes multi-channel qualification outreach via Telegram and Email, handles objections with grounded AI reasoning, and coordinates conflict-free executive meeting scheduling.",
            "United States, Canada, United Kingdom, European Union",
            "50-500 employees",
            "VP of Engineering, CTO, Head of RevOps, VP Sales",
            utc_now(),
            ws_id
        ))

        # B. Seed / Update 7 Integrations
        now_str = utc_now()
        integrations_data = [
            (
                "OPENAI", "CONNECTED", "API_KEY",
                encrypt(json.dumps({"api_key": "sk-proj-demo-threadline-prod-key-9912", "model": "gpt-4o"})),
                json.dumps(["models.read", "chat.completions"]),
                "OpenAI API Account (org-threadline-prod)",
                "HEALTHY"
            ),
            (
                "APOLLO", "CONNECTED", "API_KEY",
                encrypt(json.dumps({"api_key": "apollo-demo-lead-discovery-key-4421"})),
                json.dumps(["people.search", "organizations.search"]),
                "Apollo API (Workspace Lead Pool)",
                "HEALTHY"
            ),
            (
                "HUNTER", "CONNECTED", "API_KEY",
                encrypt(json.dumps({"api_key": "hunter-demo-enrichment-key-8812"})),
                json.dumps(["domain_search", "email_finder", "email_verifier"]),
                "sarah.ops@threadline.ai (Verified Tier)",
                "HEALTHY"
            ),
            (
                "TELEGRAM", "CONNECTED", "BOT_TOKEN",
                encrypt(json.dumps({"bot_token": "123456789:ABCdefGhIJKlmNoPQRstuVWxyz_ThreadlineBot", "username": "ThreadlineOutreachBot"})),
                json.dumps(["bot.getMe", "bot.sendMessage", "bot.setWebhook"]),
                "@ThreadlineOutreachBot",
                "HEALTHY"
            ),
            (
                "GOOGLE_CALENDAR", "CONNECTED", "OAUTH2",
                encrypt(json.dumps({"access_token": "ya29-demo-threadline-google-oauth-token-primary", "email": "sarah.ops@threadline.ai"})),
                json.dumps(["https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/calendar.readonly"]),
                "sarah.ops@threadline.ai (primary)",
                "HEALTHY"
            ),
            (
                "LINKEDIN", "RESTRICTED", "OAUTH2",
                encrypt(json.dumps({"access_token": "aq-demo-linkedin-oauth-token-userinfo", "name": "Sarah Connor"})),
                json.dumps(["openid", "profile", "email"]),
                "Sarah Connor (LinkedIn Profile Sync)",
                "HEALTHY"
            ),
            (
                "HUBSPOT", "CONNECTED", "API_KEY",
                encrypt(json.dumps({"api_key": "pat-demo-threadline-hubspot-portal-482910"})),
                json.dumps(["crm.objects.contacts.read", "crm.objects.contacts.write"]),
                "HubSpot Portal #482910",
                "HEALTHY"
            )
        ]

        for provider, status, auth_type, enc_creds, scopes, acct_id, health in integrations_data:
            existing = c.execute("SELECT id FROM integrations WHERE workspace_id = ? AND provider = ?", (ws_id, provider)).fetchone()
            if existing:
                c.execute("""
                    UPDATE integrations
                    SET status = ?, authentication_type = ?, encrypted_credentials = ?, scopes = ?,
                        account_identifier = ?, health_status = ?, last_successful_request = ?,
                        error_message = NULL, error_code = NULL, updated_at = ?
                    WHERE id = ?
                """, (status, auth_type, enc_creds, scopes, acct_id, health, now_str, now_str, existing[0]))
            else:
                c.execute("""
                    INSERT INTO integrations (id, workspace_id, provider, status, authentication_type,
                        encrypted_credentials, scopes, account_identifier, health_status,
                        last_successful_request, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (str(uuid.uuid4()), ws_id, provider, status, auth_type, enc_creds, scopes, acct_id, health, now_str, now_str, now_str))

        # C. Seed ICP Profiles
        icp_1_id = None
        icp_2_id = None

        existing_icps = c.execute("SELECT id, name FROM icp_profiles WHERE workspace_id = ?", (ws_id,)).fetchall()
        for icp_row in existing_icps:
            if "Engineering" in icp_row[1]:
                icp_1_id = icp_row[0]
            elif "Sales" in icp_row[1] or "RevOps" in icp_row[1]:
                icp_2_id = icp_row[0]

        if not icp_1_id:
            icp_1_id = str(uuid.uuid4())
            c.execute("""
                INSERT INTO icp_profiles (
                    id, workspace_id, name, description, is_active,
                    target_industries, target_company_sizes, target_revenue_range,
                    target_geographies, target_job_titles, target_seniorities,
                    target_technologies, business_signals, negative_criteria, weights,
                    min_qualification_score, auto_qualification_threshold, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                icp_1_id, ws_id,
                "B2B SaaS Engineering & Technology Leaders",
                "High-growth software companies experiencing rapid customer scaling with manual qualification bottlenecks and high SDR turnover.",
                1,
                json.dumps(["SaaS", "Cloud Infrastructure", "Enterprise Software", "Developer Tools"]),
                json.dumps(["51-200", "201-500", "50-100"]),
                json.dumps(["$5M - $50M"]),
                json.dumps(["United States", "United Kingdom", "Canada", "Germany", "Remote"]),
                json.dumps(["VP of Engineering", "Chief Technology Officer", "Head of Infrastructure", "Director of Engineering", "VP Product"]),
                json.dumps(["VP", "C-Level", "Director", "Head"]),
                json.dumps(["PostgreSQL", "Kafka", "AWS", "Kubernetes", "Redis", "TypeScript"]),
                json.dumps(["Expanding sales engineering team", "Recent Series A/B funding", "High inbound lead volume"]),
                json.dumps({
                    "excluded_industries": ["Consumer Retail", "Higher Education", "Hospitality"],
                    "excluded_locations": ["Excluded Countries"],
                    "excluded_titles": ["Intern", "Student", "Associate"],
                    "excluded_domains": ["gmail.com", "yahoo.com", "hotmail.com"]
                }),
                json.dumps({"title": 25, "industry": 20, "company_size": 15, "geography": 15, "technology": 15, "business_signal": 10}),
                65, 80, now_str, now_str
            ))

        if not icp_2_id:
            icp_2_id = str(uuid.uuid4())
            c.execute("""
                INSERT INTO icp_profiles (
                    id, workspace_id, name, description, is_active,
                    target_industries, target_company_sizes, target_revenue_range,
                    target_geographies, target_job_titles, target_seniorities,
                    target_technologies, business_signals, negative_criteria, weights,
                    min_qualification_score, auto_qualification_threshold, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                icp_2_id, ws_id,
                "High-Growth Sales & Revenue Operations Leaders",
                "Mid-market B2B revenue and sales ops leaders seeking autonomous AI inbound triage and real-time calendar scheduling.",
                1,
                json.dumps(["Fintech", "B2B SaaS", "Artificial Intelligence", "E-commerce Infrastructure"]),
                json.dumps(["11-50", "51-200", "201-500"]),
                json.dumps(["$3M - $25M"]),
                json.dumps(["United States", "European Union", "Global"]),
                json.dumps(["VP Sales Operations", "Head of Revenue Operations", "Chief Revenue Officer", "Director of Sales Development"]),
                json.dumps(["VP", "C-Level", "Head", "Director"]),
                json.dumps(["HubSpot", "Salesforce", "Segment", "Apollo", "Stripe"]),
                json.dumps(["Hiring SDRs", "Increasing outbound volume", "CRM replatforming"]),
                json.dumps({
                    "excluded_industries": ["Real Estate Brokerage", "Solo Consulting"],
                    "excluded_locations": [],
                    "excluded_titles": ["Junior SDR", "Intern"],
                    "excluded_domains": []
                }),
                json.dumps({"title": 25, "industry": 20, "company_size": 20, "geography": 15, "technology": 10, "business_signal": 10}),
                65, 80, now_str, now_str
            ))

        # D. Seed Realistic Leads (16 diverse leads with scores, companies, and decision traces)
        leads_specs = [
            {
                "full_name": "John Davis",
                "first_name": "John",
                "last_name": "Davis",
                "job_title": "CEO & Co-Founder",
                "seniority": "C-Level",
                "company_name": "Acme Growth SaaS",
                "company_domain": "acmegrowth.io",
                "website": "https://acmegrowth.io",
                "industry": "B2B SaaS",
                "employee_count": 50,
                "location": "San Francisco, CA",
                "country": "United States",
                "email": "john.davis@acmegrowth.io",
                "telegram_identifier": "@johndavis_ceo",
                "telegram_chat_id": "tg_user_8849102",
                "telegram_opt_in_status": "OPTED_IN",
                "source": "APOLLO",
                "icp_score": 94,
                "qualification_status": "QUALIFIED",
                "lead_status": "MEETING_SCHEDULED",
                "outreach_status": "REPLIED",
                "buying_intent": "HIGH",
                "next_best_action": "Meeting confirmed on Google Calendar for Wednesday at 3:00 PM UTC.",
                "ai_summary": "The prospect is the founder of a 50-person SaaS company handling 400-500 inbound leads/mo. Facing critical SDR qualification bottlenecks. High buying intent; accepted Wednesday 3 PM meeting invitation.",
                "matched_criteria": ["Industry: B2B SaaS (Exact Match)", "Title: CEO & Co-Founder (Executive Decision Maker)", "Company Size: 50 employees (Target Bracket)", "Location: United States", "Signal: Expanding sales team & high inbound volume"],
                "failed_criteria": [],
                "icp_id": icp_1_id
            },
            {
                "full_name": "Elena Rostova",
                "first_name": "Elena",
                "last_name": "Rostova",
                "job_title": "VP of Engineering",
                "seniority": "VP",
                "company_name": "CloudScale Dynamics",
                "company_domain": "cloudscale.io",
                "website": "https://cloudscale.io",
                "industry": "Cloud Infrastructure",
                "employee_count": 140,
                "location": "New York, NY",
                "country": "United States",
                "email": "elena.rostova@cloudscale.io",
                "telegram_identifier": "@elena_tech",
                "telegram_chat_id": "tg_user_3948172",
                "telegram_opt_in_status": "OPTED_IN",
                "source": "APOLLO",
                "icp_score": 92,
                "qualification_status": "QUALIFIED",
                "lead_status": "ENGAGED",
                "outreach_status": "REPLIED",
                "buying_intent": "HIGH",
                "next_best_action": "Continue active technical discovery on inbound latency overhead.",
                "ai_summary": "VP Engineering at a 140-person Cloud Infrastructure scale-up. Evaluated multi-region cluster data ingestion. Actively engaged over Telegram regarding lead response latency.",
                "matched_criteria": ["Title: VP of Engineering", "Industry: Cloud Infrastructure", "Company Size: 140 (Target 51-200)", "Tech: Kubernetes, Kafka"],
                "failed_criteria": [],
                "icp_id": icp_1_id
            },
            {
                "full_name": "Emily Watson",
                "first_name": "Emily",
                "last_name": "Watson",
                "job_title": "Chief Revenue Officer",
                "seniority": "C-Level",
                "company_name": "Apex Commerce",
                "company_domain": "apexcommerce.com",
                "website": "https://apexcommerce.com",
                "industry": "E-commerce Infrastructure",
                "employee_count": 220,
                "location": "San Francisco, CA",
                "country": "United States",
                "email": "emily.watson@apexcommerce.com",
                "telegram_identifier": "@emily_rev",
                "telegram_chat_id": "tg_user_6672819",
                "telegram_opt_in_status": "OPTED_IN",
                "source": "APOLLO",
                "icp_score": 89,
                "qualification_status": "QUALIFIED",
                "lead_status": "QUALIFIED",
                "outreach_status": "REPLIED",
                "buying_intent": "HIGH",
                "next_best_action": "Dispatched executive case study and proposed calendar invitation.",
                "ai_summary": "CRO overseeing 35 SDRs. Identified outbound capacity ceiling and slow lead triage as primary Q3 friction points.",
                "matched_criteria": ["Title: Chief Revenue Officer", "Company Size: 220", "Industry: E-commerce Infrastructure", "Signal: Scaling outbound SDR team"],
                "failed_criteria": [],
                "icp_id": icp_2_id
            },
            {
                "full_name": "Marcus Vance",
                "first_name": "Marcus",
                "last_name": "Vance",
                "job_title": "Chief Technology Officer",
                "seniority": "C-Level",
                "company_name": "NexaCorp Systems",
                "company_domain": "nexacorp.com",
                "website": "https://nexacorp.com",
                "industry": "Enterprise Software",
                "employee_count": 310,
                "location": "Austin, TX",
                "country": "United States",
                "email": "marcus.vance@nexacorp.com",
                "telegram_identifier": "@marcus_cto",
                "telegram_opt_in_status": "NOT_OPTED_IN",
                "source": "APOLLO",
                "icp_score": 88,
                "qualification_status": "QUALIFIED",
                "lead_status": "RESEARCHING",
                "outreach_status": "ENROLLED",
                "buying_intent": "MEDIUM",
                "next_best_action": "Enrolled in B2B SaaS Inbound Fast-Track Cadence (Step 1 scheduled).",
                "ai_summary": "CTO at 310-person enterprise software platform. Excellent technological and firmographic match.",
                "matched_criteria": ["Title: CTO", "Industry: Enterprise Software", "Geography: United States"],
                "failed_criteria": [],
                "icp_id": icp_1_id
            },
            {
                "full_name": "Priya Sharma",
                "first_name": "Priya",
                "last_name": "Sharma",
                "job_title": "Head of Revenue Operations",
                "seniority": "Head",
                "company_name": "FinFlow Technologies",
                "company_domain": "finflow.tech",
                "website": "https://finflow.tech",
                "industry": "Fintech",
                "employee_count": 85,
                "location": "Boston, MA",
                "country": "United States",
                "email": "priya.sharma@finflow.tech",
                "telegram_identifier": "@priya_revops",
                "telegram_opt_in_status": "OPTED_IN",
                "source": "APOLLO",
                "icp_score": 85,
                "qualification_status": "QUALIFIED",
                "lead_status": "CONTACTED",
                "outreach_status": "ACTIVE",
                "buying_intent": "MEDIUM",
                "next_best_action": "Awaiting prospect response to initial qualification inquiry.",
                "ai_summary": "Head of RevOps managing HubSpot CRM synchronization and inbound routing.",
                "matched_criteria": ["Title: Head of Revenue Operations", "Industry: Fintech", "Company Size: 85"],
                "failed_criteria": [],
                "icp_id": icp_2_id
            },
            {
                "full_name": "David Chen",
                "first_name": "David",
                "last_name": "Chen",
                "job_title": "Director of Engineering",
                "seniority": "Director",
                "company_name": "DataMesh Labs",
                "company_domain": "datamesh.dev",
                "website": "https://datamesh.dev",
                "industry": "Developer Tools",
                "employee_count": 65,
                "location": "Seattle, WA",
                "country": "United States",
                "email": "david.chen@datamesh.dev",
                "telegram_identifier": "@dchen_eng",
                "telegram_opt_in_status": "NOT_OPTED_IN",
                "source": "APOLLO",
                "icp_score": 82,
                "qualification_status": "QUALIFIED",
                "lead_status": "NEW",
                "outreach_status": "IDLE",
                "buying_intent": "UNKNOWN",
                "next_best_action": "Ready for automated sequence enrollment.",
                "ai_summary": "Engineering Director at DevTools platform. Matches target sizing and tech stack requirements.",
                "matched_criteria": ["Title: Director of Engineering", "Industry: Developer Tools", "Size: 65"],
                "failed_criteria": [],
                "icp_id": icp_1_id
            },
            {
                "full_name": "Sophia Laurent",
                "first_name": "Sophia",
                "last_name": "Laurent",
                "job_title": "VP Sales Development",
                "seniority": "VP",
                "company_name": "OmniChannel AI",
                "company_domain": "omnichannel.ai",
                "website": "https://omnichannel.ai",
                "industry": "Artificial Intelligence",
                "employee_count": 45,
                "location": "Chicago, IL",
                "country": "United States",
                "email": "sophia.laurent@omnichannel.ai",
                "telegram_identifier": "@sophia_omni",
                "telegram_opt_in_status": "NOT_OPTED_IN",
                "source": "APOLLO",
                "icp_score": 74,
                "qualification_status": "POTENTIAL",
                "lead_status": "NEW",
                "outreach_status": "IDLE",
                "buying_intent": "UNKNOWN",
                "next_best_action": "Evaluate team size readiness before executive outreach.",
                "ai_summary": "VP Sales Development at early-stage AI firm (45 employees). High title match; slightly below 50-person preferred band.",
                "matched_criteria": ["Title: VP Sales Development", "Industry: AI", "Location: US"],
                "failed_criteria": ["Company Size: 45 (Preferred 50+)"],
                "icp_id": icp_2_id
            },
            {
                "full_name": "Thomas Wright",
                "first_name": "Thomas",
                "last_name": "Wright",
                "job_title": "Head of Infrastructure",
                "seniority": "Head",
                "company_name": "ScaleStream",
                "company_domain": "scalestream.ca",
                "website": "https://scalestream.ca",
                "industry": "Cloud Infrastructure",
                "employee_count": 180,
                "location": "Toronto, ON",
                "country": "Canada",
                "email": "thomas.wright@scalestream.ca",
                "telegram_identifier": "@twright_ops",
                "telegram_opt_in_status": "NOT_OPTED_IN",
                "source": "APOLLO",
                "icp_score": 72,
                "qualification_status": "POTENTIAL",
                "lead_status": "NEW",
                "outreach_status": "IDLE",
                "buying_intent": "UNKNOWN",
                "next_best_action": "Verify Canadian data residency compliance before outreach.",
                "ai_summary": "Head of Infrastructure in Canada. Strong technological overlap.",
                "matched_criteria": ["Title: Head of Infrastructure", "Company Size: 180", "Industry: Cloud Infrastructure"],
                "failed_criteria": [],
                "icp_id": icp_1_id
            },
            {
                "full_name": "Laura Martinez",
                "first_name": "Laura",
                "last_name": "Martinez",
                "job_title": "Director of Revenue Enablement",
                "seniority": "Director",
                "company_name": "HyperScale Solutions",
                "company_domain": "hyperscale.co",
                "website": "https://hyperscale.co",
                "industry": "SaaS",
                "employee_count": 95,
                "location": "Denver, CO",
                "country": "United States",
                "email": "laura.martinez@hyperscale.co",
                "telegram_identifier": "@lmartinez_growth",
                "telegram_opt_in_status": "NOT_OPTED_IN",
                "source": "APOLLO",
                "icp_score": 68,
                "qualification_status": "POTENTIAL",
                "lead_status": "NEW",
                "outreach_status": "IDLE",
                "buying_intent": "UNKNOWN",
                "next_best_action": "Initial email discovery touchpoint queued.",
                "ai_summary": "Director of Revenue Enablement. Title is secondary influencer rather than primary budget authority.",
                "matched_criteria": ["Industry: SaaS", "Company Size: 95", "Location: US"],
                "failed_criteria": ["Decision Authority: Indirect Buyer"],
                "icp_id": icp_2_id
            },
            {
                "full_name": "Alex Mercer",
                "first_name": "Alex",
                "last_name": "Mercer",
                "job_title": "VP Engineering",
                "seniority": "VP",
                "company_name": "CyberDefense Pro",
                "company_domain": "cyberdefense.pro",
                "website": "https://cyberdefense.pro",
                "industry": "Enterprise Software",
                "employee_count": 120,
                "location": "London",
                "country": "United Kingdom",
                "email": "alex.mercer@cyberdefense.pro",
                "telegram_identifier": "@amercer_sec",
                "telegram_opt_in_status": "NOT_OPTED_IN",
                "source": "APOLLO",
                "icp_score": 65,
                "qualification_status": "POTENTIAL",
                "lead_status": "NEW",
                "outreach_status": "IDLE",
                "buying_intent": "LOW",
                "next_best_action": "Queue GDPR-compliant email touchpoint.",
                "ai_summary": "VP Engineering at UK cyber firm. Fits technical profile but slower procurement cycle.",
                "matched_criteria": ["Title: VP Engineering", "Size: 120"],
                "failed_criteria": ["Geography: UK (Procurement Lag)"],
                "icp_id": icp_1_id
            },
            {
                "full_name": "Vikram Patel",
                "first_name": "Vikram",
                "last_name": "Patel",
                "job_title": "Head of Product & Growth",
                "seniority": "Head",
                "company_name": "MetricPulse",
                "company_domain": "metricpulse.io",
                "website": "https://metricpulse.io",
                "industry": "Developer Tools",
                "employee_count": 35,
                "location": "San Jose, CA",
                "country": "United States",
                "email": "vikram.patel@metricpulse.io",
                "telegram_identifier": "@vikram_metric",
                "telegram_opt_in_status": "NOT_OPTED_IN",
                "source": "APOLLO",
                "icp_score": 62,
                "qualification_status": "POTENTIAL",
                "lead_status": "NEW",
                "outreach_status": "IDLE",
                "buying_intent": "UNKNOWN",
                "next_best_action": "Monitor growth milestones.",
                "ai_summary": "Product & Growth leader at 35-person seed stage venture.",
                "matched_criteria": ["Title: Head of Product", "Industry: DevTools"],
                "failed_criteria": ["Company Size: 35 (Below 50 threshold)"],
                "icp_id": icp_1_id
            },
            {
                "full_name": "Sarah Jenkins",
                "first_name": "Sarah",
                "last_name": "Jenkins",
                "job_title": "Operations Lead",
                "seniority": "Senior",
                "company_name": "AgilePulse",
                "company_domain": "agilepulse.io",
                "website": "https://agilepulse.io",
                "industry": "SaaS",
                "employee_count": 28,
                "location": "Atlanta, GA",
                "country": "United States",
                "email": "sarah.jenkins@agilepulse.io",
                "telegram_identifier": "@sjenkins_agile",
                "telegram_opt_in_status": "NOT_OPTED_IN",
                "source": "APOLLO",
                "icp_score": 48,
                "qualification_status": "NOT_QUALIFIED",
                "lead_status": "NOT_QUALIFIED",
                "outreach_status": "IDLE",
                "buying_intent": "LOW",
                "next_best_action": "Do not enroll in active outreach. Insufficient decision-making authority.",
                "ai_summary": "Operations Lead at small 28-person team. Lacks executive purchasing budget.",
                "matched_criteria": ["Industry: SaaS"],
                "failed_criteria": ["Title: Operations Lead (Non-Executive)", "Company Size: 28 (Below 50)"],
                "icp_id": icp_1_id
            },
            {
                "full_name": "Robert Miller",
                "first_name": "Robert",
                "last_name": "Miller",
                "job_title": "Founder & Principal",
                "seniority": "Founder",
                "company_name": "Miller IT Consulting",
                "company_domain": "millerconsulting.net",
                "website": "https://millerconsulting.net",
                "industry": "IT Services",
                "employee_count": 4,
                "location": "Portland, OR",
                "country": "United States",
                "email": "robert.miller@millerconsulting.net",
                "telegram_identifier": "@rmiller_biz",
                "telegram_opt_in_status": "NOT_OPTED_IN",
                "source": "CSV_IMPORT",
                "icp_score": 42,
                "qualification_status": "NOT_QUALIFIED",
                "lead_status": "NOT_QUALIFIED",
                "outreach_status": "IDLE",
                "buying_intent": "LOW",
                "next_best_action": "Disqualified. Boutique agency without sales engineering pipeline.",
                "ai_summary": "Boutique 4-person consulting practice. Disqualified due to company size below ICP minimum.",
                "matched_criteria": ["Title: Founder"],
                "failed_criteria": ["Company Size: 4 (Negative Criteria)", "Industry: IT Services"],
                "icp_id": icp_1_id
            },
            {
                "full_name": "Kevin O'Connor",
                "first_name": "Kevin",
                "last_name": "O'Connor",
                "job_title": "Managing Partner",
                "seniority": "Executive",
                "company_name": "O'Connor Legal Partners",
                "company_domain": "oconnorlegal.com",
                "website": "https://oconnorlegal.com",
                "industry": "Legal Services",
                "employee_count": 18,
                "location": "Chicago, IL",
                "country": "United States",
                "email": "kevin.oconnor@oconnorlegal.com",
                "telegram_identifier": "@koconnor_law",
                "telegram_opt_in_status": "NOT_OPTED_IN",
                "source": "CSV_IMPORT",
                "icp_score": 28,
                "qualification_status": "NOT_QUALIFIED",
                "lead_status": "NOT_QUALIFIED",
                "outreach_status": "IDLE",
                "buying_intent": "LOW",
                "next_best_action": "Disqualified. Out-of-scope industry.",
                "ai_summary": "Legal partnership. Zero technological alignment or B2B software sales process.",
                "matched_criteria": [],
                "failed_criteria": ["Industry: Legal Services (Non-Target)", "Tech Stack: No SaaS Stack"],
                "icp_id": icp_2_id
            },
            {
                "full_name": "Carlos Mendez",
                "first_name": "Carlos",
                "last_name": "Mendez",
                "job_title": "Facilities Director",
                "seniority": "Director",
                "company_name": "Global Logistics Hub",
                "company_domain": "globallogistics.com",
                "website": "https://globallogistics.com",
                "industry": "Logistics & Supply Chain",
                "employee_count": 850,
                "location": "Miami, FL",
                "country": "United States",
                "email": "carlos.mendez@globallogistics.com",
                "telegram_identifier": "@cmendez_log",
                "telegram_opt_in_status": "NOT_OPTED_IN",
                "source": "CSV_IMPORT",
                "icp_score": 22,
                "qualification_status": "NOT_QUALIFIED",
                "lead_status": "NOT_QUALIFIED",
                "outreach_status": "IDLE",
                "buying_intent": "LOW",
                "next_best_action": "Disqualified. Non-target function and traditional industrial sector.",
                "ai_summary": "Facilities Director in logistics. Unrelated to revenue operations or software engineering.",
                "matched_criteria": [],
                "failed_criteria": ["Industry: Logistics (Non-Target)", "Function: Facilities (Non-Target)"],
                "icp_id": icp_1_id
            },
            {
                "full_name": "Hannah Abbott",
                "first_name": "Hannah",
                "last_name": "Abbott",
                "job_title": "Junior Developer Intern",
                "seniority": "Intern",
                "company_name": "CampusTech Academy",
                "company_domain": "campustech.edu",
                "website": "https://campustech.edu",
                "industry": "Higher Education",
                "employee_count": 450,
                "location": "Columbus, OH",
                "country": "United States",
                "email": "hannah.abbott@campustech.edu",
                "telegram_identifier": "@hannah_dev",
                "telegram_opt_in_status": "NOT_OPTED_IN",
                "source": "CSV_IMPORT",
                "icp_score": 12,
                "qualification_status": "NOT_QUALIFIED",
                "lead_status": "NOT_QUALIFIED",
                "outreach_status": "IDLE",
                "buying_intent": "LOW",
                "next_best_action": "Disqualified automatically by negative criteria filter.",
                "ai_summary": "Junior intern in higher education. Triggered negative criteria filter (excluded title & excluded industry).",
                "matched_criteria": [],
                "failed_criteria": ["Negative Filter: Excluded title 'intern'", "Negative Filter: Excluded industry 'Higher Education'"],
                "icp_id": icp_1_id
            }
        ]

        # Insert or update each lead
        john_lead_id = None
        elena_lead_id = None

        for spec in leads_specs:
            # Check if lead already exists by email
            existing_lead = c.execute("SELECT id FROM leads WHERE workspace_id = ? AND email = ?", (ws_id, spec["email"])).fetchone()
            if existing_lead:
                lead_id = existing_lead[0]
                c.execute("""
                    UPDATE leads
                    SET full_name = ?, first_name = ?, last_name = ?, job_title = ?, seniority = ?,
                        company_name = ?, company_domain = ?, website = ?, industry = ?,
                        employee_count = ?, location = ?, country = ?, telegram_identifier = ?,
                        telegram_chat_id = ?, telegram_opt_in_status = ?, source = ?, icp_score = ?,
                        qualification_status = ?, lead_status = ?, outreach_status = ?, buying_intent = ?,
                        next_best_action = ?, ai_summary = ?, icp_profile_id = ?, email_status = 'VERIFIED',
                        do_not_contact = ?, updated_at = ?
                    WHERE id = ?
                """, (
                    spec["full_name"], spec["first_name"], spec["last_name"], spec["job_title"], spec["seniority"],
                    spec["company_name"], spec["company_domain"], spec["website"], spec["industry"],
                    spec["employee_count"], spec["location"], spec["country"], spec["telegram_identifier"],
                    spec.get("telegram_chat_id"), spec["telegram_opt_in_status"], spec["source"], spec["icp_score"],
                    spec["qualification_status"], spec["lead_status"], spec["outreach_status"], spec["buying_intent"],
                    spec["next_best_action"], spec["ai_summary"], spec["icp_id"], 1 if spec["qualification_status"] == "NOT_QUALIFIED" and spec["icp_score"] < 25 else 0,
                    now_str, lead_id
                ))
            else:
                lead_id = str(uuid.uuid4())
                c.execute("""
                    INSERT INTO leads (
                        id, workspace_id, full_name, first_name, last_name, job_title, seniority,
                        company_name, company_domain, website, industry, employee_count, location, country,
                        email, email_status, telegram_identifier, telegram_chat_id, telegram_opt_in_status,
                        source, icp_score, qualification_status, lead_status, outreach_status, buying_intent,
                        next_best_action, ai_summary, icp_profile_id, do_not_contact, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    lead_id, ws_id, spec["full_name"], spec["first_name"], spec["last_name"], spec["job_title"], spec["seniority"],
                    spec["company_name"], spec["company_domain"], spec["website"], spec["industry"], spec["employee_count"], spec["location"], spec["country"],
                    spec["email"], "VERIFIED", spec["telegram_identifier"], spec.get("telegram_chat_id"), spec["telegram_opt_in_status"],
                    spec["source"], spec["icp_score"], spec["qualification_status"], spec["lead_status"], spec["outreach_status"], spec["buying_intent"],
                    spec["next_best_action"], spec["ai_summary"], spec["icp_id"],
                    1 if spec["qualification_status"] == "NOT_QUALIFIED" and spec["icp_score"] < 25 else 0,
                    now_str, now_str
                ))

            if spec["full_name"] == "John Davis":
                john_lead_id = lead_id
            elif spec["full_name"] == "Elena Rostova":
                elena_lead_id = lead_id

            # Add LeadScore record
            c.execute("DELETE FROM lead_scores WHERE lead_id = ?", (lead_id,))
            c.execute("""
                INSERT INTO lead_scores (
                    id, lead_id, icp_profile_id, score, confidence,
                    matched_criteria, failed_criteria, unknown_criteria,
                    breakdown, explanation, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                str(uuid.uuid4()), lead_id, spec["icp_id"], spec["icp_score"], 0.95,
                json.dumps(spec["matched_criteria"]), json.dumps(spec["failed_criteria"]), json.dumps([]),
                json.dumps({"fit_percentage": spec["icp_score"], "tier": spec["qualification_status"]}),
                f"Evaluation score {spec['icp_score']}/100. Categorized as {spec['qualification_status']}. " +
                ("Meets core industry, sizing, and decision authority requirements." if spec["icp_score"] >= 65 else "Fails one or more mandatory ICP criteria filters."),
                now_str
            ))

            # Add LeadEnrichment record
            c.execute("DELETE FROM lead_enrichments WHERE lead_id = ?", (lead_id,))
            c.execute("""
                INSERT INTO lead_enrichments (id, lead_id, field_name, old_value, new_value, source, confidence, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                str(uuid.uuid4()), lead_id, "email_deliverability", "UNKNOWN", "VERIFIED (0.01% bounce probability)", "hunter", 0.99, now_str
            ))
            c.execute("""
                INSERT INTO lead_enrichments (id, lead_id, field_name, old_value, new_value, source, confidence, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                str(uuid.uuid4()), lead_id, "company_headcount", None, f"{spec['employee_count']} verified employees", "apollo", 0.94, now_str
            ))

        # E. Seed Sequences
        existing_seq = c.execute("SELECT id FROM outreach_sequences WHERE workspace_id = ? AND name = ?", (ws_id, "B2B SaaS Inbound Fast-Track Cadence")).fetchone()
        if not existing_seq:
            seq_1_id = str(uuid.uuid4())
            c.execute("""
                INSERT INTO outreach_sequences (id, workspace_id, name, description, is_active, trigger_type, min_icp_score, stop_conditions, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                seq_1_id, ws_id,
                "B2B SaaS Inbound Fast-Track Cadence",
                "Automated 3-step outreach sequence: initial personalized Telegram touchpoint, 48h follow-up, and fallback email closing note. Automatically stops upon prospect response or calendar booking.",
                1, "ICP_SCORE_THRESHOLD", 80,
                json.dumps(["REPLIED", "MEETING_BOOKED", "OPTED_OUT", "HUMAN_TAKEOVER"]),
                now_str, now_str
            ))

            # Steps
            c.execute("""
                INSERT INTO sequence_steps (id, sequence_id, step_number, channel, delay_hours, condition_rule, template_content, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                str(uuid.uuid4()), seq_1_id, 1, "TELEGRAM", 0, "ALWAYS",
                "Hi {{first_name}}, I noticed that your company is expanding its sales team. We work with companies looking to automate their lead qualification process. Is this something your team is currently exploring?",
                now_str
            ))
            c.execute("""
                INSERT INTO sequence_steps (id, sequence_id, step_number, channel, delay_hours, condition_rule, template_content, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                str(uuid.uuid4()), seq_1_id, 2, "TELEGRAM", 48, "IF_NO_REPLY",
                "Hi {{first_name}}, following up on my previous note. We recently helped a team in your space cut response latency by 85% and boost pipeline by 40%. Would you be open to a quick 10-minute overview?",
                now_str
            ))
            c.execute("""
                INSERT INTO sequence_steps (id, sequence_id, step_number, channel, delay_hours, condition_rule, template_content, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                str(uuid.uuid4()), seq_1_id, 3, "EMAIL", 72, "IF_NO_REPLY",
                "Hi {{first_name}}, just checking in one last time regarding {{company}}'s lead qualification workflow. Let me know if you'd like to revisit this next quarter.",
                now_str
            ))

        # Second Sequence
        existing_seq2 = c.execute("SELECT id FROM outreach_sequences WHERE workspace_id = ? AND name = ?", (ws_id, "Executive RevOps Infrastructure Outreach")).fetchone()
        if not existing_seq2:
            seq_2_id = str(uuid.uuid4())
            c.execute("""
                INSERT INTO outreach_sequences (id, workspace_id, name, description, is_active, trigger_type, min_icp_score, stop_conditions, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                seq_2_id, ws_id,
                "Executive RevOps Infrastructure Outreach",
                "Direct executive cadence for Heads of RevOps and Chief Revenue Officers focusing on SDR capacity scaling and CRM sync automation.",
                1, "MANUAL", 75,
                json.dumps(["REPLIED", "MEETING_BOOKED", "OPTED_OUT"]),
                now_str, now_str
            ))
            c.execute("""
                INSERT INTO sequence_steps (id, sequence_id, step_number, channel, delay_hours, condition_rule, template_content, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                str(uuid.uuid4()), seq_2_id, 1, "EMAIL", 0, "ALWAYS",
                "Hi {{first_name}}, noticed {{company}}'s recent expansion. We help B2B SaaS revenue leaders automate qualified lead triage directly into CRM pipelines.",
                now_str
            ))
            c.execute("""
                INSERT INTO sequence_steps (id, sequence_id, step_number, channel, delay_hours, condition_rule, template_content, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                str(uuid.uuid4()), seq_2_id, 2, "EMAIL", 48, "IF_NO_REPLY",
                "Hi {{first_name}}, quick follow-up: wanted to share how similar teams reduced SDR qualification overhead while maintaining 95%+ ICP accuracy.",
                now_str
            ))

        # F. Complete AI Conversations matching the PDF Prompt!
        if john_lead_id:
            # Delete old conversations for John to ensure clean state
            c.execute("DELETE FROM conversations WHERE lead_id = ?", (john_lead_id,))

            john_conv_id = str(uuid.uuid4())
            time_base = datetime.now(timezone.utc) - timedelta(hours=3)

            c.execute("""
                INSERT INTO conversations (
                    id, workspace_id, lead_id, channel, state, ai_paused,
                    last_message_at, last_intent, context_data, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                john_conv_id, ws_id, john_lead_id, "TELEGRAM", "MEETING_SCHEDULED", 0,
                utc_now(), "MEETING_REQUEST",
                json.dumps({
                    "known_facts": {
                        "company_name": "Acme Growth SaaS",
                        "team_size": "50-person SaaS company",
                        "monthly_lead_volume": "400 to 500 inbound leads/month",
                        "primary_challenge": "SDR team struggles to qualify and respond within minutes",
                        "meeting_slot": "Wednesday at 3:00 PM UTC"
                    },
                    "objections": [],
                    "buying_signals": [
                        "currently looking at some options",
                        "400-500 inbound volume",
                        "struggles with lead qualification latency",
                        "Wednesday at 3 PM works"
                    ],
                    "asked_questions": [
                        "current_lead_volume",
                        "qualification_challenge",
                        "meeting_availability"
                    ],
                    "proposed_slots": [
                        "Tuesday at 11:00 AM",
                        "Wednesday at 3:00 PM"
                    ]
                }),
                time_base.strftime("%Y-%m-%d %H:%M:%S.%f"),
                utc_now()
            ))

            # Dialogue messages matching the PDF verbatim!
            dialogue = [
                (
                    "AI", "OUTBOUND",
                    "Hi John, I noticed that your company is expanding its sales team. We work with companies looking to automate their lead qualification process. Is this something your team is currently exploring?",
                    time_base + timedelta(minutes=0)
                ),
                (
                    "PROSPECT", "INBOUND",
                    "Yes, we're currently looking at some options.",
                    time_base + timedelta(minutes=22)
                ),
                (
                    "AI", "OUTBOUND",
                    "Great. To understand whether it would be relevant, approximately how many leads does your team handle each month?",
                    time_base + timedelta(minutes=23)
                ),
                (
                    "PROSPECT", "INBOUND",
                    "We handle around 400 to 500 inbound leads each month, but our SDR team struggles to qualify and respond within minutes.",
                    time_base + timedelta(minutes=45)
                ),
                (
                    "AI", "OUTBOUND",
                    "That's a significant volume. Our autonomous pipeline qualifies leads in under 60 seconds over Telegram and syncs directly with your CRM. Would you prefer a 30-minute call? I have availability on Tuesday at 11:00 AM or Wednesday at 3:00 PM.",
                    time_base + timedelta(minutes=46)
                ),
                (
                    "PROSPECT", "INBOUND",
                    "Wednesday at 3 PM works.",
                    time_base + timedelta(minutes=78)
                ),
                (
                    "AI", "OUTBOUND",
                    "Confirmed! I've scheduled a 30-minute discovery call for Wednesday at 3:00 PM UTC and sent a calendar invite with the Google Meet link to your email (john.davis@acmegrowth.io). Looking forward to speaking then!",
                    time_base + timedelta(minutes=79)
                )
            ]

            for sender_type, direction, content, msg_time in dialogue:
                c.execute("""
                    INSERT INTO messages (
                        id, conversation_id, sender_type, direction, channel,
                        content, delivery_status, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    str(uuid.uuid4()), john_conv_id, sender_type, direction, "TELEGRAM",
                    content, "SENT" if direction == "OUTBOUND" else "RECEIVED",
                    msg_time.strftime("%Y-%m-%d %H:%M:%S.%f")
                ))

            # Qualification answers for John
            c.execute("""
                INSERT INTO qualification_answers (
                    id, conversation_id, lead_id, question_key, question_text,
                    extracted_answer, signal_type, confidence, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                str(uuid.uuid4()), john_conv_id, john_lead_id,
                "current_volume", "Approximately how many leads does your team handle each month?",
                "400 to 500 inbound leads each month", "NEED", 0.98, "ANSWERED", now_str
            ))
            c.execute("""
                INSERT INTO qualification_answers (
                    id, conversation_id, lead_id, question_key, question_text,
                    extracted_answer, signal_type, confidence, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                str(uuid.uuid4()), john_conv_id, john_lead_id,
                "qualification_bottleneck", "What is your team's primary friction point with lead response?",
                "SDR team struggles to qualify and respond within minutes (inbound leakage)", "PAIN_POINT", 0.99, "ANSWERED", now_str
            ))
            c.execute("""
                INSERT INTO qualification_answers (
                    id, conversation_id, lead_id, question_key, question_text,
                    extracted_answer, signal_type, confidence, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                str(uuid.uuid4()), john_conv_id, john_lead_id,
                "meeting_slot_preference", "Would you prefer Tuesday at 11:00 AM or Wednesday at 3:00 PM?",
                "Wednesday at 3 PM works", "TIMELINE", 1.0, "ANSWERED", now_str
            ))

            # G. Confirmed Meeting for John Davis
            c.execute("DELETE FROM meetings WHERE lead_id = ?", (john_lead_id,))
            # Next Wednesday at 15:00 UTC
            today = datetime.now(timezone.utc)
            days_ahead = (2 - today.weekday()) % 7  # 2 is Wednesday
            if days_ahead <= 0:
                days_ahead += 7
            next_wed = today + timedelta(days=days_ahead)
            meeting_start = next_wed.replace(hour=15, minute=0, second=0, microsecond=0)
            meeting_end = meeting_start + timedelta(minutes=30)

            c.execute("""
                INSERT INTO meetings (
                    id, workspace_id, lead_id, calendar_id, provider_event_id,
                    title, description, start_at, end_at, timezone,
                    attendees, meeting_link, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                str(uuid.uuid4()), ws_id, john_lead_id, "primary", f"gcal_evt_{uuid.uuid4().hex[:12]}",
                "Threadline AI x Acme Growth — Autonomous Lead Qualification Discovery",
                "Executive discovery and platform demonstration with John Davis (CEO @ Acme Growth SaaS). Topics: 400-500 leads/mo volume automation, Telegram qualification chatbot, and CRM bi-directional sync.",
                meeting_start.strftime("%Y-%m-%d %H:%M:%S.%f"),
                meeting_end.strftime("%Y-%m-%d %H:%M:%S.%f"),
                "UTC",
                json.dumps(["sarah.ops@threadline.ai", "john.davis@acmegrowth.io"]),
                "https://meet.google.com/thrd-acme-meet",
                "CONFIRMED",
                now_str, now_str
            ))

        # Also seed active discovery conversation for Elena Rostova
        if elena_lead_id:
            c.execute("DELETE FROM conversations WHERE lead_id = ?", (elena_lead_id,))
            elena_conv_id = str(uuid.uuid4())
            elena_time = datetime.now(timezone.utc) - timedelta(hours=1)

            c.execute("""
                INSERT INTO conversations (
                    id, workspace_id, lead_id, channel, state, ai_paused,
                    last_message_at, last_intent, context_data, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                elena_conv_id, ws_id, elena_lead_id, "TELEGRAM", "ENGAGED", 0,
                utc_now(), "QUESTION",
                json.dumps({
                    "known_facts": {"role": "VP Engineering", "company": "CloudScale Dynamics", "stack": "Kubernetes"},
                    "buying_signals": ["manual review with forms", "latency is a headache"]
                }),
                elena_time.strftime("%Y-%m-%d %H:%M:%S.%f"),
                utc_now()
            ))

            c.execute("""
                INSERT INTO messages (id, conversation_id, sender_type, direction, channel, content, delivery_status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                str(uuid.uuid4()), elena_conv_id, "AI", "OUTBOUND", "TELEGRAM",
                "Hi Elena, noticed CloudScale's recent infrastructure expansion into multi-region clusters. Are you currently handling lead qualification and data ingestion manually or via automated pipelines?",
                "SENT", elena_time.strftime("%Y-%m-%d %H:%M:%S.%f")
            ))
            c.execute("""
                INSERT INTO messages (id, conversation_id, sender_type, direction, channel, content, delivery_status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                str(uuid.uuid4()), elena_conv_id, "PROSPECT", "INBOUND", "TELEGRAM",
                "Hey! We're mostly using manual SDR review with HubSpot forms right now, but latency is a headache.",
                "RECEIVED", (elena_time + timedelta(minutes=15)).strftime("%Y-%m-%d %H:%M:%S.%f")
            ))
            c.execute("""
                INSERT INTO messages (id, conversation_id, sender_type, direction, channel, content, delivery_status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                str(uuid.uuid4()), elena_conv_id, "AI", "OUTBOUND", "TELEGRAM",
                "Understood. That lag typically costs 30-40% in pipeline conversion. How many inbound requests is your team processing per week?",
                "SENT", (elena_time + timedelta(minutes=16)).strftime("%Y-%m-%d %H:%M:%S.%f")
            ))

        # H. Audit Logs
        audit_events = [
            ("lead_discovered", "APOLLO", "LEAD", john_lead_id, {"source": "apollo", "search_query": "SaaS Founders"}),
            ("icp_scored", "AI", "LEAD", john_lead_id, {"score": 94, "status": "QUALIFIED"}),
            ("enrichment_completed", "INTEGRATION", "LEAD", john_lead_id, {"provider": "hunter", "verified_email": True}),
            ("sequence_enrolled", "SYSTEM", "SEQUENCE", None, {"sequence_name": "B2B SaaS Inbound Fast-Track Cadence"}),
            ("outreach_dispatched", "AI", "CONVERSATION", john_conv_id if john_lead_id else None, {"channel": "TELEGRAM"}),
            ("prospect_replied", "PROSPECT", "CONVERSATION", john_conv_id if john_lead_id else None, {"channel": "TELEGRAM", "intent": "INTERESTED"}),
            ("ai_qualification_updated", "AI", "CONVERSATION", john_conv_id if john_lead_id else None, {"qualification_status": "QUALIFIED", "buying_intent": "HIGH"}),
            ("meeting_scheduled", "AI", "MEETING", None, {"title": "Discovery Call", "slot": "Wednesday at 3 PM UTC"})
        ]
        for action, actor, ent_type, ent_id, meta in audit_events:
            c.execute("""
                INSERT INTO audit_logs (id, workspace_id, actor_type, actor_id, entity_type, entity_id, action, metadata_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                str(uuid.uuid4()), ws_id, actor, "threadline_engine", ent_type, ent_id, action, json.dumps(meta), now_str
            ))

    conn.commit()
    conn.close()
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    run_seed()
