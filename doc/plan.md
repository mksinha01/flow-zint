# FlowZint — AI Sales Bot Implementation Plan
## FlowZint AI Hackathon 2026 · Version 2

> **Two core systems:** AI Outbound Calling Agent + AI Sales Intelligence Analyzer

---

## Project Overview

FlowZint is an AI-powered sales automation platform that:
1. **Calls leads automatically** — qualifies them, detects interest, and books demos
2. **Analyzes every call** — sentiment, lead scoring, objection detection, buying intent, summaries
3. **CRM Dashboard** — real-time views, call recordings, transcripts, hot/warm/cold lead tags

---

## Tech Stack (Confirmed)

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 + Recharts + Shadcn/ui |
| **Backend** | Node.js (Express) + TypeScript |
| **Database** | PostgreSQL + Prisma ORM |
| **AI Voice Agent** | LiveKit + OpenAI Realtime API (`gpt-realtime-2025-08-28`) |
| **AI Analysis** | OpenAI GPT-4o (transcription + analysis) |
| **Email** | Resend API |
| **Scheduling** | Calendly API |
| **CRM Sync** | Salesforce / HubSpot (webhook-based) |
| **Auth** | JWT + bcrypt + RBAC (admin vs sales rep) |
| **Process Manager** | PM2 |
| **Containerization** | Docker + docker-compose |

---

## Production-Grade Monorepo Structure

```
flowzint/                                       # Root monorepo
├── .env.production                             # Production env (never commit)
├── .env.example                                # Template
├── .gitignore
├── package.json                                # Root scripts
├── README.md
├── ecosystem.config.js                         # PM2 config
├── Dockerfile
├── docker-compose.yml
├── jest.config.js
│
├── backend/                                    # Node.js/Express API
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts                    # Prisma client
│   │   │   ├── env.ts                         # Zod env validation
│   │   │   └── logger.ts                      # Winston logger
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── leads.controller.ts
│   │   │   ├── calls.controller.ts
│   │   │   ├── analysis.controller.ts
│   │   │   └── dashboard.controller.ts
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── leads.routes.ts
│   │   │   ├── calls.routes.ts
│   │   │   ├── analysis.routes.ts
│   │   │   └── dashboard.routes.ts
│   │   ├── models/
│   │   │   └── schema.prisma                  # All DB schemas
│   │   ├── services/
│   │   │   ├── livekit.service.ts             # Dispatch outbound call
│   │   │   ├── openai.service.ts              # Transcription + analysis
│   │   │   ├── calendly.service.ts            # Auto-booking
│   │   │   ├── resend.service.ts              # Email confirmations
│   │   │   ├── crm.service.ts                 # Salesforce/HubSpot sync
│   │   │   └── analysis.service.ts            # Lead scoring pipeline
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts             # JWT verify
│   │   │   ├── rbac.middleware.ts             # Role-based access
│   │   │   ├── error.middleware.ts            # Global error handler
│   │   │   └── validate.middleware.ts         # Zod schema validation
│   │   ├── utils/
│   │   │   ├── jwt.util.ts
│   │   │   ├── hash.util.ts
│   │   │   └── response.util.ts
│   │   ├── validators/
│   │   │   ├── auth.validator.ts
│   │   │   ├── lead.validator.ts
│   │   │   └── call.validator.ts
│   │   ├── public/                            # Uploads / audio files
│   │   └── app.ts                             # Express entry point
│   ├── package.json
│   └── tsconfig.json
│
├── ai-agent/                                   # Python LiveKit agent
│   ├── src/
│   │   ├── agents/
│   │   │   └── sales_caller.py               # Core OutboundSalesCaller agent
│   │   ├── services/
│   │   │   ├── lead_lookup.py                # Fetch lead data from backend
│   │   │   └── booking.py                    # Trigger Calendly booking
│   │   ├── utils/
│   │   │   └── logger.py
│   │   └── config/
│   │       └── settings.py                   # Env config
│   ├── main.py                               # Entry point
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/                                   # Next.js 14
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── layout.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx                  # Main dashboard
│   │   │   │   ├── leads/
│   │   │   │   │   ├── page.tsx             # Lead list
│   │   │   │   │   └── [id]/page.tsx        # Lead detail
│   │   │   │   └── calls/
│   │   │   │       ├── page.tsx             # Call history
│   │   │   │       └── [id]/page.tsx        # Call detail + analysis
│   │   │   └── api/                          # Next.js API routes (proxy)
│   │   ├── components/
│   │   │   ├── ui/                           # Shadcn components
│   │   │   ├── dashboard/
│   │   │   │   ├── StatsCards.tsx
│   │   │   │   ├── CallVolumeChart.tsx
│   │   │   │   ├── LeadScoreChart.tsx
│   │   │   │   └── TopObjectionsChart.tsx
│   │   │   ├── leads/
│   │   │   │   ├── LeadTable.tsx
│   │   │   │   ├── LeadBadge.tsx            # hot/warm/cold
│   │   │   │   └── AddLeadModal.tsx
│   │   │   └── calls/
│   │   │       ├── CallPlayer.tsx           # Audio player
│   │   │       ├── TranscriptViewer.tsx
│   │   │       └── AnalysisPanel.tsx        # Sentiment, score, objections
│   │   ├── hooks/
│   │   │   ├── useLeads.ts
│   │   │   └── useCalls.ts
│   │   ├── lib/
│   │   │   ├── api.ts                        # Axios client
│   │   │   └── auth.ts
│   │   └── types/
│   │       └── index.ts
│   ├── package.json
│   └── next.config.ts
│
└── tests/
    ├── backend/
    │   ├── auth.test.ts
    │   ├── leads.test.ts
    │   └── calls.test.ts
    └── ai-agent/
        └── test_agent.py
```

