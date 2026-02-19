# UI Status — Phase 0 Foundation

Last updated: 2026-02-18

## Phase 0 — Foundation ✅

### Task 1: Root Layout ✅
- `src/app/layout.tsx` — Inter + JetBrains_Mono fonts via `next/font/google`
- Metadata: `title: "Trading Journal OS"` with template
- Wraps children in `<Providers>` (QueryClientProvider)
- `src/components/providers.tsx` — QueryClient with 60s staleTime

### Task 2: globals.css ✅
- Full design token system applied (`--color-bg-*`, `--color-text-*`, `--color-accent-*`, etc.)
- All shadcn/ui CSS variables overridden with our luxury dark palette
- Dark-only theme (`:root, .dark {}`)
- Accent: `#6C63FF` (indigo), bg: `#0D0F14`, surface: `#14171E`
- Custom scrollbar, selection highlight, semantic utility classes (`.text-profit`, `.text-loss`)
- Font: Inter (sans), JetBrains Mono (mono)

### Task 3: shadcn/ui ✅
- Initialized with `npx shadcn@latest init --defaults`
- `components.json` created (new-york style, dark, cssVariables, lucide icons)
- `src/lib/utils.ts` — `cn()` helper (clsx + tailwind-merge)
- Deps installed: `clsx`, `tailwind-merge`, `tw-animate-css`

### Task 4: AppShell ✅
- `src/components/layout/sidebar.tsx`
  - All 11 main nav items from `docs/03_ia_navigation.md` with Lucide icons
  - Collapsible to 60px icon rail (toggles via ChevronLeft/Right)
  - Active state: accent color + muted background highlight
  - Badge support for ungraded trades / prop warnings
  - Bottom section: Import, Settings, Account
- `src/components/layout/app-shell.tsx`
  - Flex layout: sidebar + main area (toolbar + scrollable content)
- `src/app/(app)/layout.tsx` — AppShell wrapper for all authenticated routes

### Task 5: Global Toolbar ✅
- `src/components/layout/global-toolbar.tsx`
  - Account selector, Date range (preset pills), Session, Instrument, Strategy filter dropdowns
  - Import action button (accent color)
  - 52px height matching sidebar header
- `src/stores/filters.ts` — Zustand store for all filter state (accountIds, datePreset, dateRange, sessions, instruments, strategies)

### Task 6: Auth Pages ✅
- `src/app/(auth)/layout.tsx` — centered auth layout
- `src/app/(auth)/login/page.tsx` — email/password sign-in via Supabase `signInWithPassword`
- `src/app/(auth)/register/page.tsx` — sign-up with confirm password validation, success state
- Both pages use design system tokens (dark card, accent inputs, destructive error states)

### Task 7: Placeholder Pages ✅ (29 routes)

| Route | File | Status |
|-------|------|--------|
| `/` | `(app)/page.tsx` | ✅ |
| `/journal` | `(app)/journal/page.tsx` | ✅ |
| `/journal/calendar` | `(app)/journal/calendar/page.tsx` | ✅ |
| `/journal/[tradeId]` | `(app)/journal/[tradeId]/page.tsx` | ✅ |
| `/analytics` | `(app)/analytics/page.tsx` | ✅ |
| `/analytics/[dimension]` | `(app)/analytics/[dimension]/page.tsx` | ✅ |
| `/strategies` | `(app)/strategies/page.tsx` | ✅ |
| `/strategies/[id]` | `(app)/strategies/[id]/page.tsx` | ✅ |
| `/prop` | `(app)/prop/page.tsx` | ✅ |
| `/prop/[evalId]` | `(app)/prop/[evalId]/page.tsx` | ✅ |
| `/finance` | `(app)/finance/page.tsx` | ✅ |
| `/ledger` | `(app)/ledger/page.tsx` | ✅ |
| `/ledger/new` | `(app)/ledger/new/page.tsx` | ✅ |
| `/grading` | `(app)/grading/page.tsx` | ✅ |
| `/leaks` | `(app)/leaks/page.tsx` | ✅ |
| `/coach` | `(app)/coach/page.tsx` | ✅ |
| `/goals` | `(app)/goals/page.tsx` | ✅ |
| `/settings/accounts` | `(app)/settings/accounts/page.tsx` | ✅ |
| `/settings/instruments` | `(app)/settings/instruments/page.tsx` | ✅ |
| `/settings/sessions` | `(app)/settings/sessions/page.tsx` | ✅ |
| `/settings/strategies` | `(app)/settings/strategies/page.tsx` | ✅ |
| `/settings/tags` | `(app)/settings/tags/page.tsx` | ✅ |
| `/settings/grading` | `(app)/settings/grading/page.tsx` | ✅ |
| `/settings/prop-templates` | `(app)/settings/prop-templates/page.tsx` | ✅ |
| `/settings/dashboard` | `(app)/settings/dashboard/page.tsx` | ✅ |
| `/settings/routines` | `(app)/settings/routines/page.tsx` | ✅ |
| `/settings/preferences` | `(app)/settings/preferences/page.tsx` | ✅ |
| `/settings/data` | `(app)/settings/data/page.tsx` | ✅ |
| `/login` | `(auth)/login/page.tsx` | ✅ |
| `/register` | `(auth)/register/page.tsx` | ✅ |

