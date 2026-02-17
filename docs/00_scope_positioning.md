# Trading Journal OS — Scope & Positioning

## Vision
A **single-pane-of-glass operating system** for futures day-traders who import Tradeovate fills and trade under LucidFlex prop-firm rules. Every insight, score, and dollar figure traces back to real fills — no market-data feed, no black boxes.

## Tagline
> *"One import. Total clarity."*

## Target Persona
| Attribute | Detail |
|-----------|--------|
| Trader type | Futures day-trader (scalp / intraday) |
| Instruments | Micro / mini futures — MNQ, MES, MGC (configurable) |
| Broker | Tradeovate (fills CSV) |
| Prop firm | LucidFlex 50 K (preloaded; fully editable) |
| # accounts | 1–N (multi-account with unified or per-account view) |
| Strategies | 1–2 typical, unlimited configurable |
| Session | Flat-by-4:45 PM ET / resume 6:00 PM ET (editable per account) |

## What This System Is
| ✅ In scope | ❌ Out of scope |
|-------------|-----------------|
| Web app (desktop-first, responsive) | Native mobile app |
| Futures only | Equities / options / crypto |
| Tradeovate FILLS CSV import | Broker API live sync |
| Fills-only analytics (no market data) | Real-time P&L / DOM replay |
| LucidFlex prop-firm rules | Other prop firms (may be added later) |
| Manual TradingView screenshots + links | Embedded charting / market data |
| Configurable grading (checkbox + rubric) | Auto-grading from market data |
| AI Coach (insights + optional plans) | Autonomous AI trading signals |

## Design Philosophy

### 1. Configurability-First
Nothing is hard-coded: names, labels, sessions, times, time zones, rollover boundaries, currencies, accounts, contract fees, grading rubrics, dashboards, widgets, filters, prop rules, strategies, tags — **all configurable**.

### 2. OS Cohesion (No Silos)
Every module reads from and writes to the same shared model. A tag change on one trade ripples instantly through Analytics Lab, Grading roll-ups, Leak Detector signals, Goals progress, Command Center widgets, and Finance ledger. An account-selector or date-range change in the global toolbar applies everywhere.

### 3. Fills as Source of Truth
The only external data entering the system is the Tradeovate fills CSV. Trades are reconstructed from fills using Flat-to-Flat grouping (configurable). All metrics, grades, and financial reports derive from these reconstructed trades plus user annotations.

### 4. Automation over Paperwork
- Auto-grouping fills → trades
- Auto-suggesting strategy by instrument + session
- Auto-deduplication on re-import
- Pre/post-market routines: one-click confirmation, not long forms
- AI Coach generates insights by default; action plans on demand

### 5. Luxury Dark Minimalist UI
High signal, low clutter. Visualization-first: charts, heatmaps, compact tables with fast filters. Every number is clickable — drill down to the trade list, then to the individual trade detail.

## Modules Overview

| # | Module | Purpose |
|---|--------|---------|
| 1 | **Command Center** | Configurable dashboard — the trader's daily cockpit |
| 2 | **Trade Journal** | Chronological trade log with annotations, grades, screenshots |
| 3 | **Analytics Lab** | Multi-dimensional breakdowns, KPIs, charts |
| 4 | **Strategies** | Playbook management — rules, confluences, per-strategy analytics |
| 5 | **Prop Firm HQ** | LucidFlex rule tracking, evaluation funnel, payout tracker |
| 6 | **Finance Manager** | CFO view: net P&L, fees, payouts, account equity curves |
| 7 | **Business Ledger** | Expense/revenue/ROI tracking for the trading business |
| 8 | **Grading** | Configurable scorecards — checkbox + rubric, daily/weekly/monthly roll-ups |
| 9 | **Leak Detector** | Descriptive analytics to surface recurring losses/mistakes |
| 10 | **AI Coach** | Insight summaries, optional action plans + pre-market drafts |
| 11 | **Goals** | Habit + performance targets tied to real data |

## Day Boundary & Sessions
- **Trading day rollover**: 18:00 America/New_York (DST-safe) — configurable
- **Trading window preset**: flat by 4:45 PM ET; trading resumes 6:00 PM ET — configurable
- **Holiday exceptions**: manually configurable per date

## Currency & Display
- Default currency: **USD**
- Configurable: USD / EUR
- Decimal precision configurable per context (P&L, fees, R-multiples)

## Explicit Exclusions
- ❌ "Cost of mistakes" metric — **not implemented in any form**
- ❌ Market data integration
- ❌ Live broker API sync
- ❌ Non-futures asset classes
