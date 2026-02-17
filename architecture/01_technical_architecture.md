# Technical Architecture

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     NEXT.JS APP (VERCEL)                         │
│  Next.js 15 (App Router) / React 19 / TypeScript                │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐  │
│  │  Pages       │  Components  │  Stores      │  Server      │  │
│  │  (app/)      │  (shadcn/ui  │  (Zustand    │  Actions     │  │
│  │              │   + Tailwind)│   + nuqs)    │  (mutations) │  │
│  └──────────────┴──────────────┴──────────────┴──────────────┘  │
│                                                                   │
│  ┌──────────────┬──────────────┬──────────────┐                 │
│  │  API Routes  │  Inngest     │  Supabase    │                 │
│  │  (/api/*)    │  Functions   │  Client      │                 │
│  │  (REST)      │  (bg jobs)   │  (SSR + RLS) │                 │
│  └──────────────┴──────────────┴──────────────┘                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────────────┐
│                      SUPABASE (BaaS)                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ PostgreSQL   │  │ Supabase     │  │ Supabase     │          │
│  │ 15+ (+ RLS)  │  │ Auth         │  │ Storage      │          │
│  │ 26 tables    │  │ (JWT, OAuth) │  │ (screenshots)│          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | Next.js 15 (App Router), React 19, TypeScript | Full-stack, SSR/RSC, API routes, Vercel-native |
| State | Zustand + nuqs (URL state) + TanStack Query | Global state + URL-synced filters + data fetching with caching |
| Styling | Tailwind CSS 4 + shadcn/ui | Utility-first CSS + accessible component library |
| Charts | Recharts (or Tremor for dashboard) | Composable React charts, Tailwind-friendly |
| Grid | react-grid-layout | Dashboard widget drag/resize |
| Database | Supabase PostgreSQL 15+ | Managed Postgres with RLS, realtime, edge functions |
| ORM | Drizzle ORM | Type-safe, lightweight, SQL-first, Supabase-compatible |
| Auth | Supabase Auth | JWT managed by Supabase, SSR helpers for Next.js |
| File Storage | Supabase Storage | Screenshots, CSV backups — buckets with RLS policies |
| Background Jobs | Inngest | Event-driven functions, retries, cron, fan-out — no infra to manage |
| AI | OpenAI API (gpt-4o) | AI Coach insights, action plans |
| Testing | Vitest (unit), Playwright (e2e) | Fast, modern test runners |
| Hosting | Vercel | Serverless, edge network, preview deployments, Inngest integration |

## 3. Project Structure

```
/
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (auth)/                # Login, register (no sidebar)
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (dashboard)/           # Main app shell (with sidebar)
│   │   │   ├── layout.tsx         # AppShell: sidebar + toolbar + content
│   │   │   ├── page.tsx           # Command Center (/)
│   │   │   ├── journal/           # Trade Journal
│   │   │   ├── analytics/         # Analytics Lab
│   │   │   ├── strategies/        # Strategies
│   │   │   ├── prop/              # Prop Firm HQ
│   │   │   ├── finance/           # Finance Manager
│   │   │   ├── ledger/            # Business Ledger
│   │   │   ├── grading/           # Grading Overview
│   │   │   ├── leaks/             # Leak Detector
│   │   │   ├── coach/             # AI Coach
│   │   │   ├── goals/             # Goals
│   │   │   └── settings/          # Settings pages
│   │   └── api/                   # API Route Handlers
│   │       ├── import/            # CSV upload + batch endpoints
│   │       ├── trades/            # Trade CRUD
│   │       ├── analytics/         # KPI + breakdown endpoints
│   │       ├── prop/              # Prop templates + evaluations
│   │       ├── finance/           # Finance + ledger endpoints
│   │       ├── grading/           # Rubric + grade endpoints
│   │       ├── inngest/route.ts   # Inngest webhook handler
│   │       └── [...catchall]/     # Other REST endpoints
│   │
│   ├── components/                # React components
│   │   ├── ui/                    # shadcn/ui components (auto-generated)
│   │   ├── layout/                # AppShell, Sidebar, Toolbar, GlobalFilters
│   │   ├── data-display/          # KpiCard, DataTable, TradeRow, etc.
│   │   ├── charts/                # Chart wrappers (equity, heatmap, breakdown)
│   │   ├── import/                # ImportModal, ColumnMapper, ValidationReport
│   │   └── widgets/               # Dashboard widget components
│   │
│   ├── lib/                       # Core utilities
│   │   ├── supabase/
│   │   │   ├── client.ts          # Browser Supabase client
│   │   │   ├── server.ts          # Server-side Supabase client (cookies)
│   │   │   ├── admin.ts           # Service-role client (for Inngest jobs)
│   │   │   └── middleware.ts      # Auth middleware (refreshes session)
│   │   ├── inngest/
│   │   │   ├── client.ts          # Inngest client instance
│   │   │   └── functions/         # Background job definitions
│   │   │       ├── import-csv.ts          # CSV parse + dedup + insert
│   │   │       ├── reconstruct-trades.ts  # Flat-to-Flat reconstruction
│   │   │       ├── recalc-summaries.ts    # Daily summary materialization
│   │   │       ├── evaluate-prop-rules.ts # Prop rule evaluation
│   │   │       └── generate-insights.ts   # AI Coach generation
│   │   ├── db/
│   │   │   ├── schema.ts          # Drizzle schema definitions
│   │   │   ├── migrations/        # SQL migration files
│   │   │   └── queries/           # Reusable query builders
│   │   ├── domain/                # Pure domain logic (no DB dependency)
│   │   │   ├── trade-reconstruction.ts
│   │   │   ├── kpi-computation.ts
│   │   │   ├── fill-hash.ts
│   │   │   ├── trading-day.ts
│   │   │   ├── commission-cascade.ts
│   │   │   ├── grade-rollups.ts
│   │   │   └── prop-rules.ts
│   │   └── utils/                 # Shared helpers (format, parse, etc.)
│   │
│   ├── stores/                    # Zustand stores
│   │   ├── global-context.ts      # Account, date range, session, instrument
│   │   └── import-progress.ts     # Import modal state
│   │
│   ├── hooks/                     # Custom React hooks
│   │   ├── use-trades.ts          # TanStack Query: trades
│   │   ├── use-kpis.ts            # TanStack Query: KPIs
│   │   └── use-global-context.ts  # Zustand + nuqs sync
│   │
│   └── types/                     # Shared TypeScript types
│       ├── database.ts            # Generated from Drizzle schema
│       ├── api.ts                 # Request/response types
│       └── domain.ts              # Business domain types
│
├── supabase/
│   ├── config.toml                # Supabase CLI config
│   ├── migrations/                # SQL migrations (source of truth)
│   ├── seed.sql                   # Preset data (instruments, sessions, LucidFlex)
│   └── storage/                   # Storage bucket policies
│
├── .env.local                     # Local env vars (gitignored)
├── .env.example                   # Template for required env vars
├── components.json                # shadcn/ui config
├── drizzle.config.ts              # Drizzle ORM config
├── inngest.config.ts              # Inngest config
├── middleware.ts                  # Next.js middleware (Supabase auth refresh)
├── tailwind.config.ts             # Tailwind config
├── next.config.ts                 # Next.js config
├── package.json
└── tsconfig.json
```

## 4. Key Architectural Decisions

### Supabase Auth (replaces custom JWT)
- Supabase handles signup, login, token refresh, session management
- `@supabase/ssr` package for Next.js SSR cookie management
- Next.js middleware refreshes session on every request
- RLS policies on all tables enforce `auth.uid() = user_id`
- No custom auth code — delegate entirely to Supabase

### Row-Level Security (RLS)
Every table has RLS enabled with policies like:
```sql
CREATE POLICY "Users can only access their own data"
ON fills FOR ALL
USING (user_id = auth.uid());
```
This is defense-in-depth: even if application code has a bug, Postgres itself prevents cross-user data access.

### Inngest (replaces BullMQ + Redis)
Event-driven background functions hosted alongside the Next.js app:
```
import/upload → emits "import/csv.uploaded"
  → Inngest function: parse CSV, dedup, insert fills
  → emits "import/fills.inserted"
  → Inngest function: reconstruct trades (Flat-to-Flat)
  → emits "trades/reconstructed"
  → Inngest fan-out:
     ├─ recalc daily summaries
     ├─ evaluate prop rules
     ├─ detect leaks
     └─ invalidate caches
```

Benefits:
- No Redis required
- Automatic retries with backoff
- Event replay for debugging
- Built-in Vercel integration
- Cron support (daily leak analysis, AI insights)

### Server Actions vs API Routes
- **Server Actions**: Used for simple mutations (trade edits, tag add/remove, grade save)
- **API Routes**: Used for complex flows (CSV upload, analytics endpoints, export)
- Both go through Supabase client with RLS enforcement

### Data Fetching Strategy
- **Server Components**: Initial page load data (trades list, KPIs) — no loading spinners
- **TanStack Query**: Client-side refetching after mutations, polling for import progress
- **Supabase Realtime**: Optional — live widget updates when import completes on another tab

### Confirmation for Destructive Operations
All destructive database operations require explicit user confirmation:
- Import batch rollback → "This will delete N fills and M trades. Confirm?"
- Account deletion → "This will permanently delete all data for this account. Type account name to confirm."
- Trade split/merge → Preview shown before confirmation
- Rollover time change → "This will reassign trading days for all trades. Confirm?"
- Full data wipe → "Type DELETE to confirm"

### GlobalContext (URL-synced filters)
```
nuqs + Zustand for URL state synchronization:
  /?accounts=acc1,acc2&from=2025-01-01&to=2025-01-31&session=RTH&instrument=MNQ
```
- Every page reads from URL params via `useQueryStates` (nuqs)
- Zustand store syncs for non-URL state (e.g., sidebar collapsed)
- Server Components receive filters as searchParams

## 5. Deployment

### Vercel Production
```
Vercel Project
├── Framework: Next.js (auto-detected)
├── Build: next build
├── Runtime: Node.js 20
├── Env vars:
│   ├── NEXT_PUBLIC_SUPABASE_URL
│   ├── NEXT_PUBLIC_SUPABASE_ANON_KEY
│   ├── SUPABASE_SERVICE_ROLE_KEY
│   ├── INNGEST_EVENT_KEY
│   ├── INNGEST_SIGNING_KEY
│   └── OPENAI_API_KEY
└── Integrations:
    ├── Supabase (auto-configured)
    └── Inngest (auto-configured)
```

### Local Development
```
1. supabase start          # Local Supabase (Docker-based Postgres + Auth + Storage)
2. npx inngest-cli@latest dev  # Local Inngest dev server
3. npm run dev             # Next.js dev server (port 3000)
```
