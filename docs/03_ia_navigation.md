# Information Architecture & Navigation

## 1. Top-Level IA

```
Trading Journal OS
│
├── 🏠 Command Center          (default landing / dashboard)
├── 📓 Trade Journal            (trade log + detail)
├── 📊 Analytics Lab            (KPIs, charts, breakdowns)
├── 📋 Strategies               (playbooks / confluences)
├── 🏢 Prop Firm HQ             (LucidFlex rules + funnel)
├── 💰 Finance Manager          (CFO view: P&L, fees, equity)
├── 📒 Business Ledger          (expenses, revenue, ROI)
├── 🎯 Grading                  (scorecards, roll-ups)
├── 🔍 Leak Detector            (loss pattern signals)
├── 🤖 AI Coach                 (insights, action plans)
├── 🎯 Goals                    (targets + habit tracking)
│
├── ⬆️ Import                   (CSV upload — top bar action)
│
└── ⚙️ Settings
    ├── Accounts
    ├── Instruments
    ├── Sessions & Rollover
    ├── Strategies
    ├── Tags & Labels
    ├── Grading Rubrics
    ├── Prop Firm Templates
    ├── Dashboard Layouts
    ├── Routines
    ├── Preferences (timezone, currency, display)
    └── Data Management (export, danger zone)
```

## 2. Navigation Model

### Primary Navigation — Left Sidebar
- Always visible on desktop (collapsible to icon rail)
- Icon + label for each module
- Active state highlight with accent color
- Badge indicators: ungraded trades count, prop rule warnings
- Bottom section: Import button, Settings, User avatar

### Global Toolbar — Top Bar
Persistent across all pages:

```
┌──────────────────────────────────────────────────────────────────────┐
│  [≡]  Trading Journal OS    [Account ▾] [Date Range ▾] [Session ▾] │
│                              [Instrument ▾] [Strategy ▾]  [Import ▲]│
└──────────────────────────────────────────────────────────────────────┘
```

- **Account selector**: multi-select dropdown — "All Accounts" or individual accounts
- **Date range**: presets (Today, This Week, This Month, Last 30d, Custom) + calendar picker
- **Session filter**: All, or specific named sessions
- **Instrument filter**: All, or specific root symbols
- **Strategy filter**: All, or specific strategies
- **Import button**: prominent action button (opens import modal)

### Account View Modes
Two modes available via the account selector:
1. **Unified**: "All Accounts" selected → data aggregated across all accounts
2. **Per-account**: single account selected → only that account's data shown

Switching account selector updates ALL modules simultaneously.

## 3. Page Layouts

### Command Center
```
┌────────────────────────────────────────────────────┐
│  Global Toolbar                                    │
├──────┬─────────────────────────────────────────────┤
│      │  ┌────────┐ ┌────────┐ ┌────────┐          │
│  S   │  │Widget 1│ │Widget 2│ │Widget 3│          │
│  I   │  └────────┘ └────────┘ └────────┘          │
│  D   │  ┌────────┐ ┌────────┐ ┌────────┐          │
│  E   │  │Widget 4│ │Widget 5│ │Widget 6│          │
│  B   │  └────────┘ └────────┘ └────────┘          │
│  A   │  ─────────────────────────────────          │
│  R   │  Additional widgets (scrollable)            │
│      │  AI Coach insights banner                   │
└──────┴─────────────────────────────────────────────┘
```

### Trade Journal
```
┌────────────────────────────────────────────────────┐
│  Global Toolbar                                    │
├──────┬────────────────────────┬─────────────────────┤
│      │  ┌──────────────────┐  │  Trade Detail Panel │
│  S   │  │ Calendar Toggle  │  │  ┌───────────────┐  │
│  I   │  ├──────────────────┤  │  │ Summary       │  │
│  D   │  │ Filter bar       │  │  │ Fills table   │  │
│  E   │  ├──────────────────┤  │  │ P&L / R       │  │
│  B   │  │ Day Header: Mon  │  │  │ Strategy      │  │
│  A   │  │  Trade row 1     │  │  │ Tags          │  │
│  R   │  │  Trade row 2     │  │  │ Grade         │  │
│      │  │ Day Header: Tue  │  │  │ Notes         │  │
│      │  │  Trade row 3     │  │  │ Screenshots   │  │
│      │  └──────────────────┘  │  │ TradingView   │  │
│      │                        │  └───────────────┘  │
└──────┴────────────────────────┴─────────────────────┘
```

