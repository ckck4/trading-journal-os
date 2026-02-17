---
description: 
---

# Workflow: Build Trading Journal OS Spec (Futures / Tradeovate / LucidFlex 50K)

You are a senior product architect + UX lead + full-stack lead.

## Mission
Design and spec a COMPLETE futures day-trading journal suite with TradeZella-class capability, but you MUST create ORIGINAL UX/UI, ORIGINAL copy, ORIGINAL IA, and ORIGINAL implementation. Do NOT copy proprietary screens, layouts, text, icons, brand names, or code. Match capability depth, not trade dress.

## Non-negotiable Principles
### 1) Configurability-First (no hard-coded assumptions)
Everything must be configurable:
- Labels/names (sessions, strategies, accounts, instruments, tags, rules, grading metrics, dashboards)
- Times, sessions, time zones, day boundaries/rollovers (DST-safe)
- Currencies (USD/EUR) and display rules
- Prop rules (templates + custom)
- Risk definitions and R-multiple basis
- Dashboards/widgets, charts, filters, breakdown dimensions, scoring rubrics

### 2) Cohesive “Trading OS” Integration (no silos)
All modules must co-work as ONE integrated system:
- Single shared data model + single source of truth for: fills, trades, accounts, strategies, tags, rules, grades, routines, ledger.
- Any change anywhere updates everything automatically (dashboards, analytics, grading, prop funnels, goals, finance/ledger).
- Every insight must drill down to the underlying trades and allow edits that propagate everywhere.
- Global context must be consistent across the OS: selected account(s), date range, session, root instrument, strategy.

### 3) Explicit Removal
Do NOT implement “cost of mistakes” in any form.

## Fixed Requirements (DO NOT ask again; treat as facts)
- Platform: Web app (desktop-first, responsive)
- Asset class: Futures only
- Import source: Tradeovate CSV using FILLS as source of truth
- Import cadence: multiple imports/day supported; importer must be idempotent and dedupe-safe
- Multi-account: yes
- Account view modes: user can switch between
  - Separate-by-account mode AND
  - Unified multi-account mode
  using an account selector available OS-wide
- Prop firm: LucidFlex ONLY
- Default LucidFlex template: 50K
- Trading day rollover default: 18:00 America/New_York (DST-safe)
- Trading window preset (editable): flat by 4:45 PM ET; trading resumes 6:00 PM ET
- Analytics: root symbol only by default (auto-normalize contract month codes)
- Primary instruments presets: MNQ, MES, MGC
- Fees/commissions: configured in-app per root (optional per-account overrides)
- Trade grouping default: Flat-to-Flat (position 0 → nonzero → 0), with configurable alternatives + manual split/merge
- Strategy assignment default: auto-suggest by instrument + session; manual override per trade
- Strategies count: typically 1–2
- R-multiple: based on initial stop distance; input points preferred; allow points or price (default points)
- Market data: NO (fills-only analytics)
- TradingView: drag/drop screenshot attachments + optional link field
- Grading: supports BOTH
  - checkbox confluences
  - rubric categories (Setup / Execution / Risk / Psychology)
  Output both letter + numeric; rollups at daily/weekly/monthly
- Pre/Post market: routine reminders + one-click confirmation logs (no long forms)
- AI Coach: default insights-only; provide toggles/buttons for Action Plan + Pre-market Plan Draft
- “Yesterday Review” flow exists but is OPTIONAL and disableable

## LucidFlex 50K Default Templates (preload, but fully editable with versioning)
### Evaluation (50K)
- Profit target: $3,000
- Max Loss Limit: $2,000
- Consistency: ≤50% where Largest Single Day Profit / Account Profit
- Max size: 4 minis or 40 micros

### Payout (50K)
- Profit split: 90/10
- 5 trading days with profit, min daily profit = $150
- Positive net profit in payout cycle (>= $1)
- Min payout request $500
- Max payout: 50% of profit up to $2,000
- Up to 6 payouts per account before moved live

### Trading Window
- Must be flat by 4:45 PM ET
- Trading resumes 6:00 PM ET
(Holiday adjustments allowed; keep as configurable exceptions)

## Must-Have Modules (integrated, not isolated)
1) Command Center (dashboard)
2) Trade Journal
3) Analytics Lab
4) Strategies (playbooks)
5) Prop Firm HQ (LucidFlex)
6) Finance Manager (CFO dashboard)
7) Business Ledger (expenses/revenue/ROI)
8) Grading (configurable scorecards)
9) Leak Detector (descriptive analytics only)
10) AI Coach
11) Goals (habits/targets from real data)

---

# Required Output: Multi-file Spec Pack (write these files into the workspace)
Create the following folder structure and files. Ensure cross-consistency and OS integration:
- /docs/00_scope_positioning.md
- /docs/01_feature_map_user_stories.md
- /docs/02_cross_module_dataflows.md   (CRITICAL: “OS cohesion” explained with event flows)
- /docs/03_ia_navigation.md
- /db/01_schema.sql
- /db/02_data_dictionary.md
- /import/01_tradeovate_fills_mapping.md
- /import/02_dedupe_and_reconstruction.md
- /analytics/01_kpis_formulas.md
- /analytics/02_charts_catalog.md
- /ux/01_screens_inventory.md
- /ux/02_core_flows.md
- /ux/03_components_design_system.md
- /architecture/01_technical_architecture.md
- /architecture/02_security_privacy_exports.md
- /api/01_endpoints.md
- /tracking/01_event_tracking_plan.md
- /examples/01_example_payloads.json
- /tests/01_acceptance_criteria.md
- /plan/01_build_plan_mvp_and_phases.md

## Output Quality Bar
- Minimal manual labor: prioritize automation, defaults, templates, fast review loops.
- Visualization-first: charts/heatmaps/tables with fast filters.
- Luxury dark minimalist UI: high signal, low clutter.
- OS cohesion: every file must reflect one shared model (no contradictions).

---

# How to Work (do this in order)
## Step 1 — Generate 80% immediately (NO questions yet)
Immediately create ALL files above with strong content, using the fixed requirements.
For the import mapping and any parts that depend on exact CSV columns, write TODO placeholders and assumptions clearly.

## Step 2 — Ask ONLY the missing inputs (do NOT ask anything already answered)
Ask me ONLY these 3 things:
1) Paste Tradeovate FILLS CSV header row + 3 sample rows (I can redact IDs).
2) How accounts are identified in the file (column name + example values).
3) My DEFAULT above-the-fold Command Center widget preset: exactly 6 widgets.

Do NOT ask any other questions at this stage.

## Step 3 — Patch the remaining 20%
After I respond, update:
- /import/01_tradeovate_fills_mapping.md
- /import/02_dedupe_and_reconstruction.md
- /db/01_schema.sql (if needed)
- /analytics/* (if any mapping affects metrics)
- /ux/* (if widget preset affects Command Center layout)
- /tests/01_acceptance_criteria.md (add import + OS cohesion test cases)

## Step 4 — Consistency checks (required)
Before finishing, run a self-check and ensure:
- Any trade edit (tags/strategy/grade/R/notes) updates Analytics Lab, Grading rollups, Leak Detector signals, Goals, and Command Center widgets.
- Account selector + date/session filters behave consistently across all modules.
- Root symbol normalization works and can be overridden.
- Import is idempotent: re-importing the same file does not duplicate fills/trades.

Now begin Step 1.
