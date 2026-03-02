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
        <div className="flex flex-col flex-1 min-h-0 w-full divide-y divide-[var(--border)] overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#27272A] [&::-webkit-scrollbar-thumb]:rounded-full">
          {data.map((trade) => {
            const isLong = trade.side === 'LONG'
            const isWin = trade.netPnl > 0
            return (
              <Link
                key={trade.id}
                href="/journal"
                className="flex items-center w-full min-h-[44px] py-3 hover:bg-white/5 transition-colors"
              >
                <div className="w-[15%] flex justify-center shrink-0">
                  {isLong ? (
                    <ArrowUpRight className="w-3.5 h-3.5 text-[var(--color-green)]" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5 text-[var(--color-red)]" />
                  )}
                </div>
                <div className="w-[20%] text-sm font-mono font-semibold shrink-0 truncate">
                  {trade.instrument}
                </div>
                <div
                  className={cn(
                    'w-[25%] text-sm font-mono-data font-semibold shrink-0 text-right truncate',
                    isWin ? 'text-[var(--color-green)]' : trade.netPnl < 0 ? 'text-[var(--color-red)]' : 'text-[var(--foreground)]'
                  )}
                >
                  {fmt$(trade.netPnl)}
                </div>
                <div className="w-[20%] text-xs text-[var(--muted-foreground)] text-right shrink-0 truncate">
                  {fmtTime(trade.entryTime)}
                </div>
                <div className="w-[20%] text-xs font-semibold text-right shrink-0 pr-2 truncate">
                  {trade.grade ?? '-'}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