### Analytics Lab
```
┌────────────────────────────────────────────────────┐
│  Global Toolbar                                    │
├──────┬─────────────────────────────────────────────┤
│      │  ┌─────────────────────────────────────┐    │
│  S   │  │ KPI Cards Row (P&L, WR, PF, etc.)  │    │
│  I   │  └─────────────────────────────────────┘    │
│  D   │  ┌─────────────────┐ ┌─────────────────┐   │
│  E   │  │ Breakdown by    │ │ Equity Curve    │   │
│  B   │  │ [Dimension ▾]   │ │                 │   │
│  A   │  │ (bar chart)     │ │                 │   │
│  R   │  └─────────────────┘ └─────────────────┘   │
│      │  ┌─────────────────┐ ┌─────────────────┐   │
│      │  │ Heatmap         │ │ Distribution    │   │
│      │  └─────────────────┘ └─────────────────┘   │
└──────┴─────────────────────────────────────────────┘
```

### Prop Firm HQ
```
┌────────────────────────────────────────────────────┐
│  Global Toolbar                                    │
├──────┬─────────────────────────────────────────────┤
│      │  ┌─────────────────────────────────────┐    │
│  S   │  │ Evaluation Funnel (pipeline view)   │    │
│  I   │  └─────────────────────────────────────┘    │
│  D   │  ┌──────────────┐  ┌──────────────────┐    │
│  E   │  │ Rule Status   │  │ Payout Tracker  │    │
│  B   │  │ ✅ Profit: 72%│  │ Days: 3/5       │    │
│  A   │  │ ✅ MaxLoss OK │  │ Min profit: ✅  │    │
│  R   │  │ ⚠️ Consist: 48%│ │ Net: $1,230     │    │
│      │  │ ✅ Size OK    │  │ Eligible: Yes   │    │
│      │  └──────────────┘  └──────────────────┘    │
│      │  ┌─────────────────────────────────────┐    │
│      │  │ Trading Window Status               │    │
│      │  └─────────────────────────────────────┘    │
└──────┴─────────────────────────────────────────────┘
```

## 4. Navigation Patterns

### Drill-Down Pattern
Every aggregate value is clickable:
1. **Widget value** (Command Center) → opens relevant module with filters
2. **KPI card** (Analytics Lab) → opens filtered trade list
3. **Chart data point** → opens filtered trade list
4. **Heatmap cell** → opens filtered trade list
5. **Leak signal card** → opens filtered trade list
6. **Prop rule line item** → opens filtered trade list for the relevant period

### Modal Patterns
- **Import**: full-screen modal with progress + validation report
- **Trade detail**: slide-over panel (right side) or full-screen modal on small screens
- **Settings**: full-page (not modal)
- **TradingView screenshot**: lightbox overlay

### Breadcrumbs
Not needed — flat module hierarchy with global toolbar context indicators.

## 5. Responsive Behavior

| Breakpoint | Sidebar | Toolbar | Layout |
|-----------|---------|---------|--------|
| ≥ 1440px | Full (icon + label) | Full | 3-column widgets |
| 1024–1439px | Collapsed (icon rail) | Full | 2-column widgets |
| 768–1023px | Hidden (hamburger) | Compact (filter drawer) | 1-column |
| < 768px | Hidden (hamburger) | Compact (filter drawer) | 1-column stacked |

## 6. Keyboard Shortcuts (P1)

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + 1–9` | Navigate to module by position |
| `Cmd/Ctrl + I` | Open import modal |
| `Cmd/Ctrl + K` | Command palette (search/navigate) |
| `←/→` | Navigate trades in detail panel |
| `Esc` | Close modal/panel |

## 7. Badge & Notification System

| Badge | Location | Trigger |
|-------|----------|---------|
| Ungraded trades count | Journal icon in sidebar | Trade reconstructed without grade |
| Prop rule warning | Prop HQ icon in sidebar | Rule violation or approaching threshold |
| Routine reminder | Command Center banner | Pre/post-market routine not completed |
| Import status | Import button | Import in progress or errors |
