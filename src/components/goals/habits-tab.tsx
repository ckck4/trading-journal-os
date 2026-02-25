'use client'

import { useState } from 'react'
import { Habit } from './goals-client'
import { Pencil, Trash2, Plus, Flame, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HabitDialog } from './forms/habit-dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useMutation, useQueryClient } from '@tanstack/react-query'

interface HabitsTabProps {
    habits: Habit[]
    isLoading: boolean
}

export function HabitsTab({ habits, isLoading }: HabitsTabProps) {
    const queryClient = useQueryClient()
    const [editHabit, setEditHabit] = useState<Habit | null>(null)
    const [deleteId, setDeleteId] = useState<string | null>(null)

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/habits/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to delete habit')
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['habits'] })
            setDeleteId(null)
        }
    })

    const completeMutation = useMutation({
        mutationFn: async ({ id, isCompleting }: { id: string, isCompleting: boolean }) => {
            const method = isCompleting ? 'POST' : 'DELETE'
            const res = await fetch(`/api/habits/${id}/complete`, { method })
            if (!res.ok) throw new Error('Failed to toggle completion')
        },
        onSuccess: () => {
            // Invalidate to fetch new stats 
            queryClient.invalidateQueries({ queryKey: ['habits'] })
        }
    })

    if (isLoading) {
        return <div className="text-[var(--muted-foreground)] text-sm">Loading habits...</div>
    }

    if (habits.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-[var(--border)] rounded-xl bg-[var(--surface)]">
                <Activity className="h-10 w-10 text-[var(--muted-foreground)] mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-[var(--foreground)]">No habits yet</h3>
                <p className="text-[var(--muted-foreground)] text-sm mb-6 mt-1 max-w-sm">
                    Build consistency by tracking daily, weekly, or monthly routines.
                </p>
                <Button onClick={() => setEditHabit({} as Habit)} className="bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent)]/90">
                    <Plus className="h-4 w-4 mr-2" />
                    New Habit
                </Button>
                {editHabit && <HabitDialog habit={editHabit} open={!!editHabit} onOpenChange={(o: boolean) => !o && setEditHabit(null)} />}
            </div>
        )
    }

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {habits.map(habit => {
                    return (
                        <div key={habit.id} className={`flex flex-col p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] relative overflow-hidden group ${!habit.is_active ? 'opacity-60 grayscale' : ''}`}>
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="text-lg font-medium text-[var(--foreground)]">{habit.name}</h3>
                                    <div className="flex gap-2 mt-1">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-semibold tracking-wider bg-[var(--muted)] text-[var(--muted-foreground)] border border-[var(--border)]">
                                            {habit.frequency}
                                        </span>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-semibold tracking-wider bg-[var(--sidebar)] text-[var(--muted-foreground)]">
                                            {habit.category}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {habit.description && (
                                <p className="text-sm text-[var(--muted-foreground)] line-clamp-2 mt-2 mb-4">
                                    {habit.description}
                                </p>
                            )}

                            {/* Stats Row */}
                            <div className={`grid grid-cols-3 gap-2 mt-auto pt-4 pb-4 ${!habit.is_active ? 'hidden' : ''}`}>
                                <div className="flex flex-col">
                                    <span className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Streak</span>
                                    <span className="text-xl font-mono text-[var(--foreground)] flex items-center gap-1">
                                        {habit.currentStreak}
                                        {habit.currentStreak > 0 && <Flame className="h-4 w-4 text-orange-500" fill="currentColor" />}
                                    </span>
                                </div>
                                <div className="flex flex-col border-l border-[var(--border)] pl-3">
                                    <span className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Best</span>
                                    <span className="text-xl font-mono text-[var(--foreground)]">{habit.bestStreak}</span>
                                </div>
                                <div className="flex flex-col border-l border-[var(--border)] pl-3">
                                    <span className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Week</span>
                                    <span className={`text-xl font-mono ${habit.weeklyRate >= 70 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
                                        {habit.weeklyRate.toFixed(0)}%
                                    </span>
                                </div>
                            </div>

                            {/* Central Action Button */}
                            {habit.is_active && (
                                <Button
                                    variant={habit.completedToday ? "default" : "outline"}
                                    className={`w-full py-6 mt-2 font-medium text-base transition-all ${habit.completedToday
                                        ? 'bg-[var(--color-success)] hover:bg-[var(--color-success)]/90 text-white border-transparent'
                                        : 'bg-transparent border-[var(--border)] hover:bg-[var(--sidebar-accent)] text-[var(--foreground)]'
                                        }`}
                                    onClick={() => completeMutation.mutate({ id: habit.id, isCompleting: !habit.completedToday })}
                                    disabled={completeMutation.isPending && completeMutation.variables?.id === habit.id}
                                >
                                    {completeMutation.isPending && completeMutation.variables?.id === habit.id
                                        ? 'Saving...'
                                        : (habit.completedToday ? '✓ Completed Today' : 'Mark Complete')
                                    }
                                </Button>
                            )}

                            {/* Footer Actions */}
                            <div className="border-t border-[var(--border)] mt-4 pt-3 flex items-center justify-start gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--muted-foreground)] hover:text-[var(--foreground)]" onClick={() => setEditHabit(habit)}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--muted-foreground)] hover:text-[var(--color-error)]" onClick={() => setDeleteId(habit.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )
                })}
            </div>

            {editHabit && (
                <HabitDialog
                    habit={editHabit.id ? editHabit : undefined}
                    open={!!editHabit}
                    onOpenChange={(open: boolean) => !open && setEditHabit(null)}
                />
            )}

            <AlertDialog open={!!deleteId} onOpenChange={(open: boolean) => !open && setDeleteId(null)}>
                <AlertDialogContent className="bg-[var(--surface)] border-[var(--border)]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-[var(--foreground)]">Delete Habit</AlertDialogTitle>
                        <AlertDialogDescription className="text-[var(--muted-foreground)]">
                            This will permanently delete this habit and all of its historical completion data. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-[var(--muted)] text-[var(--foreground)] border-none hover:bg-[var(--sidebar-accent)] hover:text-[var(--foreground)]">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteId && deleteMutation.mutate(deleteId)}
                            className="bg-[var(--color-error)] text-white hover:bg-[var(--color-error)]/90"
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete Habit'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
