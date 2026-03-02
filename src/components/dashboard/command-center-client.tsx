'use client'

import { useQuery } from '@tanstack/react-query'
import { useFiltersStore } from '@/stores/filters'
import { CombinedEquityBalanceWidget } from '@/components/dashboard/combined-equity-balance-widget'
import { DailyDisciplineWidget } from '@/components/dashboard/daily-discipline-widget'
import { DisciplineHistoryWidget } from '@/components/dashboard/discipline-history-widget'
import { DailyPnlWidget } from '@/components/dashboard/daily-pnl-widget'
import { WinRateWidget } from '@/components/dashboard/win-rate-widget'
import { PropRulesWidget } from '@/components/dashboard/prop-rules-widget'
import { RecentTradesWidget } from '@/components/dashboard/recent-trades-widget'
import { GoalsWidget } from '@/components/dashboard/goals-widget'
import type { WidgetData } from '@/types/dashboard'
import type { DatePreset } from '@/stores/filters'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const WIDGET_IDS = ['combined', 'discipline', 'history', 'daily', 'winrate', 'prop', 'trades', 'goals'] as const
type WidgetId = typeof WIDGET_IDS[number]

// ─── Date range helper ─────────────────────────────────────────────────────────

function getDateRange(
  preset: DatePreset,
  dateFrom: string | null,
  dateTo: string | null
): { from: string; to: string } {
  const today = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  const fmt = (d: Date, endOfDay = false) => {
    const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    return endOfDay ? `${dateStr}T23:59:59` : `${dateStr}T00:00:00`
  }

  if (preset === 'today') return { from: fmt(today), to: fmt(today, true) }
  if (preset === 'this_week') {
    const mon = new Date(today)
    const dow = today.getDay()
    mon.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
    return { from: fmt(mon), to: fmt(today, true) }
  }
  if (preset === 'this_month') {
    const first = new Date(today.getFullYear(), today.getMonth(), 1)
    return { from: fmt(first), to: fmt(today, true) }
  }
  if (preset === 'last_30d') {
    const d = new Date(today)
    d.setDate(today.getDate() - 29)
    return { from: fmt(d), to: fmt(today, true) }
  }
  return {
    from: dateFrom ? `${dateFrom}T00:00:00` : fmt(today),
    to: dateTo ? `${dateTo}T23:59:59` : fmt(today, true)
  }
}

function formatDisplayDate(from: string, to: string) {
  const d1Str = from.split('T')[0]
  const d2Str = to.split('T')[0]
  const d1 = new Date(d1Str + 'T12:00:00')
  const d2 = new Date(d2Str + 'T12:00:00')

  if (d1Str === d2Str) {
    return d1.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
  } else {
    if (d1.getFullYear() === d2.getFullYear()) {
      const start = d1.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const end = d2.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      return `${start} – ${end}`
    } else {
      const start = d1.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      const end = d2.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      return `${start} – ${end}`
    }
  }
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
      {id === 'combined' && (
        <CombinedEquityBalanceWidget balanceData={widgets?.balance ?? null} equityData={widgets?.equityCurve ?? []} isLoading={isLoading} />
      )}
      {id === 'discipline' && (
        <DailyDisciplineWidget />
      )}
      {id === 'history' && (
        <DisciplineHistoryWidget />
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
  const { accountIds, datePreset, dateFrom, dateTo, setDatePreset } = useFiltersStore()
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
          <div className="flex items-center gap-3 mt-1.5">
            <Select
              value={datePreset}
              onValueChange={(val) => setDatePreset(val as DatePreset)}
            >
              <SelectTrigger className="w-[140px] h-8 text-xs bg-[#14171E] border border-[#2A2F3E] text-[#E8EAF0] focus:ring-0">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent className="bg-[#14171E] border-[#2A2F3E] text-[#E8EAF0]">
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_30d">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
            <span className="font-sans text-sm text-[#A1A1AA]">
              {formatDisplayDate(from, to)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Overview Mode (fixed grid) ────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        {/* ROW 1: Combined + Win Rate + Today's PnL */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-5 h-[340px]">
            <WidgetCard id="combined" widgets={widgets} isLoading={isLoading} />
          </div>
          <div className="col-span-12 lg:col-span-3 h-[340px]">
            <WidgetCard id="winrate" widgets={widgets} isLoading={isLoading} />
          </div>
          <div className="col-span-12 lg:col-span-4 h-[340px]">
            <WidgetCard id="daily" widgets={widgets} isLoading={isLoading} />
          </div>
        </div>

        {/* ROW 2: Discipline History + Daily Discipline + Recent Trades */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-4 h-[240px]">
            <WidgetCard id="history" widgets={widgets} isLoading={isLoading} />
          </div>
          <div className="col-span-12 lg:col-span-3 h-[240px]">
            <WidgetCard id="discipline" widgets={widgets} isLoading={isLoading} />
          </div>
          <div className="col-span-12 lg:col-span-5 h-[240px]">
            <WidgetCard id="trades" widgets={widgets} isLoading={isLoading} />
          </div>
        </div>

        {/* ROW 3: Prop Rules + Goals */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-5 h-[240px]">
            <WidgetCard id="prop" widgets={widgets} isLoading={isLoading} />
          </div>
          <div className="col-span-12 lg:col-span-7 h-[240px]">
            <WidgetCard id="goals" widgets={widgets} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </div>
  )
}
