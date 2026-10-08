# THREADLINE — Security, Privacy & Compliance Architecture

THREADLINE implements enterprise security standards to protect prospect data, integration secrets, and audit records.

## 1. Credential Encryption at Rest (Fernet AES-256)
- Integration credentials (e.g. OpenAI API keys, Apollo API tokens, Google Calendar OAuth tokens, Telegram Bot tokens) are symmetrically encrypted using Fernet cryptography before being written to PostgreSQL/SQLite.
- Plaintext API keys are never returned in full to the client once saved.

## 2. Authentication & JWT Bearer Architecture
- Passwords are hashed using direct bcrypt with unique salt generation.
- Sessions use signed JWT bearer tokens (`HS256`) with expiry validation and workspace context scoping.

## 3. Role-Based Access Control (RBAC)
Every workspace member is assigned one of five granular roles:
1. **OWNER**: Full administrative control, integration management, member invitations, billing, and workspace deletion.
2. **ADMIN**: Integration configuration, ICP creation, sequence publishing, and lead deletion.
3. **SALES_MANAGER**: Sequence editing, lead qualification overrides, and analytics access.
4. **SALES_REP**: Lead discovery, manual outreach, inbox replies, human takeover, and meeting scheduling.
5. **VIEWER**: Read-only access to leads, conversations, and pipeline analytics.

## 4. Outreach Safety & Opt-Out Enforcement
- **Quiet Hours**: Automations automatically pause overnight (default 20:00 - 08:00) respecting local working hours.
- **Daily Sending Caps**: Strict per-workspace limits (`max_daily_outreach`) preventing uncontrolled outbound volume.
- **Instant Opt-Out Engine**: When inbound messages match configured opt-out keywords (`stop`, `unsubscribe`, `remove me`, `opt out`), the lead is immediately updated to `DO_NOT_CONTACT`, ongoing sequence enrollments are terminated, and automated AI sending is halted.
