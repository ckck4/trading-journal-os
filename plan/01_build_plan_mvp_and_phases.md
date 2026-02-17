# Build Plan — MVP & Phases

---

## Phase 0: Foundation (Week 1–2)

### Goal
Project scaffolding, database, auth, design system.

| Task | Effort | Priority |
|------|--------|----------|
| Next.js 15 scaffold (App Router, TypeScript, Tailwind, `src/` dir) | 0.5d | P0 |
| Supabase project + CLI init + local dev (`supabase start`) | 0.5d | P0 |
| SQL migrations (26 tables + RLS policies) + Drizzle schema | 2.5d | P0 |
| Seed data: instruments, sessions, LucidFlex 50K template | 0.5d | P0 |
| Supabase Auth: email/password + Next.js middleware + auth pages | 1.5d | P0 |
| shadcn/ui init + Tailwind theme (dark mode, Inter font) | 1d | P0 |
| AppShell: sidebar + toolbar + placeholder pages | 2d | P0 |
| GlobalContext: Zustand + nuqs URL state sync | 1d | P0 |
| Inngest setup: client + serve route + dev server verification | 0.5d | P0 |
| Supabase Storage: screenshots bucket + RLS policy | 0.25d | P0 |

**Deliverable**: Running app with Supabase Auth, sidebar navigation, dark mode, Inngest connected.

---

## Phase 1: Import Engine (Week 3–4)

### Goal
CSV upload → fills stored → trades reconstructed.

| Task | Effort | Priority |
|------|--------|----------|
| CSV upload endpoint (multipart) | 1d | P0 |
| CSV parser (column mapping, validation) | 2d | P0 |
| Root symbol normalizer | 0.5d | P0 |
| Fill hash + deduplication | 1d | P0 |
| Account resolution (detect + create) | 1d | P0 |
| Flat-to-Flat trade reconstruction | 3d | P0 |
| Commission computation (config cascade) | 1d | P0 |
| Trading day assignment (rollover logic, DST-safe) | 1d | P0 |
| Session matching | 0.5d | P0 |
| Strategy auto-suggest | 1d | P0 |
| Import modal UI (drag-drop, progress, validation report) | 2d | P0 |
| Import batch history + rollback | 1d | P1 |

**Deliverable**: User can import CSV, see reconstructed trades, re-import is idempotent.

---

## Phase 2: Trade Journal (Week 5–6)

### Goal
Browse, view, and annotate trades.

| Task | Effort | Priority |
|------|--------|----------|
| Trade list API (filtered, paginated) | 1d | P0 |
| Trade list UI (day-grouped, compact rows) | 2d | P0 |
| Trade detail panel (slide-over, fills table) | 2d | P0 |
| Inline edit: strategy, tags, R-value, notes | 2d | P0 |
| Screenshot upload + display | 1d | P0 |
| TradingView link field | 0.5d | P0 |
| Calendar view (heatmap) | 2d | P0 |
| Filter bar (instrument, strategy, tag, date, session) | 1d | P0 |
| Trade split / merge | 2d | P0 |
| Event emission on trade edit (trade.updated) | 0.5d | P0 |

**Deliverable**: Full trade journal with annotations, calendar view, split/merge.

---

## Phase 3: Analytics Lab + Grading (Week 7–9)

### Goal
KPIs, charts, breakdowns, grading.

| Task | Effort | Priority |
|------|--------|----------|
| Daily summaries materialization | 2d | P0 |
| KPI computation service | 2d | P0 |
| KPI cards UI | 1d | P0 |
| Equity curve chart | 1d | P0 |
| P&L distribution histogram | 1d | P0 |
| Breakdown bar charts (by dimension) | 2d | P0 |
| Calendar heatmap (analytics) | 1d | P0 |
| Day × Hour heatmap | 1d | P0 |
| Drill-down: chart → trade list | 1d | P0 |
| Grading rubric config UI | 2d | P0 |
| Trade grading UI (rubric categories + confluences) | 2d | P0 |
| Grade roll-up computation | 1d | P0 |
| Grade distribution chart | 0.5d | P0 |

**Deliverable**: Full analytics with 8+ chart types, configurable grading with roll-ups.

---

## Phase 4: Command Center + Prop Firm HQ (Week 10–11)

### Goal
Dashboard cockpit + LucidFlex rule tracking.

