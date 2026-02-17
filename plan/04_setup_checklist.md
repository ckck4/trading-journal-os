# Setup Checklist — Manual Steps

> Complete these steps **once** before running the dev environment for the first time.

---

## 1. Accounts to Create

| Service | URL | What to Do |
|---------|-----|------------|
| **Supabase** | [supabase.com](https://supabase.com) | Create free account → "New Project" → name: `trading-journal-os`, region: closest, generate DB password → **save password** |
| **Vercel** | [vercel.com](https://vercel.com) | Create account → connect GitHub repo → import project (auto-detects Next.js) |
| **Inngest** | [inngest.com](https://inngest.com) | Create account → create app → note Event Key + Signing Key |
| **OpenAI** | [platform.openai.com](https://platform.openai.com) | Create API key (for AI Coach — can defer to Phase 7) |

---

## 2. Supabase Project Setup

### 2.1 Create Project
- [ ] Log in to Supabase → "New Project"
- [ ] Name: `trading-journal-os`
- [ ] Database password: **generate strong password → save to password manager**
- [ ] Region: choose closest
- [ ] Wait for project to provision (~2 min)

### 2.2 Get Connection Details
- [ ] Go to **Settings → API** → copy:
  - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
  - `anon (public) key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `secret key` (labeled "secret key" in the new dashboard, also known as the service role key) → `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Go to **Settings → Database** → copy:
  - `Connection string (URI)` → `DATABASE_URL` (for Drizzle migrations)

### 2.3 Enable Auth
- [ ] Go to **Authentication → Providers**
- [ ] Ensure **Email** provider is enabled (enabled by default)
- [ ] Optional: disable "Confirm Email" for dev (Auth → Settings → toggle off)

### 2.4 Create Storage Bucket
- [ ] Go to **Storage → Create Bucket**
- [ ] Name: `screenshots`
- [ ] Public: **No** (private)
- [ ] File size limit: 10 MB
- [ ] Allowed MIME types: `image/png, image/jpeg, image/webp`

### 2.5 Install Supabase CLI
```bash
# macOS/Linux
brew install supabase/tap/supabase

# Windows (via scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Or via npm (cross-platform)
npm install -g supabase
```

### 2.6 Link Local to Remote
```bash
supabase login
supabase link --project-ref <your-project-ref>
```

---

## 3. Vercel Project Setup

- [ ] Log in to Vercel → "Import Project" → select GitHub repo
- [ ] Framework preset: **Next.js** (auto-detected)
- [ ] Root directory: `./` (or wherever `package.json` is)
- [ ] Install Supabase integration: **Vercel → Integrations → Supabase** (auto-populates env vars)
- [ ] Install Inngest integration: **Vercel → Integrations → Inngest** (auto-populates env vars)
- [ ] Set remaining env vars (see Section 5)

---

## 4. Inngest Setup

### 4.1 Local Development
```bash
# Install CLI
npm install -g inngest-cli

# Start local dev server (run alongside npm run dev)
npx inngest-cli@latest dev
```

### 4.2 Production Keys
- [ ] Log in to [app.inngest.com](https://app.inngest.com)
- [ ] Create app
- [ ] Copy **Event Key** → `INNGEST_EVENT_KEY`
- [ ] Copy **Signing Key** → `INNGEST_SIGNING_KEY`

---

## 5. Environment Variables

Create `.env.local` in the project root (never commit this file):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://postgres:PASSWORD@db.xxxxxxxxxxxx.supabase.co:5432/postgres

# Inngest
INNGEST_EVENT_KEY=your-event-key
INNGEST_SIGNING_KEY=your-signing-key

# OpenAI (defer until Phase 7 — AI Coach)
# OPENAI_API_KEY=sk-...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### `.env.example` (commit this file)
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
OPENAI_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 6. CSV Sample Placement

- [ ] Export a Tradeovate FILLS CSV (even 1 day is fine)
- [ ] Place it in the project for testing:
  ```
  /test-data/
  ├── sample_fills_day1.csv       # Real export, 1 trading day
  ├── sample_fills_day2.csv       # Real export, 2nd day (for overlap tests)
  └── sample_fills_combined.csv   # Day 1 + Day 2 merged (for partial overlap E2E)
  ```
- [ ] Add `/test-data/` to `.gitignore` (contains real trade data)
- [ ] Verify CSV has the expected header:
  ```
  id,orderId,contractId,timestamp,tradeDate,action,qty,price,active,account,
  Fill ID,Order ID,Timestamp,Date,Account,B/S,Quantity,Price,Force,
  priceFormat,tickSize,Contract,Product,ProductDescription,commission
  ```

---

## 7. Local Dev Startup Sequence

Run these in order, each in a separate terminal:

```bash
# Terminal 1: Start Supabase (Postgres + Auth + Storage)
supabase start

# Terminal 2: Start Inngest dev server
npx inngest-cli@latest dev

# Terminal 3: Start Next.js
npm run dev
```

### First-Time Database Setup
```bash
# Run migrations (creates all 26 tables + RLS policies)
supabase db push

# Seed preset data (instruments, sessions, LucidFlex template)
supabase db reset    # This runs migrations + seed.sql
```

> [!CAUTION]
> `supabase db reset` drops and recreates the entire local database. Only use for initial setup or when you explicitly want a fresh start.

### Verify Everything Works
- [ ] Open `http://localhost:3000` → should show login page
- [ ] Open `http://localhost:54323` → Supabase Studio (check tables exist)
- [ ] Open `http://localhost:8288` → Inngest dev dashboard (check functions registered)

---

## 8. Production Deployment Checklist

When deploying to Vercel for the first time:

- [ ] Push code to GitHub `main` branch
- [ ] Vercel auto-deploys (or click "Deploy")
- [ ] Verify env vars are set in Vercel dashboard (Supabase + Inngest integrations should auto-populate)
- [ ] Run Supabase migrations against production:
  ```bash
  supabase db push --linked
  ```
- [ ] Verify production: visit URL → register → login → navigate

> [!CAUTION]
> **Before running `supabase db push --linked` on production**, review the migration diff. Supabase CLI will show you what SQL will execute. Never approve destructive operations without reviewing.
