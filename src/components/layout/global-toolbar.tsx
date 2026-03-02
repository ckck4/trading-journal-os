'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Upload, ChevronDown, Calendar, Check } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useFiltersStore, type DatePreset } from '@/stores/filters'
import { useImportModalStore } from '@/stores/import-modal'
import { cn } from '@/lib/utils'
import type { Strategy } from '@/types/trades'
import type { AccountOption } from '@/app/api/accounts/route'
import type { InstrumentOption } from '@/app/api/instruments/route'
import type { SessionOption } from '@/app/api/sessions/route'

// ─── Date preset definitions ─────────────────────────────────────────────────

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_30d', label: 'Last 30d' },
  { value: 'custom', label: 'Custom Range' },
]

const PRESET_LABELS: Record<DatePreset, string> = {
  today: 'Today',
  this_week: 'This Week',
  this_month: 'This Month',
  last_30d: 'Last 30d',
  custom: 'Custom Range',
}

// ─── Generic filter dropdown ──────────────────────────────────────────────────
//
// Uses position:fixed for the menu so it escapes the toolbar's overflow context
// (overflow-x:auto implies overflow-y:auto, which would clip absolute children).

interface DropdownOption {
  value: string
  label: string
}

interface FilterDropdownProps {
  label: string
  icon?: React.ElementType
  options: DropdownOption[]
  /** The currently-selected value. Empty string = "all" (no filter). */
  selectedValue: string
  /** Label shown when nothing is selected (the "All X" row). Omit for filters with no "all" option. */
  allLabel?: string
  onSelect: (value: string) => void
}

function FilterDropdown({
  label,
  icon: Icon,
  options,
  selectedValue,
  allLabel,
  onSelect,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Compute fixed position from the trigger's bounding rect
  const openMenu = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setMenuPos({ top: rect.bottom + 4, left: rect.left })
    }
    setOpen(true)
  }, [])

  const closeMenu = useCallback(() => setOpen(false), [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        !menuRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        closeMenu()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, closeMenu])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, closeMenu])

  const handleSelect = (value: string) => {
    onSelect(value)
    closeMenu()
  }

  const isActive = Boolean(selectedValue)

  return (
    <>
      <button
        ref={triggerRef}
        onClick={open ? closeMenu : openMenu}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          'group flex items-center gap-1.5 rounded-[6px] border px-3 py-1.5 text-sm',
          'transition-colors duration-150 whitespace-nowrap select-none',
          open
            ? 'border-[rgba(74,222,128,0.4)] bg-[#0d1410] text-[#E4E4E7]'
            : isActive
              ? 'border-[rgba(74,222,128,0.4)] bg-[#0d1410] text-[#4ADE80]'
              : 'border-[#1a2e1f] bg-[#0d1410] text-[#A1A1AA] hover:border-[rgba(74,222,128,0.4)] hover:text-[#E4E4E7]'
        )}
      >
        {Icon && (
          <Icon
            size={14}
            className={
              isActive
                ? 'text-[#4ADE80]'
                : 'text-[#71717A] group-hover:text-[#A1A1AA]'
            }
          />
        )}
        <span>{label}</span>
        <ChevronDown
          size={12}
          className={cn(
            'transition-transform duration-150',
            open ? 'rotate-180 text-[#E4E4E7]' : 'text-[#A1A1AA] group-hover:text-[#E4E4E7]'
          )}
        />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="listbox"
          style={{
            position: 'fixed',
            top: menuPos.top,
            left: menuPos.left,
            zIndex: 9999,
          }}
          className={cn(
            'min-w-[176px] rounded-md border border-[var(--border)]',
            'bg-[var(--card)] shadow-[var(--shadow-md)]',
            'py-1 overflow-hidden'
          )}
        >
          {/* "All" option */}
          {allLabel !== undefined && (
            <>
              <DropdownItem
                label={allLabel}
                isSelected={!selectedValue}
                onClick={() => handleSelect('')}
              />
              {options.length > 0 && (
                <div className="my-1 h-px bg-[var(--border)]" />
              )}
            </>
          )}

          {options.length === 0 && !allLabel && (
            <div className="px-3 py-2 text-[13px] text-[var(--muted-foreground)]">
              No options
            </div>
          )}

          {options.length === 0 && allLabel !== undefined && (
            <div className="px-3 py-2 text-[13px] text-[var(--muted-foreground)]">
              None configured yet
            </div>
          )}

          {options.map((opt) => (
            <DropdownItem
              key={opt.value}
              label={opt.label}
              isSelected={selectedValue === opt.value}
              onClick={() => handleSelect(opt.value)}
            />
          ))}
        </div>
      )}
    </>
  )
}

function DropdownItem({
  label,
  isSelected,
  onClick,
}: {
  label: string
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      role="option"
      aria-selected={isSelected}
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between gap-3',
        'px-3 py-1.5 text-[13px] text-left',
        'hover:bg-[var(--accent)] transition-colors duration-100',
        isSelected
          ? 'text-[var(--color-accent-primary)] font-medium'
          : 'text-[var(--foreground)]'
      )}
    >
      <span>{label}</span>
      {isSelected && (
        <Check size={12} className="shrink-0 text-[var(--color-accent-primary)]" />
      )}
    </button>
  )
}

// ─── Main Toolbar ─────────────────────────────────────────────────────────────

