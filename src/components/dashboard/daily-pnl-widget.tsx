'use client'

import { cn } from '@/lib/utils'
import type { DailyPnlData } from '@/types/dashboard'

interface DailyPnlWidgetProps {
  data: DailyPnlData | null
  isLoading?: boolean
}

export function DailyPnlWidget({ data, isLoading }: DailyPnlWidgetProps) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  if (isLoading) {
    return (
      <div className="h-full flex flex-col gap-3 p-1">
        <div className="h-4 w-20 rounded bg-[var(--secondary)] animate-pulse" />
        <div className="h-10 w-32 rounded bg-[var(--secondary)] animate-pulse" />
        <div className="flex gap-3 mt-auto">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-16 rounded bg-[var(--secondary)] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="h-full flex flex-col gap-2 p-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Today · {today}
        </span>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-[var(--muted-foreground)]">No trades today</p>
        </div>
      </div>
    )
  }

  const isPositive = data.netPnl > 0
  const isNegative = data.netPnl < 0

  return (
    <div className="h-full flex flex-col gap-2 p-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
        Today · {today}
      </span>

      {/* Net P&L */}
      <span
        className={cn(
          'text-3xl font-mono font-bold tracking-tight',
          isPositive
            ? 'text-[var(--color-green)]'
            : isNegative
            ? 'text-[var(--color-red)]'
            : 'text-[var(--foreground)]'
        )}
      >
        {data.netPnl >= 0 ? '+' : ''}$
        {Math.abs(data.netPnl).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </span>

      {/* Stats row */}
      <div className="mt-auto flex gap-4">
        <div className="flex flex-col">
          <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide">
            Trades
          </span>
          <span className="text-sm font-mono font-semibold">{data.tradeCount}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-[var(--color-green)] uppercase tracking-wide">W</span>
          <span className="text-sm font-mono font-semibold text-[var(--color-green)]">
            {data.winCount}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-[var(--color-red)] uppercase tracking-wide">L</span>
          <span className="text-sm font-mono font-semibold text-[var(--color-red)]">
            {data.lossCount}
          </span>
        </div>
      </div>
    </div>
  )
}
