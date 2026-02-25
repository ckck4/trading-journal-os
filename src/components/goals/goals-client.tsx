'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Target, Flame, CheckCircle2, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GoalsTab } from './goals-tab'
import { HabitsTab } from './habits-tab'

// Types for our APIs
export type Goal = {
    id: string
    title: string
    description: string | null
    goal_type: 'performance' | 'consistency' | 'financial' | 'custom'
    metric: string | null
    unit: string | null
    target_value: string
    current_value: string
    deadline: string | null
    status: 'active' | 'completed' | 'failed' | 'paused'
    progress: number
}

export type Habit = {
    id: string
    name: string
    description: string | null
    frequency: 'daily' | 'weekly' | 'monthly'
    category: string
    is_active: boolean
    completedToday: boolean
    currentStreak: number
    bestStreak: number
    weeklyRate: number
}

export function GoalsClient() {
    const [activeTab, setActiveTab] = useState('goals')

    // Fetch data
    const { data: goalsData, isLoading: goalsLoading } = useQuery<{ data: Goal[] }>({
        queryKey: ['goals'],
        queryFn: async () => {
            const res = await fetch('/api/goals')
            if (!res.ok) throw new Error('Failed to fetch goals')
            return res.json()
        }
    })

    const { data: habitsData, isLoading: habitsLoading } = useQuery<{ data: Habit[] }>({
        queryKey: ['habits'],
        queryFn: async () => {
            const res = await fetch('/api/habits')
            if (!res.ok) throw new Error('Failed to fetch habits')
            return res.json()
        }
    })

    const goals = goalsData?.data || []
    const habits = habitsData?.data || []

    // KPI Calculations
    const completedGoals = goals.filter(g => g.status === 'completed').length
    const totalGoals = goals.length

    const activeHabits = habits.filter(h => h.is_active)
    const completedTodayHabits = activeHabits.filter(h => h.completedToday).length
    const totalActiveHabits = activeHabits.length

    const bestStreak = habits.length > 0
        ? Math.max(...habits.map(h => h.currentStreak))
        : 0

    const avgWeeklyRate = activeHabits.length > 0
        ? activeHabits.reduce((acc, h) => acc + h.weeklyRate, 0) / activeHabits.length
        : 0

    return (
        <div className="flex flex-col gap-6 p-6 md:p-8 max-w-[1600px] mx-auto w-full">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-[var(--foreground)]">Goals & Habits</h1>
                    <p className="text-sm text-[var(--muted-foreground)] mt-1">
                        Set targets, build habits, and track your progress
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Note: In future steps, buttons will trigger dialogs */}
                    <Button variant="secondary" size="sm" className="gap-2">
                        <Plus className="h-4 w-4" />
                        New Habit
                    </Button>
                    <Button size="sm" className="gap-2 bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent)]/90">
                        <Plus className="h-4 w-4" />
                        New Goal
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* KPI 1: Goals Progress */}
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <Target className="h-4 w-4 text-[var(--muted-foreground)]" />
                        <span className="text-sm font-medium text-[var(--muted-foreground)]">Goals Progress</span>
                    </div>
                    <div className="flex items-end gap-2">
                        <span className="text-2xl font-semibold font-mono text-[var(--foreground)]">
                            {completedGoals}/{totalGoals}
                        </span>
                        <span className="text-sm text-[var(--muted-foreground)] mb-1">completed</span>
                    </div>
                </div>

                {/* KPI 2: Today's Habits */}
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-4 w-4 text-[var(--muted-foreground)]" />
                        <span className="text-sm font-medium text-[var(--muted-foreground)]">Today's Habits</span>
                    </div>
                    <div className="flex items-end gap-2">
                        <span className="text-2xl font-semibold font-mono text-[var(--foreground)]">
                            {completedTodayHabits}/{totalActiveHabits}
                        </span>
                        <span className="text-sm text-[var(--muted-foreground)] mb-1">completed</span>
                    </div>
                </div>

                {/* KPI 3: Best Streak */}
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <Flame className="h-4 w-4 text-[var(--muted-foreground)]" />
                        <span className="text-sm font-medium text-[var(--muted-foreground)]">Best Streak</span>
                    </div>
                    <div className="flex items-end gap-2">
                        <span className="flex items-center text-2xl font-semibold font-mono text-[var(--foreground)]">
                            {bestStreak}
                            {bestStreak > 0 && <Flame className="h-5 w-5 text-orange-500 ml-1" fill="currentColor" />}
                        </span>
                        <span className="text-sm text-[var(--muted-foreground)] mb-1">days</span>
                    </div>
                </div>

                {/* KPI 4: Weekly Rate */}
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-[var(--muted-foreground)]" />
                        <span className="text-sm font-medium text-[var(--muted-foreground)]">Weekly Rate</span>
                    </div>
                    <div className="flex items-end gap-2">
                        <span className={`text-2xl font-semibold font-mono ${avgWeeklyRate >= 70 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
                            }`}>
                            {avgWeeklyRate.toFixed(1)}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="mb-6">
                    <TabsTrigger value="goals">Goals</TabsTrigger>
                    <TabsTrigger value="habits">Habits</TabsTrigger>
                </TabsList>

                <TabsContent value="goals" className="m-0 mt-2">
                    <GoalsTab goals={goals} isLoading={goalsLoading} />
                </TabsContent>

                <TabsContent value="habits" className="m-0 mt-2">
                    <HabitsTab habits={habits} isLoading={habitsLoading} />
                </TabsContent>
            </Tabs>

        </div>
    )
}
