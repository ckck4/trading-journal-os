'use client'

import { useQuery } from '@tanstack/react-query'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

function getDisciplineCellColor(score: number | null | undefined): string {
    if (score === null || score === undefined) return '#27272A'
    if (score >= 80) return '#4ADE80'
    if (score >= 50) return '#F59E0B'
    return '#EF4444'
}

function fmtLabel(dateStr: string) {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function DisciplineHistoryWidget() {
    const { data, isLoading } = useQuery({
        queryKey: ['discipline-history-widget', '30d'],
        queryFn: async () => {
            const res = await fetch('/api/discipline/history?days=30')
            if (!res.ok) throw new Error('Failed to fetch discipline history')
            return res.json()
        }
    })

    const days = Array.from({ length: 30 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (29 - i))
        return date
    })

    const history = data?.data ?? []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const disciplineMap = new Map<string, any>()
    for (const item of history) {
        disciplineMap.set(item.date, item)
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
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#71717A]">Discipline History</h3>
                <p className="text-xs text-[#71717A] mt-0.5">
                    Last 30 days
                </p>
            </div>

            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                overflow: 'hidden',
                padding: '8px'
            }}>
                <TooltipProvider delayDuration={100}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                        gridTemplateRows: 'repeat(5, minmax(0, 1fr))',
                        gap: '3px',
                        width: '100%',
                        height: '100%',
                    }}>
                        {days.map((date, i) => {
                            const dateStr = date.toISOString().split('T')[0]
                            const discData = disciplineMap.get(dateStr)
                            const color = discData ? getDisciplineCellColor(discData.score) : '#1A1D27'

                            return (
                                <Tooltip key={i}>
                                    <TooltipTrigger asChild>
                                        <div
                                            className="cursor-default transition-colors duration-200 hover:opacity-80 border border-white/5"
                                            style={{
                                                borderRadius: '3px',
                                                backgroundColor: color,
                                            }}
                                        />
                                    </TooltipTrigger>
                                    <TooltipContent
                                        className="border-[#27272A] bg-[#18181B] px-3 py-2 text-xs shadow-md z-[100]"
                                        sideOffset={4}
                                    >
                                        <div className="flex flex-col gap-1 text-[#E4E4E7]">
                                            <span className="font-semibold">{fmtLabel(dateStr)}</span>
                                            {discData ? (
                                                <>
                                                    <span style={{ color: getDisciplineCellColor(discData.score) }} className="font-medium flex items-center gap-1">
                                                        Overall: {discData.score} &middot; {discData.label}
                                                    </span>
                                                    <span className="text-[#A1A1AA]">
                                                        Grades: {discData.components?.grades_score ?? '—'} ({discData.weights?.grade_weight ?? 70}%)
                                                        <br />
                                                        Routine: {discData.components?.routine_score != null ? (discData.components.routine_score > 0 ? '✓' : '✗') : '—'} ({discData.weights?.routine_weight ?? 30}%)
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="text-[#A1A1AA]">
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
                </TooltipProvider>
            </div>
        </div>
    )
}
