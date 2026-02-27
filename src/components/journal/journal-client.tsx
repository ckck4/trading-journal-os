'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowUp, ArrowDown, BookOpen, RefreshCw, Info, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFiltersStore, type DatePreset } from '@/stores/filters'
import type { Trade } from '@/types/trades'
import { NotebookPanel } from './notebook-panel'
import { TradeDetailPanel } from './trade-detail-panel'

// ─── Date helpers ────────────────────────────────────────────────────────────

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

function fmt(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function getEffectiveDateRange(
  preset: DatePreset,
  dateFrom: string | null,
  dateTo: string | null
): { from: string; to: string } {
  const today = new Date()

  switch (preset) {
    case 'today':
      return { from: fmt(today), to: fmt(today) }

    case 'this_week': {
      const d = new Date(today)
      const day = d.getDay() // 0=Sun, 1=Mon
      d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
      return { from: fmt(d), to: fmt(today) }
    }

    case 'this_month': {
      const d = new Date(today.getFullYear(), today.getMonth(), 1)
      return { from: fmt(d), to: fmt(today) }
    }

    case 'last_30d': {
      const d = new Date(today)
      d.setDate(d.getDate() - 30)
      return { from: fmt(d), to: fmt(today) }
    }

    case 'custom':
      return { from: dateFrom ?? fmt(today), to: dateTo ?? fmt(today) }

    default:
      return { from: fmt(today), to: fmt(today) }
  }
}

// ─── Format helpers ──────────────────────────────────────────────────────────

function formatPnl(value: string | null): string {
  if (!value) return '$0.00'
  const num = parseFloat(value)
  if (isNaN(num)) return '$0.00'
  const abs = Math.abs(num).toFixed(2)
  return `${num >= 0 ? '+' : '-'}$${abs}`
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatDayHeader(date: string): string {
  const d = new Date(date + 'T12:00:00')
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function formatPrice(value: string | null): string {
  if (!value) return '—'
  return parseFloat(value).toFixed(2)
}

function pnlClass(value: string | null): string {
  if (!value) return 'text-[var(--muted-foreground)]'
  const num = parseFloat(value)
  if (num > 0) return 'text-profit'
  if (num < 0) return 'text-loss'
  return 'text-[var(--muted-foreground)]'
}

// ─── Outcome badge ───────────────────────────────────────────────────────────

function OutcomeBadge({ outcome, isOpen }: { outcome: string | null; isOpen: boolean }) {
  if (isOpen) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-[var(--color-blue)]/15 text-[var(--color-blue)]">
        OPEN
      </span>
    )
  }
  if (!outcome) return null

  const styles: Record<string, string> = {
    WIN: 'bg-[var(--color-green-muted)] text-[var(--color-green)]',
    LOSS: 'bg-[var(--color-red-muted)] text-[var(--color-red)]',
    BE: 'bg-[var(--color-yellow-muted)] text-[var(--color-yellow)]',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
        styles[outcome] ?? 'bg-[var(--muted)] text-[var(--muted-foreground)]'
      )}
    >
      {outcome}
    </span>
  )
}

function GradeBadge({ grade }: { grade: string | null }) {
  if (!grade) return null

  const getGradeStyle = (g: string) => {
    switch (g) {
      case 'A+': return 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30'
      case 'A': return 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20'
      case 'B+': return 'bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/30'
      case 'B': return 'bg-[#E8EAF0]/20 text-[var(--foreground)] border-[#E8EAF0]/40'
      case 'B-': return 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30'
      case 'C': return 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30'
      default: return 'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]'
    }
  }

  return (
    <span className={cn(
      "inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold font-mono border",
      getGradeStyle(grade)
    )}>
      {grade}
    </span>
  )
}

