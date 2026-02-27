'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { Settings, Save } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function getScoreColor(score: number | null | undefined): string {
    if (score === null || score === undefined) return '#2A2F3E'
    if (score >= 90) return '#22C55E' // green
    if (score >= 75) return '#3B82F6' // blue
    if (score >= 60) return '#F59E0B' // amber
    if (score >= 40) return '#F97316' // orange
    return '#EF4444' // red
}

function WeightsDialog() {
    const queryClient = useQueryClient()
    const [isOpen, setIsOpen] = useState(false)
    const [gradeWeight, setGradeWeight] = useState<number>(70)
    const [routineWeight, setRoutineWeight] = useState<number>(30)

    // Fetch initial
    const { data: settingsData, isLoading } = useQuery({
        queryKey: ['discipline-settings'],
        queryFn: async () => {
            const res = await fetch('/api/discipline/settings')
            if (!res.ok) throw new Error('Failed to fetch settings')
            return res.json()
        },
        enabled: isOpen
    })

    // set initial values when data loads
    useState(() => {
        if (settingsData?.data) {
            setGradeWeight(settingsData.data.grade_weight)
            setRoutineWeight(settingsData.data.routine_weight)
        }
    })

    const mutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/discipline/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    grade_weight: gradeWeight,
                    routine_weight: routineWeight
                })
            })
            if (!res.ok) throw new Error('Failed to save settings')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['discipline-score'] })
            queryClient.invalidateQueries({ queryKey: ['discipline-settings'] })
            setIsOpen(false)
        }
    })

    const total = gradeWeight + routineWeight
    const isValid = total === 100

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <button className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] flex items-center gap-1.5 transition-colors mt-4">
                    Configure weights <Settings size={12} />
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[360px] bg-[var(--card)] border-[var(--border)]">
                <DialogHeader>
                    <DialogTitle className="text-[var(--foreground)]">Discipline Score Weights</DialogTitle>
                    <DialogDescription className="text-[var(--muted-foreground)]">
                        Must add up to 100%. Adjust how much trades vs. routine affect your final score.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="py-6 flex justify-center text-sm text-[var(--muted-foreground)]">Loading...</div>
                ) : (
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-xs text-[var(--muted-foreground)]">Trade Grades Weight (%)</Label>
                            <Input
                                type="number"
                                min="0"
                                max="100"
                                value={gradeWeight}
                                onChange={(e) => setGradeWeight(parseInt(e.target.value) || 0)}
                                className="bg-[var(--background)] border-[var(--border)] text-[var(--foreground)]"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs text-[var(--muted-foreground)]">Routine Weight (%)</Label>
                            <Input
                                type="number"
                                min="0"
                                max="100"
                                value={routineWeight}
                                onChange={(e) => setRoutineWeight(parseInt(e.target.value) || 0)}
                                className="bg-[var(--background)] border-[var(--border)] text-[var(--foreground)]"
                            />
                        </div>

                        <div className={cn(
                            "text-sm font-medium pt-2 text-right",
                            isValid ? "text-[var(--color-green)]" : "text-[var(--color-red)]"
                        )}>
                            Total: {total}%
                        </div>

                        <button
                            onClick={() => mutation.mutate()}
                            disabled={!isValid || mutation.isPending}
                            className="w-full flex items-center justify-center gap-2 rounded-md bg-[var(--color-blue)] px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-[var(--color-blue)]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white"
                        >
                            {mutation.isPending ? 'Saving...' : <><Save size={16} /> Save Weights</>}
                        </button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}

