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
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#71717A]">
          Goals
        </span>
        <Link
          href="/goals"
          className="text-[10px] text-[#71717A] hover:text-[#E4E4E7]"
        >
          Manage →
        </Link>
      </div>

      {data.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-1">
          <p className="text-xs text-[#71717A]">No active goals</p>
          <Link
            href="/goals"
            className="text-xs text-[#4ADE80] hover:underline"
          >
            Set a goal
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 overflow-y-auto">
          {data.map((goal) => {
            const barColor =
              goal.progress >= 100
                ? 'bg-[#4ADE80]'
                : goal.progress >= 60
                  ? 'bg-[#FFFFFF]'
                  : 'bg-[#A1A1AA]'

            return (
              <div key={goal.id} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs text-[#FFFFFF] truncate flex-1">
                    {goal.name}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] font-mono-data flex-shrink-0',
                      goal.progress >= 100
                        ? 'text-[#4ADE80]'
                        : 'text-[#A1A1AA]'
                    )}
                  >
                    {goal.progress}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#27272A] overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-300', barColor)}
                    style={{ width: `${Math.min(100, goal.progress)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-[#71717A]">
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
