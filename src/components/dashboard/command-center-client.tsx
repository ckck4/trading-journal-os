'use client'

import { useQuery } from '@tanstack/react-query'
import { useFiltersStore } from '@/stores/filters'
import { BalanceDrawdownWidget } from '@/components/dashboard/balance-drawdown-widget'
import { DailyDisciplineWidget } from '@/components/dashboard/daily-discipline-widget'
import { EquityCurveWidget } from '@/components/dashboard/equity-curve-widget'
import { DailyPnlWidget } from '@/components/dashboard/daily-pnl-widget'
import { WinRateWidget } from '@/components/dashboard/win-rate-widget'
import { PropRulesWidget } from '@/components/dashboard/prop-rules-widget'
import { RecentTradesWidget } from '@/components/dashboard/recent-trades-widget'
import { GoalsWidget } from '@/components/dashboard/goals-widget'
import type { WidgetData } from '@/types/dashboard'
import type { DatePreset } from '@/stores/filters'

const WIDGET_IDS = ['balance', 'discipline', 'equity', 'daily', 'winrate', 'prop', 'trades', 'goals'] as const
type WidgetId = typeof WIDGET_IDS[number]

// ─── Date range helper ─────────────────────────────────────────────────────────

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
  return { from: dateFrom ?? fmt(today), to: dateTo ?? fmt(today) }
}

// ─── Widget Card Wrapper ───────────────────────────────────────────────────────

function WidgetCard({
  id,
  widgets,
  isLoading,
}: {
  id: WidgetId
  widgets: WidgetData | undefined
  isLoading: boolean
}) {
  return (
    <div className="h-full w-full rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 overflow-hidden relative">
      {id === 'balance' && (
        <BalanceDrawdownWidget data={widgets?.balance ?? null} isLoading={isLoading} />
      )}
      {id === 'discipline' && (
        <DailyDisciplineWidget />
      )}
      {id === 'equity' && (
        <EquityCurveWidget data={widgets?.equityCurve ?? []} isLoading={isLoading} />
      )}
      {id === 'daily' && (
        <DailyPnlWidget data={widgets?.dailyPnl ?? null} isLoading={isLoading} />
      )}
      {id === 'winrate' && (
        <WinRateWidget data={widgets?.winRate ?? null} isLoading={isLoading} />
      )}
      {id === 'prop' && (
        <PropRulesWidget data={widgets?.propRules ?? null} isLoading={isLoading} />
      )}
      {id === 'trades' && (
        <RecentTradesWidget data={widgets?.recentTrades ?? []} isLoading={isLoading} />
      )}
      {id === 'goals' && (
        <GoalsWidget data={widgets?.goals ?? []} isLoading={isLoading} />
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function CommandCenterClient() {
  const { accountIds, datePreset, dateFrom, dateTo } = useFiltersStore()
  const accountId = accountIds[0] ?? ''
  const { from, to } = getDateRange(datePreset, dateFrom, dateTo)

  // ─── Fetch widget data ──────────────────────────────────────────────────────

  const widgetsQuery = useQuery<{ widgets: WidgetData }>({
    queryKey: ['dashboard-widgets', accountId, from, to],
    queryFn: () =>
      fetch(`/api/dashboard/widgets?accountId=${accountId}&from=${from}&to=${to}`).then((r) => {
        if (!r.ok) throw new Error('Failed to fetch widgets')
        return r.json()
      }),
    enabled: !!accountId,
    staleTime: 60_000,
  })

  const widgets = widgetsQuery.data?.widgets
  const isLoading = widgetsQuery.isLoading

  // ─── Empty state ────────────────────────────────────────────────────────────

  if (!accountId) {
    return (
      <div className="px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-[var(--foreground)]">Command Center</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Your daily trading cockpit.
          </p>
        </div>
        <div className="flex items-center justify-center h-64 rounded-lg border border-dashed border-[var(--border)] bg-[var(--card)]">
          <p className="text-sm text-[var(--muted-foreground)]">
            Select an account in the toolbar to load your dashboard.
          </p>
        </div>
      </div>
    )
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="px-6 py-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[var(--foreground)]">Command Center</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            {from === to ? from : `${from} → ${to}`}
          </p>
        </div>
      </div>

      {/* ── Overview Mode (fixed grid) ────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        {/* Row 1: Balance + Discipline + Equity Curve */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-3" style={{ minHeight: '340px' }}>
            <WidgetCard id="balance" widgets={widgets} isLoading={isLoading} />
          </div>
          <div className="col-span-12 lg:col-span-3" style={{ minHeight: '340px' }}>
            <WidgetCard id="discipline" widgets={widgets} isLoading={isLoading} />
          </div>
          <div className="col-span-12 lg:col-span-6" style={{ minHeight: '340px' }}>
            <WidgetCard id="equity" widgets={widgets} isLoading={isLoading} />
          </div>
        </div>

        {/* Row 2: Daily P&L + Win Rate + Prop Rules */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 sm:col-span-6 lg:col-span-3" style={{ minHeight: '180px' }}>
            <WidgetCard id="daily" widgets={widgets} isLoading={isLoading} />
          </div>
          <div className="col-span-12 sm:col-span-6 lg:col-span-3" style={{ minHeight: '180px' }}>
            <WidgetCard id="winrate" widgets={widgets} isLoading={isLoading} />
          </div>
          <div className="col-span-12 lg:col-span-6" style={{ minHeight: '180px' }}>
            <WidgetCard id="prop" widgets={widgets} isLoading={isLoading} />
          </div>
        </div>

        {/* Row 3: Recent Trades + Goals */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-6" style={{ minHeight: '240px' }}>
            <WidgetCard id="trades" widgets={widgets} isLoading={isLoading} />
          </div>
          <div className="col-span-12 lg:col-span-6" style={{ minHeight: '240px' }}>
            <WidgetCard id="goals" widgets={widgets} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </div>
  )
}