| Task | Effort | Priority |
|------|--------|----------|
| Widget grid (react-grid-layout) | 2d | P0 |
| Widget library (12+ widget types) | 3d | P0 |
| Dashboard customization UI (add/remove/resize) | 2d | P0 |
| Dashboard layout save/load | 1d | P0 |
| Prop template CRUD + LucidFlex 50K preset | 1d | P0 |
| Prop rule engine (profit target, max loss, consistency, size) | 2d | P0 |
| Prop evaluation dashboard UI | 2d | P0 |
| Payout tracker | 1d | P0 |
| Trading window check + warning | 1d | P0 |
| Evaluation funnel UI (pipeline view) | 2d | P0 |

**Deliverable**: Configurable dashboard + full LucidFlex prop tracking.

---

## Phase 5: Finance + Ledger + Leak Detector (Week 12–13)

### Goal
Financial overview, business accounting, loss pattern detection.

| Task | Effort | Priority |
|------|--------|----------|
| Finance Manager: CFO dashboard | 2d | P0 |
| Per-account equity curves | 1d | P0 |
| Fee breakdown charts | 1d | P0 |
| Business Ledger: CRUD entries | 2d | P0 |
| Ledger: auto-revenue from trading P&L | 1d | P0 |
| ROI calculation + monthly P&L statement | 1d | P0 |
| Leak Detector: signal generation algorithm | 3d | P0 |
| Leak signal cards UI | 1d | P0 |

**Deliverable**: CFO view, business ledger, automated leak detection.

---

## Phase 6: Strategies + Routines + Goals (Week 14–15)

### Goal
Playbook management, routines, habit tracking.

| Task | Effort | Priority |
|------|--------|----------|
| Strategy CRUD UI | 1d | P0 |
| Confluence template editor | 1d | P0 |
| Per-strategy analytics panel | 1d | P0 |
| Strategy versioning | 1d | P1 |
| Routine CRUD + items | 1d | P0 |
| Routine one-click completion UI | 1d | P0 |
| Goals CRUD + progress tracking | 2d | P1 |
| Streak computation | 1d | P1 |

**Deliverable**: Strategies with playbooks, routines with one-click completion, goals tracking.

---

## Phase 7: AI Coach + Polish (Week 16–17)

### Goal
AI insights, UX polish, performance tuning.

| Task | Effort | Priority |
|------|--------|----------|
| AI Coach: insights generation (OpenAI integration) | 3d | P1 |
| AI Coach: action plan generation | 1d | P1 |
| AI Coach: pre-market plan draft | 1d | P1 |
| "Yesterday Review" flow (optional) | 1d | P1 |
| Export: full backup JSON | 1d | P1 |
| Export: CSV (trades, summaries, ledger) | 1d | P1 |
| Keyboard shortcuts | 1d | P1 |
| Micro-animations + transitions | 2d | P1 |
| Performance optimization (query caching, lazy loading) | 2d | P1 |
| Responsive breakpoints testing | 1d | P1 |

**Deliverable**: AI Coach operational, full export, polished UX.

---

## Phase 8: Testing + Launch Prep (Week 18–19)

### Goal
E2E tests, acceptance criteria validation, deployment.

| Task | Effort | Priority |
|------|--------|----------|
| Unit tests: import engine, trade reconstruction, KPIs | 3d | P0 |
| Unit tests: prop rule engine, grading, leak detector | 2d | P0 |
| E2E tests: full import → journal → analytics flow | 2d | P0 |
| E2E tests: OS cohesion (edit propagation) | 1d | P0 |
| Acceptance criteria walkthrough (all AC-* items) | 2d | P0 |
| Vercel production deployment + Supabase prod migration | 1d | P0 |
| Documentation: user guide + README | 2d | P1 |

**Deliverable**: Tested, documented, deployed v1.0 on Vercel.

---

## Timeline Summary

| Phase | Duration | Focus |
|-------|----------|-------|
| Phase 0 | 2 weeks | Foundation |
| Phase 1 | 2 weeks | Import Engine |
| Phase 2 | 2 weeks | Trade Journal |
| Phase 3 | 3 weeks | Analytics + Grading |
| Phase 4 | 2 weeks | Dashboard + Prop |
| Phase 5 | 2 weeks | Finance + Leaks |
| Phase 6 | 2 weeks | Strategies + Goals |
| Phase 7 | 2 weeks | AI Coach + Polish |
| Phase 8 | 2 weeks | Testing + Launch |
| **Total** | **~19 weeks** | **Full MVP** |

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| CSV column mapping unknown | TODO placeholders + Step 2 user input |
| Trade reconstruction edge cases | Comprehensive unit tests in Phase 1 |
| Performance at 10K+ trades | Daily summaries materialization, index optimization |
| AI Coach API costs | Rate limiting, caching, toggle-based (opt-in) |
| Scope creep | Strict P0/P1 prioritization, no P2 in MVP |
