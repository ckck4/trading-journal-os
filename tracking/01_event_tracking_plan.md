# Event Tracking Plan

> Every significant user action and system event is tracked for analytics, consistency, and audit purposes.

---

## 1. Client-Side Events

| Event Name | Trigger | Properties |
|------------|---------|------------|
| `page.viewed` | Route change | page, module, filters |
| `import.started` | Upload CSV | filename, fileSize |
| `import.completed` | Import finishes | batchId, newFills, duplicates, errors |
| `import.failed` | Import error | batchId, errorType |
| `trade.viewed` | Open trade detail | tradeId, instrument, tradingDay |
| `trade.edited` | Save trade edit | tradeId, fieldsChanged[] |
| `trade.graded` | Submit grade | tradeId, numericScore, letterGrade |
| `trade.tagged` | Add/remove tag | tradeId, tagId, action (add/remove) |
| `trade.strategy_assigned` | Set strategy | tradeId, strategyId, wasAuto |
| `trade.screenshot_added` | Upload screenshot | tradeId, fileSize |
| `trade.split` | Split trade | originalTradeId, newTradeIds[] |
| `trade.merged` | Merge trades | sourceTradeIds[], resultTradeId |
| `analytics.breakdown_viewed` | Select breakdown dimension | dimension, metric |
| `analytics.chart_drilldown` | Click chart data point | chartType, dimension, value |
| `dashboard.widget_added` | Add widget | widgetType |
| `dashboard.widget_removed` | Remove widget | widgetType |
| `dashboard.layout_saved` | Save dashboard layout | widgetCount |
| `prop.evaluation_created` | Create evaluation | templateId, accountId |
| `prop.payout_recorded` | Record payout | evaluationId, amount |
| `routine.completed` | Complete routine | routineId, routineType, itemCount |
| `goal.created` | Create goal | metric, period, targetValue |
| `coach.insight_viewed` | View AI insight | insightType |
| `coach.action_plan_generated` | Request action plan | — |
| `coach.premarket_generated` | Request pre-market plan | — |
| `ledger.entry_created` | Create expense/revenue | entryType, categoryId, amount |
| `settings.changed` | Change any setting | settingKey, module |
| `filter.changed` | Change global filter | filterType, value |
| `export.downloaded` | Download export | format, scope |

---

## 2. Server-Side Domain Events

| Event | Emitter | Subscribers | Purpose |
|-------|---------|-------------|---------|
| `fills.imported` | Import service | Trade reconstructor | Trigger trade reconstruction |
| `trades.reconstructed` | Reconstructor | Analytics, Grading, Prop, Finance, CC, Leaks, Goals | Recalculate all downstream |
| `trade.updated` | Trade service | Analytics, Grading, Prop, Finance, CC, Leaks, Goals | Propagate edit |
| `trade.graded` | Grade service | Analytics, CC, Goals | Roll-up recalc |
| `daily_summary.recalculated` | Analytics service | CC, Prop, Leaks, Goals, Finance | Refresh cached aggregates |
| `grade_rollup.updated` | Grade service | CC, Goals, AI Coach | Trend updates |
| `prop_rule.evaluated` | Prop service | CC, Finance | Status update |
| `payout.recorded` | Prop service | Finance, Ledger | Revenue entry |
| `expense.created` | Ledger service | Finance | ROI recalc |
| `routine.completed` | Routine service | Goals, CC | Streak tracking |
| `config.changed` | Settings service | All modules | Re-query with new config |

---

## 3. Audit Log Events (event_log table)

Every mutation writes to `event_log`:

```json
{
  "event_type": "trade.updated",
  "entity_type": "trade",
  "entity_id": "uuid",
  "payload": {
    "changes": {
      "strategy_id": { "old": null, "new": "uuid" },
      "notes": { "old": "", "new": "Solid setup, followed rules" }
    }
  }
}
```

Retained for 90 days. Used for: undo support, debugging, compliance.

---

## 4. Performance Metrics

| Metric | Where | SLA |
|--------|-------|-----|
| Import processing time | Server | < 5s for 1000 fills |
| Trade list load time | Client | < 500ms (paginated) |
| Analytics KPI compute | Server | < 1s for 10K trades |
| Dashboard widget refresh | Client | < 300ms per widget |
| Chart render time | Client | < 500ms |
| Search/filter response | Server | < 200ms |
