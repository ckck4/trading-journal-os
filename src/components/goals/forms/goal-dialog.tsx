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
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useMutation, useQueryClient } from '@tanstack/react-query'

interface GoalDialogProps {
    goal?: Goal // If provided, we are editing. If undefined, we are creating.
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function GoalDialog({ goal, open, onOpenChange }: GoalDialogProps) {
    const queryClient = useQueryClient()
    const isEditing = !!goal

    const [formData, setFormData] = useState({
        title: goal?.title || '',
        description: goal?.description || '',
        goal_type: goal?.goal_type || 'performance',
        metric: goal?.metric || '',
        unit: goal?.unit || '',
        target_value: goal?.target_value?.toString() || '',
        current_value: goal?.current_value?.toString() || '0',
        deadline: goal?.deadline || '',
        status: goal?.status || 'active'
    })

    const [error, setError] = useState<string | null>(null)

    const mutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const payload: any = {
                title: data.title,
                goal_type: data.goal_type,
                target_value: parseFloat(data.target_value),
                current_value: parseFloat(data.current_value),
            }

            if (data.description) payload.description = data.description
            if (data.metric) payload.metric = data.metric
            if (data.unit) payload.unit = data.unit
            if (data.deadline) payload.deadline = data.deadline
            if (isEditing && data.status) payload.status = data.status

            const url = isEditing ? `/api/goals/${goal.id}` : '/api/goals'
            const method = isEditing ? 'PATCH' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Failed to save goal')
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

        if (!formData.title.trim()) {
            setError('Title is required')
            return
        }
        if (isNaN(parseFloat(formData.target_value))) {
            setError('Target value must be a valid number')
            return
        }
        if (isNaN(parseFloat(formData.current_value))) {
            setError('Current value must be a valid number')
            return
        }

        mutation.mutate(formData)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-[var(--surface)] border-[var(--border)] sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-[var(--foreground)]">
                        {isEditing ? 'Edit Goal' : 'New Goal'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    {error && (
                        <div className="p-3 text-sm text-[var(--color-error)] bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 rounded-md">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label className="text-[var(--foreground)]">Goal Title <span className="text-[var(--color-error)]">*</span></Label>
                        <Input
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="bg-[var(--sidebar)] border-[var(--border)] text-[var(--foreground)]"
                            placeholder="e.g., Reach $5k in profits"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[var(--foreground)]">Description</Label>
                        <Textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="bg-[var(--sidebar)] border-[var(--border)] text-[var(--foreground)] resize-none"
                            placeholder="Detail your plan to achieve this goal..."
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[var(--foreground)]">Goal Type</Label>
                            <Select
                                value={formData.goal_type}
                                onValueChange={(val) => setFormData({ ...formData, goal_type: val as "performance" | "consistency" | "financial" | "custom" })}
                            >
                                <SelectTrigger className="bg-[var(--sidebar)] border-[var(--border)] text-[var(--foreground)]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="performance">Performance</SelectItem>
                                    <SelectItem value="consistency">Consistency</SelectItem>
                                    <SelectItem value="financial">Financial</SelectItem>
                                    <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[var(--foreground)]">Deadline (Optional)</Label>
                            <Input
                                type="date"
                                value={formData.deadline}
                                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                                className="bg-[var(--sidebar)] border-[var(--border)] text-[var(--foreground)]"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[var(--foreground)]">Metric Name</Label>
                            <Input
                                value={formData.metric}
                                onChange={(e) => setFormData({ ...formData, metric: e.target.value })}
                                className="bg-[var(--sidebar)] border-[var(--border)] text-[var(--foreground)]"
                                placeholder="e.g., Total PnL"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[var(--foreground)]">Unit</Label>
                            <Input
                                value={formData.unit}
                                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                className="bg-[var(--sidebar)] border-[var(--border)] text-[var(--foreground)]"
                                placeholder="e.g., $ or %"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[var(--foreground)]">Target Value <span className="text-[var(--color-error)]">*</span></Label>
                            <Input
                                type="number"
                                step="any"
                                value={formData.target_value}
                                onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                                className="bg-[var(--sidebar)] border-[var(--border)] text-[var(--foreground)]"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[var(--foreground)]">Current Value</Label>
                            <Input
                                type="number"
                                step="any"
                                value={formData.current_value}
                                onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
                                className="bg-[var(--sidebar)] border-[var(--border)] text-[var(--foreground)]"
                            />
                        </div>
                    </div>

                    {isEditing && (
                        <div className="space-y-2 pt-2 border-t border-[var(--border)] mt-4">
                            <Label className="text-[var(--foreground)]">Status</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(val) => setFormData({ ...formData, status: val as "active" | "completed" | "failed" | "paused" })}
                            >
                                <SelectTrigger className="bg-[var(--sidebar)] border-[var(--border)] text-[var(--foreground)]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="failed">Failed</SelectItem>
                                    <SelectItem value="paused">Paused</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <DialogFooter className="pt-4 border-t border-[var(--border)]">
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
                            {mutation.isPending ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Goal')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
