# UI Status — Phase 0 Foundation

Last updated: 2026-02-20

---

## 2026-02-22 — Journal Slide-over Reintegration ✅

**Status**: Complete ✅
**Commit**: fix(journal): restore trade detail slide-over alongside notebook

### What was done
- Identified that the `TradeDetailPanel` still existed natively inside `src/components/journal/trade-detail-panel.tsx`.
- Integrated `trade-detail-panel.tsx` directly into the bottom of `journal-client.tsx`, maintaining z-index precedence so it correctly layers above the `NotebookPanel` layout blocks.
- Appended a dedicated `Info` (ℹ) button trigger immediately within the `TradeRow` rows component. Propagated click captures orthogonally via `onInfoTrade` mappings tied to a new isolated `detailedTrade` state hook.
- Ensured existing trade row clicks purely update the Notebook contents. Both interactions live seamlessly together.
- Substituted `button` elements mapping the info trigger for semantically sound div roles + tabs to satisfy generic Next.js hydration descendant warnings without side-effects.

---
## 2026-02-22 — Command Center Layout Optimization ✅

**Status**: Complete ✅
**Commit**: fix(dashboard): remove customize mode, fixed layout only

### What was done
- **Customization Deprecation**: Re-wrote `src/components/dashboard/command-center-client.tsx` to completely remove the `react-grid-layout` ecosystem, purging all dynamic block handling, drag-and-drop operations, and custom layouts configuration arrays.
- **Backend Clean-up (frontend side)**: Severed all usages of the deprecated `/api/dashboard/layouts` route. Ripped out `layoutsQuery`, the layout saving mutations, hooks, state variables, and icons representing customization intent (`Settings2`, `Save`, `RotateCcw`, `Check`, `X`).
- **Fixed Layout Solidification**: The front page Command Center dashboard represents a rigid layout configuration displaying the 7 essential component widgets (Balance / Drawdown, Equity Curve, Daily P&L, Win Rate, Prop Rules, Recent Trades, Goals) reliably rendering on all loads instantly, without any editing interfaces.

**Verified by**: tsc ✅ | build ✅ | Browser Subagent ✅

---

## 2026-02-22 — Trade Journal Permanent Notebook Layout ✅

**Status**: Complete ✅
**Commit**: feat(journal): add always-visible notebook panel

### What was done
- **Layout Restructuring**: Updated `src/components/journal/journal-client.tsx` to transition from a slide-over details panel to a permanent 60/40 width split layout (`flex-row`). The left side houses the grouped trades list, retaining its selection logic.
- **NotebookPanel Component**: Created a new `NotebookPanel` component (`src/components/journal/notebook-panel.tsx`) occupying the right 40% of the screen.
  - Dynamically displays "Trade Notes" with symbol and date or "Daily Journal" if no trade is selected.
  - Features a `textarea` utilizing `JetBrains Mono` and explicit dark theme aesthetics (`#14171E` background, `#2A2F3E` border, `#E8EAF0` text).
- **API Integration**: Linked the "Save Notes" button directly to the existing `PATCH /api/trades/[id]` endpoint, transmitting the modified notes string and displaying a transient "Saved ✓" confirmation UI. State syncs automatically when new trades are selected.

**Verified by**: tsc ✅ | build ✅ | Browser Subagent ✅

---

## 2026-02-22 — Analytics Tooltips Fix ✅

**Status**: Complete ✅
**Commit**: fix(analytics): dark theme tooltips with color-coded values

### What was done
- **KpiCards**: Added `TooltipProvider`, `Tooltip`, `TooltipTrigger`, and `TooltipContent` wrappers inside `KpiCard` component in `src/components/analytics/kpi-cards.tsx` to display full metrics. Value colors dynamically update (`#22C55E` for >0, `#EF4444` for <0) and background strictly set to `#14171E` with `#2A2F3E` stroke.
- **Charts**: Replaced Recharts standard component default config with a bespoke `<CustomAnalyticsTooltip>` component in `src/components/analytics/charts.tsx`. Now renders a dark theme tooltip matching spec on all `LineChart` and `BarChart` instances.
- **Calendar Heatmap**: Ripped out standard native HTML `title` attributes and replaced them with shadcn `@/components/ui/tooltip` implementations for uniform style over hovering daily P&L blocks.

