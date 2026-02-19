'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import type { DayResult, BreakdownEntry } from '@/types/analytics'

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function fmtDollar(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  return `${sign}$${abs.toFixed(0)}`
}

function fmtLabel(label: unknown): string {
  const s = String(label ?? '')
  if (!s.match(/^\d{4}-\d{2}-\d{2}$/)) return s
  const d = new Date(s + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Chart wrapper ────────────────────────────────────────────────────────────

function ChartCard({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden ${className ?? ''}`}
    >
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          {title}
        </span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-40 text-sm text-[var(--muted-foreground)]">
      No data for this period
    </div>
  )
}

const TOOLTIP_STYLE = {
  backgroundColor: '#14171E',
  border: '1px solid #2A2F3E',
  borderRadius: '6px',
  fontSize: '12px',
  color: '#E8EAF0',
}

// ─── a. Equity Curve ─────────────────────────────────────────────────────────

export function EquityCurveChart({ days }: { days: DayResult[] }) {
  if (!days.length) {
    return <ChartCard title="Equity Curve"><EmptyState /></ChartCard>
  }

  return (
    <ChartCard title="Equity Curve">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={days} margin={{ top: 4, right: 16, bottom: 0, left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2F3E" vertical={false} />
          <XAxis
            dataKey="tradingDay"
            tickFormatter={fmtDate}
            tick={{ fill: '#8B92A8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={fmtDollar}
            tick={{ fill: '#8B92A8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={70}
          />
          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any) => [fmtDollar(value ?? 0), 'Cumulative P&L']}
            labelFormatter={fmtLabel}
            contentStyle={TOOLTIP_STYLE}
          />
          <Line
            type="monotone"
            dataKey="cumulativePnl"
            stroke="var(--color-accent-primary)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: 'var(--color-accent-primary)' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

// ─── b. Daily P&L Bar Chart ──────────────────────────────────────────────────

export function DailyPnlChart({ days }: { days: DayResult[] }) {
  if (!days.length) {
    return <ChartCard title="Daily P&L"><EmptyState /></ChartCard>
  }

  return (
    <ChartCard title="Daily P&L">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={days} margin={{ top: 4, right: 16, bottom: 0, left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2F3E" vertical={false} />
          <XAxis
            dataKey="tradingDay"
            tickFormatter={fmtDate}
            tick={{ fill: '#8B92A8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={fmtDollar}
            tick={{ fill: '#8B92A8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={70}
          />
          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any) => [fmtDollar(value ?? 0), 'Net P&L']}
            labelFormatter={fmtLabel}
            contentStyle={TOOLTIP_STYLE}
          />
          <Bar dataKey="netPnl" radius={[2, 2, 0, 0]}>
            {days.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.netPnl >= 0 ? '#22C55E' : '#EF4444'}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

// ─── c. Calendar Heatmap ─────────────────────────────────────────────────────

function getCalendarCellColor(netPnl: number, maxMagnitude: number): string {
  if (maxMagnitude === 0) return 'rgba(26,30,40,0.6)'
  const intensity = Math.min(Math.abs(netPnl) / maxMagnitude, 1)
  const opacity = 0.2 + intensity * 0.8
  if (netPnl > 0) return `rgba(34, 197, 94, ${opacity.toFixed(2)})`
  if (netPnl < 0) return `rgba(239, 68, 68, ${opacity.toFixed(2)})`
  return 'rgba(26,30,40,0.6)'
}

export function CalendarHeatmap({ days }: { days: DayResult[] }) {
  if (!days.length) {
    return <ChartCard title="Calendar"><EmptyState /></ChartCard>
  }

  const dayMap = new Map<string, DayResult>()
  for (const d of days) {
    dayMap.set(d.tradingDay, d)
  }

  const sortedDates = days.map((d) => d.tradingDay).sort()
  const startDate = new Date(sortedDates[0] + 'T12:00:00')
  const endDate = new Date(sortedDates[sortedDates.length - 1] + 'T12:00:00')

  const maxMagnitude = Math.max(...days.map((d) => Math.abs(d.netPnl)), 1)

  // Align to Monday
  const cur = new Date(startDate)
  const dayOfWeek = cur.getDay() === 0 ? 6 : cur.getDay() - 1
  cur.setDate(cur.getDate() - dayOfWeek)

  const weeks: (string | null)[][] = []
  while (cur <= endDate) {
    const week: (string | null)[] = []
    for (let d = 0; d < 7; d++) {
      const dateStr = cur.toISOString().split('T')[0]
      week.push(cur <= endDate && cur >= startDate ? dateStr : null)
      cur.setDate(cur.getDate() + 1)
    }
    weeks.push(week)
  }

  const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  return (
    <ChartCard title="Calendar Heatmap">
      <div className="overflow-x-auto">
        <div className="flex gap-1 min-w-0">
          {/* Day labels column */}
          <div className="flex flex-col gap-1 shrink-0 pt-5">
            {DAY_LABELS.map((label, i) => (
              <div
                key={i}
                className="w-5 h-6 flex items-center justify-center text-[10px] text-[var(--muted-foreground)]"
              >
                {label}
              </div>
            ))}
          </div>
          {/* Weeks */}
          {weeks.map((week, wi) => {
            const firstCell = week.find((d) => d !== null)
            const showMonth =
              firstCell &&
              (wi === 0 || new Date(firstCell + 'T12:00:00').getDate() <= 7)

            return (
              <div key={wi} className="flex flex-col gap-1 shrink-0">
                <div className="h-5 flex items-center">
                  {showMonth && (
                    <span className="text-[10px] text-[var(--muted-foreground)] whitespace-nowrap">
                      {new Date(firstCell + 'T12:00:00').toLocaleString('en-US', { month: 'short' })}
                    </span>
                  )}
                </div>
                {week.map((dateStr, di) => {
                  if (!dateStr) {
                    return <div key={di} className="w-6 h-6 rounded" style={{ background: 'transparent' }} />
                  }
                  const dayData = dayMap.get(dateStr)
                  const color = dayData
                    ? getCalendarCellColor(dayData.netPnl, maxMagnitude)
                    : 'rgba(26,30,40,0.4)'
                  return (
                    <div
                      key={di}
                      className="w-6 h-6 rounded cursor-default"
                      style={{ background: color }}
                      title={
                        dayData
                          ? `${dateStr}: ${dayData.netPnl >= 0 ? '+' : ''}$${dayData.netPnl.toFixed(2)}`
                          : dateStr
                      }
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </ChartCard>
  )
}

// ─── d. R-Multiple Histogram ─────────────────────────────────────────────────

const R_BUCKETS = [
  { label: '< -3R', min: -Infinity, max: -3 },
  { label: '-3 to -2R', min: -3, max: -2 },
  { label: '-2 to -1R', min: -2, max: -1 },
  { label: '-1 to 0R', min: -1, max: 0 },
  { label: '0 to 1R', min: 0, max: 1 },
  { label: '1 to 2R', min: 1, max: 2 },
  { label: '2 to 3R', min: 2, max: 3 },
  { label: '> 3R', min: 3, max: Infinity },
]

export function RMultipleHistogram({ rMultiples }: { rMultiples: number[] }) {
  if (!rMultiples.length) {
    return <ChartCard title="R-Multiple Distribution"><EmptyState /></ChartCard>
  }

  const data = R_BUCKETS.map((bucket) => ({
    label: bucket.label,
    count: rMultiples.filter((r) => r >= bucket.min && r < bucket.max).length,
    isPositive: bucket.min >= 0,
  }))

  return (
    <ChartCard title="R-Multiple Distribution">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2F3E" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#8B92A8', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#8B92A8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            width={30}
          />
          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any) => [value ?? 0, 'Trades']}
            contentStyle={TOOLTIP_STYLE}
          />
          <Bar dataKey="count" radius={[2, 2, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.isPositive ? '#22C55E' : '#EF4444'}
                fillOpacity={0.8}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

// ─── e/f/g. Breakdown Bar Chart (horizontal) ─────────────────────────────────

export function BreakdownBarChart({
  data,
  title,
}: {
  data: BreakdownEntry[]
  title: string
}) {
  if (!data.length) {
    return <ChartCard title={title}><EmptyState /></ChartCard>
  }

  const chartHeight = Math.max(180, data.length * 44)

  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2F3E" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={fmtDollar}
            tick={{ fill: '#8B92A8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fill: '#E8EAF0', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={80}
          />
          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any, _name: any, props: any) => {
              const entry = props?.payload as BreakdownEntry | undefined
              const wr = entry?.winRate != null ? ` (${entry.winRate.toFixed(0)}% WR)` : ''
              return [`${fmtDollar(value ?? 0)}${wr}`, 'Net P&L']
            }}
            contentStyle={TOOLTIP_STYLE}
          />
          <Bar dataKey="netPnl" radius={[0, 2, 2, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.netPnl >= 0 ? '#22C55E' : '#EF4444'}
                fillOpacity={0.8}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

// ─── h. Duration Histogram ────────────────────────────────────────────────────

const DURATION_BUCKETS = [
  { label: '0-1m', minSec: 0, maxSec: 60 },
  { label: '1-2m', minSec: 60, maxSec: 120 },
  { label: '2-5m', minSec: 120, maxSec: 300 },
  { label: '5-10m', minSec: 300, maxSec: 600 },
  { label: '10-30m', minSec: 600, maxSec: 1800 },
  { label: '30-60m', minSec: 1800, maxSec: 3600 },
  { label: '60m+', minSec: 3600, maxSec: Infinity },
]

export function DurationHistogram({ durations }: { durations: number[] }) {
  if (!durations.length) {
    return <ChartCard title="Trade Duration Distribution"><EmptyState /></ChartCard>
  }

  const data = DURATION_BUCKETS.map((b) => ({
    label: b.label,
    count: durations.filter((d) => d >= b.minSec && d < b.maxSec).length,
  }))

  return (
    <ChartCard title="Trade Duration Distribution">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2F3E" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#8B92A8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#8B92A8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            width={30}
          />
          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any) => [value ?? 0, 'Trades']}
            contentStyle={TOOLTIP_STYLE}
          />
          <Bar dataKey="count" fill="#3B82F6" fillOpacity={0.75} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
