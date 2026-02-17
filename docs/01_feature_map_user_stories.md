# Feature Map & User Stories

## Legend
- **P0** — MVP-critical (must ship in v1)
- **P1** — High-value, ship within first 2 sprints after MVP
- **P2** — Nice-to-have, phased later

---

## 1. Import Engine (P0)

### Features
| ID | Feature | Priority |
|----|---------|----------|
| IMP-01 | Upload Tradeovate FILLS CSV (drag-drop + file picker) | P0 |
| IMP-02 | Parse fills → normalize root symbols (strip contract month codes) | P0 |
| IMP-03 | Idempotent import — SHA-256 hash per fill row; skip exact duplicates | P0 |
| IMP-04 | Multi-account detection (column-based account ID) | P0 |
| IMP-05 | Flat-to-Flat trade reconstruction from fills | P0 |
| IMP-06 | Configurable grouping alternatives (manual split/merge) | P0 |
| IMP-07 | Import history log with undo/rollback per import batch | P1 |
| IMP-08 | Validation report (skipped/duplicate/error rows surfaced) | P0 |

### User Stories
- **US-IMP-01**: As a trader, I can drag-drop my Tradeovate fills CSV and see reconstructed trades within seconds so I spend zero time on data entry.
- **US-IMP-02**: As a trader, I can re-import the same file without creating duplicate trades so I never worry about corrupting my journal.
- **US-IMP-03**: As a multi-account trader, I can import a single CSV containing fills from multiple accounts and have them auto-separated.
- **US-IMP-04**: As a trader, I can manually split one trade into two or merge two trades into one if the auto-grouping doesn't match my intent.

---

## 2. Command Center — Dashboard (P0)

### Features
| ID | Feature | Priority |
|----|---------|----------|
| CC-01 | Configurable widget grid (drag, resize, add/remove) | P0 |
| CC-02 | Preset widget library (P&L, win rate, R-stats, streaks, equity curve, trade log preview, calendar heatmap, prop status, grade summary, goal progress) | P0 |
| CC-03 | Global filters: account selector, date range, session, instrument, strategy | P0 |
| CC-04 | Default 6-widget above-the-fold preset (user-configurable) | P0 |
| CC-05 | Save/load dashboard layouts | P1 |
| CC-06 | Real-time widget refresh on any data change (trade edit, import, grade) | P0 |

### User Stories
- **US-CC-01**: As a trader, I see my top 6 widgets immediately on login so I get the daily snapshot in under 2 seconds.
- **US-CC-02**: As a trader, I can rearrange/add/remove widgets to personalize my cockpit without touching code.
- **US-CC-03**: As a trader, when I switch the account selector from "All" to a single account, every widget updates instantly.

---

## 3. Trade Journal (P0)

### Features
| ID | Feature | Priority |
|----|---------|----------|
| TJ-01 | Chronological trade list (grouped by trading day) | P0 |
| TJ-02 | Trade detail panel: fills, P&L, fees, duration, R-multiple, tags, notes, grade, screenshots | P0 |
| TJ-03 | Inline edit: strategy, tags, notes, R-input (points/price), grade | P0 |
| TJ-04 | TradingView screenshot attachment (drag-drop) + optional link | P0 |
| TJ-05 | Bulk actions: tag, strategy assign, delete | P1 |
| TJ-06 | Calendar view toggle (heatmap by P&L or grade) | P0 |
| TJ-07 | Trade timeline (entry/exit markers on time axis without market data) | P1 |
| TJ-08 | Filter/search: by instrument, strategy, tag, grade, P&L range, date range, session | P0 |

### User Stories
- **US-TJ-01**: As a trader, I can scroll through my trades day-by-day and click any trade to see full detail including my fills breakdown.
- **US-TJ-02**: As a trader, I can add/change strategy, tags, grade, R-value, and notes inline and see the change reflected across the OS immediately.
- **US-TJ-03**: As a trader, I can drag-drop a TradingView screenshot onto a trade and it attaches instantly.
- **US-TJ-04**: As a trader, I can view a calendar heatmap colored by daily P&L or daily grade to spot patterns at a glance.

---

## 4. Analytics Lab (P0)

### Features
| ID | Feature | Priority |
|----|---------|----------|
| AL-01 | KPI dashboard: net P&L, win rate, profit factor, avg win/loss, expectancy, max drawdown, R-stats | P0 |
| AL-02 | Breakdown dimensions: instrument, strategy, session, day-of-week, hour-of-day, tag, account | P0 |
| AL-03 | Charts: equity curve, P&L distribution, R-distribution, win-rate over time, drawdown chart, cumulative R | P0 |
| AL-04 | Heatmaps: day-of-week × hour, instrument × strategy | P0 |
| AL-05 | Comparison mode: side-by-side strategy or instrument analysis | P1 |
| AL-06 | Drill-down: click any data point → filtered trade list | P0 |
| AL-07 | Export: CSV / PNG / PDF | P1 |
| AL-08 | Custom date range + rolling windows (7d, 30d, 90d, custom) | P0 |