**Verified by**: tsc ✅ | build ✅ | Browser Subagent ✅

---

## 2026-02-22 — Prop Firm Maximum Loss Limit (MLL) Feature ✅

**Status**: Complete ✅
**Commit**: fix(prop): add maximum loss limit MLL rule

### What was done
- **Schema & DB**: Altered `prop_templates` to include `max_loss_limit numeric(10,2)` globally for templates. Updated `src/lib/db/schema.ts` and `PropTemplate` typescript types.
- **Rule Engine**: Appended MLL evaluation into `src/lib/services/prop-rule-engine.ts`. Evaluates to violation if the absolute sum of all losing days exceeds the configured MLL. Emits a warning at 80% utilization.
- **API**: Updated the POST and PATCH logic in `src/app/api/prop/templates/route.ts` and `[id]/route.ts` to seamlessly deserialize and patch `maxLossLimit` template boundaries.
- **UI**: Displayed a brand new `Maximum Loss Limit ($)` input in `src/components/prop/prop-client.tsx` using a clean disabled `$` icon, and securely linked it to the `onSave` logic. `RuleLabels` constant updated to render the MLL inside evaluations accurately.

**Verified by**: tsc ✅ | build ✅ | Browser Subagent ✅

---

## 2026-02-22 — Prop Firm Consistency Rule Fix ✅

**Status**: Complete ✅
**Commit**: fix(prop): consistency rule treats value as % not $

### What was done

#### Server: Consistency Rule Calculation (`src/lib/services/prop-rule-engine.ts`)
- Fixed logic so the "Consistency" rule interprets the configured value as a percentage instead of a dollar amount.
- The rule now dynamically calculates the maximum allowed single-day P&L by multiplying the configured percentage by the target profit (`(consistencyPct / 100) * Math.max(0, profitTarget)`).
- Previous logic was statically comparing the single day's percentage out of the current total profit against the configuration, which did not align with actual Prop Firm parameters.

#### Client: Template Editor UI (`src/components/prop/prop-client.tsx`)
- Updated the label for the Consistency field to: `"Max % of profit target allowed in a single day"`.
- Inserted a disabled `%` sign suffix inside the number input wrapper to clearly indicate the expected unit.
- Applied `min={1}` and `max={100}` constraints to the input HTML element.

**Verified by**: tsc ✅ | build ✅ | Browser Subagent ✅

---

## 2026-02-20 — Full Data Connectivity After Import ✅

**Status**: Complete ✅
**Commit**: fix: full data connectivity after import across all pages

### What was done

#### Server: recalcSummaries after import (`src/lib/import/run-import.ts`)
- Step 7.5 added: after `reconstructTrades`, collect distinct (accountId, tradingDay) pairs from all inserted fills
- Process days **sequentially per account in ascending date order** — ensures each day's `cumulative_pnl` correctly sums prior days (parallel would cause race condition where D2 reads D1 before it's written)
- Multiple accounts processed in parallel (they are independent)
- `recalcSummaries` completes before `finalizeBatch` and HTTP response — import does not return until summaries are ready

#### Server: Data relationship verification
- `GET /api/analytics/summary` — filters by `user_id` + `account_id` ✅
- `GET /api/analytics/daily` — filters by `user_id` + `account_id` ✅
- `GET /api/analytics/breakdowns` — filters by `user_id` + `account_id` ✅
- `GET /api/dashboard/widgets` — all 8 sub-queries filter by `account_id` + `user_id` ✅
- `GET /api/prop/evaluations/[id]/status` — ownership-checks eval then passes `account_id` to evaluateRules ✅
- No data bleeds between accounts