// ─── Loading skeleton ────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded bg-[var(--secondary)]',
        className
      )}
    />
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {[0, 1, 2].map((g) => (
        <div key={g} className="space-y-2">
          {/* Day header skeleton */}
          <div className="flex items-center gap-3 py-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-px flex-1" />
            <Skeleton className="h-4 w-20" />
          </div>
          {/* Trade rows skeleton */}
          {[0, 1, 2].map((r) => (
            <div
              key={r}
              className="flex items-center gap-4 px-4 py-3 rounded-lg border border-[var(--border)]"
            >
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="p-4 rounded-full bg-[var(--secondary)]">
        <BookOpen size={28} className="text-[var(--muted-foreground)]" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-[var(--foreground)] mb-1">
          No trades found
        </h3>
        <p className="text-sm text-[var(--muted-foreground)] max-w-xs">
          Import a CSV from your broker to get started, or adjust your filters.
        </p>
      </div>
    </div>
  )
}

// ─── Trade row ───────────────────────────────────────────────────────────────

interface TradeRowProps {
  trade: Trade
  isSelected: boolean
  onClick: () => void
  onInfoClick: (e: React.MouseEvent) => void
}

function TradeRow({ trade, isSelected, onClick, onInfoClick }: TradeRowProps) {
  const isLong = trade.side === 'LONG'

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-4 px-4 py-3 rounded-lg text-left',
        'border transition-all duration-150',
        'hover:bg-[var(--accent)] hover:border-[var(--color-accent-primary)]/30',
        isSelected
          ? 'border-[var(--color-accent-primary)]/60 bg-[var(--color-accent-muted)]'
          : 'border-[var(--border)] bg-[var(--card)]'
      )}
    >
      {/* Time */}
      <span className="font-mono text-xs text-[var(--muted-foreground)] w-14 shrink-0 tabular-nums">
        {formatTime(trade.entryTime)}
      </span>

      {/* Instrument */}
      <span className="text-sm font-semibold text-[var(--foreground)] w-12 shrink-0">
        {trade.rootSymbol}
      </span>

      {/* Side icon */}
      <span className="shrink-0">
        {isLong ? (
          <ArrowUp size={14} className="text-[var(--color-green)]" />
        ) : (
          <ArrowDown size={14} className="text-[var(--color-red)]" />
        )}
      </span>

      {/* Entry → Exit prices */}
      <span className="font-mono text-xs text-[var(--muted-foreground)] shrink-0">
        {formatPrice(trade.avgEntryPrice)}
        {trade.avgExitPrice && (
          <span className="mx-1 opacity-50">→</span>
        )}
        {trade.avgExitPrice && formatPrice(trade.avgExitPrice)}
      </span>

      {/* Duration */}
      <span className="text-xs text-[var(--muted-foreground)] shrink-0 hidden sm:block">
        {formatDuration(trade.durationSeconds)}
      </span>

      {/* Fills count */}
      <span className="text-xs text-[var(--muted-foreground)] shrink-0 hidden md:block">
        {trade.fillsCount} fill{trade.fillsCount !== 1 ? 's' : ''}
      </span>

      {/* Tags & Grade */}
      {(trade.tags.length > 0 || trade.grade) && (
        <div className="hidden lg:flex items-center gap-1.5 overflow-hidden">
          {trade.grade && <GradeBadge grade={trade.grade} />}
          {trade.tags.slice(0, 2).map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border border-[var(--border)] text-[var(--muted-foreground)]"
              style={
                tag.color
                  ? { borderColor: tag.color + '60', color: tag.color }
                  : undefined
              }
            >
              {tag.name}
            </span>
          ))}
          {trade.tags.length > 2 && (
            <span className="text-[10px] text-[var(--muted-foreground)]">
              +{trade.tags.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Net P&L */}
      <span
        className={cn(
          'font-mono text-sm font-semibold tabular-nums shrink-0',
          pnlClass(trade.netPnl)
        )}
      >
        {formatPnl(trade.netPnl)}
      </span>

      {/* Detail button */}
      <div className="shrink-0 flex items-center justify-center pl-3 pr-1">
        <div
          role="button"
          tabIndex={0}
          onClick={onInfoClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onInfoClick(e as any)
            }
          }}
          className={cn(
            'p-1.5 flex items-center justify-center rounded-md text-[var(--muted-foreground)]',
            'hover:bg-[var(--border)] hover:text-[var(--foreground)]',
            'transition-all duration-150 cursor-pointer'
          )}
          title="Trade Details"
        >
          <Info size={14} />
        </div>
      </div>

      {/* Outcome badge */}
      <div className="shrink-0 w-12 flex justify-end">
        <OutcomeBadge outcome={trade.outcome} isOpen={trade.isOpen} />
      </div>
    </button>
  )
}

// ─── Day group ───────────────────────────────────────────────────────────────

interface DayGroupProps {
  date: string
  trades: Trade[]
  selectedId: string | null
  onSelectTrade: (trade: Trade) => void
  onInfoTrade: (trade: Trade) => void
}

function DayGroup({ date, trades, selectedId, onSelectTrade, onInfoTrade }: DayGroupProps) {
  const dayPnl = trades.reduce((sum, t) => sum + parseFloat(t.netPnl || '0'), 0)
  const pnlColor =
    dayPnl > 0
      ? 'text-[var(--color-green)]'
      : dayPnl < 0
        ? 'text-[var(--color-red)]'
        : 'text-[var(--muted-foreground)]'

  return (
    <div className="space-y-1.5">
      {/* Day header */}
      <div className="flex items-center gap-3 py-1 sticky top-0 bg-[var(--background)] z-10">
        <span className="text-xs font-semibold text-[var(--muted-foreground)] shrink-0">
          {formatDayHeader(date)}
        </span>
        <div className="flex-1 h-px bg-[var(--border)]" />
        <span className="text-xs text-[var(--muted-foreground)] shrink-0">
          {trades.length} trade{trades.length !== 1 ? 's' : ''}
        </span>
        <span
          className={cn(
            'font-mono text-sm font-semibold tabular-nums shrink-0',
            pnlColor
          )}
        >
          {formatPnl(dayPnl.toString())}
        </span>
      </div>

      {/* Trade rows */}
      <div className="space-y-1">
        {trades.map((trade) => (
          <TradeRow
            key={trade.id}
            trade={trade}
            isSelected={selectedId === trade.id}
            onClick={() => onSelectTrade(trade)}
            onInfoClick={(e) => {
              e.stopPropagation()
              onInfoTrade(trade)
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Routine Banner ────────────────────────────────────────────────────────────

function RoutineBanner() {
  const queryClient = useQueryClient()
  const today = useMemo(() => fmt(new Date()), [])

  const { data: checkinData, isLoading: checkinLoading } = useQuery({
    queryKey: ['discipline-checkin', today],
    queryFn: async () => {
      const res = await fetch(`/api/discipline/checkin?date=${today}`)
      if (!res.ok) return null
      return res.json()
    }
  })

  const { data: scoreData } = useQuery({
    queryKey: ['discipline-score', today],
    queryFn: async () => {
      const res = await fetch(`/api/discipline/score?date=${today}`)
      if (!res.ok) return null
      return res.json()
    }
  })

  const checkinMutation = useMutation({
    mutationFn: async (followed: boolean) => {
      const res = await fetch('/api/discipline/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today, followed_routine: followed })
      })
      if (!res.ok) throw new Error('Failed to update checkin')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discipline-checkin', today] })
      queryClient.invalidateQueries({ queryKey: ['discipline-score', today] })
    }
  })

  const [showPrompt, setShowPrompt] = useState(false)

  if (checkinLoading) return null

  const checkin = checkinData?.data
  const score = scoreData?.data?.score
  const label = scoreData?.data?.label

  const isCheckedIn = !!checkin && !showPrompt

  let scoreColor = 'text-[var(--muted-foreground)]'
  if (score >= 90) scoreColor = 'text-[var(--color-green)]'
  else if (score >= 75) scoreColor = 'text-[#A3E635]' // lighter green/yellow
  else if (score >= 60) scoreColor = 'text-[var(--color-yellow)]'
  else if (score >= 40) scoreColor = 'text-[var(--color-orange)]'
  else if (score !== undefined && score !== null) scoreColor = 'text-[var(--color-red)]'

  if (!isCheckedIn) {
    return (
      <div className="mb-6 w-full rounded-lg border border-[var(--border)] border-l-[3px] border-l-[var(--color-blue)] bg-[#14171E] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <span className="text-sm font-medium text-[var(--foreground)]">Did you follow your pre-trade routine today?</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { checkinMutation.mutate(true); setShowPrompt(false); }}
            disabled={checkinMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-[var(--color-green)] border border-[var(--color-green)]/30 hover:bg-[var(--color-green)]/10 transition-colors"
          >
            <Check size={14} /> Yes, I followed my routine
          </button>
          <button
            onClick={() => { checkinMutation.mutate(false); setShowPrompt(false); }}
            disabled={checkinMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-[var(--color-red)] border border-[var(--color-red)]/30 hover:bg-[var(--color-red)]/10 transition-colors"
          >
            <X size={14} /> No I didn't
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6 w-full rounded-lg border border-[var(--border)] bg-[#14171E] px-4 py-2.5 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        {checkin.followed_routine ? (
          <div className="flex items-center gap-2 text-[var(--color-green)] text-sm font-medium">
            <Check size={16} /> Routine followed today
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[var(--color-red)] text-sm font-medium">
            <X size={16} /> Routine not followed today
          </div>
        )}
        <button
          onClick={() => setShowPrompt(true)}
          className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline decoration-dotted underline-offset-2 transition-colors"
        >
          Change
        </button>
      </div>

      {score !== undefined && score !== null && (
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-[var(--muted-foreground)]">Discipline:</span>
          <span className={cn("font-semibold font-mono", scoreColor)}>{score}</span>
          <span className="text-[var(--muted-foreground)]">·</span>
          <span className={scoreColor}>{label}</span>
        </div>
      )}
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export function JournalClient() {
  const { accountIds, datePreset, dateFrom, dateTo, instruments, strategyIds } =
    useFiltersStore()

  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null)
  const [detailedTrade, setDetailedTrade] = useState<Trade | null>(null)

  // Compute effective date range from preset
  const dateRange = useMemo(
    () => getEffectiveDateRange(datePreset, dateFrom, dateTo),
    [datePreset, dateFrom, dateTo]
  )

  // Build query params
  const queryParams = useMemo(() => {
    const p = new URLSearchParams()
    p.set('date_from', dateRange.from)
    p.set('date_to', dateRange.to)
    if (accountIds.length > 0) p.set('account_id', accountIds[0])
    if (instruments.length > 0) p.set('instrument', instruments[0])
    if (strategyIds.length > 0) p.set('strategy_id', strategyIds[0])
    return p.toString()
  }, [dateRange, accountIds, instruments, strategyIds])

  // Fetch trades
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['trades', accountIds, datePreset, dateFrom, dateTo, instruments, strategyIds],
    queryFn: async () => {
      const res = await fetch(`/api/trades?${queryParams}`)
      if (!res.ok) throw new Error('Failed to fetch trades')
      return res.json() as Promise<{ trades: Trade[] }>
    },
    staleTime: 30 * 1000,
  })

  const trades = data?.trades ?? []

  // Group trades by trading day (already sorted DESC from API)
  const groupedTrades = useMemo(() => {
    const groups: Record<string, Trade[]> = {}
    for (const trade of trades) {
      if (!groups[trade.tradingDay]) groups[trade.tradingDay] = []
      groups[trade.tradingDay].push(trade)
    }
    // Days are already in DESC order from the API
    return Object.entries(groups)
  }, [trades])

  const handleSelectTrade = (trade: Trade) => {
    setSelectedTrade((prev) => (prev?.id === trade.id ? null : trade))
  }

  const handleInfoTrade = (trade: Trade) => setDetailedTrade(trade)
  const handleCloseDetailPanel = () => setDetailedTrade(null)

  if (isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24">
        <p className="text-sm text-[var(--color-red)]">Failed to load trades.</p>
        <button
          onClick={() => refetch()}
          className={cn(
            'flex items-center gap-2 rounded-md px-4 py-2 text-sm',
            'border border-[var(--border)] bg-[var(--secondary)]',
            'hover:bg-[var(--accent)] transition-colors duration-150'
          )}
        >
          <RefreshCw size={14} />
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden flex-row">
      {/* Main list (60%) */}
      <div className="w-[60%] overflow-y-auto border-r border-[var(--border)]">
        {isLoading ? (
          <LoadingSkeleton />
        ) : trades.length === 0 ? (
          <div className="px-6 py-5 space-y-6 max-w-5xl">
            <RoutineBanner />
            <EmptyState />
          </div>
        ) : (
          <div className="px-6 py-5 space-y-6 max-w-5xl">
            <RoutineBanner />
            {groupedTrades.map(([date, dayTrades]) => (
              <DayGroup
                key={date}
                date={date}
                trades={dayTrades}
                selectedId={selectedTrade?.id ?? null}
                onSelectTrade={handleSelectTrade}
                onInfoTrade={handleInfoTrade}
              />
            ))}
          </div>
        )}
      </div>

      {/* Notebook panel (40%) */}
      <NotebookPanel trade={selectedTrade} />

      {/* Slide-over trade detail panel */}
      <TradeDetailPanel trade={detailedTrade} onClose={handleCloseDetailPanel} />
    </div>
  )
}