### User Stories
- **US-AL-01**: As a trader, I can see my profit factor and expectancy broken down by strategy to know which playbook actually works.
- **US-AL-02**: As a trader, I can click on a bar in the "P&L by session" chart and instantly see the trades behind it.
- **US-AL-03**: As a trader, I can compare my MNQ performance vs MES performance side-by-side with the same KPI set.

---

## 5. Strategies / Playbooks (P0)

### Features
| ID | Feature | Priority |
|----|---------|----------|
| ST-01 | Strategy CRUD: name, description, rules/confluences checklist, applicable instruments, sessions | P0 |
| ST-02 | Auto-suggest strategy for new trades based on instrument + session mapping | P0 |
| ST-03 | Per-strategy analytics (same KPIs as Analytics Lab, filtered) | P0 |
| ST-04 | Strategy versioning (track rule changes over time) | P1 |
| ST-05 | Confluence template (reusable checklist per strategy) | P0 |

### User Stories
- **US-ST-01**: As a trader, I can define my "ORB Breakout" strategy with specific confluence checkboxes and the system auto-assigns it to my MNQ morning trades.
- **US-ST-02**: As a trader, I can see win rate & profit factor for each strategy separately to decide which to keep or retire.

---

## 6. Prop Firm HQ — LucidFlex (P0)

### Features
| ID | Feature | Priority |
|----|---------|----------|
| PF-01 | LucidFlex 50K evaluation template (preloaded, editable) | P0 |
| PF-02 | Rule engine: profit target, max loss limit, consistency rule (≤50%), max size | P0 |
| PF-03 | Real-time rule status dashboard (% progress, violations, days traded) | P0 |
| PF-04 | Payout cycle tracker: days with profit ≥ $150, net profit, payout eligibility | P0 |
| PF-05 | Trading window enforcement warning (flat-by-4:45 PM, resume 6:00 PM) | P0 |
| PF-06 | Template versioning (edit history for prop rule changes) | P1 |
| PF-07 | Account-to-evaluation assignment (link account(s) to eval template) | P0 |
| PF-08 | Evaluation funnel: visual pipeline of evaluation stages per account | P0 |
| PF-09 | Holiday exception calendar | P1 |

### User Stories
- **US-PF-01**: As a prop trader, I can see at a glance how close I am to hitting the $3,000 profit target and whether my consistency ratio is on track.
- **US-PF-02**: As a prop trader, I get a warning if I'm still holding a position at 4:40 PM ET.
- **US-PF-03**: As a prop trader, I can track my payout cycle — how many qualifying days I have and how much I can request.

---

## 7. Finance Manager (P0)

### Features
| ID | Feature | Priority |
|----|---------|----------|
| FM-01 | CFO-level dashboard: total P&L, fees paid, net after fees, payouts received | P0 |
| FM-02 | Per-account equity curve (derived from fills + configured starting balance) | P0 |
| FM-03 | Fee breakdown: per root, per account, over time | P0 |
| FM-04 | Commission configuration: per-root default, per-account override | P0 |
| FM-05 | Currency display toggle (USD/EUR) | P1 |
| FM-06 | Monthly/weekly/daily summary tables | P0 |

### User Stories
- **US-FM-01**: As a trader, I can see my total fees paid this month vs my gross P&L to understand my true net.
- **US-FM-02**: As a trader, I can configure MNQ commission at $0.62/side and MES at $0.62/side and have all P&L calculations use the correct fees.

---

## 8. Business Ledger (P0)

### Features
| ID | Feature | Priority |
|----|---------|----------|
| BL-01 | Expense entry: date, category, amount, notes, recurring flag | P0 |
| BL-02 | Revenue integration: trading P&L + payouts auto-imported as revenue | P0 |
| BL-03 | ROI calculation: net trading revenue minus business expenses | P0 |
| BL-04 | Category management (software, data, education, hardware, etc.) | P0 |
| BL-05 | Monthly P&L statement view | P0 |
| BL-06 | Export to CSV / PDF | P1 |

### User Stories
- **US-BL-01**: As a trader running a business, I can log my $150/mo platform fee and see it subtracted from my trading revenue in the ROI view.
- **US-BL-02**: As a trader, trading P&L from the Finance Manager flows into the ledger automatically — I don't re-enter it.

---

## 9. Grading (P0)

