'use client'

import { useState } from 'react'
import { Goal } from '../goals-client'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useMutation, useQueryClient } from '@tanstack/react-query'

interface UpdateProgressDialogProps {
    goal: Goal
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function UpdateProgressDialog({ goal, open, onOpenChange }: UpdateProgressDialogProps) {
    const queryClient = useQueryClient()
    const [value, setValue] = useState(goal.current_value.toString())
    const [error, setError] = useState<string | null>(null)

    const mutation = useMutation({
        mutationFn: async (newValue: number) => {
            const res = await fetch(`/api/goals/${goal.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ current_value: newValue })
            })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to update progress')
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['goals'] })
            onOpenChange(false)
        },
        onError: (err: any) => {
            setError(err.message)
        }
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        const num = parseFloat(value)
        if (isNaN(num)) {
            setError('Please enter a valid number')
            return
        }
        mutation.mutate(num)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-[var(--surface)] border-[var(--border)] sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle className="text-[var(--foreground)]">Update Progress</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    {error && (
                        <div className="p-3 text-sm text-[var(--color-error)] bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 rounded-md">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm text-[var(--muted-foreground)]">
                            <span>Goal:</span>
                            <span className="font-medium text-[var(--foreground)]">{goal.title}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-[var(--muted-foreground)]">
                            <span>Target:</span>
                            <span className="font-mono text-[var(--foreground)]">{goal.target_value} {goal.unit}</span>
                        </div>

                        <div className="space-y-2 pt-2">
                            <Label htmlFor="currentValue" className="text-[var(--foreground)]">New Current Value</Label>
                            <Input
                                id="currentValue"
                                type="number"
                                step="any"
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                className="bg-[var(--sidebar)] border-[var(--border)] text-[var(--foreground)]"
                                autoFocus
                                required
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="bg-transparent border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--sidebar-accent)]"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={mutation.isPending}
                            className="bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent)]/90"
                        >
                            {mutation.isPending ? 'Saving...' : 'Save Progress'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
