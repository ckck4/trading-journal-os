'use client'

import { useQuery } from '@tanstack/react-query'
import { useFiltersStore } from '@/stores/filters'
import { KpiCards } from '@/components/analytics/kpi-cards'
import {
  EquityCurveChart,
  DailyPnlChart,
  CalendarHeatmap,
  RMultipleHistogram,
  BreakdownBarChart,
  DurationHistogram,
} from '@/components/analytics/charts'
import type { AnalyticsSummary, DayResult, AnalyticsBreakdowns } from '@/types/analytics'
import type { DatePreset } from '@/stores/filters'

// ─── Date range helper ────────────────────────────────────────────────────────

function getDateRange(
  preset: DatePreset,
  dateFrom: string | null,
  dateTo: string | null
): { from: string; to: string } {
  const today = new Date()
  const fmt = (d: Date) => d.toISOString().split('T')[0]

  if (preset === 'today') return { from: fmt(today), to: fmt(today) }

  if (preset === 'this_week') {
    const mon = new Date(today)
    const dow = today.getDay()
    mon.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
    return { from: fmt(mon), to: fmt(today) }
  }

  if (preset === 'this_month') {
    const first = new Date(today.getFullYear(), today.getMonth(), 1)
    return { from: fmt(first), to: fmt(today) }
  }

  if (preset === 'last_30d') {
    const d = new Date(today)
    d.setDate(today.getDate() - 29)
    return { from: fmt(d), to: fmt(today) }
  }

  // custom
  return { from: dateFrom ?? fmt(today), to: dateTo ?? fmt(today) }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function AnalyticsClient() {
  const { accountIds, datePreset, dateFrom, dateTo } = useFiltersStore()
  const accountId = accountIds[0] ?? ''
  const { from, to } = getDateRange(datePreset, dateFrom, dateTo)

  const summaryQuery = useQuery<{ summary: AnalyticsSummary }>({
    queryKey: ['analytics-summary', accountId, from, to],
    queryFn: () =>
      fetch(`/api/analytics/summary?accountId=${accountId}&from=${from}&to=${to}`).then((r) => {
        if (!r.ok) throw new Error('Failed to fetch summary')
        return r.json()
      }),
    enabled: !!accountId,
    staleTime: 60_000,
  })

  const dailyQuery = useQuery<{ days: DayResult[] }>({
    queryKey: ['analytics-daily', accountId, from, to],
    queryFn: () =>
      fetch(`/api/analytics/daily?accountId=${accountId}&from=${from}&to=${to}`).then((r) => {
        if (!r.ok) throw new Error('Failed to fetch daily data')
        return r.json()
      }),
    enabled: !!accountId,
    staleTime: 60_000,
  })

  const breakdownsQuery = useQuery<{ breakdowns: AnalyticsBreakdowns }>({
    queryKey: ['analytics-breakdowns', accountId, from, to],
    queryFn: () =>
      fetch(`/api/analytics/breakdowns?accountId=${accountId}&from=${from}&to=${to}`).then((r) => {
        if (!r.ok) throw new Error('Failed to fetch breakdowns')
        return r.json()
      }),
    enabled: !!accountId,
    staleTime: 60_000,
  })

  const summary = summaryQuery.data?.summary
  const days = dailyQuery.data?.days ?? []
  const breakdowns = breakdownsQuery.data?.breakdowns

  if (!accountId) {
    return (
      <div className="px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-[var(--foreground)]">Analytics Lab</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Performance breakdown, charts, and trade quality metrics.
          </p>
        </div>
        <div className="flex items-center justify-center h-48 rounded-lg border border-dashed border-[var(--border)] bg-[var(--card)]">
          <p className="text-sm text-[var(--muted-foreground)]">
            Select an account in the toolbar to view analytics.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 py-6 space-y-6">

      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Analytics Lab</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          {from === to ? from : `${from} → ${to}`}
        </p>
      </div>

      {/* KPI cards */}
      <KpiCards
        summary={summary}
        isLoading={summaryQuery.isLoading}
      />

      {/* Charts — Row 1: equity curve full width */}
      <EquityCurveChart days={days} />

      {/* Row 2: daily P&L full width */}
      <DailyPnlChart days={days} />

      {/* Row 3: calendar heatmap + R histogram */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CalendarHeatmap days={days} />
        </div>
        <div>
          <RMultipleHistogram rMultiples={breakdowns?.rMultiples ?? []} />
        </div>
      </div>

      {/* Row 4: 3 breakdown charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <BreakdownBarChart
          data={breakdowns?.byInstrument ?? []}
          title="P&L by Instrument"
        />
        <BreakdownBarChart
          data={breakdowns?.bySession ?? []}
          title="P&L by Session"
        />
        <BreakdownBarChart
          data={breakdowns?.byStrategy ?? []}
          title="P&L by Strategy"
        />
      </div>

      {/* Row 5: duration histogram half width */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DurationHistogram durations={breakdowns?.durations ?? []} />
      </div>

    </div>
  )
}
