---
trigger: always_on
---

# Trading Journal OS — Non-negotiable Rules

## 1) Configurability-first (no hard-coded assumptions)
Everything must be configurable: names/labels, sessions, times, time zones, rollover boundaries, currencies (USD/EUR), accounts, contract fees, grading rubrics, dashboards/widgets, filters, prop rules, strategies, tags.

## 2) Cohesive OS integration (no silos)
All modules must co-work as one integrated system with a single source of truth.
Any update in any module must automatically update dashboards, stats, scorecards, prop-firm funnels, goals, and business ledger.
Every insight must drill down to the underlying trades and edits must propagate everywhere.

## 3) Scope constraints
- Web app (desktop-first responsive)
- Futures only
- Import from Tradeovate FILLS CSV
- Root-symbol analytics by default (contract month auto-normalized)
- Fees/commissions configured in-app per root (optional per-account override)
- Market data integration: NO (fills only)
- TradingView: manual screenshot attachments + optional link

## 4) Explicit removal
Do NOT implement “cost of mistakes” in any form.

## 5) Prop firm default
LucidFlex preset library (default template 50K), fully editable with versioning.
Trading day rollover default: 18:00 America/New_York (DST-safe).
