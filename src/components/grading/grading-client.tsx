'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns'
import Link from 'next/link'
import { Target, Download, Settings } from 'lucide-react'
import { Line, LineChart, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, XAxis, YAxis, Tooltip, Area, AreaChart, Bar, BarChart } from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
};

// Types
type TradeGrade = {
    id: string
    tradeId: string
    grade: string
    riskManagementScore: number | null
    executionScore: number | null
    disciplineScore: number | null
    strategyScore: number | null
    efficiencyScore: number | null
    createdAt: string
    tradingDay: string | null
    netPnl: number
}

type CategoryWeights = {
    risk_management: number
    execution: number
    discipline: number
    strategy: number
    efficiency: number
}

const DEFAULT_WEIGHTS: CategoryWeights = {
    risk_management: 25,
    execution: 20,
    discipline: 25,
    strategy: 15,
    efficiency: 15
}

// Helpers
const getGradeColor = (score: number) => {
    if (score >= 90) return '#22C55E' // A+ / A
    if (score >= 75) return '#3B82F6' // B+
    if (score >= 60) return '#F59E0B' // B / B-
    if (score >= 40) return '#F97316' // C (Poor)
    return '#EF4444' // D / F (Critical)
}

const getGradeLabel = (score: number) => {
    if (score >= 90) return { label: 'Excellent', grade: 'A' }
    if (score >= 75) return { label: 'Good', grade: 'B+' }
    if (score >= 60) return { label: 'Average', grade: 'B' }
    if (score >= 40) return { label: 'Poor', grade: 'C' }
    return { label: 'Critical', grade: 'C-' }
}

const getOverallScore = (trade: TradeGrade) => {
    let sum = 0
    let count = 0
    const cols = ['riskManagementScore', 'executionScore', 'disciplineScore', 'strategyScore', 'efficiencyScore'] as const
    cols.forEach(c => {
        if (trade[c] !== null) {
            sum += trade[c]!
            count++
        }
    })
    return count > 0 ? sum / count : null
}