---

## Next Steps — Phase 3+

- [ ] Command Center: real KPI widget grid (BentoCard, KpiCard components)
- [ ] Analytics Lab: KPI row + chart area with Recharts
- [ ] Journal calendar view (`/journal/calendar`)
- [ ] Middleware auth guard: redirect unauthenticated users to `/login`

## Architecture Notes
- Route groups: `(app)` wraps all authenticated pages with AppShell; `(auth)` wraps login/register
- `src/app/page.tsx` has no default export (avoids conflict with `(app)/page.tsx` at `/`)
- Filter state: Zustand `useFiltersStore` — single source of truth for all global filters
- Supabase client: `src/lib/supabase/client.ts` (browser), `server.ts` (server components)

---

## Phase 2 — Trade Journal ✅

Last updated: 2026-02-19

### Task 1: GET /api/trades ✅
- `src/app/api/trades/route.ts`
- Auth via server client, DB reads via admin client
- Query params: `account_id`, `date_from`, `date_to`, `instrument`, `strategy_id`, `session_id`
- Returns trades ordered by `trading_day DESC`, `entry_time DESC`
- Includes embedded fills (sorted by fill_time ASC) + tags via `trade_tags → tags`
- All fields camelCase in response, typed with `src/types/trades.ts`

### Task 2: Trade Journal List Page ✅
- `src/app/(app)/journal/page.tsx` — server wrapper (metadata export)
- `src/components/journal/journal-client.tsx` — client component
  - TanStack Query with 30s staleTime; refetches on any filter change
  - Trades grouped by `trading_day`, day header shows date + count + daily net P&L
  - Trade row: time, instrument, side arrow, entry→exit price, duration, fills count, tags, net P&L, outcome badge
  - Click row → opens TradeDetailPanel (toggle off on second click)
  - Loading skeleton, empty state with import CTA, error state with retry

### Task 3: Trade Detail Panel ✅
- `src/components/journal/trade-detail-panel.tsx`
- Right slide-over (300ms ease, Escape key + backdrop click to close)
- Sections: header, summary metrics, fills table, annotations (strategy/notes/tv link), tags, grade placeholder
- Save feedback: Saving… / Saved / Save failed per field
- Invalidates trades query on successful save

### Task 4: PATCH /api/trades/[id] + GET /api/strategies ✅
- `src/app/api/trades/[id]/route.ts` — PATCH, ownership check, allowed fields only
- `src/app/api/strategies/route.ts` — GET active strategies for dropdown

### Shared Types ✅
- `src/types/trades.ts` — Trade, TradeFill, TradeTag, Strategy

**Verified by**: build ✅ (0 errors) | browser ⚠️ (manual required) | DB query ⚠️ (manual required)
**Next**: Phase 3 — Analytics Lab + Grading

---

## Phase 2 — Filter Wiring Fix ✅

Last updated: 2026-02-19

**Bug**: GlobalToolbar date/account/instrument/strategy/session dropdowns were dead UI — no onClick handlers, never called any Zustand setter. Clicking did nothing.

**Root cause #1**: `FilterDropdown` was a `<button>` with no interaction logic — no open state, no option list rendered, no store calls.

**Root cause #2**: Toolbar's `overflow-x: auto` creates an implicit `overflow-y: auto` context that clips absolute-positioned children (dropdowns). Any absolute dropdown would have been visually clipped by the header.

**Fix**:
- Rewrote `global-toolbar.tsx` with a real `FilterDropdown` component:
  - `useState(open)` + `position: fixed` menu (via `getBoundingClientRect`) escapes overflow clipping
  - `useEffect` outside-click and Escape-key listeners to close
  - Checkmark on selected option, accent color highlight
  - Active filter state visually indicated on the trigger button
- All 5 filters wired to Zustand setters: `setDatePreset`, `setAccounts`, `setInstruments`, `setStrategies`, `setSessions`
- Created `GET /api/accounts`, `GET /api/instruments`, `GET /api/sessions` endpoints to populate filter dropdowns
- Removed `overflow-x: auto` from toolbar header (was clipping dropdowns)
- Removed unused `netPnlNum` variable in `journal-client.tsx`

**Full chain verified**: toolbar click → Zustand setter → queryKey changes → TanStack Query refetches → journal list updates

**Verified by**: build ✅ (0 errors, 0 warnings) | browser ⚠️ (manual required)
