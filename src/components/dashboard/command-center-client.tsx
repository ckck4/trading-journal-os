'use client'

import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout'
import type { ResponsiveLayouts, Layout } from 'react-grid-layout'
import { Settings2, Save, RotateCcw, Check, X } from 'lucide-react'
import { useFiltersStore } from '@/stores/filters'
import { BalanceDrawdownWidget } from '@/components/dashboard/balance-drawdown-widget'
import { EquityCurveWidget } from '@/components/dashboard/equity-curve-widget'
import { DailyPnlWidget } from '@/components/dashboard/daily-pnl-widget'
import { WinRateWidget } from '@/components/dashboard/win-rate-widget'
import { PropRulesWidget } from '@/components/dashboard/prop-rules-widget'
import { RecentTradesWidget } from '@/components/dashboard/recent-trades-widget'
import { GoalsWidget } from '@/components/dashboard/goals-widget'
import type { WidgetData } from '@/types/dashboard'
import type { DatePreset } from '@/stores/filters'

// ─── Default Layout ────────────────────────────────────────────────────────────

export const DEFAULT_LAYOUTS: ResponsiveLayouts = {
  lg: [
    { i: 'balance', x: 0,  y: 0, w: 4, h: 4, minW: 3, minH: 3 },
    { i: 'equity',  x: 4,  y: 0, w: 8, h: 4, minW: 4, minH: 3 },
    { i: 'daily',   x: 0,  y: 4, w: 3, h: 4, minW: 2, minH: 3 },
    { i: 'winrate', x: 3,  y: 4, w: 3, h: 4, minW: 2, minH: 3 },
    { i: 'prop',    x: 6,  y: 4, w: 6, h: 4, minW: 4, minH: 3 },
    { i: 'trades',  x: 0,  y: 8, w: 6, h: 5, minW: 4, minH: 4 },
    { i: 'goals',   x: 6,  y: 8, w: 6, h: 5, minW: 4, minH: 4 },
  ],
  md: [
    { i: 'balance', x: 0, y: 0, w: 4, h: 4 },
    { i: 'equity',  x: 4, y: 0, w: 6, h: 4 },
    { i: 'daily',   x: 0, y: 4, w: 3, h: 4 },
    { i: 'winrate', x: 3, y: 4, w: 3, h: 4 },
    { i: 'prop',    x: 6, y: 4, w: 4, h: 4 },
    { i: 'trades',  x: 0, y: 8, w: 5, h: 5 },
    { i: 'goals',   x: 5, y: 8, w: 5, h: 5 },
  ],
  sm: [
    { i: 'balance', x: 0, y: 0,  w: 6, h: 4 },
    { i: 'equity',  x: 0, y: 4,  w: 6, h: 4 },
    { i: 'daily',   x: 0, y: 8,  w: 3, h: 4 },
    { i: 'winrate', x: 3, y: 8,  w: 3, h: 4 },
    { i: 'prop',    x: 0, y: 12, w: 6, h: 4 },
    { i: 'trades',  x: 0, y: 16, w: 6, h: 5 },
    { i: 'goals',   x: 0, y: 21, w: 6, h: 5 },
  ],
}

