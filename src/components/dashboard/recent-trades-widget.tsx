'use client'

import Link from 'next/link'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RecentTrade } from '@/types/dashboard'

interface RecentTradesWidgetProps {
  data: RecentTrade[]
  isLoading?: boolean
}

function fmt$(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : n > 0 ? '+' : ''
  return `${sign}$${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function RecentTradesWidget({ data, isLoading }: RecentTradesWidgetProps) {
  if (isLoading) {
    return (
      <div className="h-full flex flex-col gap-2 p-1">
        <div className="h-4 w-28 rounded bg-[var(--secondary)] animate-pulse" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-7 rounded bg-[var(--secondary)] animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col gap-2 p-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Recent Trades
        </span>
        <Link
          href="/journal"
          className="text-[10px] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          View all →
        </Link>
      </div>

      {data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-[var(--muted-foreground)]">No trades yet</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-[var(--border)]">
          {data.map((trade) => {
            const isLong = trade.side === 'LONG'
            const isWin = trade.netPnl > 0
            return (
              <Link
                key={trade.id}
                href="/journal"
                className="flex items-center gap-2 py-1.5 hover:bg-white/5 rounded px-1 transition-colors"
              >
                {isLong ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-[var(--color-green)] flex-shrink-0" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 text-[var(--color-red)] flex-shrink-0" />
                )}
                <span className="text-xs font-mono font-semibold w-10 flex-shrink-0">
                  {trade.instrument}
                </span>
                <span className="text-[10px] text-[var(--muted-foreground)] flex-1">
                  {fmtTime(trade.entryTime)}
                </span>
                <span
                  className={cn(
                    'text-xs font-mono font-semibold flex-shrink-0',
                    isWin ? 'text-[var(--color-green)]' : trade.netPnl < 0 ? 'text-[var(--color-red)]' : 'text-[var(--foreground)]'
                  )}
                >
                  {fmt$(trade.netPnl)}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
