# Flow-Zint Deployment Guide for Render Free Tier

This guide walks you through the step-by-step process of hosting **Flow-Zint** on the [Render Free Tier](https://render.com/docs/free).

---

## Architecture Overview

```mermaid
graph TD
    A[Next.js Frontend - Static/Dynamic Web Service] -->|REST APIs| B[Express Backend - Web Service]
    B -->|Prisma Client| C[(Neon PostgreSQL Database)]
    B -->|SIP Dispatch| D[LiveKit Cloud / SIP Trunk]
    E[Python AI Agent Worker - Background Worker] -->|Listen for Jobs| D
    E -->|Fetch Dynamic Agent Config| B
```

---

## Step 1: Set Up a Free PostgreSQL Database

Since Render's free tier databases expire after 90 days and SQLite databases on Render are ephemeral (reverts to empty every time the service restarts), we **highly recommend** setting up a lifetime-free database on [Neon](https://neon.tech) or [Aiven](https://aiven.io).

1. Sign up on [Neon](https://neon.tech) and create a new project.
2. Select PostgreSQL as the database engine.
3. Copy your database connection string:
   `postgres://username:password@ep-host-name.neon.tech/neondb?sslmode=require`

---

## Step 2: Configure Backend for Deployment

Render requires our backend to build and run automatically using environment variables.

### 1. Update `package.json` Scripts
Ensure `backend/package.json` contains:
```json
"scripts": {
  "build": "tsc && prisma generate",
  "start": "node dist/app.js",
  "db:push": "prisma db push"
}
```

### 2. Prepare Environment Variables
When creating your **Web Service** on Render, configure the following environment variables:

| Variable | Description | Example Value |
| :--- | :--- | :--- |
| `PORT` | Listening port for backend | `3001` |
| `DATABASE_URL` | Neon database connection string | `postgresql://neondb_owner:npg_Gu3zMts9kbLH@ep-muddy-butterfly-aqv45k6y.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require` |
| `JWT_SECRET` | Secret for auth tokens | `a_highly_secure_random_string` |
| `GEMINI_API_KEY` | Gemini AI developer key | `AIzaSy...` |
| `LIVEKIT_URL` | LiveKit server websocket URL | `wss://flow-zint.livekit.cloud` |
| `LIVEKIT_API_KEY` | LiveKit developer API key | `API...` |
| `LIVEKIT_API_SECRET` | LiveKit secret | `SEC...` |
| `SIP_OUTBOUND_TRUNK_ID` | SIP outbound trunk ID for outbound calling | `SIP_...` |
| `RESEND_API_KEY` | (Optional) Email sender service key | `re_...` |
| `HUBSPOT_ACCESS_TOKEN` | (Optional) CRM synchronization token | `pat-na-e...` |

### 3. Deploy Backend Web Service
1. Log in to [Render](https://dashboard.render.com).
2. Click **New +** and select **Web Service**.
3. Connect your Git repository.
4. Set the following options:
   - **Name**: `flow-zint-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npx prisma db push && npm run start`
   - **Instance Type**: `Free`
5. Add the Environment Variables listed above in the **Environment** tab.
6. Click **Deploy Web Service**.

---

## Step 3: Deploy Frontend Web Service

Next, deploy the Next.js application so users can access the workspace dashboard.

### 1. Configure Environment Variables
When creating the frontend service, add these environment variables:

| Variable | Description | Value |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | URL of your deployed backend service | `https://flow-zint-backend.onrender.com` |

### 2. Deploy Frontend Web Service
1. On Render Dashboard, click **New +** and select **Web Service**.
2. Connect your Git repository.
3. Set the following options:
   - **Name**: `flow-zint-frontend`
   - **Root Directory**: `frontend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Instance Type**: `Free`
4. In the **Environment** tab, add `NEXT_PUBLIC_API_URL`.
5. Click **Deploy Web Service**.

---

## Step 4: Deploy the Python AI Agent Worker

The Python AI Agent (`ai-agent/agent.py`) runs in the background, listening to LiveKit dispatch events, dialing prospects, and executing OpenAI realtime audio sessions.

### 1. Requirements Setup
Make sure `ai-agent/requirements.txt` includes:
```text
livekit-agents>=0.8.0
livekit-plugins-openai>=0.8.0
livekit-plugins-silero>=0.8.0
python-dotenv
```

### 2. Configure Environment Variables
The background worker requires access to LiveKit and OpenAI Realtime:

| Variable | Value |
| :--- | :--- |
| `LIVEKIT_URL` | `wss://flow-zint.livekit.cloud` |
| `LIVEKIT_API_KEY` | `your_livekit_api_key` |
| `LIVEKIT_API_SECRET` | `your_livekit_api_secret` |
| `OPENAI_API_KEY` | `your_openai_api_key_with_realtime_access` |
| `SIP_OUTBOUND_TRUNK_ID` | `your_sip_outbound_trunk_id` |

### 3. Deploy Background Worker
Render free tier does **not** host standard background workers, but you can deploy it as a **Cron Job** that starts a daemon, or simply host a second **Web Service** that boots the python daemon:
1. On Render Dashboard, click **New +** and select **Web Service**.
2. Connect your Git repository.
3. Set the following options:
   - **Name**: `flow-zint-agent-worker`
   - **Root Directory**: `ai-agent`
   - **Environment**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python agent.py dev`
   - **Instance Type**: `Free`
4. Add the necessary Environment Variables.
5. Click **Deploy**.

> [!TIP]
> **Keep-Alive Hack for Free Tier**
> Render free tier services go to sleep after 15 minutes of inactivity. To prevent your backend and agent worker from sleeping, you can set up a free uptime monitor (like [UptimeRobot](https://uptimerobot.com)) to ping your backend URL every 5–10 minutes.