#### Client: Query invalidation (`src/components/import/import-modal.tsx`)
- On successful import: invalidates `trades`, `analytics-summary`, `analytics-daily`, `analytics-breakdowns`, `dashboard-widgets`, `prop-evaluations`, `eval-status`
- Added `queryClient.invalidateQueries()` (no args) as blanket safety net — marks ALL cached queries stale
- Any mounted component refetches immediately; any future mount gets fresh data

#### Client: Account filter verification
- Analytics page: `accountId = accountIds[0]` from Zustand → passed to all 3 API calls ✅
- Command Center: `accountId = accountIds[0]` from Zustand → passed to `/api/dashboard/widgets` ✅
- Prop HQ: each eval card loads status by `evaluation.id` (DB already knows correct `account_id`) ✅

### End-to-end flow (verified by code trace)
1. User selects account in toolbar → Zustand `accountIds[0]` set
2. Import modal upload → `/api/import` → fills inserted → trades reconstructed → recalcSummaries per day/account (sequential, parallel across accounts) → HTTP 200
3. Modal: `setPhase("complete")` → 7 specific invalidations + blanket `invalidateQueries()`
4. Dashboard (if mounted): `['dashboard-widgets']` refetches → balance, equity, daily P&L, win rate, prop rules all update
5. Analytics (if mounted): `['analytics-summary/daily/breakdowns']` refetch → KPI cards and charts update
6. Prop HQ (if mounted): `['prop-evaluations']` + `['eval-status']` refetch → account cards update
7. Journal (if mounted): `['trades']` refetches → trade list updates

**Verified by**: tsc ✅ | build ✅ (0 errors, 0 warnings) | commits ✅ c363716, fix applied

---

## Phase 4 — Fully Configurable Prop Template Manager (2026-02-20) ✅

### Overview
Rebuilt the prop template manager with a new dynamic `rules_json` schema using a stages array instead of hardcoded eval/pa/funded keys.

### Schema Change
- **Old**: `{ evaluation: StageRules, pa: StageRules, funded: StageRules }`
- **New**: `{ stages: [{ key: string, label: string, rules: StageRules }] }`
- All 5 rules per stage: `profitTarget`, `maxDailyLoss`, `maxTrailingDrawdown`, `minTradingDays`, `consistencyPct`

### New Files
- `src/lib/prop-migrate.ts` — pure `migrateRulesJson()` function, importable from client + server; detects old format and converts; idempotent on new format

### Rule Engine
- Added `maxTrailingDrawdown` rule: tracks worst (running_cumulative_pnl - peak) across all trading days
- `getStageRules()` now uses `stages.find(s => s.key === stage)`, falls back to first stage
- Both `maxDailyLoss` and `maxTrailingDrawdown` use 20% warning zone

### API Changes
- `GET /api/prop/templates`: applies `migrateRulesJson` to all rows before returning; LucidFlex 50K seed uses new format
- `POST /api/prop/templates`: normalizes rulesJson to new format before storing
- `GET /api/dashboard/widgets`: updated to use `migrateRulesJson` for threshold lookup

### UI Changes (`prop-client.tsx`)
- **TemplateEditor**: full rewrite — toggle switches per rule (on/off), per-stage editable labels, add/remove/reorder stages, inline delete confirmation
- **Configure modal**: stage dropdown is dynamic from selected template's stages array; resets to first stage on template change
- **EvalCard**: dynamic stage labels/colors from template; "Advance to X" button uses template stage order
- **Advance modal**: uses dynamic stage labels from template stages array
- **Payout modal**: stage labels also dynamic

**Verified by**: tsc ✅ | build ✅ (0 errors, 0 warnings) | commit ✅ 4e7e824

---

## Phase 4 — Prop Page Fixes (2026-02-20) ✅

### BUG 1 — TemplateEditor crash fixed
- Normalize rules_json before `useState` — all 3 stages always get default values via `{ ...DEFAULT_STAGE_RULES, ...(rules_json?.stage ?? {}) }` pattern

