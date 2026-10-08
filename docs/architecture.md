# THREADLINE — System Architecture

## 1. Overview & Core Philosophy
THREADLINE is an enterprise-grade AI Lead Generation & Client Outreach Automation platform designed for revenue operations teams. It manages the complete lifecycle from market signal discovery to confirmed calendar meetings without fabricated data, mock numbers, or ungrounded AI claims.

```
+-------------------------------------------------------------------------------+
|                             THREADLINE CLIENT                                  |
|            (React 19 + TypeScript + Vite + Tailwind Operations Console)        |
+---------------------------------------+---------------------------------------+
                                        | HTTP / JSON / SSE
                                        v
+-------------------------------------------------------------------------------+
|                             FASTAPI REST API                                  |
|   /auth  /workspaces  /icps  /leads  /enrichment  /conversations  /calendar   |
|              /sequences  /integrations  /analytics  /audit  /webhooks         |
+---------------------------------------+---------------------------------------+
                                        |
                 +----------------------+----------------------+
                 |                                             |
                 v                                             v
+----------------------------------+       +------------------------------------+
|        SERVICE LAYER             |       |       ASYNC BACKGROUND WORKERS     |
| - Lead Service & Deduplication   |       | - Step Progression Runner          |
| - Deterministic Scoring Engine   |       | - Follow-up Queue & Throttling     |
| - Provenance-Tracking Enrichment |       | - Calendar FreeBusy Synchronizer   |
| - Conversation State Machine     |       | - Opt-Out & Safety Enforcer        |
| - Grounded AI Qualification      |       +-----------------+------------------+
| - Calendar & Meeting Engine      |                         |
+----------------+-----------------+                         |
                 |                                           |
                 +----------------------+--------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
|                       DATABASE & TELEMETRY PERSISTENCE                        |
|       PostgreSQL / SQLite Async + Alembic Migrations + Immutable Audit Logs   |
+---------------------------------------+---------------------------------------+
                                        |
                 +----------------------+----------------------+
                 |                                             |
                 v                                             v
+----------------------------------+       +------------------------------------+
|     AI & DISCOVERY ADAPTERS      |       |      COMMUNICATION ADAPTERS        |
| - OpenAI Responses & Tool API    |       | - Telegram Bot API + Opt-In Links  |
| - Apollo.io Prospect Search      |       | - Google Calendar FreeBusy & Meet  |
| - Hunter.io Email Verification   |       | - LinkedIn Connector (Compliant)   |
| - HubSpot CRM Sync (Additive)    |       | - Inbound Webhook Processors       |
+----------------------------------+       +------------------------------------+
```

## 2. Real Operational Lifecycle
1. **ICP Definition**: Target job titles, seniorities, industries, company size ranges, tech stacks, and negative filters.
2. **Lead Discovery**: Real prospect search via Apollo.io or CSV import with workspace-scoped deduplication.
3. **Deterministic Scoring**: Transparent multi-factor evaluation (0-100) producing the signature **Decision Trace**.
4. **Verified Enrichment**: Email verification via Hunter.io with field-level provenance history (`LeadEnrichment`).
5. **Sequence Outreach**: Scheduled multi-step campaigns with delay rules, quiet hours, and daily sending caps.
6. **Telegram Opt-In**: Verified deep-link mapping (`https://t.me/<bot>?start=lead_<token>`) preventing unauthorized messaging.
7. **AI Conversation Engine**: Intent classification (`MEETING_REQUEST`, `INTERESTED`, `QUESTION`, `OBJECTION`, `OPT_OUT`), anti-repetition memory, and structured outputs.
8. **Human-in-the-Loop**: Instant human takeover stopping automated responses on complex pricing, complaints, or explicit human requests.
9. **Conflict-Free Scheduling**: Google Calendar FreeBusy queries, working hours constraint calculation, and direct event creation with Google Meet links.
10. **Immutable Audit Trail & Observability**: Every state change, message, and AI execution latency/token count is recorded.