### Features
| ID | Feature | Priority |
|----|---------|----------|
| GR-01 | Configurable grading rubric: categories (Setup / Execution / Risk / Psychology) with weighted scores | P0 |
| GR-02 | Checkbox confluences: per-strategy checklist (did I follow my rules?) | P0 |
| GR-03 | Dual output: letter grade (A–F) + numeric score (0–100) | P0 |
| GR-04 | Daily / weekly / monthly grade roll-ups | P0 |
| GR-05 | Grade-vs-P&L correlation chart | P1 |
| GR-06 | Configurable rubric weights and scale | P0 |

### User Stories
- **US-GR-01**: As a trader, I can grade each trade on Setup (was the pattern valid?), Execution (did I enter/exit well?), Risk (was sizing correct?), Psychology (was I calm?) and see a composite letter + score.
- **US-GR-02**: As a trader, I can see my weekly average grade trending up even if my P&L was flat — confirming I'm improving process.

---

## 10. Leak Detector (P0)

### Features
| ID | Feature | Priority |
|----|---------|----------|
| LD-01 | Auto-detect recurring loss patterns: by time-of-day, day-of-week, session, instrument, strategy, tag | P0 |
| LD-02 | Signal cards: "You lose 65% of trades taken after 2 PM on Fridays" | P0 |
| LD-03 | Descriptive analytics only (no prescriptive "cost of mistakes") | P0 |
| LD-04 | Drill-down from any signal to the underlying trades | P0 |
| LD-05 | Configurable thresholds for signal sensitivity | P1 |

### User Stories
- **US-LD-01**: As a trader, I see a card telling me "MNQ trades in the last hour have 30% win rate vs 58% overall" so I can investigate and adjust.
- **US-LD-02**: As a trader, I can click any leak signal and immediately see the trades driving it.

---

## 11. AI Coach (P1)

### Features
| ID | Feature | Priority |
|----|---------|----------|
| AI-01 | Default: daily insight summary (auto-generated from today's trades + grades + leaks) | P1 |
| AI-02 | Toggle: Action Plan generation (specific improvement suggestions) | P1 |
| AI-03 | Toggle: Pre-market Plan Draft (based on recent patterns + goals) | P1 |
| AI-04 | "Yesterday Review" flow: optional, disableable recap of previous day | P1 |
| AI-05 | Insights history log | P1 |

### User Stories
- **US-AI-01**: As a trader, I see 2–3 key insights at the top of my Command Center each morning without clicking anything.
- **US-AI-02**: As a trader, I can click "Generate Action Plan" to get specific, data-backed improvement steps.

---

## 12. Goals (P1)

### Features
| ID | Feature | Priority |
|----|---------|----------|
| GO-01 | Performance targets: daily P&L, weekly P&L, win rate floor, max trades/day | P1 |
| GO-02 | Habit targets: grade ≥ B on 80% of trades, complete pre-market routine daily | P1 |
| GO-03 | Progress tracking from real data (auto-computed, not manual entry) | P1 |
| GO-04 | Streak tracking: consecutive days meeting goal | P1 |
| GO-05 | Configurable goal definitions and thresholds | P1 |

### User Stories
- **US-GO-01**: As a trader, I set a goal of "Average grade ≥ B this week" and see live progress from my actual grades.
- **US-GO-02**: As a trader, I can track my streak of consecutive days where I followed my pre-market routine.

---

## 13. Pre/Post-Market Routines (P0)

### Features
| ID | Feature | Priority |
|----|---------|----------|
| RT-01 | Configurable routine checklists (pre-market, post-market) | P0 |
| RT-02 | One-click confirmation log (not long forms) | P0 |
| RT-03 | Reminder notifications (in-app) | P1 |
| RT-04 | Routine completion history | P0 |

### User Stories
- **US-RT-01**: As a trader, I see my pre-market checklist with one-click confirmations and I'm done in 10 seconds.

---

## 14. Settings & Configuration (P0)

### Features
| ID | Feature | Priority |
|----|---------|----------|
| CFG-01 | Account management: add/edit/archive accounts | P0 |
| CFG-02 | Instrument configuration: root symbols, tick value, tick size, commission per side | P0 |
| CFG-03 | Session definitions: name, start/end times, timezone | P0 |
| CFG-04 | Trading day rollover configuration | P0 |
| CFG-05 | Grading rubric editor | P0 |
| CFG-06 | Prop firm template editor with versioning | P0 |
| CFG-07 | Dashboard layout management | P0 |
| CFG-08 | Tag/label management | P0 |
| CFG-09 | Strategy definitions | P0 |
| CFG-10 | Currency preference | P0 |
| CFG-11 | Timezone preference (display vs data) | P0 |
| CFG-12 | Data export (full backup JSON/CSV) | P1 |