### FEATURE 1 — Configure modal
- Gear icon on every account card (EvalCard + NoEvalCard)
- 7-field modal: account name, starting balance, template dropdown, stage, status, start date (auto-fetched from earliest daily_summary trading_day), profit target override
- Save: PATCH /api/accounts/[id] + PATCH or POST /api/prop/evaluations
- Auto-detects LucidFlex template for LFE* account names
- New API: GET + PATCH /api/accounts/[id] (returns account + earliestTradingDay)
- Migration: profit_target_override column added to prop_evaluations

### FEATURE 2 — All accounts visible
- accountsWithoutEval already computed from accounts query minus activeEvalAccountIds
- NoEvalCard now shows "No evaluation configured" + Configure button

**Verified by**: build ✅ (0 errors, 0 warnings) | tsc ✅ | commit ✅ c39e27b

---

## Phase 4 — Command Center + Prop Firm HQ ✅

### 2026-02-20 — Phase 4 Complete
**Status**: Complete ✅
**What was done**:
- `src/types/prop.ts` — RuleResult, EvaluateRulesResult, PropTemplate, PropEvaluation, Payout types
- `src/types/dashboard.ts` — WidgetData and all 7 widget data shapes
- `src/lib/services/prop-rule-engine.ts` — evaluateRules() with 4 rules (maxDailyLoss w/ 20% warning zone, minTradingDays, consistency, profitTarget)
- API routes: `/api/prop/templates`, `/api/prop/evaluations`, `/api/prop/evaluations/[id]/status`, `/api/prop/payouts` (all CRUD)
- API routes: `/api/dashboard/widgets` (8 parallel queries), `/api/dashboard/layouts` (layout persistence)
- `react-grid-layout` v2.2.2 installed; CSS via direct node_modules paths for Turbopack
- 7 dashboard widget components: balance/drawdown, equity curve (Recharts), daily P&L, win rate, prop rules, recent trades, goals
- `command-center-client.tsx` — overview mode (fixed Tailwind grid) + custom mode (react-grid-layout v2 with useContainerWidth)
- `prop-client.tsx` — account cards with live rule status, payout tracker table, template manager
**Verified by**: build ✅ (0 errors, 0 warnings) | commit ✅ 6e6b261
**Key learnings**:
- react-grid-layout v2: no WidthProvider — use `useContainerWidth()` hook, pass `width` prop
- react-grid-layout v2: `isDraggable`/`isResizable` → `dragConfig={{ enabled }}`/`resizeConfig={{ enabled }}`
- react-grid-layout v2: `Layouts` → `ResponsiveLayouts`, `onLayoutChange(layout, allLayouts)` sig unchanged
- `eval` is a reserved JS word — cannot use as prop name in strict mode
- TanStack Query v5: `onSuccess` removed from `useQuery` — use `useEffect` reacting to `query.data`
**Next**: Phase 5 — Finance + Ledger + Leak Detector

---

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

---

## Session Summary — 2026-02-19

**What was built (Phase 2: Trade Journal):**
- `GET /api/trades` — authenticated endpoint with 6 filter params, returns trades with embedded fills + tags, ordered by day/time DESC.
- `PATCH /api/trades/[id]` — updates notes, tradingview_link, strategy_id with ownership check.
- `GET /api/strategies` — active strategies list for dropdown.
- `src/types/trades.ts` — shared `Trade`, `TradeFill`, `TradeTag`, `Strategy` types.
- `journal-client.tsx` — client component: TanStack Query, trades grouped by day, loading skeleton, empty state, error retry.
- `trade-detail-panel.tsx` — right slide-over with fills table, editable annotations (save on blur/change), save feedback states, grade placeholder.
- `journal/page.tsx` — replaced placeholder with real page.

**Bug fixed (Filter Wiring):**
- All toolbar dropdowns were dead UI — no handlers, never called Zustand. Fixed by rewriting `global-toolbar.tsx` with a real `FilterDropdown` (fixed-position menu via `getBoundingClientRect`, outside-click + Escape to close, checkmarks, active state on trigger).
- Added `GET /api/accounts`, `/api/instruments`, `/api/sessions` to populate dropdowns.
- Removed `overflow-x: auto` from toolbar header — it was promoting `overflow-y` to `auto` and would have clipped dropdown menus.

