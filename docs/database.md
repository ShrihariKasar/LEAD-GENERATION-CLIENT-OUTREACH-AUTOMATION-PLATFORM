# THREADLINE — Database Architecture & Schema Reference

THREADLINE uses a normalized PostgreSQL relational database schema with SQLAlchemy 2.0 async ORM and Alembic migrations.

## Entity Relational Model

```
+---------------+        1:N       +-------------------+
|  workspaces   |<-----------------| workspace_members |
+-------+-------+                  +---------+---------+
        |                                    | N:1
        | 1:N                                v
        |                              +-----------+
        +----------------------------->|   users   |
        |                              +-----------+
        | 1:N
        +----------------------------->+-------------------+
        |                              |   icp_profiles    |
        | 1:N                          +---------+---------+
        +----------------------------->          | 1:N
        |                                        v
        | 1:N       +-------------+    +-------------------+
        +---------->|  companies  |<---|       leads       |
        |           +-------------+    +---------+---------+
        | 1:N                                    |
        +----------------------------->          | 1:N
        |                              +---------v---------+
        | 1:N                          |   conversations   |
        +----------------------------->+---------+---------+
        |                                        | 1:N
        | 1:N                          +---------v---------+
        +----------------------------->|     messages      |
        |                              +-------------------+
        | 1:N
        +----------------------------->+-------------------+
        |                              | outreach_sequences|
        | 1:N                          +-------------------+
        +----------------------------->
        |                              +-------------------+
        | 1:N                          |     meetings      |
        +----------------------------->+-------------------+
        |
        | 1:N                          +-------------------+
        +----------------------------->|   integrations    |
        |                              +-------------------+
        | 1:N
        +----------------------------->+-------------------+
        |                              |    audit_logs     |
        | 1:N                          +-------------------+
        +----------------------------->
                                       +-------------------+
                                       |      ai_runs      |
                                       +-------------------+
```

## Schema Entities Summary

| Table | Primary Key | Key Foreign Keys | Purpose |
| :--- | :--- | :--- | :--- |
| `users` | UUID | — | Global user accounts & password hashes |
| `workspaces` | UUID | — | Multi-tenant operational workspace |
| `workspace_members`| UUID | `workspace_id`, `user_id` | Role-based access control (`OWNER`, `ADMIN`, `SALES_REP`, etc.) |
| `icp_profiles` | UUID | `workspace_id` | Deterministic criteria, weights, and thresholds |
| `companies` | UUID | `workspace_id` | Company domain, headcount, tech stack |
| `leads` | UUID | `workspace_id`, `company_id`, `icp_profile_id` | Prospect profiles, CRM stage, opt-in status, Decision Trace |
| `lead_scores` | UUID | `lead_id`, `icp_profile_id` | Historical scoring breakdown and match criteria |
| `lead_enrichments` | UUID | `lead_id` | Provenance tracking (`old_value`, `new_value`, `source`, `confidence`) |
| `conversations` | UUID | `workspace_id`, `lead_id` | Dialogue state machine and human takeover flags |
| `messages` | UUID | `conversation_id` | Inbound / outbound messages with channel metadata |
| `qualification_answers` | UUID | `conversation_id`, `lead_id` | Extracted facts and anti-repetition memory |
| `outreach_sequences` | UUID | `workspace_id` | Multi-step outreach workflow definitions |
| `sequence_steps` | UUID | `sequence_id` | Step order, channel, delay hours, and message templates |
| `sequence_enrollments` | UUID | `sequence_id`, `lead_id` | Execution progression state and execution timestamps |
| `meetings` | UUID | `workspace_id`, `lead_id` | Verified Google Calendar events and Meet links |
| `integrations` | UUID | `workspace_id` | Fernet encrypted credentials, health status, error codes |
| `audit_logs` | UUID | `workspace_id` | Immutable system and AI operation audit records |
| `ai_runs` | UUID | `workspace_id`, `lead_id`, `conversation_id` | AI execution telemetry, token usage, latency, structured outputs |
| `notifications` | UUID | `workspace_id` | Event-driven alerts (opt-outs, human handoffs, meetings) |
