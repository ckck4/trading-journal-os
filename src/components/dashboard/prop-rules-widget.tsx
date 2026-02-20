'use client'

import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EvaluateRulesResult, RuleStatus } from '@/types/prop'

interface PropRulesWidgetProps {
  data: EvaluateRulesResult | null
  isLoading?: boolean
}

const RULE_LABELS: Record<string, string> = {
  maxDailyLoss: 'Max Daily Loss',
  minTradingDays: 'Min Trading Days',
  consistency: 'Consistency',
  profitTarget: 'Profit Target',
}

function statusDot(status: RuleStatus) {
  const colors: Record<RuleStatus, string> = {
    pass: 'bg-[var(--color-green)]',
    warning: 'bg-[var(--color-yellow)]',
    violation: 'bg-[var(--color-red)]',
    pending: 'bg-[var(--muted-foreground)]',
  }
  return (
    <span
      className={cn('inline-block w-2 h-2 rounded-full flex-shrink-0', colors[status])}
    />
  )
}

const overallColors = {
  on_track: 'text-[var(--color-green)]',
  warning: 'text-[var(--color-yellow)]',
  violation: 'text-[var(--color-red)]',
  passed: 'text-[var(--color-green)]',
}

export function PropRulesWidget({ data, isLoading }: PropRulesWidgetProps) {
  if (isLoading) {
    return (
      <div className="h-full flex flex-col gap-2 p-1">
        <div className="h-4 w-28 rounded bg-[var(--secondary)] animate-pulse" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--secondary)] animate-pulse" />
            <div className="h-3 flex-1 rounded bg-[var(--secondary)] animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="h-full flex flex-col gap-2 p-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Prop Rules
        </span>
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <p className="text-xs text-[var(--muted-foreground)]">No active evaluation</p>
          <Link
            href="/prop"
            className="text-xs text-[var(--color-accent-primary)] hover:underline flex items-center gap-1"
          >
            Start one <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>
    )
  }

  const entries = Object.entries(data.rules) as [string, typeof data.rules.maxDailyLoss][]

  return (
    <div className="h-full flex flex-col gap-2 p-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Prop Rules
        </span>
        <Link
          href="/prop"
          className="text-[10px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] flex items-center gap-0.5"
        >
          View all <ExternalLink className="w-2.5 h-2.5" />
        </Link>
      </div>

      <div
        className={cn(
          'text-xs font-medium',
          overallColors[data.overallStatus]
        )}
      >
        {data.overallStatus.replace('_', ' ').toUpperCase()}
      </div>

      <div className="flex flex-col gap-1.5 mt-1">
        {entries.map(([key, rule]) => (
          <div key={key} className="flex items-center gap-2">
            {statusDot(rule.status)}
            <span className="text-[11px] text-[var(--muted-foreground)] flex-1 min-w-0 truncate">
              {RULE_LABELS[key] ?? key}
            </span>
            <span className="text-[11px] font-mono text-[var(--foreground)] flex-shrink-0">
              {rule.threshold !== null
                ? `${rule.direction === 'toward_target' ? `${rule.progress}%` : rule.status === 'pass' ? '✓' : `${rule.progress}%`}`
                : 'N/A'}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-auto text-[10px] text-[var(--muted-foreground)] leading-tight line-clamp-2">
        {data.summary}
      </p>
    </div>
  )
}