**Key decisions:**
- Dropdown uses `position: fixed` (not absolute) to escape toolbar's overflow context.
- Journal page is a server component wrapping a client component — allows `metadata` export while keeping interactivity.
- `queryKey` includes all Zustand filter values so any store change triggers a TanStack Query refetch automatically.

**Exact next steps:**
1. Manual browser verification: open `/journal`, confirm trades display, panel opens, notes save, date preset changes reload list.
2. Phase 3: Analytics Lab — KPI row (`net_pnl`, `win_rate`, `profit_factor`, `avg_win`, `avg_loss`, `expectancy`) + Recharts equity curve + breakdown chart.
3. Middleware auth guard — redirect unauthenticated users to `/login`.
4. Command Center — replace placeholder with real widget grid using daily summary data.

---

## Phase 3 — Analytics Lab + Grading ✅

Last updated: 2026-02-19

### Services
- `src/lib/services/recalc-summaries.ts` — `recalcSummaries(userId, accountId, tradingDay)`: queries closed trades, computes 17 metrics, upserts daily_summaries with cumulative P&L
- `src/lib/services/grading.ts` — `computeGrade(scores, categories)`: weighted average → letter grade (A/B/C/D); `createAutoGrade(categories)`: mid-point scores

### API Routes
- `PATCH /api/trades/[id]` — wired recalcSummaries call after every trade update (non-fatal, catch swallowed)
- `GET /api/analytics/summary` — aggregates daily_summaries range into 12-field AnalyticsSummary
- `GET /api/analytics/daily` — raw daily_summaries rows as DayResult[], sorted ASC
- `GET /api/analytics/breakdowns` — trades grouped by instrument/session/strategy + R-multiples + durations arrays
- `POST /api/analytics/recalc` — bulk recalc all days for an account
- `GET/POST /api/grading/rubrics` — list + create rubrics with categories
- `PATCH/DELETE /api/grading/rubrics/[id]` — update (name/isDefault) + delete; isDefault=true clears all others first
- `GET/POST /api/grading/rubrics/[id]/categories` — list + add categories
- `PATCH/DELETE /api/grading/categories/[id]` — update + delete (ownership via rubric join)
- `GET/POST /api/trades/[id]/grade` — fetch grade with rubric/categories; upsert via server-side computeGrade

### Analytics UI
- `src/app/(app)/analytics/page.tsx` — server wrapper → AnalyticsClient
- `src/components/analytics/analytics-client.tsx` — 3 TanStack Query hooks, responds to Zustand accountId + datePreset, empty state when no account
- `src/components/analytics/kpi-cards.tsx` — 8 KPI cards in 2/4-col grid: Net P&L, Win Rate, Profit Factor, Avg R, Total Trades, Avg Win/Loss, Largest Win/Loss, Best/Worst Day
- `src/components/analytics/charts.tsx` — 8 recharts charts: equity curve, daily P&L, calendar heatmap (custom grid), R-multiple histogram, 3 horizontal breakdown charts, duration histogram; all handle empty state

### Grading UI
- `src/app/(app)/settings/grading/page.tsx` — server wrapper → GradingSettingsClient
- `src/components/settings/grading-settings-client.tsx` — accordion rubric list, inline category add/edit/delete, weight sum validation, set-default button
- `src/components/journal/grade-section.tsx` — trade detail panel grade section: no-rubric state, grade-this-trade button, live slider editor with computed score preview, letter grade badge + score breakdown display

### Types
- `src/types/analytics.ts` — DayResult, AnalyticsSummary, BreakdownEntry, AnalyticsBreakdowns
- `src/types/grading.ts` — RubricCategory, Rubric, TradeGrade, ComputeGradeResult

**Verified by**: build ✅ (0 errors, 0 warnings, 25 files, 3726 insertions) | tsc --noEmit ✅ | browser ⚠️ (manual required) | DB query ⚠️ (manual required — run POST /api/analytics/recalc after importing data)

