'use client'

import { useQuery } from '@tanstack/react-query'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

function getDisciplineCellColor(score: number | null | undefined): string {
    if (score === null || score === undefined) return '#1A1D27'

    // We use opacity variation within each range to show intensity
    if (score >= 90) {
        const opacity = 0.5 + ((score - 90) / 10) * 0.5
        return `rgba(34, 197, 94, ${opacity.toFixed(2)})` // #22C55E
    }
    if (score >= 75) {
        const opacity = 0.5 + ((score - 75) / 15) * 0.5
        return `rgba(59, 130, 246, ${opacity.toFixed(2)})` // #3B82F6
    }
    if (score >= 60) {
        const opacity = 0.5 + ((score - 60) / 15) * 0.5
        return `rgba(245, 158, 11, ${opacity.toFixed(2)})` // #F59E0B
    }
    if (score >= 40) {
        const opacity = 0.5 + ((score - 40) / 20) * 0.5
        return `rgba(249, 115, 22, ${opacity.toFixed(2)})` // #F97316
    }
    const opacity = 0.5 + (score / 40) * 0.5
    return `rgba(239, 68, 68, ${opacity.toFixed(2)})` // #EF4444
}

function fmtLabel(dateStr: string) {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function DisciplineHistoryWidget() {
    const { data, isLoading } = useQuery({
        queryKey: ['discipline-history-widget', '60d'],
        queryFn: async () => {
            const res = await fetch('/api/discipline/history?days=60')
            if (!res.ok) throw new Error('Failed to fetch discipline history')
            return res.json()
        }
    })

    // Calculate a date range for the last 60 days
    const today = new Date()
    const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0)
    const startDate = new Date(endDate)
    startDate.setDate(endDate.getDate() - 59)

    const history = data?.data ?? []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const disciplineMap = new Map<string, any>()
    for (const item of history) {
        disciplineMap.set(item.date, item)
    }

    // Align to Monday
    const cur = new Date(startDate)
    const dayOfWeek = cur.getDay() === 0 ? 6 : cur.getDay() - 1
    cur.setDate(cur.getDate() - dayOfWeek)

    const allDays: (string | null)[] = []
    while (cur <= endDate) {
        const dateStr = cur.toISOString().split('T')[0]
        allDays.push(cur <= endDate && cur >= startDate ? dateStr : null)
        cur.setDate(cur.getDate() + 1)
    }

    if (isLoading) {
        return (
            <div className="h-full flex flex-col p-1">
                <div className="h-4 w-32 rounded bg-[var(--secondary)] animate-pulse mb-6" />
                <div className="flex-1 rounded bg-[var(--secondary)] animate-pulse" />
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full w-full p-0 overflow-hidden">
            <div className="mb-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Discipline History</h3>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    Last 60 days
                </p>
            </div>

            <div className="flex-1 w-full min-h-0 flex flex-col justify-end">
                <TooltipProvider delayDuration={100}>
                    <div className="w-full">
                        <div className="grid grid-cols-7 gap-1 w-full">
                            {allDays.map((dateStr, i) => {
                                if (!dateStr) {
                                    return <div key={i} className="aspect-square min-w-0 rounded-md bg-transparent" />
                                }
                                const discData = disciplineMap.get(dateStr)
                                const color = discData ? getDisciplineCellColor(discData.score) : '#1A1D27'

                                return (
                                    <Tooltip key={i}>
                                        <TooltipTrigger asChild>
                                            <div
                                                className="aspect-square min-w-0 rounded-md cursor-default"
                                                style={{ background: color }}
                                            />
                                        </TooltipTrigger>
                                        <TooltipContent
                                            className="border-[#2A2F3E] bg-[#14171E] px-3 py-2 text-xs shadow-md z-[100]"
                                            sideOffset={4}
                                        >
                                            <div className="flex flex-col gap-1 text-[#E8EAF0]">
                                                <span className="font-semibold">{fmtLabel(dateStr)}</span>
                                                {discData ? (
                                                    <>
                                                        <span style={{ color: getDisciplineCellColor(discData.score) }} className="font-medium flex items-center gap-1">
                                                            Overall: {discData.score} &middot; {discData.label}
                                                        </span>
                                                        <span className="text-[#8B92A8]">
                                                            Grades: {discData.components?.grades_score ?? '—'} ({discData.weights?.grade_weight ?? 70}%)
                                                            <br />
                                                            Routine: {discData.components?.routine_score != null ? (discData.components.routine_score > 0 ? '✓' : '✗') : '—'} ({discData.weights?.routine_weight ?? 30}%)
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className="text-[#8B92A8]">
                                                        No discipline data yet.<br />
                                                        Grade your trades and check your routine.
                                                    </span>
                                                )}
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>
                                )
                            })}
                        </div>
                    </div>
                </TooltipProvider>
            </div>
        </div>
    )
}