export function GradingClient() {
    const [weights, setWeights] = useState<CategoryWeights>(DEFAULT_WEIGHTS)
    const [activeTab, setActiveTab] = useState<'today' | 'week' | 'month' | 'lifetime'>('today')

    // Load weights from local storage
    useEffect(() => {
        const stored = localStorage.getItem('grading-weights')
        if (stored) {
            try {
                setWeights(JSON.parse(stored))
            } catch (e) {
                console.error("Failed parsing valid weights", e)
            }
        }
    }, [])

    const { data, isLoading } = useQuery<{ data: TradeGrade[] }>({
        queryKey: ['grading-summary'],
        queryFn: async () => {
            const res = await fetch('/api/grading/summary')
            if (!res.ok) throw new Error('Failed to fetch grading summary')
            return res.json()
        }
    })

    const trades = data?.data || []

    // Derived periods logic
    const now = new Date()
    const todayStr = format(now, 'yyyy-MM-dd')
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)

    const filterByPeriod = (period: 'today' | 'week' | 'month' | 'lifetime') => {
        return trades.filter(t => {
            if (!t.tradingDay) return false
            const d = parseISO(t.tradingDay)
            if (period === 'today') return t.tradingDay === todayStr
            if (period === 'week') return isWithinInterval(d, { start: weekStart, end: weekEnd })
            if (period === 'month') return isWithinInterval(d, { start: monthStart, end: monthEnd })
            return true
        })
    }

    const periodData = {
        today: filterByPeriod('today'),
        week: filterByPeriod('week'),
        month: filterByPeriod('month'),
        lifetime: filterByPeriod('lifetime'),
    }

    const computeStats = (periodTrades: TradeGrade[]) => {
        if (periodTrades.length === 0) return null

        let totalScore = 0
        let scorableCount = 0
        let totalPnl = 0

        // Component averages
        const categorySums = { rm: 0, ex: 0, di: 0, st: 0, ef: 0 }
        const categoryCounts = { rm: 0, ex: 0, di: 0, st: 0, ef: 0 }

        // Distributions
        const dist: Record<string, number> = { 'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'B-': 0, 'C': 0 }

        periodTrades.forEach(t => {
            totalPnl += Number(t.netPnl || 0)

            if (dist[t.grade] !== undefined) dist[t.grade]++
            else dist[t.grade] = 1

            const score = getOverallScore(t)
            if (score !== null) {
                totalScore += score
                scorableCount++
            }

            if (t.riskManagementScore !== null) { categorySums.rm += t.riskManagementScore; categoryCounts.rm++ }
            if (t.executionScore !== null) { categorySums.ex += t.executionScore; categoryCounts.ex++ }
            if (t.disciplineScore !== null) { categorySums.di += t.disciplineScore; categoryCounts.di++ }
            if (t.strategyScore !== null) { categorySums.st += t.strategyScore; categoryCounts.st++ }
            if (t.efficiencyScore !== null) { categorySums.ef += t.efficiencyScore; categoryCounts.ef++ }
        })

        const avgScore = scorableCount > 0 ? totalScore / scorableCount : 0

        // Category specific averages
        const catAverages = {
            rm: categoryCounts.rm > 0 ? categorySums.rm / categoryCounts.rm : 0,
            ex: categoryCounts.ex > 0 ? categorySums.ex / categoryCounts.ex : 0,
            di: categoryCounts.di > 0 ? categorySums.di / categoryCounts.di : 0,
            st: categoryCounts.st > 0 ? categorySums.st / categoryCounts.st : 0,
            ef: categoryCounts.ef > 0 ? categorySums.ef / categoryCounts.ef : 0,
        }

        // Weighted Score
        const weightedTotal =
            (catAverages.rm * (weights.risk_management / 100)) +
            (catAverages.ex * (weights.execution / 100)) +
            (catAverages.di * (weights.discipline / 100)) +
            (catAverages.st * (weights.strategy / 100)) +
            (catAverages.ef * (weights.efficiency / 100))

        return {
            count: periodTrades.length,
            avgScore,
            totalPnl,
            catAverages,
            weightedTotal,
            dist
        }
    }

    const activeStats = computeStats(periodData[activeTab])

    // Chart Data preparation
    const historyData = useMemo(() => {
        // Generate buckets (last 12 weeks)
        const buckets: Record<string, { sum: number, count: number }> = {}

        // Fill last 12 weeks with empty data to ensure contiguous line
        for (let i = 11; i >= 0; i--) {
            const wStart = startOfWeek(subDays(now, i * 7), { weekStartsOn: 1 })
            buckets[format(wStart, 'MMM d')] = { sum: 0, count: 0 }
        }

        trades.forEach(t => {
            if (!t.tradingDay) return
            const d = parseISO(t.tradingDay)
            const wStart = startOfWeek(d, { weekStartsOn: 1 })
            const key = format(wStart, 'MMM d')
            const score = getOverallScore(t)
            if (score !== null && buckets[key]) {
                buckets[key].sum += score
                buckets[key].count++
            }
        })

        return Object.entries(buckets).map(([week, data]) => ({
            week,
            score: data.count > 0 ? Math.round(data.sum / data.count) : null
        }))
    }, [trades])

    const radarData = useMemo(() => {
        if (!activeStats) return []
        return [
            { subject: 'Risk', A: Math.round(activeStats.catAverages.rm) || 0, fullMark: 100 },
            { subject: 'Execution', A: Math.round(activeStats.catAverages.ex) || 0, fullMark: 100 },
            { subject: 'Discipline', A: Math.round(activeStats.catAverages.di) || 0, fullMark: 100 },
            { subject: 'Strategy', A: Math.round(activeStats.catAverages.st) || 0, fullMark: 100 },
            { subject: 'Efficiency', A: Math.round(activeStats.catAverages.ef) || 0, fullMark: 100 },
        ]
    }, [activeStats])

    const exportCSV = () => {
        const rows = [
            ['Period', 'Trade Count', 'Avg Score', 'Weighted Total', 'Grade', 'Total PnL', 'Risk Score', 'Execution Score', 'Discipline Score', 'Strategy Score', 'Efficiency Score'],
        ]

        const periods = [
            { key: 'Today', data: computeStats(periodData.today) },
            { key: 'This Week', data: computeStats(periodData.week) },
            { key: 'This Month', data: computeStats(periodData.month) },
            { key: 'Lifetime', data: computeStats(periodData.lifetime) },
        ]

        periods.forEach(p => {
            if (p.data) {
                rows.push([
                    p.key,
                    p.data.count.toString(),
                    p.data.avgScore.toFixed(1),
                    p.data.weightedTotal.toFixed(1),
                    getGradeLabel(p.data.weightedTotal).grade,
                    p.data.totalPnl.toString(),
                    p.data.catAverages.rm.toFixed(1),
                    p.data.catAverages.ex.toFixed(1),
                    p.data.catAverages.di.toFixed(1),
                    p.data.catAverages.st.toFixed(1),
                    p.data.catAverages.ef.toFixed(1)
                ])
            } else {
                rows.push([p.key, '0', '', '', '', '', '', '', '', '', ''])
            }
        })

        const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `grading-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">Grading</h1>
                    <p className="text-[var(--muted-foreground)]">Your performance scorecards calculated from actual trades.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Link href="/grading/configure" className="flex-1 sm:flex-none">
                        <Button variant="outline" className="w-full">
                            <Settings className="w-4 h-4 mr-2" /> Customize & Configure
                        </Button>
                    </Link>
                    <Button variant="outline" onClick={exportCSV} className="flex-1 sm:flex-none">
                        <Download className="w-4 h-4 mr-2" /> Export Report
                    </Button>
                </div>
            </div>

            {/* Scorecards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Scorecard title="Today" stats={computeStats(periodData.today)} />
                <Scorecard title="This Week" stats={computeStats(periodData.week)} />
                <Scorecard title="This Month" stats={computeStats(periodData.month)} />
                <Scorecard title="Lifetime" stats={computeStats(periodData.lifetime)} />
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-2 gap-4">
                <Card className="flex flex-col h-[350px]">
                    <CardHeader>
                        <CardTitle className="text-lg">Score History</CardTitle>
                        <CardDescription>Weekly performance score trend</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0 pt-0">
                        {historyData.some(d => d.score !== null) ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={historyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                    <XAxis
                                        dataKey="week"
                                        stroke="var(--muted-foreground)"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                        dy={10}
                                    />
                                    <YAxis
                                        stroke="var(--muted-foreground)"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                        domain={[0, 100]}
                                        ticks={[0, 25, 50, 75, 100]}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                                        itemStyle={{ color: '#3B82F6' }}
                                        labelStyle={{ color: 'var(--muted-foreground)', marginBottom: '4px' }}
                                        formatter={(value: any) => [`${value}/100`, 'Score']}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="score"
                                        stroke="#3B82F6"
                                        strokeWidth={2}
                                        dot={{ fill: '#3B82F6', r: 3, strokeWidth: 0 }}
                                        activeDot={{ r: 5 }}
                                        connectNulls
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm text-[var(--muted-foreground)]">
                                No score history yet
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="flex flex-col h-[350px]">
                    <CardHeader>
                        <CardTitle className="text-lg">Performance Radar</CardTitle>
                        <CardDescription>Strengths and weaknesses by category</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0 flex items-center justify-center pt-0">
                        {activeStats && activeStats.count > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                    <PolarGrid stroke="var(--border)" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                    <Radar name="Score" dataKey="A" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} strokeWidth={2} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                                        itemStyle={{ color: '#3B82F6' }}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-sm text-[var(--muted-foreground)]">No data for selected period</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Tabs and Breakdown */}
            <div>
                <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
                    <TabsList className="mb-4">
                        <TabsTrigger value="today">Today</TabsTrigger>
                        <TabsTrigger value="week">This Week</TabsTrigger>
                        <TabsTrigger value="month">This Month</TabsTrigger>
                        <TabsTrigger value="lifetime">Lifetime</TabsTrigger>
                    </TabsList>

                    <Card>
                        <CardContent className="p-5 sm:p-6">
                            {!activeStats || activeStats.count === 0 ? (
                                <div className="py-12 text-center text-[var(--muted-foreground)]">
                                    No graded trades in this period.
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {/* Header */}
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-lg font-semibold capitalize">{activeTab === 'lifetime' ? 'Lifetime' : `This ${activeTab}`} Breakdown</h3>
                                            <p className="text-sm text-[var(--muted-foreground)]">{activeStats.count} trades · {activeStats.totalPnl >= 0 ? '+' : ''}{formatCurrency(activeStats.totalPnl)}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-4xl font-mono font-bold" style={{ color: getGradeColor(activeStats.weightedTotal) }}>
                                                {Math.round(activeStats.weightedTotal)} <span className="text-xl text-[var(--muted-foreground)] font-sans">/ 100</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progress Bars */}
                                    <div className="grid gap-4">
                                        <CategoryRow name="Risk Management" score={activeStats.catAverages.rm} weight={weights.risk_management} />
                                        <CategoryRow name="Execution" score={activeStats.catAverages.ex} weight={weights.execution} />
                                        <CategoryRow name="Discipline" score={activeStats.catAverages.di} weight={weights.discipline} />
                                        <CategoryRow name="Strategy" score={activeStats.catAverages.st} weight={weights.strategy} />
                                        <CategoryRow name="Efficiency" score={activeStats.catAverages.ef} weight={weights.efficiency} />
                                    </div>

                                    {/* Total row */}
                                    <div className="pt-4 border-t flex justify-between items-center bg-[var(--sidebar)]/50 p-4 rounded-lg">
                                        <span className="font-semibold">Weighted Total</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl font-mono font-bold">{activeStats.weightedTotal.toFixed(1)}</span>
                                            <span className="text-xl text-[var(--muted-foreground)]">→</span>
                                            <span className="px-2.5 py-1 text-sm font-bold font-mono rounded bg-[var(--background)] border" style={{ color: getGradeColor(activeStats.weightedTotal), borderColor: getGradeColor(activeStats.weightedTotal) + '40' }}>
                                                {getGradeLabel(activeStats.weightedTotal).grade}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Distribution */}
                                    <div className="pt-4">
                                        <h4 className="font-medium mb-4 text-sm uppercase tracking-wider text-[var(--muted-foreground)]">Grade Distribution</h4>
                                        <div className="space-y-2">
                                            {['A+', 'A', 'B+', 'B', 'B-', 'C'].map((g) => {
                                                const count = activeStats.dist[g] || 0
                                                const pct = activeStats.count > 0 ? (count / activeStats.count) * 100 : 0
                                                let rawScoreMap = 0;
                                                if (g === 'A+') rawScoreMap = 100
                                                else if (g === 'A') rawScoreMap = 95
                                                else if (g === 'B+') rawScoreMap = 85
                                                else if (g === 'B') rawScoreMap = 70
                                                else if (g === 'B-') rawScoreMap = 65
                                                else rawScoreMap = 40
                                                return (
                                                    <div key={g} className="flex items-center gap-3 text-sm font-mono">
                                                        <div className="w-8 font-bold" style={{ color: getGradeColor(rawScoreMap) }}>{g}</div>
                                                        <div className="flex-1 h-2.5 bg-[var(--sidebar)] rounded overflow-hidden">
                                                            <div className="h-full rounded transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: getGradeColor(rawScoreMap) }} />
                                                        </div>
                                                        <div className="w-8 text-right text-[var(--muted-foreground)]">{count}</div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>

                                </div>
                            )}
                        </CardContent>
                    </Card>
                </Tabs>
            </div>

            {/* Rubric */}
            <div>
                <h4 className="font-medium mb-3 text-sm uppercase tracking-wider text-[var(--muted-foreground)]">Scoring Rubric</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    <div className="border rounded bg-[#22C55E]/10 border-[#22C55E]/30 p-2 text-center">
                        <div className="text-[#22C55E] font-mono font-bold">90-100</div>
                        <div className="text-[11px] text-[#22C55E] uppercase tracking-wider mt-0.5">Excellent</div>
                    </div>
                    <div className="border rounded bg-[#3B82F6]/10 border-[#3B82F6]/30 p-2 text-center">
                        <div className="text-[#3B82F6] font-mono font-bold">75-89</div>
                        <div className="text-[11px] text-[#3B82F6] uppercase tracking-wider mt-0.5">Good</div>
                    </div>
                    <div className="border rounded bg-[#F59E0B]/10 border-[#F59E0B]/30 p-2 text-center">
                        <div className="text-[#F59E0B] font-mono font-bold">60-74</div>
                        <div className="text-[11px] text-[#F59E0B] uppercase tracking-wider mt-0.5">Average</div>
                    </div>
                    <div className="border rounded bg-[#F97316]/10 border-[#F97316]/30 p-2 text-center">
                        <div className="text-[#F97316] font-mono font-bold">40-59</div>
                        <div className="text-[11px] text-[#F97316] uppercase tracking-wider mt-0.5">Poor</div>
                    </div>
                    <div className="border rounded bg-[#EF4444]/10 border-[#EF4444]/30 p-2 text-center">
                        <div className="text-[#EF4444] font-mono font-bold">0-39</div>
                        <div className="text-[11px] text-[#EF4444] uppercase tracking-wider mt-0.5">Critical</div>
                    </div>
                </div>
            </div>

            {/* Weights Configure Link is in Header now */}
        </div>
    )
}

function Scorecard({ title, stats }: { title: string, stats: any }) {
    if (!stats || stats.count === 0) {
        return (
            <Card className="flex flex-col justify-between h-[140px] border-red-900/10">
                <CardContent className="p-4 flex flex-col justify-between h-full pt-4">
                    <div className="text-[10px] uppercase font-semibold text-[var(--muted-foreground)] tracking-wider">
                        {title}
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-mono text-[var(--muted-foreground)]">—</div>
                        <div className="text-xs text-[var(--muted-foreground)] mt-1">No graded trades</div>
                    </div>
                    <div className="text-[11px] text-center text-[var(--muted-foreground)]">
                        0 trades
                    </div>
                </CardContent>
            </Card>
        )
    }

    const scoreInfo = getGradeLabel(stats.weightedTotal)

    return (
        <Card className="flex flex-col justify-between h-[140px]">
            <CardContent className="p-4 flex flex-col justify-between h-full pt-4">
                <div className="text-[10px] uppercase font-semibold text-[var(--muted-foreground)] tracking-wider">
                    {title}
                </div>
                <div className="text-center">
                    <div className="text-4xl font-mono font-bold" style={{ color: getGradeColor(stats.weightedTotal) }}>
                        {Math.round(stats.weightedTotal)}
                    </div>
                    <div className="text-[11px] uppercase tracking-wider font-semibold mt-1" style={{ color: getGradeColor(stats.weightedTotal) }}>
                        {scoreInfo.label}
                    </div>
                </div>
                <div className="h-px bg-[var(--border)] w-full opacity-50" />
                <div className="text-[11px] text-center flex justify-between px-2 font-mono">
                    <span className="text-[var(--muted-foreground)]">{stats.count} trades</span>
                    <span className={stats.totalPnl >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"}>
                        {stats.totalPnl >= 0 ? '+' : ''}{formatCurrency(stats.totalPnl)}
                    </span>
                </div>
            </CardContent>
        </Card>
    )
}

function CategoryRow({ name, score, weight }: { name: string, score: number, weight: number }) {
    const normScore = Math.max(0, Math.min(100, Math.round(score)))

    return (
        <div className="flex items-center gap-3">
            <div className="w-[140px] font-semibold text-sm">{name}</div>
            <div className="flex-1 h-3 bg-[var(--sidebar)] rounded overflow-hidden">
                <div
                    className="h-full rounded transition-all duration-500"
                    style={{
                        width: `${normScore}%`,
                        backgroundColor: getGradeColor(normScore),
                        opacity: 0.8
                    }}
                />
            </div>
            <div className="w-12 text-right font-mono font-bold text-sm" style={{ color: getGradeColor(normScore) }}>
                {normScore}
            </div>
            <div className="w-20 text-right text-xs text-[var(--muted-foreground)] font-mono">
                weight {weight}%
            </div>
        </div>
    )
}


