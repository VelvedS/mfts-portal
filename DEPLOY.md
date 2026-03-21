# MFTS Portal — Vercel + Supabase Deployment Guide

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Vercel                                             │
│  ┌──────────────┐   ┌───────────────────────────┐   │
│  │  Static SPA  │   │  Serverless API (/api/*)  │   │
│  │  (Vite/React)│   │  (Node.js functions)      │   │
│  └──────────────┘   └─────────┬─────────────────┘   │
│                               │                     │
└───────────────────────────────┼─────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │  Supabase             │
                    │  ┌─────────────────┐  │
                    │  │ Postgres (data) │  │
                    │  └─────────────────┘  │
                    │  ┌─────────────────┐  │
                    │  │ Auth (JWT)      │  │
                    │  └─────────────────┘  │
                    └───────────────────────┘
```

- **Frontend**: Vite + React SPA, deployed as static files on Vercel
- **Backend**: Vercel serverless functions under `/api/`
- **Database**: Supabase Postgres (accessed via Drizzle ORM)
- **Auth**: Supabase Auth (email/password, JWT tokens)

## Prerequisites

- [Vercel](https://vercel.com) account
- [Supabase](https://supabase.com) account (free tier works)
- [Node.js](https://nodejs.org) 18+
- Git repository (GitHub/GitLab/Bitbucket)

---

## Step 1: Create Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New Project**
2. Choose a name (e.g., `mfts-portal`), set a database password, pick a region
3. Wait for the project to finish provisioning (~1 min)

### Collect these values:
- **Project URL** → Settings > API → Project URL (e.g., `https://abc123.supabase.co`)
- **Anon Key** → Settings > API → `anon` public key
- **Service Role Key** → Settings > API → `service_role` key (keep secret!)
- **Database URL** → Settings > Database → Connection String (URI) → use the one with **Transaction mode** for serverless

> The database URL looks like: `postgresql://postgres.abc123:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres`

---

## Step 2: Push Database Schema

From the project root:

```bash
# Set the database URL
export DATABASE_URL="postgresql://postgres.abc123:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# Push schema to Supabase (creates tables)
npx drizzle-kit push

# Seed the data
psql "$DATABASE_URL" -f seed.sql
```

> **Note**: Use the **direct connection** (port 5432) for schema push, not the pooler.

---

## Step 3: Create Supabase Auth Users

In the Supabase Dashboard → Authentication → Users → **Add User**:

| Email                    | Password        | Role    |
|--------------------------|-----------------|---------|
| `v@agency-6.com`        | (choose one)    | admin   |
| `brandon@agency-6.com`  | (choose one)    | team    |
| `miguel@agency-6.com`   | (choose one)    | team    |
| `dena@farmtoschool.org` | (choose one)    | client  |

> Select "Auto Confirm" when creating users so they don't need email verification.

The portal automatically links Supabase Auth users to portal users by matching email addresses on first login.

---

## Step 4: Deploy to Vercel

### Option A: Deploy via GitHub (Recommended)

1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) → Import your repository
3. Vercel auto-detects `vercel.json` — no framework preset needed
4. Add environment variables:

| Variable                    | Value                                          |
|-----------------------------|-------------------------------------------------|
| `DATABASE_URL`              | Supabase pooler connection string (port 6543)  |
| `SUPABASE_URL`              | `https://abc123.supabase.co`                   |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key from Supabase                 |
| `VITE_SUPABASE_URL`         | Same as SUPABASE_URL                           |
| `VITE_SUPABASE_ANON_KEY`    | Anon/public key from Supabase                  |

5. Click **Deploy**

### Option B: Deploy via CLI

```bash
npm i -g vercel

# Login and link project
vercel login
vercel link

# Set environment variables
vercel env add DATABASE_URL
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# Deploy
vercel --prod
```

---

## Step 5: Configure Supabase Auth Redirect

In Supabase Dashboard → Authentication → URL Configuration:
- **Site URL**: `https://your-project.vercel.app`
- **Redirect URLs**: Add `https://your-project.vercel.app`

---

## Environment Variables Reference

### Server-side (Vercel serverless functions)

| Variable                    | Description                           | Required |
|-----------------------------|---------------------------------------|----------|
| `DATABASE_URL`              | Supabase Postgres connection string   | Yes      |
| `SUPABASE_URL`              | Supabase project URL                  | Yes      |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (admin access)       | Yes      |

### Client-side (Vite build)

| Variable                | Description                    | Required |
|-------------------------|--------------------------------|----------|
| `VITE_SUPABASE_URL`    | Supabase project URL           | Yes      |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key     | Yes      |

---

## User Roles

| Role     | Can View Tasks | Can Edit Tasks | Can Comment | Can Manage Phases |
|----------|---------------|----------------|-------------|-------------------|
| `admin`  | ✅            | ✅             | ✅          | ✅                |
| `team`   | ✅            | ✅             | ✅          | ✅                |
| `client` | ✅            | ❌             | ✅          | ❌                |

---

## API Routes

| Method | Path                           | Auth     | Description              |
|--------|--------------------------------|----------|--------------------------|
| GET    | `/api/auth/me`                 | Required | Get current user profile |
| POST   | `/api/auth/setup`              | Required | Link/create portal user  |
| GET    | `/api/team`                    | Required | List team members        |
| GET    | `/api/phases`                  | Required | List project phases      |
| PATCH  | `/api/phases/[id]`             | Team+    | Update phase status      |
| GET    | `/api/tasks`                   | Required | List all tasks           |
| POST   | `/api/tasks`                   | Team+    | Create a task            |
| PATCH  | `/api/tasks/[id]`              | Required | Update task              |
| DELETE | `/api/tasks/[id]`              | Team+    | Delete task              |
| GET    | `/api/tasks/[id]/comments`     | Required | List task comments       |
| POST   | `/api/tasks/[id]/comments`     | Required | Add a comment            |
| GET    | `/api/stats`                   | Required | Dashboard statistics     |

---

## Local Development

```bash
# Create .env file
cp .env.example .env
# Fill in your Supabase credentials

# Install and run
npm install
npm run dev
```

> The original Express dev server still works locally. For production, the Vercel serverless functions take over.

---

## Project Structure

```
mfts-portal/
├── api/                    # Vercel serverless functions
│   ├── _auth.ts           # JWT verification + Supabase Admin
│   ├── _db.ts             # Drizzle + pg pool (serverless)
│   ├── _storage.ts        # Storage class (DB operations)
│   ├── auth/
│   │   ├── me.ts          # GET /api/auth/me
│   │   └── setup.ts       # POST /api/auth/setup
│   ├── phases.ts          # GET /api/phases
│   ├── phases/[id].ts     # PATCH /api/phases/:id
│   ├── tasks.ts           # GET/POST /api/tasks
│   ├── tasks/[id].ts      # GET/PATCH/DELETE /api/tasks/:id
│   ├── tasks/[id]/
│   │   └── comments.ts    # GET/POST /api/tasks/:id/comments
│   └── stats.ts           # GET /api/stats
├── client/                 # React frontend (Vite)
│   └── src/
│       ├── lib/
│       │   ├── auth-context.tsx  # Auth state management
│       │   ├── queryClient.ts    # API client with JWT injection
│       │   └── supabase.ts       # Supabase client
│       ├── pages/
│       │   ├── login.tsx         # Login page
│       │   ├── dashboard.tsx     # Dashboard
│       │   ├── task-board.tsx    # Task board
│       │   └── timeline.tsx      # Gantt timeline
│       └── components/
│           └── app-layout.tsx    # Sidebar with user info + logout
├── shared/
│   └── schema.ts           # Drizzle schema (Postgres tables)
├── seed.sql                # Seed data (team, phases, tasks, comments)
├── vercel.json             # Vercel deployment config
├── drizzle.config.ts       # Drizzle Kit config
└── DEPLOY.md               # This file
```