export function GlobalToolbar() {
  const {
    accountIds,
    datePreset,
    instruments,
    strategyIds,
    sessionIds,
    setAccounts,
    setDatePreset,
    setInstruments,
    setStrategies,
    setSessions,
  } = useFiltersStore()

  const openModal = useImportModalStore((s) => s.openModal)

  // ── Fetch filter options ────────────────────────────────────────────────────

  const { data: accountsData } = useQuery({
    queryKey: ['filter-accounts'],
    queryFn: async () => {
      const res = await fetch('/api/accounts')
      if (!res.ok) return { accounts: [] as AccountOption[] }
      return res.json() as Promise<{ accounts: AccountOption[] }>
    },
    staleTime: 5 * 60 * 1000,
  })

  const { data: instrumentsData } = useQuery({
    queryKey: ['filter-instruments'],
    queryFn: async () => {
      const res = await fetch('/api/instruments')
      if (!res.ok) return { instruments: [] as InstrumentOption[] }
      return res.json() as Promise<{ instruments: InstrumentOption[] }>
    },
    staleTime: 5 * 60 * 1000,
  })

  const { data: strategiesData } = useQuery({
    queryKey: ['strategies'],
    queryFn: async () => {
      const res = await fetch('/api/strategies')
      if (!res.ok) return { strategies: [] as Strategy[] }
      return res.json() as Promise<{ strategies: Strategy[] }>
    },
    staleTime: 5 * 60 * 1000,
  })

  const { data: sessionsData } = useQuery({
    queryKey: ['filter-sessions'],
    queryFn: async () => {
      const res = await fetch('/api/sessions')
      if (!res.ok) return { sessions: [] as SessionOption[] }
      return res.json() as Promise<{ sessions: SessionOption[] }>
    },
    staleTime: 5 * 60 * 1000,
  })

  // ── Derived option lists ────────────────────────────────────────────────────

  const accountOptions: DropdownOption[] = (accountsData?.accounts ?? []).map((a) => ({
    value: a.id,
    label: a.name,
  }))

  const instrumentOptions: DropdownOption[] = (instrumentsData?.instruments ?? []).map((i) => ({
    value: i.rootSymbol,
    label: i.rootSymbol,
  }))

  const strategyOptions: DropdownOption[] = (strategiesData?.strategies ?? []).map((s) => ({
    value: s.id,
    label: s.name,
  }))

  const sessionOptions: DropdownOption[] = (sessionsData?.sessions ?? []).map((s) => ({
    value: s.id,
    label: s.name,
  }))

  // ── Derived display labels ──────────────────────────────────────────────────

  const selectedAccountId = accountIds[0] ?? ''
  const selectedAccountLabel =
    selectedAccountId
      ? (accountsData?.accounts.find((a) => a.id === selectedAccountId)?.name ?? 'Account')
      : 'All Accounts'

  const selectedInstrument = instruments[0] ?? ''
  const selectedInstrumentLabel = selectedInstrument || 'All Instruments'

  const selectedStrategyId = strategyIds[0] ?? ''
  const selectedStrategyLabel =
    selectedStrategyId
      ? (strategiesData?.strategies.find((s) => s.id === selectedStrategyId)?.name ?? 'Strategy')
      : 'All Strategies'

  const selectedSessionId = sessionIds[0] ?? ''
  const selectedSessionLabel =
    selectedSessionId
      ? (sessionsData?.sessions.find((s) => s.id === selectedSessionId)?.name ?? 'Session')
      : 'All Sessions'

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleAccountSelect = (value: string) => {
    setAccounts(value ? [value] : [])
  }

  const handleInstrumentSelect = (value: string) => {
    setInstruments(value ? [value] : [])
  }

  const handleStrategySelect = (value: string) => {
    setStrategies(value ? [value] : [])
  }

  const handleSessionSelect = (value: string) => {
    setSessions(value ? [value] : [])
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <header
      className={cn(
        'flex items-center gap-2 border-b border-[#18181B] bg-[#09090B]',
        'h-[52px] px-4 shrink-0'
      )}
    >
      {/* Left spacer */}
      <div className="flex-1" />

      {/* Filter pills row */}
      <div className="flex items-center gap-2">

        {/* Account */}
        <FilterDropdown
          label={selectedAccountLabel}
          options={accountOptions}
          selectedValue={selectedAccountId}
          allLabel="All Accounts"
          onSelect={handleAccountSelect}
        />

        {/* Date preset */}
        <FilterDropdown
          label={PRESET_LABELS[datePreset]}
          icon={Calendar}
          options={DATE_PRESETS}
          selectedValue={datePreset}
          onSelect={(v) => setDatePreset(v as DatePreset)}
        />

        {/* Session */}
        <FilterDropdown
          label={selectedSessionLabel}
          options={sessionOptions}
          selectedValue={selectedSessionId}
          allLabel="All Sessions"
          onSelect={handleSessionSelect}
        />

        {/* Instrument */}
        <FilterDropdown
          label={selectedInstrumentLabel}
          options={instrumentOptions}
          selectedValue={selectedInstrument}
          allLabel="All Instruments"
          onSelect={handleInstrumentSelect}
        />

        {/* Strategy */}
        <FilterDropdown
          label={selectedStrategyLabel}
          options={strategyOptions}
          selectedValue={selectedStrategyId}
          allLabel="All Strategies"
          onSelect={handleStrategySelect}
        />

        <div className="h-5 w-px bg-[#18181B]" />

        {/* Import button */}
        <button
          onClick={openModal}
          className={cn(
            'flex items-center gap-1.5 rounded-[6px] px-4 py-1.5 text-sm font-semibold',
            'bg-[#4ADE80] text-[#000000]',
            'hover:bg-[#22c55e]',
            'transition-colors duration-150'
          )}
        >
          <Upload size={14} className="text-[#000000]" />
          <span>Import</span>
        </button>
      </div>
    </header>
  )
}