function ComponentRow({ label, score, weight }: { label: string, score: number | null, weight: number }) {
    const color = getScoreColor(score)
    const isNull = score === null || score === undefined

    return (
        <div className="flex items-center justify-between text-sm py-1.5">
            <span className="text-[var(--muted-foreground)] w-20">{label}</span>
            <div className="flex-1 px-4">
                <div className="h-1.5 w-full rounded-full bg-[var(--border)] overflow-hidden">
                    <div
                        className="h-full transition-all duration-500 rounded-full"
                        style={{
                            width: `${isNull ? 0 : score}%`,
                            backgroundColor: color
                        }}
                    />
                </div>
            </div>
            <div className="flex items-center gap-3 w-16 justify-end">
                <span className="font-mono font-medium text-[var(--foreground)]">
                    {isNull ? '—' : score}
                </span>
                <span className="text-xs text-[var(--muted-foreground)]">{weight}%</span>
            </div>
        </div>
    )
}

export function DailyDisciplineWidget() {
    const today = new Date().toISOString().split('T')[0]

    const { data, isLoading } = useQuery({
        queryKey: ['discipline-score', today],
        queryFn: async () => {
            const res = await fetch(`/api/discipline/score?date=${today}`)
            if (!res.ok) throw new Error('Failed to fetch discipline score')
            return res.json()
        },
        refetchInterval: 60 * 1000 // 60s
    })

    const scoreData = data?.data
    const score = scoreData?.score
    const label = scoreData?.label
    const components = scoreData?.components || {}
    const weights = scoreData?.weights || { grade_weight: 70, routine_weight: 30 }

    const color = getScoreColor(score)

    // Recharts needs an array of data
    const chartData = [{ name: 'score', value: score ?? 0 }]

    return (
        <div className="flex flex-col h-full w-full">
            <div className="mb-4">
                <h3 className="text-sm font-medium text-[var(--foreground)]">Daily Discipline</h3>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
            </div>

            <div className="flex-1 flex flex-col justify-center">
                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="h-4 w-4 rounded-full border-2 border-[var(--border)] border-t-[var(--muted-foreground)] animate-spin" />
                    </div>
                ) : score === null || score === undefined ? (
                    <div className="flex-1 flex flex-col items-center justify-center pb-4">
                        <div className="h-[120px] w-[120px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadialBarChart
                                    cx="50%" cy="50%" innerRadius="70%" outerRadius="100%"
                                    barSize={10} data={[{ name: 'score', value: 100 }]} startAngle={90} endAngle={-270}
                                >
                                    <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                                    <RadialBar background={{ fill: '#2A2F3E' }} dataKey="value" cornerRadius={10} fill="#2A2F3E" />
                                </RadialBarChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-bold font-mono text-[var(--muted-foreground)]">0</span>
                            </div>
                        </div>
                        <p className="text-sm text-[var(--muted-foreground)] font-medium mt-4">No data yet</p>
                        <p className="text-[10px] text-[var(--muted-foreground)]/70 text-center max-w-[150px] mt-1">
                            Grade your trades and check your routine
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col h-full">
                        {/* Gauge */}
                        <div className="flex justify-center mb-6">
                            <div className="h-[140px] w-[140px] relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadialBarChart
                                        cx="50%" cy="50%" innerRadius="75%" outerRadius="100%"
                                        barSize={12} data={chartData} startAngle={90} endAngle={-270}
                                    >
                                        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                                        <RadialBar
                                            background={{ fill: '#2A2F3E' }}
                                            dataKey="value"
                                            cornerRadius={10}
                                            fill={color}
                                        />
                                    </RadialBarChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center mt-1">
                                    <span className="text-3xl font-bold font-mono" style={{ color }}>{score}</span>
                                    <span className="text-xs font-medium uppercase tracking-wider mt-1" style={{ color }}>{label}</span>
                                </div>
                            </div>
                        </div>

                        {/* Breakdown */}
                        <div className="space-y-1 mt-auto">
                            <ComponentRow
                                label="Grades"
                                score={components.grades_score}
                                weight={weights.grade_weight}
                            />
                            <ComponentRow
                                label="Routine"
                                score={components.routine_score}
                                weight={weights.routine_weight}
                            />
                        </div>
                    </div>
                )}
            </div>

            <WeightsDialog />
        </div>
    )
}
