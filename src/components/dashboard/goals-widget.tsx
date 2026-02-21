'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { GoalData } from '@/types/dashboard'

interface GoalsWidgetProps {
  data: GoalData[]
  isLoading?: boolean
}

export function GoalsWidget({ data, isLoading }: GoalsWidgetProps) {
  if (isLoading) {
    return (
      <div className="h-full flex flex-col gap-2 p-1">
        <div className="h-4 w-16 rounded bg-[var(--secondary)] animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="h-3 w-32 rounded bg-[var(--secondary)] animate-pulse" />
            <div className="h-1.5 w-full rounded bg-[var(--secondary)] animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col gap-2 p-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Goals
        </span>
        <Link
          href="/goals"
          className="text-[10px] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          Manage →
        </Link>
      </div>

      {data.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-1">
          <p className="text-xs text-[var(--muted-foreground)]">No active goals</p>
          <Link
            href="/goals"
            className="text-xs text-[var(--color-accent-primary)] hover:underline"
          >
            Set a goal
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 overflow-y-auto">
          {data.map((goal) => {
            const barColor =
              goal.progress >= 100
                ? 'bg-[var(--color-green)]'
                : goal.progress >= 60
                ? 'bg-[var(--color-accent-primary)]'
                : 'bg-[var(--color-accent-primary)]'

            return (
              <div key={goal.id} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs text-[var(--foreground)] truncate flex-1">
                    {goal.name}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] font-mono flex-shrink-0',
                      goal.progress >= 100
                        ? 'text-[var(--color-green)]'
                        : 'text-[var(--muted-foreground)]'
                    )}
                  >
                    {goal.progress}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[var(--secondary)] overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-300', barColor)}
                    style={{ width: `${Math.min(100, goal.progress)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-[var(--muted-foreground)]">
                  <span>{goal.metric}</span>
                  <span>
                    {goal.currentValue} / {goal.targetValue}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
