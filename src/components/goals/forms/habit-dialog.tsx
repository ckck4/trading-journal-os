'use client'

import { useState } from 'react'
import { Habit } from '../goals-client'
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

const PREDEFINED_CATEGORIES = ['Preparation', 'Discipline', 'Review', 'Risk Management', 'Other']

interface HabitDialogProps {
    habit?: Habit // If provided, we are editing. If undefined, we are creating.
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function HabitDialog({ habit, open, onOpenChange }: HabitDialogProps) {
    const queryClient = useQueryClient()
    const isEditing = !!habit

    const initialCategory = habit?.category || 'Preparation'
    const isCustomCategoryInitially = !PREDEFINED_CATEGORIES.includes(initialCategory) && !!habit?.category

    const [formData, setFormData] = useState({
        name: habit?.name || '',
        description: habit?.description || '',
        frequency: habit?.frequency || 'daily',
        categorySelect: isCustomCategoryInitially ? 'Custom...' : initialCategory,
        customCategory: isCustomCategoryInitially ? initialCategory : '',
        is_active: habit?.is_active ?? true
    })

    const [error, setError] = useState<string | null>(null)

    const mutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const finalCategory = data.categorySelect === 'Custom...' ? data.customCategory : data.categorySelect

            const payload: any = {
                name: data.name,
                frequency: data.frequency,
                category: finalCategory,
            }

            if (data.description) payload.description = data.description
            if (isEditing) payload.is_active = data.is_active

            const url = isEditing ? `/api/habits/${habit.id}` : '/api/habits'
            const method = isEditing ? 'PATCH' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Failed to save habit')
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['habits'] })
            onOpenChange(false)
        },
        onError: (err: any) => {
            setError(err.message)
        }
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!formData.name.trim()) {
            setError('Name is required')
            return
        }

        if (formData.categorySelect === 'Custom...' && !formData.customCategory.trim()) {
            setError('Please specify a custom category')
            return
        }

        mutation.mutate(formData)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-[var(--surface)] border-[var(--border)] sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="text-[var(--foreground)]">
                        {isEditing ? 'Edit Habit' : 'New Habit'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    {error && (
                        <div className="p-3 text-sm text-[var(--color-error)] bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 rounded-md">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label className="text-[var(--foreground)]">Habit Name <span className="text-[var(--color-error)]">*</span></Label>
                        <Input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="bg-[var(--sidebar)] border-[var(--border)] text-[var(--foreground)]"
                            placeholder="e.g., Pre-market checklist"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[var(--foreground)]">Description</Label>
                        <Textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="bg-[var(--sidebar)] border-[var(--border)] text-[var(--foreground)] resize-none"
                            placeholder="What exactly does this habit entail?"
                            rows={2}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[var(--foreground)]">Frequency</Label>
                            <Select
                                value={formData.frequency}
                                onValueChange={(val) => setFormData({ ...formData, frequency: val as "daily" | "weekly" | "monthly" })}
                            >
                                <SelectTrigger className="bg-[var(--sidebar)] border-[var(--border)] text-[var(--foreground)]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="daily">Daily</SelectItem>
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[var(--foreground)]">Category</Label>
                            <Select
                                value={formData.categorySelect}
                                onValueChange={(val) => setFormData({ ...formData, categorySelect: val })}
                            >
                                <SelectTrigger className="bg-[var(--sidebar)] border-[var(--border)] text-[var(--foreground)]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PREDEFINED_CATEGORIES.map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                    <SelectItem value="Custom...">Custom...</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {formData.categorySelect === 'Custom...' && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                            <Label className="text-[var(--foreground)]">Custom Category <span className="text-[var(--color-error)]">*</span></Label>
                            <Input
                                value={formData.customCategory}
                                onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
                                className="bg-[var(--sidebar)] border-[var(--border)] text-[var(--foreground)]"
                                placeholder="e.g., Fitness"
                                required
                            />
                        </div>
                    )}

                    {isEditing && (
                        <div className="space-y-2 pt-2 border-t border-[var(--border)] mt-4">
                            <Label className="text-[var(--foreground)]">Status</Label>
                            <Select
                                value={formData.is_active ? 'active' : 'inactive'}
                                onValueChange={(val) => setFormData({ ...formData, is_active: val === 'active' })}
                            >
                                <SelectTrigger className="bg-[var(--sidebar)] border-[var(--border)] text-[var(--foreground)]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
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
                            {mutation.isPending ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Habit')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
