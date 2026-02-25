'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { X, ArrowUp, ArrowDown, ExternalLink, Clock } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import type { Trade, Strategy } from '@/types/trades'
import { GradeSection } from '@/components/journal/grade-section'

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatPnl(value: string | number | null): string {
  if (value === null || value === undefined) return '—'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '—'
  const abs = Math.abs(num).toFixed(2)
  return `${num >= 0 ? '+' : '-'}$${abs}`
}

function formatPrice(value: string | null): string {
  if (!value) return '—'
  const num = parseFloat(value)
  if (isNaN(num)) return value
  return num.toFixed(2)
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function formatDate(dateStr: string): string {
  // Avoid UTC offset issues by appending noon time
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function pnlClass(value: string | null): string {
  if (!value) return 'text-[var(--muted-foreground)]'
  const num = parseFloat(value)
  if (num > 0) return 'text-profit'
  if (num < 0) return 'text-loss'
  return 'text-[var(--muted-foreground)]'
}

// ─── Outcome Badge ──────────────────────────────────────────────────────────

function OutcomeBadge({ outcome, isOpen }: { outcome: string | null; isOpen: boolean }) {
  if (isOpen) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-[var(--color-blue)]/15 text-[var(--color-blue)]">
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
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        styles[outcome] ?? 'bg-[var(--muted)] text-[var(--muted-foreground)]'
      )}
    >
      {outcome}
    </span>
  )
}

// ─── Save feedback hook ──────────────────────────────────────────────────────

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function useSaveState() {
  const [state, setState] = useState<SaveState>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setSaving = () => setState('saving')
  const setSaved = () => {
    setState('saved')
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setState('idle'), 2000)
  }
  const setError = () => {
    setState('error')
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setState('idle'), 3000)
  }

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  return { state, setSaving, setSaved, setError }
}

// ─── Section Header ──────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
        {title}
      </span>
      <div className="flex-1 h-px bg-[var(--border)]" />
    </div>
  )
}

// ─── Metric Card ────────────────────────────────────────────────────────────

