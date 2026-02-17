# Core UX Flows

---

## Flow 1: First-Time Setup

```
1. User signs up / logs in
2. Onboarding wizard (skippable):
   a. Set timezone + currency
   b. Configure instruments (presets: MNQ, MES, MGC — edit tick/commission)
   c. Create first account (name + external_id)
   d. Define sessions (presets: Pre-Market, RTH, Post-Market)
   e. Create strategy (optional — can skip)
   f. Configure rollover time (default: 18:00 ET)
3. Prompt: "Import your first Tradeovate CSV"
4. → Import flow
```

---

## Flow 2: CSV Import

```
1. Click Import button (top bar) → modal opens
2. Drag-drop CSV or click file picker
3. System:
   a. Parse header → validate columns
   b. Show column mapping preview (auto-matched + manual override)
   c. If unknown account detected → prompt: create or map
   d. If unknown instrument → show with preset options
4. User confirms → "Start Import"
5. Processing (progress bar):
   a. Parse fills → dedupe → normalize → insert
   b. Reconstruct trades (Flat-to-Flat)
   c. Auto-assign strategies
   d. Recalculate summaries
6. Validation report displayed:
   - ✅ {N} new fills imported
   - 🔄 {N} duplicates skipped
   - ⚠️ {N} warnings
   - ❌ {N} errors (expandable details)
7. User clicks "Done" → Command Center refreshes
```

---

## Flow 3: Review & Annotate Trade

```
1. Navigate to Trade Journal (/journal)
2. Scroll to trade or use filters (instrument, date, session)
3. Click trade row → detail panel slides in from right
4. In detail panel:
   a. Review: fills table, P&L, duration, session badge
   b. Set strategy: dropdown (auto-suggested value shown)
   c. Add tags: chip input (autocomplete from existing tags)
   d. Set R-value: input points (or toggle to price mode)
   e. Grade trade: rubric categories with sliders + confluence checkboxes
   f. Add notes: textarea (auto-save on blur)
   g. Attach screenshot: drag-drop zone
   h. Paste TradingView link: input field
5. All changes save immediately (optimistic UI)
6. Changes propagate: Analytics, Grading roll-ups, Leak Detector, Goals, Command Center
```

---

## Flow 4: Analyze Performance

```
1. Navigate to Analytics Lab (/analytics)
2. Global filters already applied (account, date range from toolbar)
3. View KPI cards row at top
4. Select breakdown dimension (dropdown): instrument / strategy / session / day / hour / tag
5. Charts update with selected dimension
6. Click a bar / data point in any chart
   → Filtered trade list appears below
   → Click any trade → Trade Detail panel
7. Toggle comparison mode:
   → Select 2 strategies or instruments
   → Side-by-side KPI comparison
```

---

## Flow 5: Check Prop Firm Status

```
1. Navigate to Prop Firm HQ (/prop)
2. See evaluation funnel (accounts as cards in pipeline columns)
3. Click account card → Evaluation Detail:
   a. Rule gauges: profit target %, max loss remaining, consistency %, size
   b. Trading window status (flat-by check)
   c. Daily breakdown table
   d. Payout tracker (if in payout stage):
      - Qualifying days with P&L ≥ $150
      - Net profit status
      - Eligible payout amount
4. If violation → alert banner with details + link to offending trades
```

---

## Flow 6: Pre-Market Routine

```
1. Land on Command Center (morning)
2. Routine reminder banner: "Complete your pre-market checklist"
3. Click → Routine panel opens (or inline on Command Center)
4. Checklist items (configured in Settings):
   - [ ] Review yesterday's trades
   - [ ] Check economic calendar
   - [ ] Set daily goals
   - [ ] Review strategy rules
   - ... (user-configured)
5. One-click per item (checkbox)
6. Click "Complete" → routine_completion logged
7. Banner updates: "✅ Pre-market complete"
8. Goals module: routine streak incremented
```

---

## Flow 7: Grade a Trade

```
1. Open trade detail (from Journal or any drill-down)
2. Grade section shows:
   a. Rubric categories (Setup / Execution / Risk / Psychology)
   b. Per-category score slider (0–10)
   c. Strategy confluence checklist (from strategy template)
3. User scores each category + checks confluences
4. System computes:
   - Weighted numeric score (0–100)
   - Letter grade (A+ through F)
5. Grade saved → events emitted:
   - Daily/weekly/monthly roll-ups recalculated
   - Command Center grade widget updated
   - Goals checked
```

---

## Flow 8: Split / Merge Trades

```
Split:
1. Open trade detail → click "Split Trade"
2. Fills table shows with split-point selector (between any two fills)
3. User selects split point → preview shows two resulting trades
4. Confirm → two trades created, original deleted
5. All downstream recalculated

Merge:
1. In trade list, select two adjacent trades (checkbox)
2. Click "Merge" action
3. Preview shows combined trade
4. Confirm → one trade created, two originals deleted
5. All downstream recalculated
```

---

## Flow 9: Business Expense Entry

```
1. Navigate to Business Ledger (/ledger)
2. Click "Add Expense"
3. Form: date, category (dropdown), amount, description, recurring toggle
4. Save → entry appears in table
5. ROI and monthly P&L auto-recalculated
```

---

## Flow 10: AI Coach Interaction

```
1. Command Center shows AI insights banner (auto-generated)
2. Default: 2–3 key observations from recent trades/grades
3. Click "View Details" → AI Coach page (/coach)
4. Optional buttons:
   - "Generate Action Plan" → specific improvement suggestions
   - "Draft Pre-Market Plan" → tomorrow's plan based on data
5. Insights saved to history
```

---

## Flow 11: Goal Management

```
1. Navigate to Goals (/goals)
2. Active goals shown as progress cards
3. Click "Add Goal":
   a. Select metric (net_pnl, win_rate, avg_grade, etc.)
   b. Set target value + operator (>=, <=)
   c. Set period (daily, weekly, monthly)
4. Progress auto-tracked from real data
5. Streaks shown: "5 consecutive days meeting this goal"
```

---

## Flow 12: Dashboard Customization

```
1. On Command Center, click "Customize" (gear icon)
2. Enter edit mode:
   - Drag widgets to reorder
   - Resize widget handles
   - "+" button to add widget from library
   - "×" to remove widget
3. Widget library drawer:
   - Categories: P&L, Risk, Grading, Prop, Goals, Activity
   - Click to add to grid
4. Click "Save Layout" → stored as dashboard_layout
5. Optional: "Save As..." for named presets
```
