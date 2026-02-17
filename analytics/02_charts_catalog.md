# Charts Catalog

> All charts are interactive: hover for values, click for drill-down to trade list. Filters (account, date, session, instrument, strategy) apply globally.

---

## 1. Equity Curve

| Property | Value |
|----------|-------|
| Type | Line chart |
| X-axis | Trading day (or trade sequence #) |
| Y-axis | Cumulative net P&L ($) |
| Variants | By account, by strategy, by instrument |
| Features | Peak line overlay, drawdown shading, benchmark toggle |

## 2. Cumulative R Chart

| Property | Value |
|----------|-------|
| Type | Line chart |
| X-axis | Trade sequence # |
| Y-axis | Cumulative R-multiple |
| Features | Only trades with R-value; zero-line reference |

## 3. P&L by Day (Bar Chart)

| Property | Value |
|----------|-------|
| Type | Vertical bar chart |
| X-axis | Trading day |
| Y-axis | Daily net P&L ($) |
| Colors | Green = positive, Red = negative |
| Click | → Day's trade list |

## 4. P&L Distribution (Histogram)

| Property | Value |
|----------|-------|
| Type | Histogram |
| X-axis | P&L buckets |
| Y-axis | Trade count |
| Features | Mean line, median line, configurable bucket size |

## 5. R-Distribution (Histogram)

| Property | Value |
|----------|-------|
| Type | Histogram |
| X-axis | R-multiple buckets |
| Y-axis | Trade count |
| Features | Mean R line, only trades with R-value |

## 6. Win Rate Over Time

| Property | Value |
|----------|-------|
| Type | Line chart |
| X-axis | Date (daily / weekly / monthly) |
| Y-axis | Win rate (%) |
| Features | Rolling average toggle (7d, 30d), target line |

## 7. Calendar Heatmap

| Property | Value |
|----------|-------|
| Type | Calendar grid (GitHub-style) |
| Cell | One trading day |
| Color | Intensity by net P&L or grade (toggle) |
| Click | → Day's trade list |

## 8. Day-of-Week × Hour Heatmap

| Property | Value |
|----------|-------|
| Type | Matrix heatmap |
| X-axis | Hour of day (entry time) |
| Y-axis | Day of week |
| Cell color | By net P&L, win rate, or trade count (toggle) |
| Click | → Filtered trade list |

## 9. Instrument × Strategy Heatmap

| Property | Value |
|----------|-------|
| Type | Matrix heatmap |
| X-axis | Strategy |
| Y-axis | Root symbol |
| Cell color | By net P&L, win rate, or avg R |

## 10. Breakdown Bar Chart

| Property | Value |
|----------|-------|
| Type | Horizontal bar chart |
| Dimension | Configurable: instrument, strategy, session, tag, side, day-of-week |
| Metric | Configurable: net P&L, win rate, trade count, avg R, profit factor |
| Click | → Filtered trade list |

## 11. Drawdown Chart

| Property | Value |
|----------|-------|
| Type | Area chart (inverted) |
| X-axis | Trading day |
| Y-axis | Drawdown from peak ($) |
| Features | Max drawdown marker, recovery periods highlighted |

## 12. Trade Duration Distribution

| Property | Value |
|----------|-------|
| Type | Histogram |
| X-axis | Duration buckets (seconds/minutes) |
| Y-axis | Trade count |
| Overlay | Win vs Loss distribution comparison |

## 13. Profit Factor Over Time

| Property | Value |
|----------|-------|
| Type | Line chart |
| X-axis | Date (rolling window) |
| Y-axis | Profit factor |
| Features | Reference line at 1.0, rolling window selector |

## 14. Grade Distribution

| Property | Value |
|----------|-------|
| Type | Bar chart |
| X-axis | Letter grades (A+ through F) |
| Y-axis | Trade count |
| Color | Gradient A+=green → F=red |

## 15. Grade vs P&L Scatter

| Property | Value |
|----------|-------|
| Type | Scatter plot |
| X-axis | Numeric grade (0–100) |
| Y-axis | Net P&L ($) |
| Features | Trend line, quadrant labels |

## 16. Prop Firm Progress Gauges

| Property | Value |
|----------|-------|
| Type | Radial gauge / progress bar |
| Metrics | Profit target %, Max loss remaining, Consistency ratio, Days traded |
| Colors | Green = on track, Yellow = warning, Red = violation |

## 17. Streak Chart

| Property | Value |
|----------|-------|
| Type | Bar chart (horizontal timeline) |
| X-axis | Trade sequence |
| Y-axis | Win/Loss streak length |
| Colors | Green = win streak, Red = loss streak |

## 18. Monthly / Weekly Summary Table

| Property | Value |
|----------|-------|
| Type | Data table |
| Columns | Period, Trades, Wins, Losses, Net P&L, Win Rate, PF, Avg R, Grade |
| Features | Sortable columns, click row → filtered analytics |

## 19. Comparison Chart

| Property | Value |
|----------|-------|
| Type | Grouped bar / multi-line |
| Purpose | Side-by-side comparison of 2+ strategies/instruments |
| Metrics | Any KPI from the catalog |
| Features | Dimension selector, metric selector |
