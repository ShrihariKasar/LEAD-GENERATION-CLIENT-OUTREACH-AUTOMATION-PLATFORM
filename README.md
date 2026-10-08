# THREADLINE — AI Lead Generation & Client Outreach Automation Platform

> **Codename**: `THREADLINE`  
> **Positioning**: *From first signal to booked conversation.*

[![Build](https://img.shields.io/badge/Build-Production--Ready-10b981.svg)]()
[![Backend](https://img.shields.io/badge/Backend-FastAPI%20%7C%20SQLAlchemy%202-0ea5e9.svg)]()
[![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%7C%20TypeScript%20%7C%20Tailwind-6366f1.svg)]()
[![Database](https://img.shields.io/badge/Database-PostgreSQL%20%2F%20SQLite%20Async-334155.svg)]()

THREADLINE is a production-grade AI-powered revenue operations platform built for sales and outreach teams. It implements a complete connected pipeline: from ICP definition and real prospect discovery to grounded AI qualification, anti-repetition conversation management, and conflict-free calendar booking.

---

## Key Principles & Architectural Truths

- **No Fake Data / No Mock Records**: The platform starts completely empty and cleanly handles zero-record states without placeholder charts, fictional leads, or synthesized numbers.
- **Explainable "Decision Trace"**: Transparent deterministic ICP scoring breaking down matched, failed, and unconfirmed criteria instead of opaque AI assertions.
- **Context-Grounded AI Intelligence**: Qualification and initial touchpoint personalization are strictly grounded in stored facts with anti-repetition memory.
- **Real Integration Adapters**: Dedicated integration center for OpenAI, Apollo.io, Hunter.io, Telegram Bot API, Google Calendar FreeBusy, LinkedIn official connector, and HubSpot CRM with live health testing and structured diagnostic error codes (`APOLLO_AUTH_FAILED`, `TELEGRAM_TOKEN_MISSING`, `GOOGLE_OAUTH_EXPIRED`).
- **Verified Telegram Opt-In**: Generates lead-specific deep-links (`https://t.me/<bot>?start=lead_<token>`) ensuring compliance with Telegram messaging policies.
- **Human-in-the-Loop Safeguards**: Instant human takeover halts automated AI responses when pricing, legal, sensitive complaints, or human assistance requests are detected.
- **Conflict-Free Scheduling**: Direct Google Calendar FreeBusy querying, working hours and buffer computation, and race-condition prevention.

---

## Technology Stack

### Backend
- **Python 3.10+ & FastAPI**: High-performance asynchronous REST API.
- **SQLAlchemy 2.0 & PostgreSQL / aiosqlite**: Asynchronous ORM with strict UUID primary keys and relationship integrity.
- **Pydantic v2**: Strict request/response schemas and validation.
- **Fernet AES-256 Symmetric Encryption**: Secure token and API credential encryption at rest.
- **JWT Authentication & RBAC**: Secure password hashing with direct bcrypt and granular roles (`OWNER`, `ADMIN`, `SALES_MANAGER`, `SALES_REP`, `VIEWER`).

### Frontend
- **React 19, TypeScript & Vite**: Responsive operations console.
- **Tailwind CSS**: Refined dark slate/graphite operations console aesthetic with semantic status badges.
- **React Router**: Protected application layout and navigation.
- **Lucide Icons**: Crisp vector iconography.

---

## Quick Start Guide

### 1. Backend Server
```bash
# Install Python dependencies
pip install -r backend/requirements.txt

# Run FastAPI backend
uvicorn backend.app.main:app --reload --port 8000
```
Interactive OpenAPI documentation will be accessible at: `http://127.0.0.1:8000/api/v1/docs`

### 2. Frontend Operations Console
```bash
# Navigate to frontend directory
cd frontend

# Install npm packages & start dev server
npm install
node node_modules/vite/bin/vite.js
```
The console will be accessible at: `http://localhost:5173`

---

## Real First-Run Operational Flow

1. **Register**: Sign up at `http://localhost:5173/register` to deploy your primary workspace.
2. **Setup Wizard**: Access `/setup` to verify adapter readiness (OpenAI, Apollo, Hunter, Telegram, Google Calendar).
3. **Configure ICP**: Define target job titles, company scales, and negative filters at `/icps`.
4. **Discover Prospects**: Execute real prospect searches via Apollo.io or import a CSV at `/leads`.
5. **Inspect Decision Trace**: Open any lead detail workspace at `/leads/:id` to review deterministic fit breakdown and **Next Best Action**.
6. **Enroll into Sequence**: Create and activate multi-step follow-up sequences at `/sequences`.
7. **Engage via Telegram**: Share verified opt-in links or receive webhook messages into Unified Inbox at `/conversations`.
8. **Book Meeting**: Detect meeting intent, query real Google Calendar FreeBusy availability, and schedule meetings at `/calendar`.
9. **Inspect Audit Trail**: Review immutable operation logs and AI token telemetry at `/audit`.

---

## Documentation Index

- [System Architecture](file:///s:/GitHub_NEW/LEAD%20GENERATION%20&%20CLIENT%20OUTREACH%20AUTOMATION%20PLATFORM/docs/architecture.md)
- [REST API Reference](file:///s:/GitHub_NEW/LEAD%20GENERATION%20&%20CLIENT%20OUTREACH%20AUTOMATION%20PLATFORM/docs/api.md)
- [Database & Schema Reference](file:///s:/GitHub_NEW/LEAD%20GENERATION%20&%20CLIENT%20OUTREACH%20AUTOMATION%20PLATFORM/docs/database.md)
- [AI Qualification & State Machine](file:///s:/GitHub_NEW/LEAD%20GENERATION%20&%20CLIENT%20OUTREACH%20AUTOMATION%20PLATFORM/docs/qualification-engine.md)
- [Integration Adapters Guide](file:///s:/GitHub_NEW/LEAD%20GENERATION%20&%20CLIENT%20OUTREACH%20AUTOMATION%20PLATFORM/docs/integrations.md)
- [Security & Compliance](file:///s:/GitHub_NEW/LEAD%20GENERATION%20&%20CLIENT%20OUTREACH%20AUTOMATION%20PLATFORM/docs/security.md)
- [LinkedIn Policy & Limitations](file:///s:/GitHub_NEW/LEAD%20GENERATION%20&%20CLIENT%20OUTREACH%20AUTOMATION%20PLATFORM/docs/linkedin-limitations.md)
- [Deployment Guide](file:///s:/GitHub_NEW/LEAD%20GENERATION%20&%20CLIENT%20OUTREACH%20AUTOMATION%20PLATFORM/docs/deployment.md)
