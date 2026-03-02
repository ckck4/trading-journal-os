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
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#71717A]">
          Today · {today}
        </span>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-[#71717A]">No trades today</p>
        </div>
      </div>
    )
  }

  const isPositive = data.netPnl > 0
  const isNegative = data.netPnl < 0

  return (
    <div className="h-full flex flex-col gap-2 p-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#71717A]">
        Today · {today}
      </span>

      {/* Net P&L */}
      <span
        className={cn(
          'text-3xl font-mono-data font-bold tracking-tight',
          isPositive
            ? 'text-[#4ADE80]'
            : isNegative
              ? 'text-[#EF4444]'
              : 'text-[#FFFFFF]'
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
          <span className="text-[10px] text-[#52525B] uppercase tracking-[0.1em]">
            Trades
          </span>
          <span className="text-sm font-mono-data font-semibold text-[#FFFFFF]">{data.tradeCount}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-[#4ADE80] uppercase tracking-[0.1em]">W</span>
          <span className="text-sm font-mono-data font-semibold text-[#4ADE80]">
            {data.winCount}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-[#EF4444] uppercase tracking-[0.1em]">L</span>
          <span className="text-sm font-mono-data font-semibold text-[#EF4444]">
            {data.lossCount}
          </span>
        </div>
      </div>
    </div>
  )
}