const WIDGET_IDS = ['balance', 'equity', 'daily', 'winrate', 'prop', 'trades', 'goals'] as const
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
  isCustomMode,
}: {
  id: WidgetId
  widgets: WidgetData | undefined
  isLoading: boolean
  isCustomMode: boolean
}) {
  return (
    <div
      className="h-full w-full rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 overflow-hidden relative"
      style={{ cursor: isCustomMode ? 'grab' : 'default' }}
    >
      {id === 'balance' && (
        <BalanceDrawdownWidget data={widgets?.balance ?? null} isLoading={isLoading} />
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

  const [mode, setMode] = useState<'overview' | 'custom'>('overview')
  const [layouts, setLayouts] = useState<ResponsiveLayouts>(DEFAULT_LAYOUTS)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')

  const queryClient = useQueryClient()

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

  // ─── Load saved layout ──────────────────────────────────────────────────────

  const layoutsQuery = useQuery<{ layouts: Array<{ id: string; layout_json: ResponsiveLayouts; name: string }> }>({
    queryKey: ['dashboard-layouts'],
    queryFn: () =>
      fetch('/api/dashboard/layouts').then((r) => {
        if (!r.ok) throw new Error('Failed to fetch layouts')
        return r.json()
      }),
    staleTime: 300_000,
  })

  // Apply saved layout once loaded (replaces deprecated onSuccess)
  useEffect(() => {
    if (layoutsQuery.data) {
      const defaultLayout = layoutsQuery.data.layouts.find((l) => l.name === 'Default')
      if (defaultLayout?.layout_json) {
        setLayouts(defaultLayout.layout_json)
      }
    }
  }, [layoutsQuery.data])

  // ─── Save layout mutation ───────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: (layoutJson: ResponsiveLayouts) =>
      fetch('/api/dashboard/layouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Default', layoutJson, isDefault: true }),
      }).then((r) => {
        if (!r.ok) throw new Error('Failed to save layout')
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-layouts'] })
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2000)
    },
  })

  const handleSaveLayout = useCallback(() => {
    setSaveState('saving')
    saveMutation.mutate(layouts)
  }, [layouts, saveMutation])

  const handleResetLayout = useCallback(() => {
    setLayouts(DEFAULT_LAYOUTS)
  }, [])

  const handleLayoutChange = useCallback((_layout: Layout, allLayouts: ResponsiveLayouts) => {
    setLayouts(allLayouts)
  }, [])

  const widgets = widgetsQuery.data?.widgets
  const isLoading = widgetsQuery.isLoading

  const { width: gridWidth, containerRef, mounted: gridMounted } = useContainerWidth()

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

        {/* Mode controls */}
        <div className="flex items-center gap-2">
          {mode === 'overview' ? (
            <button
              onClick={() => setMode('custom')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-[var(--muted-foreground)] border border-[var(--border)] hover:bg-white/5 hover:text-[var(--foreground)] transition-colors"
            >
              <Settings2 className="w-3.5 h-3.5" />
              Customize
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetLayout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-[var(--muted-foreground)] border border-[var(--border)] hover:bg-white/5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
              <button
                onClick={handleSaveLayout}
                disabled={saveState === 'saving'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm bg-[var(--color-accent-primary)] text-white hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
              >
                {saveState === 'saved' ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                {saveState === 'saved' ? 'Saved!' : saveState === 'saving' ? 'Saving…' : 'Save Layout'}
              </button>
              <button
                onClick={() => setMode('overview')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-[var(--muted-foreground)] border border-[var(--border)] hover:bg-white/5 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Done
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Overview Mode (fixed grid) ────────────────────────────────────────── */}
      {mode === 'overview' && (
        <div className="flex flex-col gap-4">
          {/* Row 1: Balance + Equity Curve */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-4" style={{ minHeight: '200px' }}>
              <WidgetCard id="balance" widgets={widgets} isLoading={isLoading} isCustomMode={false} />
            </div>
            <div className="col-span-12 lg:col-span-8" style={{ minHeight: '200px' }}>
              <WidgetCard id="equity" widgets={widgets} isLoading={isLoading} isCustomMode={false} />
            </div>
          </div>

          {/* Row 2: Daily P&L + Win Rate + Prop Rules */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 sm:col-span-6 lg:col-span-3" style={{ minHeight: '180px' }}>
              <WidgetCard id="daily" widgets={widgets} isLoading={isLoading} isCustomMode={false} />
            </div>
            <div className="col-span-12 sm:col-span-6 lg:col-span-3" style={{ minHeight: '180px' }}>
              <WidgetCard id="winrate" widgets={widgets} isLoading={isLoading} isCustomMode={false} />
            </div>
            <div className="col-span-12 lg:col-span-6" style={{ minHeight: '180px' }}>
              <WidgetCard id="prop" widgets={widgets} isLoading={isLoading} isCustomMode={false} />
            </div>
          </div>

          {/* Row 3: Recent Trades + Goals */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-6" style={{ minHeight: '240px' }}>
              <WidgetCard id="trades" widgets={widgets} isLoading={isLoading} isCustomMode={false} />
            </div>
            <div className="col-span-12 lg:col-span-6" style={{ minHeight: '240px' }}>
              <WidgetCard id="goals" widgets={widgets} isLoading={isLoading} isCustomMode={false} />
            </div>
          </div>
        </div>
      )}

      {/* ── Custom Mode (react-grid-layout) ──────────────────────────────────── */}
      {mode === 'custom' && (
        <div ref={containerRef}>
          <p className="text-xs text-[var(--muted-foreground)] mb-3">
            Drag and resize widgets to customize your layout. Click Save to persist.
          </p>
          {gridMounted && (
            <ResponsiveGridLayout
              className="layout"
              width={gridWidth}
              layouts={layouts}
              breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
              cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
              rowHeight={48}
              dragConfig={{ enabled: true }}
              resizeConfig={{ enabled: true }}
              margin={[16, 16]}
              onLayoutChange={handleLayoutChange}
            >
              {WIDGET_IDS.map((id) => (
                <div key={id} style={{ overflow: 'hidden' }}>
                  <WidgetCard
                    id={id}
                    widgets={widgets}
                    isLoading={isLoading}
                    isCustomMode={true}
                  />
                </div>
              ))}
            </ResponsiveGridLayout>
          )}
        </div>
      )}
    </div>
  )
}
