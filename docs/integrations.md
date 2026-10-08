# THREADLINE — Integrations & Provider Adapters

All external integrations are isolated behind clean provider interfaces (`BaseIntegrationProvider`) with structured error diagnostics.

## 1. OpenAI Adapter
- **Provider Key**: `OPENAI`
- **Capabilities**: Structured JSON responses, chat completion, function calling, tool execution.
- **Health Check**: `GET /v1/models` verification.
- **Diagnostic Codes**: `OPENAI_KEY_MISSING`, `OPENAI_AUTH_FAILED`, `OPENAI_QUOTA_EXCEEDED`.

## 2. Apollo.io Adapter
- **Provider Key**: `APOLLO`
- **Capabilities**: B2B prospect search (`/v1/mixed_people/search`), organization search, normalized contact ingestion.
- **Health Check**: Test query with `per_page=1`.
- **Diagnostic Codes**: `APOLLO_KEY_MISSING`, `APOLLO_AUTH_FAILED`, `APOLLO_RATE_LIMITED`.

## 3. Hunter.io Adapter
- **Provider Key**: `HUNTER`
- **Capabilities**: Email verification (`/v2/email-verifier`), executive email finding (`/v2/email-finder`), confidence score tracking.
- **Health Check**: `GET /v2/account` search credit validation.
- **Diagnostic Codes**: `HUNTER_KEY_MISSING`, `HUNTER_AUTH_FAILED`, `HUNTER_CREDITS_EXHAUSTED`.

## 4. Telegram Bot API Adapter
- **Provider Key**: `TELEGRAM`
- **Capabilities**: Official bot token verification (`getMe`), webhook registration (`setWebhook`), message delivery (`sendMessage`), verified deep-link generation.
- **Opt-In Flow**: Generates unique `https://t.me/<BotUsername>?start=lead_<token>`. Webhook maps `/start lead_<token>` directly to lead record and sets status to `OPTED_IN`.
- **Diagnostic Codes**: `TELEGRAM_TOKEN_MISSING`, `TELEGRAM_AUTH_FAILED`, `TELEGRAM_GETME_FAILED`.

## 5. Google Calendar Adapter
- **Provider Key**: `GOOGLE_CALENDAR`
- **Capabilities**: OAuth2 token management, FreeBusy busy interval query (`/v3/freeBusy`), slot computation respecting working hours/buffers, and event creation with Google Meet links (`/v3/calendars/primary/events?conferenceDataVersion=1`).
- **Conflict Prevention**: Rechecks FreeBusy before inserting event to avoid race conditions.
- **Diagnostic Codes**: `GOOGLE_TOKEN_MISSING`, `GOOGLE_OAUTH_EXPIRED`, `GOOGLE_CONFLICT_DETECTED`.

## 6. LinkedIn Connector Adapter
- **Provider Key**: `LINKEDIN`
- **Capabilities**: Official OAuth2 OpenID profile retrieval (`/v2/userinfo`), assisted manual outreach workflows.
- **Platform Policy Compliance**: Strictly no browser automation, scraping, or Selenium. Reports restricted status when enterprise messaging scopes are not available.
- **Diagnostic Codes**: `LINKEDIN_TOKEN_MISSING`, `LINKEDIN_MESSAGING_RESTRICTED`, `LINKEDIN_OAUTH_EXPIRED`.

## 7. HubSpot CRM Adapter (Optional & Additive)
- **Provider Key**: `HUBSPOT`
- **Capabilities**: Private App Access Token authentication, contact creation & update (`/crm/v3/objects/contacts`).
- **Diagnostic Codes**: `HUBSPOT_TOKEN_MISSING`, `HUBSPOT_AUTH_FAILED`.