---

## Database Schema (PostgreSQL / Prisma)

```
Users        → id, email, password_hash, role (admin|sales_rep), name, created_at
Leads        → id, name, phone, email, company, status (new|called|qualified|disqualified), created_by
Calls        → id, lead_id, livekit_room_id, status (queued|in_progress|completed|failed), duration, recording_url, transcript, started_at, ended_at
CallAnalysis → id, call_id, sentiment (positive|neutral|negative), lead_score (1-100), classification (hot|warm|cold), objections (jsonb), buying_intent (boolean), summary, created_at
Bookings     → id, call_id, lead_id, calendly_event_uri, scheduled_at, confirmation_email_sent
```

---

## Implementation Phases

### Phase 1 — Database & Backend Foundation
- Initialize monorepo structure with workspaces
- Set up PostgreSQL + Prisma schema (all 5 tables)
- Build Express server with middleware stack (CORS, Helmet, Morgan, rate-limit)
- Implement JWT auth system (register/login/refresh)
- CRUD APIs for: Users, Leads, Calls, Analysis, Bookings
- Environment validation with Zod

### Phase 2 — AI Voice Agent (Python)
- Adapt the existing `outbound-caller-python` agent into `ai-agent/src/agents/sales_caller.py`
- Change persona from dental scheduling to **sales qualification**
- New system prompt: introduces company, asks qualification questions, detects interest
- New function tools:
  - `qualify_lead(interest_level, notes)` — saves qualification to backend
  - `book_demo(date_time_preference)` — triggers Calendly via backend
  - `end_call()` — graceful hangup
  - `transfer_to_human()` — SIP transfer
  - `detected_answering_machine()` — voicemail hangup
- Backend endpoint `POST /api/calls/dispatch` triggers LiveKit dispatch

### Phase 3 — AI Analysis Pipeline (OpenAI)
- After call ends, LiveKit webhook fires `call.ended` event
- Backend job runs `openai.service.ts`:
  - Fetches transcript from LiveKit
  - Calls GPT-4o with structured output prompt:
    - Sentiment score + label
    - Lead score (1-100 rubric)
    - Hot / Warm / Cold classification
    - Array of detected objections with timestamps
    - Buying intent flag + reasoning
    - 3-sentence summary