**Next**: Phase 4 — Command Center + Prop Firm HQ. First action: run POST /api/analytics/recalc in browser to populate daily_summaries for existing import data.

---

## Phase 5 — Finance Hub UI Polish Fixes ✅

Last updated: 2026-02-24

### Completed Polish Tasks
1. **Recurring Expense to Subscription**:
   - Added `addToSubscriptions` state to the `<ExpensesTab />` form.
   - When marking an expense as recurring, users now see a conditional "Also add to subscriptions" checkbox.
   - On submission, if checked, it automatically hits `POST /api/finance/subscriptions` to duplicate the entry in the subscriptions list under the appropriate vendor/category.
2. **Payouts Account Select Population**:
   - Fixed the empty dropdown in the Add Payout dialog on the `<PayoutsTab />` by correctly accessing `json.accounts` instead of `json.data` from the `/api/accounts` endpoint.
   - Added fallback `isLoading` and `empty` states for proper UI feedback.
### Tooltip Styling
   - Applied dark theme formatting `#14171E` background, `#2A2F3E` border, `#E8EAF0` text, and conditional positive/negative coloring (`#22C55E` / `#EF4444`) to chart tooltips within `src/components/finance/overview-tab.tsx`. 

**Verified by**: build ✅ | tsc --noEmit ✅

---

## Phase 6 — Finance Manager Final Tabs (Cash Flow, Reports, Settings) ✅

Last updated: 2026-02-24

### Completed Components
1. **Cash Flow Tab**:
   - `src/components/finance/cashflow-tab.tsx`: Implements real-time analysis rendering Net Cash Position and burn rates. Subagent browser verified Sankey charts and bar charts layout.
2. **Reports Tab**:
   - `src/components/finance/reports-tab.tsx`: 4 robust performance report cards (Monthly, Yearly, Subscriptions, Prop Firm Profitability). Handles dynamic `generateHtml` for seamless print-ready layouts.
3. **Settings Tab**:
   - `src/components/finance/settings-tab.tsx`: Read and write configurations for `fiscal_year_start`, `vendor_presets`, and `custom_tags` via `/api/finance/settings`. Checked and confirmed persisted properly to Supabase.
   - Removed standard `use-toast` dependence in favor of standard resilient alerts per system spec.

**Verified by**: build ✅ | tsc --noEmit ✅ | browser_subagent ✅ | database `execute_sql` ✅

---

## Phase 6 � Business Ledger Page ?

Last updated: 2026-02-24

### Completed Components
1. **API Endpoints**:
   - `GET /api/ledger`: Built a unified aggregation endpoint fetching data from `trades`, `expenses`, `finance_payouts`, `subscriptions`, `ledger_entries`, and `prop_evaluations`. Computes 8 KPIs (Total Revenue, Total Expenses, Net Profit, ROI, Monthly Recurring, Total Funding, Funded Accounts, Payback Period) and 5 Prop Firm Funnel stats.
   - `POST /api/ledger`: Handles manual entry creation.
   - `PATCH /api/ledger/[id]` & `DELETE /api/ledger/[id]`: Manages editing and deletion of explicitly manual entries with Next.js 15 dynamic Route handler parsing (`await params`).
2. **Business Ledger UI**:
   - `src/components/ledger/ledger-client.tsx`: Implemented standard AppRouter `page.tsx` rendering a high-density financial dashboard.
   - Features 8 KPI Cards with specialized Tailwind semantic colors (emerald/rose).
   - Dynamic Prop Firm Lifecycle Funnel visualizing e-vals purchased down to funded accounts.
   - Expense Breakdown Pie Chart via `recharts` with CustomTooltip component.
   - Unified "All Entries" Table showcasing mixed origin data (trades, payouts, expenses, manual) sorted chronologically with categorized badge labeling.
   - Add/Edit/Delete Modals hooked to `@tanstack/react-query` mutations, and CSV Export.

**Verified by**: build ? | browser_subagent ?
