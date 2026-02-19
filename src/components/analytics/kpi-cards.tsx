'use client'

import { cn } from '@/lib/utils'
import type { AnalyticsSummary } from '@/types/analytics'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt$(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : n > 0 ? '+' : ''
  if (abs >= 1000) {
    return `${sign}$${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return `${sign}$${abs.toFixed(2)}`
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'h-6 w-20 rounded bg-[var(--secondary)] animate-pulse',
        className
      )}
    />
  )
}

// ─── Single KPI card ─────────────────────────────────────────────────────────

function KpiCard({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-4 flex flex-col gap-1',
        className
      )}
    >
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
        {label}
      </span>
      {children}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface KpiCardsProps {
  summary: AnalyticsSummary | undefined
  isLoading: boolean
}

export function KpiCards({ summary, isLoading }: KpiCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <KpiCard key={i} label="Loading">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-4 w-16 mt-1" />
          </KpiCard>
        ))}
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <KpiCard key={i} label="—">
            <span className="text-xl font-mono text-[var(--muted-foreground)]">—</span>
          </KpiCard>
        ))}
      </div>
    )
  }

  // Profit factor color
  const pfClass =
    summary.profitFactor >= 1.5
      ? 'text-profit'
      : summary.profitFactor >= 1.0
      ? 'text-warning'
      : 'text-loss'

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

      {/* Net P&L */}
      <KpiCard label="Net P&L">
        <span
          className={cn(
            'text-2xl font-mono font-semibold tracking-tight',
            summary.netPnl > 0 ? 'text-profit' : summary.netPnl < 0 ? 'text-loss' : 'text-[var(--foreground)]'
          )}
        >
          {fmt$(summary.netPnl)}
        </span>
      </KpiCard>

      {/* Win Rate */}
      <KpiCard label="Win Rate">
        <span className="text-2xl font-mono font-semibold tracking-tight">
          {fmtPct(summary.winRate)}
        </span>
        <span className="text-xs text-[var(--muted-foreground)]">
          <span className="text-profit">W{summary.winCount}</span>
          {' / '}
          <span className="text-loss">L{summary.lossCount}</span>
        </span>
      </KpiCard>

      {/* Profit Factor */}
      <KpiCard label="Profit Factor">
        <span className={cn('text-2xl font-mono font-semibold tracking-tight', pfClass)}>
          {summary.profitFactor === 9999 ? '∞' : summary.profitFactor.toFixed(2)}
        </span>
      </KpiCard>

      {/* Avg R-Multiple */}
      <KpiCard label="Avg R-Multiple">
        <span
          className={cn(
            'text-2xl font-mono font-semibold tracking-tight',
            summary.avgR > 0 ? 'text-profit' : summary.avgR < 0 ? 'text-loss' : 'text-[var(--foreground)]'
          )}
        >
          {summary.avgR === 0 ? '—' : `${summary.avgR >= 0 ? '+' : ''}${summary.avgR.toFixed(2)}R`}
        </span>
      </KpiCard>

      {/* Total Trades */}
      <KpiCard label="Total Trades">
        <span className="text-2xl font-mono font-semibold tracking-tight">
          {summary.totalTrades}
        </span>
      </KpiCard>

      {/* Avg Winner / Avg Loser */}
      <KpiCard label="Avg Win / Avg Loss">
        <div className="flex flex-col gap-0.5">
          <span className="text-lg font-mono font-semibold text-profit">
            {summary.avgWinner !== 0 ? fmt$(summary.avgWinner) : '—'}
          </span>
          <span className="text-lg font-mono font-semibold text-loss">
            {summary.avgLoser !== 0 ? fmt$(summary.avgLoser) : '—'}
          </span>
        </div>
      </KpiCard>

      {/* Largest Win / Largest Loss */}
      <KpiCard label="Best / Worst Trade">
        <div className="flex flex-col gap-0.5">
          <span className="text-lg font-mono font-semibold text-profit">
            {summary.largestWin !== 0 ? fmt$(summary.largestWin) : '—'}
          </span>
          <span className="text-lg font-mono font-semibold text-loss">
            {summary.largestLoss !== 0 ? fmt$(summary.largestLoss) : '—'}
          </span>
        </div>
      </KpiCard>

      {/* Best Day / Worst Day */}
      <KpiCard label="Best / Worst Day">
        <div className="flex flex-col gap-0.5">
          {summary.bestDay ? (
            <>
              <span className="text-lg font-mono font-semibold text-profit">
                {fmt$(summary.bestDay.netPnl)}
              </span>
              <span className="text-[11px] text-[var(--muted-foreground)]">
                {fmtDate(summary.bestDay.date)}
              </span>
            </>
          ) : (
            <span className="text-[var(--muted-foreground)]">—</span>
          )}
          {summary.worstDay && summary.worstDay.netPnl !== summary.bestDay?.netPnl && (
            <>
              <span className="text-lg font-mono font-semibold text-loss">
                {fmt$(summary.worstDay.netPnl)}
              </span>
              <span className="text-[11px] text-[var(--muted-foreground)]">
                {fmtDate(summary.worstDay.date)}
              </span>
            </>
          )}
        </div>
      </KpiCard>

    </div>
  )
}
