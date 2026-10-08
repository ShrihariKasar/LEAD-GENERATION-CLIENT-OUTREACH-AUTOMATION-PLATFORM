# THREADLINE — REST API Reference

The THREADLINE REST API is built with FastAPI and strictly adheres to Pydantic v2 schemas.

## Base URL
`/api/v1`

## Authentication & Headers
All requests after login must include the Bearer access token:
```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
X-Workspace-Id: <WORKSPACE_UUID> (optional if primary workspace is targeted)
```

## Core Endpoint Groups

### 1. Authentication (`/auth`)
- `POST /auth/register`: Create user account & initialize primary workspace.
- `POST /auth/login`: Authenticate email/password and obtain JWT access token.
- `GET /auth/me`: Fetch authenticated user profile.

### 2. Workspace & Context (`/workspaces`)
- `GET /workspaces/current`: Retrieve workspace profile and operational safety rules.
- `PATCH /workspaces/current`: Update company positioning description, daily limits, and quiet hours.
- `GET /workspaces/members`: List team members and role permissions.

### 3. ICP Profiles (`/icps`)
- `GET /icps`: List all defined ICP profiles for the workspace.
- `POST /icps`: Create new ICP profile with weights, thresholds, and negative filters.
- `PATCH /icps/{id}`: Update criteria weights and auto-qualification thresholds.
- `DELETE /icps/{id}`: Delete an ICP profile.

### 4. Lead Discovery & Management (`/leads`)
- `GET /leads`: Server-side paginated and multi-filtered query (`query`, `qualification_status`, `lead_status`, `icp_profile_id`, `min_icp_score`, `source`).
- `POST /leads`: Create single lead record with deduplication check.
- `POST /leads/discover`: Execute real search query via Apollo.io.
- `POST /leads/import-csv`: Upload and parse prospect CSV with header mapping.
- `GET /leads/{id}`: Retrieve lead details, scores, and channel status.
- `PATCH /leads/{id}`: Update lead fields.
- `GET /leads/{id}/decision-trace`: Retrieve explainable **Decision Trace** breakdown.
- `GET /leads/{id}/telegram-opt-in-link`: Generate verified Telegram bot deep link.
- `POST /leads/bulk`: Execute bulk operations (`QUALIFY`, `PAUSE`, `ENROLL_SEQUENCE`, `MARK_DO_NOT_CONTACT`, `DELETE`).

### 5. Enrichment (`/enrichment`)
- `POST /enrichment/leads/{id}`: Trigger Hunter.io email verification and Apollo data enrichment.
- `GET /enrichment/leads/{id}/history`: Retrieve field-level provenance audit trail.

### 6. Conversations & Unified Inbox (`/conversations`)
- `GET /conversations`: List conversations with state filters (`HUMAN_REVIEW`, `ENGAGED`, `QUALIFIED`, `OPTED_OUT`).
- `GET /conversations/{id}`: Get conversation timeline with messages and extracted qualification answers.
- `POST /conversations/{id}/messages`: Send outbound human message through channel.
- `POST /conversations/{id}/takeover`: Instantly pause AI automated responses for human takeover.
- `POST /conversations/{id}/resume-ai`: Resume AI automated responses.
- `POST /conversations/{id}/analyze`: Run manual AI qualification turn analysis.

### 7. Sequences (`/sequences`)
- `GET /sequences`: List outreach sequences with step details and enrollment metrics.
- `POST /sequences`: Create multi-step sequence with delays, conditions, and templates.
- `POST /sequences/{id}/activate`: Enable automated execution.
- `POST /sequences/{id}/pause`: Pause sequence execution.
- `GET /sequences/{id}/enrollments`: List active and completed enrollments.

### 8. Calendar & Scheduling (`/calendar`)
- `GET /calendar/availability`: Query Google Calendar FreeBusy and compute conflict-free slots.
- `GET /calendar/meetings`: List confirmed calendar invitations with Google Meet links.
- `POST /calendar/meetings`: Book calendar meeting with attendee invitations and conflict recheck.

### 9. Integration Center (`/integrations`)
- `GET /integrations`: List status of all 7 adapters with health indicators.
- `POST /integrations/{provider}/connect`: Save encrypted credentials (Fernet AES-256) and run live connection test.
- `POST /integrations/{provider}/test`: Execute live health check and return diagnostics.
- `DELETE /integrations/{provider}`: Disconnect provider credentials.

### 10. Analytics & Telemetry (`/analytics`, `/audit`, `/setup`)
- `GET /analytics/overview`: Real SQL database aggregated pipeline and conversion metrics.
- `GET /audit/logs`: Immutable system audit log trail.
- `GET /audit/ai-runs`: AI observability execution records (latency, tokens, prompt version).
- `GET /setup/status`: System setup status inspection across all adapters.
- `GET /search?q={term}`: Server-side debounced search across leads, companies, and meetings.
