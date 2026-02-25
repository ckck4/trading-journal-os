import { useState } from 'react'
import { Goal } from './goals-client'
import { Pencil, Trash2, Calendar, Target, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { format, isBefore, parseISO } from 'date-fns'
import { UpdateProgressDialog } from './forms/update-progress-dialog'
import { GoalDialog } from './forms/goal-dialog'
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

interface GoalsTabProps {
    goals: Goal[]
    isLoading: boolean
}

export function GoalsTab({ goals, isLoading }: GoalsTabProps) {
    const queryClient = useQueryClient()
    const [updateGoal, setUpdateGoal] = useState<Goal | null>(null)
    const [editGoal, setEditGoal] = useState<Goal | null>(null)
    const [deleteId, setDeleteId] = useState<string | null>(null)

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/goals/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to delete goal')
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['goals'] })
            setDeleteId(null)
        }
    })

    if (isLoading) {
        return <div className="text-[var(--muted-foreground)] text-sm">Loading goals...</div>
    }

    if (goals.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-[var(--border)] rounded-xl bg-[var(--surface)]">
                <Target className="h-10 w-10 text-[var(--muted-foreground)] mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-[var(--foreground)]">No goals yet</h3>
                <p className="text-[var(--muted-foreground)] text-sm mb-6 mt-1 max-w-sm">
                    Define targets for performance, consistency, or financials.
                </p>
                <Button onClick={() => setEditGoal({} as Goal)} className="bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent)]/90">
                    <Plus className="h-4 w-4 mr-2" />
                    New Goal
                </Button>
                {editGoal && <GoalDialog goal={editGoal} open={!!editGoal} onOpenChange={(o: boolean) => !o && setEditGoal(null)} />}
            </div>
        )
    }

    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {goals.map(goal => {
                    const isCompleted = goal.status === 'completed'
                    const isFailed = goal.status === 'failed'
                    const isPaused = goal.status === 'paused'

                    let statusColor = 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                    if (isCompleted) statusColor = 'bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20'
                    if (isFailed) statusColor = 'bg-[var(--color-error)]/10 text-[var(--color-error)] border-[var(--color-error)]/20'
                    if (isPaused) statusColor = 'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]'

                    let progressColorClass = 'bg-yellow-500'
                    if (goal.progress >= 100) progressColorClass = 'bg-[var(--color-success)]'
                    else if (goal.progress >= 50) progressColorClass = 'bg-blue-500'

                    const deadlineObj = goal.deadline ? parseISO(goal.deadline) : null
                    const isOverdue = deadlineObj && goal.status === 'active' && isBefore(deadlineObj, new Date())

                    return (
                        <div key={goal.id} className="flex flex-col p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] relative overflow-hidden group">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="text-lg font-medium text-[var(--foreground)]">{goal.title}</h3>
                                    <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-[10px] uppercase font-semibold tracking-wider bg-[var(--muted)] text-[var(--muted-foreground)]">
                                        {goal.goal_type}
                                    </span>
                                </div>
                                <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${statusColor} uppercase tracking-wider`}>
                                    {goal.status}
                                </span>
                            </div>

                            {goal.description && (
                                <p className="text-sm text-[var(--muted-foreground)] line-clamp-2 mt-2 mb-4">
                                    {goal.description}
                                </p>
                            )}

                            <div className="mt-4 mb-2 flex justify-between items-end">
                                <div className="text-sm font-medium text-[var(--foreground)]">
                                    {goal.metric || 'Progress'}: <span className="font-mono">{goal.current_value}</span> / <span className="font-mono">{goal.target_value}</span> {goal.unit}
                                </div>
                                <div className="text-sm font-mono font-semibold text-[var(--foreground)]">
                                    {goal.progress}%
                                </div>
                            </div>

                            {/* Progress Bar Override class based on progress logic */}
                            <Progress value={goal.progress} className="h-2 mb-4" indicatorClassName={progressColorClass} />

                            <div className="flex items-center justify-between text-sm text-[var(--muted-foreground)] mt-2">
                                <div className={`flex items-center gap-1.5 ${isOverdue ? 'text-[var(--color-error)] font-medium' : ''}`}>
                                    <Calendar className="h-4 w-4" />
                                    {goal.deadline ? `Due ${format(parseISO(goal.deadline), 'MMM d, yyyy')}` : 'No deadline'}
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="border-t border-[var(--border)] mt-4 pt-4 flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--muted-foreground)] hover:text-[var(--foreground)]" onClick={() => setEditGoal(goal)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--muted-foreground)] hover:text-[var(--color-error)]" onClick={() => setDeleteId(goal.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setUpdateGoal(goal)} className="text-[var(--foreground)] font-medium bg-[var(--muted)] hover:bg-[var(--border)]">
                                    Update Progress
                                </Button>
                            </div>
                        </div>
                    )
                })}
            </div>

            {updateGoal && (
                <UpdateProgressDialog
                    goal={updateGoal}
                    open={!!updateGoal}
                    onOpenChange={(open: boolean) => !open && setUpdateGoal(null)}
                />
            )}

            {editGoal && (
                <GoalDialog
                    goal={editGoal.id ? editGoal : undefined}
                    open={!!editGoal}
                    onOpenChange={(open: boolean) => !open && setEditGoal(null)}
                />
            )}

            <AlertDialog open={!!deleteId} onOpenChange={(open: boolean) => !open && setDeleteId(null)}>
                <AlertDialogContent className="bg-[var(--surface)] border-[var(--border)]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-[var(--foreground)]">Delete Goal</AlertDialogTitle>
                        <AlertDialogDescription className="text-[var(--muted-foreground)]">
                            This will permanently delete this goal. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-[var(--muted)] text-[var(--foreground)] border-none hover:bg-[var(--sidebar-accent)] hover:text-[var(--foreground)]">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteId && deleteMutation.mutate(deleteId)}
                            className="bg-[var(--color-error)] text-white hover:bg-[var(--color-error)]/90"
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete Goal'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
