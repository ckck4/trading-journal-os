'use client'

import { Upload, ChevronDown, Calendar } from 'lucide-react'
import { useFiltersStore, type DatePreset } from '@/stores/filters'
import { cn } from '@/lib/utils'

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'today',      label: 'Today' },
  { value: 'this_week',  label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_30d',   label: 'Last 30d' },
  { value: 'custom',     label: 'Custom' },
]

const PRESET_LABELS: Record<DatePreset, string> = {
  today:      'Today',
  this_week:  'This Week',
  this_month: 'This Month',
  last_30d:   'Last 30d',
  custom:     'Custom Range',
}

function FilterDropdown({
  label,
  icon: Icon,
  children,
}: {
  label: string
  icon?: React.ElementType
  children?: React.ReactNode
}) {
  return (
    <button
      className={cn(
        'flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--card)]',
        'px-3 py-1.5 text-[13px] text-[var(--foreground)]',
        'hover:border-[var(--color-accent-primary)] hover:bg-[var(--accent)]',
        'transition-colors duration-150 whitespace-nowrap'
      )}
    >
      {Icon && <Icon size={14} className="text-[var(--muted-foreground)]" />}
      <span>{label}</span>
      <ChevronDown size={12} className="text-[var(--muted-foreground)]" />
    </button>
  )
}

export function GlobalToolbar() {
  const { datePreset } = useFiltersStore()

  return (
    <header
      className={cn(
        'flex items-center gap-2 border-b border-[var(--border)] bg-[var(--card)]',
        'h-[52px] px-4 shrink-0 overflow-x-auto'
      )}
    >
      {/* Left spacer for sidebar toggle alignment */}
      <div className="flex-1" />

      {/* Filters row */}
      <div className="flex items-center gap-2">
        {/* Account selector */}
        <FilterDropdown label="All Accounts" />

        {/* Date range */}
        <FilterDropdown
          label={PRESET_LABELS[datePreset]}
          icon={Calendar}
        />

        {/* Session */}
        <FilterDropdown label="All Sessions" />

        {/* Instrument */}
        <FilterDropdown label="All Instruments" />

        {/* Strategy */}
        <FilterDropdown label="All Strategies" />

        {/* Divider */}
        <div className="h-5 w-px bg-[var(--border)]" />

        {/* Import button */}
        <button
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium',
            'bg-[var(--primary)] text-[var(--primary-foreground)]',
            'hover:bg-[var(--color-accent-hover)]',
            'transition-colors duration-150'
          )}
        >
          <Upload size={14} />
          <span>Import</span>
        </button>
      </div>
    </header>
  )
}