function Metric({
  label,
  value,
  mono = false,
  className,
}: {
  label: string
  value: string
  mono?: boolean
  className?: string
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-[var(--muted-foreground)] uppercase tracking-wide">
        {label}
      </span>
      <span
        className={cn(
          'text-sm font-medium',
          mono && 'font-mono',
          className
        )}
      >
        {value}
      </span>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface TradeDetailPanelProps {
  trade: Trade | null
  onClose: () => void
}

export function TradeDetailPanel({ trade, onClose }: TradeDetailPanelProps) {
  const queryClient = useQueryClient()
  const isOpen = trade !== null

  // Local editable state — sync from trade prop
  const [notes, setNotes] = useState(trade?.notes ?? '')
  const [tvLink, setTvLink] = useState(trade?.tradingviewLink ?? '')
  const [strategyId, setStrategyId] = useState(trade?.strategyId ?? '')

  const notesSave = useSaveState()
  const tvSave = useSaveState()
  const strategySave = useSaveState()

  // Sync local state when trade changes
  useEffect(() => {
    setNotes(trade?.notes ?? '')
    setTvLink(trade?.tradingviewLink ?? '')
    setStrategyId(trade?.strategyId ?? '')
  }, [trade?.id, trade?.notes, trade?.tradingviewLink, trade?.strategyId])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Strategies query
  const { data: strategiesData, isLoading } = useQuery({
    queryKey: ['strategies'],
    queryFn: async () => {
      const res = await fetch('/api/strategies')
      if (!res.ok) throw new Error('Failed to fetch strategies')
      return res.json() as Promise<{ data: Strategy[] }>
    },
    staleTime: 5 * 60 * 1000,
  })
  const strategies = strategiesData?.data ?? []
  const isLoadingStrategies = isLoading

  // PATCH mutation
  const patchMutation = useMutation({
    mutationFn: async (patch: Record<string, string | null>) => {
      const res = await fetch(`/api/trades/${trade!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? 'Update failed')
      }
      return res.json()
    },
    onSuccess: () => {
      // Invalidate trades list so it refetches with updated data
      queryClient.invalidateQueries({ queryKey: ['trades'] })
      // Invalidate strategies so stats update in real time
      queryClient.invalidateQueries({ queryKey: ['strategies'] })
    },
  })

  const saveField = useCallback(
    async (
      field: 'notes' | 'tradingview_link' | 'strategy_id',
      value: string | null,
      saveHook: ReturnType<typeof useSaveState>
    ) => {
      if (!trade) return
      saveHook.setSaving()
      try {
        await patchMutation.mutateAsync({ [field]: value || null })
        saveHook.setSaved()
      } catch {
        saveHook.setError()
      }
    },
    [trade, patchMutation]
  )

  // Backdrop click closes panel
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose()
    },
    [onClose]
  )

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]',
          'transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Slide panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Trade detail"
        className={cn(
          'fixed right-0 top-0 bottom-0 z-50 w-[520px] max-w-full',
          'flex flex-col bg-[var(--card)] border-l border-[var(--border)]',
          'shadow-[var(--shadow-lg)]',
          'transition-transform duration-300 ease-[var(--ease-default)]',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {trade && (
          <>
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  {trade.side === 'LONG' ? (
                    <ArrowUp size={16} className="text-[var(--color-green)]" />
                  ) : (
                    <ArrowDown size={16} className="text-[var(--color-red)]" />
                  )}
                  <span className="text-base font-semibold text-[var(--foreground)]">
                    {trade.rootSymbol}
                  </span>
                  <span className="text-sm text-[var(--muted-foreground)]">
                    {trade.side === 'LONG' ? 'Long' : 'Short'}
                  </span>
                </div>
                <OutcomeBadge outcome={trade.outcome} isOpen={trade.isOpen} />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--muted-foreground)]">
                  {formatDate(trade.tradingDay)}
                </span>
                <button
                  onClick={onClose}
                  className={cn(
                    'p-1.5 rounded-md text-[var(--muted-foreground)]',
                    'hover:text-[var(--foreground)] hover:bg-[var(--accent)]',
                    'transition-colors duration-150'
                  )}
                  aria-label="Close panel"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* ── Scrollable body ─────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

              {/* ── Summary metrics ──────────────────────────────────────── */}
              <section>
                <SectionHeader title="Summary" />
                <div className="grid grid-cols-3 gap-4">
                  <Metric
                    label="Net P&L"
                    value={formatPnl(trade.netPnl)}
                    mono
                    className={pnlClass(trade.netPnl)}
                  />
                  <Metric
                    label="Gross P&L"
                    value={formatPnl(trade.grossPnl)}
                    mono
                    className={pnlClass(trade.grossPnl)}
                  />
                  <Metric
                    label="Commission"
                    value={`$${parseFloat(trade.commissionTotal || '0').toFixed(2)}`}
                    mono
                    className="text-[var(--muted-foreground)]"
                  />
                  <Metric
                    label="Entry"
                    value={formatPrice(trade.avgEntryPrice)}
                    mono
                  />
                  <Metric
                    label="Exit"
                    value={formatPrice(trade.avgExitPrice)}
                    mono
                  />
                  <Metric
                    label="Qty"
                    value={`${trade.entryQty}`}
                    mono
                  />
                  <Metric
                    label="Duration"
                    value={formatDuration(trade.durationSeconds)}
                    className="flex items-center gap-1"
                  />
                  {trade.rMultiple !== null && (
                    <Metric
                      label="R-Multiple"
                      value={`${parseFloat(trade.rMultiple).toFixed(2)}R`}
                      mono
                      className={
                        parseFloat(trade.rMultiple) >= 0
                          ? 'text-profit'
                          : 'text-loss'
                      }
                    />
                  )}
                  <Metric
                    label="Entry Time"
                    value={formatTime(trade.entryTime)}
                    mono
                    className="text-[var(--muted-foreground)]"
                  />
                </div>
              </section>

              {/* ── Fills table ────────────────────────────────────────────── */}
              {trade.fills.length > 0 && (
                <section>
                  <SectionHeader title={`Fills (${trade.fills.length})`} />
                  <div className="rounded-md border border-[var(--border)] overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--secondary)]">
                          <th className="px-3 py-2 text-left text-[var(--muted-foreground)] font-medium uppercase tracking-wide">
                            Time
                          </th>
                          <th className="px-3 py-2 text-left text-[var(--muted-foreground)] font-medium uppercase tracking-wide">
                            Side
                          </th>
                          <th className="px-3 py-2 text-right text-[var(--muted-foreground)] font-medium uppercase tracking-wide">
                            Qty
                          </th>
                          <th className="px-3 py-2 text-right text-[var(--muted-foreground)] font-medium uppercase tracking-wide">
                            Price
                          </th>
                          <th className="px-3 py-2 text-right text-[var(--muted-foreground)] font-medium uppercase tracking-wide">
                            Comm.
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {trade.fills.map((fill, idx) => (
                          <tr
                            key={fill.id}
                            className={cn(
                              'border-b border-[var(--border)] last:border-0',
                              idx % 2 === 1 && 'bg-[var(--secondary)]/40'
                            )}
                          >
                            <td className="px-3 py-2 font-mono text-[var(--muted-foreground)]">
                              {formatTime(fill.fillTime)}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={
                                  fill.side === 'BUY'
                                    ? 'text-[var(--color-green)]'
                                    : 'text-[var(--color-red)]'
                                }
                              >
                                {fill.side}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-mono">
                              {fill.quantity}
                            </td>
                            <td className="px-3 py-2 text-right font-mono">
                              {formatPrice(fill.price)}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-[var(--muted-foreground)]">
                              {fill.commission
                                ? `$${parseFloat(fill.commission).toFixed(2)}`
                                : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* ── Editable fields ─────────────────────────────────────────── */}
              <section>
                <SectionHeader title="Annotations" />
                <div className="space-y-4">

                  {/* Strategy dropdown */}
                  <div>
                    <label className="block text-xs text-[var(--muted-foreground)] mb-1.5">
                      Strategy
                    </label>
                    <div className="relative">
                      <select
                        value={strategyId}
                        onChange={(e) => {
                          setStrategyId(e.target.value)
                          saveField('strategy_id', e.target.value || null, strategySave)
                        }}
                        className={cn(
                          'w-full appearance-none rounded-md border border-[var(--border)]',
                          'bg-[var(--secondary)] text-[var(--foreground)]',
                          'px-3 py-2 text-sm',
                          'focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--ring)]',
                          'transition-colors duration-150'
                        )}
                      >
                        <option value="">No strategy</option>
                        {isLoadingStrategies ? (
                          <option disabled>Loading...</option>
                        ) : (
                          strategies.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))
                        )}
                      </select>
                      <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">
                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>
                    <SaveIndicator state={strategySave.state} />
                  </div>

                  {/* Notes textarea */}
                  <div>
                    <label className="block text-xs text-[var(--muted-foreground)] mb-1.5">
                      Notes
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      onBlur={() => saveField('notes', notes, notesSave)}
                      rows={4}
                      placeholder="Add trade notes…"
                      className={cn(
                        'w-full resize-none rounded-md border border-[var(--border)]',
                        'bg-[var(--secondary)] text-[var(--foreground)]',
                        'px-3 py-2 text-sm placeholder:text-[var(--muted-foreground)]',
                        'focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--ring)]',
                        'transition-colors duration-150'
                      )}
                    />
                    <SaveIndicator state={notesSave.state} />
                  </div>

                  {/* TradingView link */}
                  <div>
                    <label className="block text-xs text-[var(--muted-foreground)] mb-1.5">
                      TradingView Link
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        value={tvLink}
                        onChange={(e) => setTvLink(e.target.value)}
                        onBlur={() => saveField('tradingview_link', tvLink, tvSave)}
                        placeholder="https://www.tradingview.com/x/..."
                        className={cn(
                          'w-full rounded-md border border-[var(--border)]',
                          'bg-[var(--secondary)] text-[var(--foreground)]',
                          'px-3 py-2 pr-9 text-sm placeholder:text-[var(--muted-foreground)]',
                          'focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--ring)]',
                          'transition-colors duration-150'
                        )}
                      />
                      {tvLink && (
                        <a
                          href={tvLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            'absolute right-2.5 top-1/2 -translate-y-1/2',
                            'text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
                            'transition-colors duration-150'
                          )}
                          aria-label="Open in TradingView"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                    <SaveIndicator state={tvSave.state} />
                  </div>
                </div>
              </section>

              {/* ── Tags ───────────────────────────────────────────────────── */}
              {trade.tags.length > 0 && (
                <section>
                  <SectionHeader title="Tags" />
                  <div className="flex flex-wrap gap-1.5">
                    {trade.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
                          'border border-[var(--border)] bg-[var(--secondary)] text-[var(--foreground)]'
                        )}
                        style={
                          tag.color
                            ? {
                              borderColor: tag.color + '60',
                              backgroundColor: tag.color + '20',
                              color: tag.color,
                            }
                            : undefined
                        }
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* ── Grade ─────────────────────────────────────────────────── */}
              <section>
                <SectionHeader title="Grade" />
                <GradeSection tradeId={trade.id} />
              </section>

            </div>
          </>
        )}
      </aside>
    </>
  )
}

// ─── Save Indicator ──────────────────────────────────────────────────────────

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'idle') return null
  return (
    <div className="mt-1 flex items-center gap-1">
      {state === 'saving' && (
        <>
          <Clock size={10} className="animate-spin text-[var(--muted-foreground)]" />
          <span className="text-[11px] text-[var(--muted-foreground)]">Saving…</span>
        </>
      )}
      {state === 'saved' && (
        <span className="text-[11px] text-[var(--color-green)]">Saved</span>
      )}
      {state === 'error' && (
        <span className="text-[11px] text-[var(--color-red)]">Save failed</span>
      )}
    </div>
  )
}
