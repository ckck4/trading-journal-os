# Core UX Flows

---

## Flow 1: Import Engine
```
1. Click Import in Sidebar/Toolbar → /import
2. Drag-drop Tradeovate FILLS CSV
3. System:
   a. Parses fills → deduplicates identical Hashes
   b. Reconstructs flat-to-flat trades
   c. Normalizes root symbols and assigns commissions
4. Trades instantly populate the Database and Analytics caches.
```

---

## Flow 2: Grading Engine
```
1. Open Trade Detail slide-over on /journal
2. Tag trade with a Strategy
3. Check corresponding Confluences in the checklist
4. System auto-recommends a grade based on Strategy threshold / exact rules
5. Save Grade → Updates trade, recalculates Grade Roll-ups and Command Center discipline charts
```

---

## Flow 3: Discipline Loop
```
1. Land on /journal
2. Use inline Routine Pill on the date header: "Did you follow your routine today?"
3. Answer Yes/No → logs routine_checkins event
4. System updates Discipline Score gauge on Command Center and 60-day calendar heatmap
5. Grade trades throughout day (Flow 2) → dynamically shifts Discipline Output
```

---

## Flow 4: Finance Flow
```
1. Navigate to /finance
2. Top-level Overview displays Trading P&L + Payouts - Expenses
3. Navigate to Expenses tab → Add software/data expenses
4. Navigate to Subscriptions → Log recurring eval fees
5. Navigate to Payouts → Log prop firm withdrawals
6. Overview + Cash Flow tabs auto-sync to display true ROI
```

---

## Flow 5: Goals Tracker
```
1. Navigate to /goals
2. Top "Goals" tab:
   a. Create standard goal (e.g. Daily P&L Target, Max Loss Limit)
   b. System automatically sweeps `daily_summaries` to track continuous progress & streaks
```

---

## Flow 6: Habits Tracker
```
1. Navigate to /goals
2. Click "Habits" tab
3. Create manual recurring habit (e.g. Exercise, Meditation)
4. Check off habit daily → updates consistency calendar heatmap and streak count
```
