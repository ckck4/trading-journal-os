'use client'

import { cn } from '@/lib/utils'
import type { WinRateData } from '@/types/dashboard'

interface WinRateWidgetProps {
  data: WinRateData | null
  isLoading?: boolean
}

export function WinRateWidget({ data, isLoading }: WinRateWidgetProps) {
  if (isLoading) {
    return (
      <div className="h-full flex flex-col gap-3 p-1">
        <div className="h-4 w-20 rounded bg-[var(--secondary)] animate-pulse" />
        <div className="h-9 w-24 rounded bg-[var(--secondary)] animate-pulse" />
        <div className="flex gap-4 mt-auto">
          <div className="h-8 w-20 rounded bg-[var(--secondary)] animate-pulse" />
          <div className="h-8 w-20 rounded bg-[var(--secondary)] animate-pulse" />
        </div>
      </div>
    )
  }

  if (!data || data.totalTrades === 0) {
    return (
      <div className="h-full flex flex-col gap-2 p-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#71717A]">
          Win Rate
        </span>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-[#71717A]">No trades in range</p>
        </div>
      </div>
    )
  }

  const wrColor =
    data.winRate >= 60
      ? 'text-[#4ADE80]'
      : data.winRate >= 45
        ? 'text-[#FFFFFF]'
        : 'text-[#EF4444]'

  const pfColor =
    data.profitFactor >= 1.5
      ? 'text-[#4ADE80]'
      : data.profitFactor >= 1.0
        ? 'text-[#FFFFFF]'
        : 'text-[#EF4444]'

  return (
    <div className="h-full flex flex-col gap-2 p-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#71717A]">
        Win Rate
      </span>

      <span className={cn('text-3xl font-mono-data font-bold tracking-tight', wrColor)}>
        {data.winRate.toFixed(1)}%
      </span>

      <div className="mt-auto flex gap-4">
        <div className="flex flex-col">
          <span className="text-[10px] text-[#52525B] uppercase tracking-[0.1em]">
            Trades
          </span>
          <span className="text-sm font-mono-data font-semibold text-[#FFFFFF]">{data.totalTrades}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-[#52525B] uppercase tracking-[0.1em]">
            Prof. Factor
          </span>
          <span className={cn('text-sm font-mono-data font-semibold', pfColor)}>
            {data.profitFactor >= 9999 ? '∞' : data.profitFactor.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  )
}