- Stores `CallAnalysis` record in DB
- Triggers Resend email to sales rep with summary

### Phase 4 — Next.js Frontend Dashboard
- Dark mode, glassmorphism design with Tailwind + Shadcn
- **Dashboard Home**: Live stats (total calls today, success rate, avg lead score, top objections)
- **Leads Page**: Table with search, filter by status/classification, bulk upload CSV
- **Lead Detail Page**: Timeline of calls, analysis cards, booking status
- **Call Detail Page**: Audio player, scrollable transcript, full AI analysis panel (sentiment gauge, score ring, objection chips)
- **Live Call Indicator**: Real-time status via polling/WebSocket

### Phase 5 — Integrations
- **Calendly**: When lead says "yes" during call, `book_demo` tool fires `POST /api/bookings/create` → creates Calendly scheduling link → sends via Resend email
- **CRM Sync**: On `CallAnalysis` creation, push to Salesforce/HubSpot via webhook (configurable)
- **Resend**: Call summary email to sales rep after analysis completes

### Phase 6 — Testing, Docker & Deploy
- Unit tests for all controllers and services (Jest)
- Python agent tests (pytest)
- Docker multi-stage build
- docker-compose with services: postgres, backend, ai-agent, frontend
- PM2 ecosystem config for non-Docker deploys
- Deploy: backend → Render, frontend → Vercel, AI agent → Railway / EC2
- End-to-end outbound call test with real phone number

---

## API Endpoints Summary

```
AUTH
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh

LEADS
GET    /api/leads           → list (paginated, filtered)
POST   /api/leads           → create lead
GET    /api/leads/:id       → lead detail
PUT    /api/leads/:id       → update
DELETE /api/leads/:id       → delete
POST   /api/leads/bulk      → CSV import

CALLS
GET  /api/calls             → call history
POST /api/calls/dispatch    → trigger outbound call via LiveKit
GET  /api/calls/:id         → call detail + transcript
POST /api/calls/webhook     → LiveKit webhook handler

ANALYSIS
GET /api/analysis/:callId   → get analysis for a call
POST /api/analysis/trigger  → manually re-run analysis

DASHBOARD
GET /api/dashboard/stats    → aggregate stats
GET /api/dashboard/charts   → chart data (volume, scores, objections)

BOOKINGS
POST /api/bookings/create   → create Calendly booking + send email
GET  /api/bookings          → booking list
```

---

## Open Questions

> [!IMPORTANT]
> Please confirm these before I start coding:

1. **Calendly API key** — Do you already have a Calendly account / API key, or should I design the booking flow as a stub for now?

2. **CRM Priority** — Salesforce or HubSpot (or both)? Or stub it out for hackathon MVP?

3. **LiveKit / SIP credentials** — You already have `SIP_OUTBOUND_TRUNK_ID` set in your `.env.local` — should I reuse those same credentials for FlowZint, or set up a separate LiveKit project?

4. **Frontend location** — Should the Next.js frontend live inside the `flowzint/` monorepo (`flowzint/frontend/`) or as a separate repo? (I recommend monorepo)

5. **AI Agent language** — The outbound caller is Python. The backend is Node.js. Happy to keep it split (Python agent + Node backend). Confirm?

6. **Recording storage** — Store call recordings in PostgreSQL (URL to LiveKit recording), or upload to S3 / Cloudflare R2?

---

## Verification Plan

### Automated Tests
- `npm test` — Jest unit tests for all backend controllers/services
- `pytest tests/ai-agent/` — Python agent tests

### Manual Verification
1. Trigger a test outbound call via `POST /api/calls/dispatch` with a real phone number
2. Verify transcript appears in dashboard after call ends
3. Verify AI analysis (score, sentiment, objections) is generated correctly
4. Verify Calendly booking flow creates an event + sends confirmation email
5. Verify CRM sync pushes lead data
