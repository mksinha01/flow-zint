# FlowZint V2 — Task Tracker

## Phase 1 — Monorepo Setup + DB + Backend Foundation
- [x] Create monorepo root (package.json, .gitignore, .env.example, docker-compose.yml, ecosystem.config.js)
- [x] Backend: Express + TypeScript scaffold (tsconfig, package.json, app.ts)
- [x] Backend: config/ (database.ts, env.ts, logger.ts, r2.ts)
- [x] Backend: Prisma schema — all 10 models
- [x] Backend: JWT auth (register/login/refresh) + middleware
- [x] Backend: workspace + workspace isolation middleware
- [x] Backend: all route/controller/service stubs
- [x] npm install — 608 packages, 0 vulnerabilities
- [x] prisma generate — client generated
- [x] tsc --noEmit — CLEAN (0 errors)

## Phase 2 — Business Onboarding System
- [x] Business context controller + service (form save)
- [x] Document upload controller (multipart, R2, text extraction pdf/docx/txt)
- [x] Persona generation service (GPT-4o → AgentConfig)
- [x] Frontend: 3-step onboarding wizard

## Phase 3 — Dynamic AI Voice Agent (Python)
- [x] ai-agent/ scaffold (requirements.txt, main.py, config)
- [x] sales_caller.py — dynamic persona from AgentConfig
- [x] Function tools: qualify_lead, book_demo, transfer, end_call, answering_machine
- [x] Internal backend routes for agent ↔ backend communication

## Phase 4 — Post-Call Analysis Pipeline
- [x] LiveKit webhook handler (in calls.controller.ts)
- [x] OpenAI analysis service (structured output — sentiment, score, objections)
- [x] Resend email on call complete

## Phase 5 — Learning Loop Engine
- [x] learning.service.ts — GPT-4o insights from call batch
- [x] Auto-generate new AgentConfig version (PENDING_REVIEW)
- [x] Learning routes/controller

## Phase 6 — Next.js Frontend Dashboard
- [x] Next.js scaffold + Shadcn/ui setup
- [x] Onboarding pages (workspace, business form, doc upload, agent preview)
- [x] Dashboard home (stats + charts)
- [x] Leads page + detail
- [x] Calls page + detail (audio, transcript, analysis)
- [x] Agent config page
- [x] Learning/iterations page

## Phase 7 — Integrations + Docker + Tests
- [x] Calendly stub service
- [x] HubSpot CRM stub
- [x] Docker multi-stage build (docker-compose.yml)
- [x] PM2 ecosystem.config.js
- [x] Jest unit tests
- [x] pytest for AI agent
# flow-zint
# flow-zint
see in this cureent  dashboard dont have a workspce option so simple we need have one option is create a workspace with + sign
that was create a personalize agent for user 
show search about that how 
a onbording form is that  and make ui simple and as non vibe coded 
steps 
1: user in dashboard create a workspace using +sign of this and then 
2: onboading form is upper that ask simple qustion about thier buzniness and what they want to sale and how was thier product
3: upload thier product or company details in doc formate or many 
4: upload target people contact number in csv with name and details 
5: for  call agent ready a promt for ai how they apporch to sale product
6: each call was personlied using ai with name aur deatils 
7: after call analysis was doing and other they was tell in past in this product 
for calling agent use this repo https://github.com/mksinha01/outbound-caller-python
and for normal ai opration use langchain (https://docs.langchain.com) framenwork with gemini api for make thier promt aur find lead and also ready route accodoing to that backennd and frontend expect call agent other all agent work with gemini api
make plan and excute this