'use client'

import { cn } from '@/lib/utils'
import type { BalanceData } from '@/types/dashboard'

interface BalanceDrawdownWidgetProps {
  data: BalanceData | null
  isLoading?: boolean
}

function fmt$(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : n > 0 ? '+' : ''
  return `${sign}$${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function BalanceDrawdownWidget({ data, isLoading }: BalanceDrawdownWidgetProps) {
  if (isLoading) {
    return (
      <div className="h-full flex flex-col gap-3 p-1">
        <div className="h-4 w-24 rounded bg-[var(--secondary)] animate-pulse" />
        <div className="h-8 w-36 rounded bg-[var(--secondary)] animate-pulse" />
        <div className="h-3 w-full rounded bg-[var(--secondary)] animate-pulse mt-auto" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-[var(--muted-foreground)]">Select an account</p>
      </div>
    )
  }

  const drawdownPct =
    data.maxDailyLossThreshold !== null && data.maxDailyLossThreshold !== 0
      ? Math.min(
          100,
          Math.round((Math.abs(data.maxDailyLoss) / Math.abs(data.maxDailyLossThreshold)) * 100)
        )
      : 0

  const barColor =
    drawdownPct >= 100
      ? 'bg-[var(--color-red)]'
      : drawdownPct >= 80
      ? 'bg-[var(--color-yellow)]'
      : 'bg-[var(--color-green)]'

  return (
    <div className="h-full flex flex-col gap-2 p-1">
      {/* Labels */}
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Account Balance
        </span>
        <span
          className={cn(
            'text-[11px] font-mono',
            data.netPnl >= 0 ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'
          )}
        >
          {fmt$(data.netPnl)}
        </span>
      </div>

      {/* Current balance */}
      <span className="text-2xl font-mono font-semibold tracking-tight text-[var(--foreground)]">
        ${data.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>

      <div className="text-xs text-[var(--muted-foreground)]">
        Started at ${data.startingBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
      </div>

      {/* Drawdown bar */}
      {data.maxDailyLossThreshold !== null && (
        <div className="mt-auto">
          <div className="flex justify-between text-[10px] text-[var(--muted-foreground)] mb-1">
            <span>Daily Loss</span>
            <span>
              {data.maxDailyLoss < 0 ? fmt$(data.maxDailyLoss) : '—'} /{' '}
              {fmt$(data.maxDailyLossThreshold)}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[var(--secondary)] overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-300', barColor)}
              style={{ width: `${drawdownPct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
