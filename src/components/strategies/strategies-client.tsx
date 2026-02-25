'use client'

import React, { useState, useMemo } from 'react'
import { Plus, Check, PenLine, Trash2, BookMarked, TrendingUp, Presentation, AlertCircle, Percent } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card'
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
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
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'

type Strategy = {
    id: string
    name: string
    description: string | null
    status: 'active' | 'testing' | 'retired'
    entry_rules: string | null
    invalidation_conditions: string | null
    tradeCount: number
    totalPnl: number
    winRate: number | null
    profitFactor: number | null
}

function formatPnl(value: number | null): string {
    if (value === null) return '—'
    const abs = Math.abs(value).toFixed(2)
    return `${value >= 0 ? '+' : '-'}$${abs}`
}

function pnlClass(value: number | null): string {
    if (value === null) return 'text-[var(--muted-foreground)]'
    return value >= 0 ? 'text-profit' : 'text-loss'
}

type Filter = 'All' | 'Active' | 'Testing' | 'Retired'

export function StrategiesClient() {
    const queryClient = useQueryClient()
    const [filter, setFilter] = useState<Filter>('All')

    // Dialog / form state
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        status: 'active' as 'active' | 'testing' | 'retired',
        entry_rules: '',
        invalidation_conditions: ''
    })

    // Sheet state
    const [viewingId, setViewingId] = useState<string | null>(null)

    // Delete confirm state
    const [deletingId, setDeletingId] = useState<string | null>(null)

    // API Queries
    const { data: strategiesData, isLoading, error } = useQuery({
        queryKey: ['strategies'],
        queryFn: async () => {
            const res = await fetch('/api/strategies')
            if (!res.ok) throw new Error('Failed to fetch')
            return res.json() as Promise<{ data: Strategy[] }>
        }
    })

    const strategies: Strategy[] = strategiesData?.data || []

    // Mutations
    const saveMutation = useMutation({
        mutationFn: async (strat: any) => {
            const url = editingId ? `/api/strategies/${editingId}` : '/api/strategies'
            const method = editingId ? 'PATCH' : 'POST'
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(strat)
            })
            if (!res.ok) throw new Error('Failed to save strategy')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['strategies'] })
            setIsDialogOpen(false)
            setEditingId(null)
            resetForm()
        }
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/strategies/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to delete strategy')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['strategies'] })
            queryClient.invalidateQueries({ queryKey: ['trades'] }) // Unlinked trades
            setDeletingId(null)
        }
    })

    // Computed Stats
    const {
        activeCount,
        totalTrades,
        combinedPnl,
        avgWinRate,
        avgProfitFactor,
        bestStrategy
    } = useMemo<{
        activeCount: number
        totalTrades: number
        combinedPnl: number
        avgWinRate: number | null
        avgProfitFactor: number | null
        bestStrategy: Strategy | null
    }>(() => {
        let active = 0, trades = 0, pnl = 0, wrSum = 0, pfSum = 0, wrCount = 0, pfCount = 0
        let best: Strategy | null = null

        strategies.forEach(s => {
            if (s.status === 'active') active++
            trades += s.tradeCount
            pnl += s.totalPnl

            if (s.winRate !== null) { wrSum += s.winRate; wrCount++ }
            if (s.profitFactor !== null) { pfSum += s.profitFactor; pfCount++ }

            if (!best || s.totalPnl > best.totalPnl) {
                if (s.tradeCount > 0) best = s
            }
        })

        return {
            activeCount: active,
            totalTrades: trades,
            combinedPnl: pnl,
            avgWinRate: wrCount > 0 ? wrSum / wrCount : null,
            avgProfitFactor: pfCount > 0 ? pfSum / pfCount : null,
            bestStrategy: best
        }
    }, [strategies])

    // Filtered
    const filteredStrategies = useMemo(() => {
        if (filter === 'All') return strategies
        return strategies.filter(s => s.status.toLowerCase() === filter.toLowerCase())
    }, [strategies, filter])

    const counts = {
        All: strategies.length,
        Active: strategies.filter(s => s.status === 'active').length,
        Testing: strategies.filter(s => s.status === 'testing').length,
        Retired: strategies.filter(s => s.status === 'retired').length,
    }

    const resetForm = () => setFormData({ name: '', description: '', status: 'active', entry_rules: '', invalidation_conditions: '' })

    const handleEdit = (strategy: Strategy) => {
        setFormData({
            name: strategy.name,
            description: strategy.description || '',
            status: strategy.status,
            entry_rules: strategy.entry_rules || '',
            invalidation_conditions: strategy.invalidation_conditions || ''
        })
        setEditingId(strategy.id)
        setIsDialogOpen(true)
    }

    const viewingStrategy = strategies.find(s => s.id === viewingId)

    // Status badge classes
    const statusBadge = (status: string) => {
        if (status === 'active') return 'bg-[var(--color-green-muted)] text-[var(--color-green)] border-[var(--color-green)]/30'
        if (status === 'testing') return 'bg-[var(--color-yellow-muted)] text-[var(--color-yellow)] border-[var(--color-yellow)]/30'
        return 'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]'
    }

    if (error) return <div className="p-8 text-red-500">Failed to load strategies</div>

    return (
        <div className="flex flex-col h-full bg-[var(--background)]">
            <div className="flex-1 space-y-8 p-8 pt-6 max-w-[1600px] w-full mx-auto">

                {/* Header */}
                <div className="flex items-center justify-between space-y-2">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">Strategies</h2>
                        <p className="text-[var(--muted-foreground)]">Build, track, and refine your trading playbook</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button onClick={() => { resetForm(); setEditingId(null); setIsDialogOpen(true) }}>
                            <Plus size={16} className="mr-2" /> New Strategy
                        </Button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 border-b border-[var(--border)] pb-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Active Strategies</CardTitle>
                            <Presentation className="h-4 w-4 text-[var(--muted-foreground)]" />
                        </CardHeader>
                        <CardContent>
                            {isLoading ? <Skeleton className="h-7 w-12" /> : <div className="text-2xl font-bold">{activeCount}</div>}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
                            <BookMarked className="h-4 w-4 text-[var(--muted-foreground)]" />
                        </CardHeader>
                        <CardContent>
                            {isLoading ? <Skeleton className="h-7 w-16" /> : <div className="text-2xl font-bold">{totalTrades}</div>}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Combined P&L</CardTitle>
                            <TrendingUp className="h-4 w-4 text-[var(--muted-foreground)]" />
                        </CardHeader>
                        <CardContent>
                            {isLoading ? <Skeleton className="h-7 w-24" /> : <div className={cn("text-2xl font-bold font-mono", pnlClass(combinedPnl))}>{formatPnl(combinedPnl)}</div>}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Avg Win Rate</CardTitle>
                            <Percent className="h-4 w-4 text-[var(--muted-foreground)]" />
                        </CardHeader>
                        <CardContent>
                            {isLoading ? <Skeleton className="h-7 w-16" /> : <div className="text-2xl font-bold">{avgWinRate !== null ? `${avgWinRate.toFixed(1)}%` : '—'}</div>}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Avg Profit Factor</CardTitle>
                            <AlertCircle className="h-4 w-4 text-[var(--muted-foreground)]" />
                        </CardHeader>
                        <CardContent>
                            {isLoading ? <Skeleton className="h-7 w-16" /> : <div className="text-2xl font-bold">{avgProfitFactor !== null ? avgProfitFactor.toFixed(2) : '—'}</div>}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Best Strategy</CardTitle>
                            <Check className="h-4 w-4 text-[var(--muted-foreground)]" />
                        </CardHeader>
                        <CardContent>
                            {isLoading ? <Skeleton className="h-7 w-24" /> : (
                                <>
                                    <div className="text-lg font-bold truncate leading-tight mt-0.5">{bestStrategy ? bestStrategy.name : 'N/A'}</div>
                                    {bestStrategy && <p className={cn("text-xs font-mono font-medium mt-1 uppercase", pnlClass(bestStrategy.totalPnl))}>{formatPnl(bestStrategy.totalPnl)}</p>}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Filter Bar */}
                <div className="flex items-center space-x-2">
                    {(['All', 'Active', 'Testing', 'Retired'] as Filter[]).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-9 px-4 py-2",
                                filter === f
                                    ? "bg-[var(--foreground)] text-[var(--background)] shadow hover:bg-[var(--foreground)]/90"
                                    : "bg-transparent text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
                            )}
                        >
                            {f} <span className="ml-2 opacity-60 text-xs">({counts[f]})</span>
                        </button>
                    ))}
                </div>

                {/* Strategies Grid */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {isLoading ? (
                        Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 w-full" />)
                    ) : filteredStrategies.length === 0 ? (
                        <div className="col-span-full py-16 text-center border border-dashed border-[var(--border)] rounded-lg">
                            <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">
                                {filter === 'All' ? 'No strategies yet.' : `No ${filter.toLowerCase()} strategies found.`}
                            </h3>
                            {filter === 'All' && (
                                <p className="text-[var(--muted-foreground)] mb-4">Click &quot;+ New Strategy&quot; to get started.</p>
                            )}
                        </div>
                    ) : (
                        filteredStrategies.map(strategy => (
                            <Card key={strategy.id} className="flex flex-col">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <CardTitle className="text-lg leading-tight truncate">{strategy.name}</CardTitle>
                                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider border shrink-0", statusBadge(strategy.status))}>
                                            {strategy.status}
                                        </span>
                                    </div>
                                    {strategy.description && (
                                        <CardDescription className="line-clamp-2 mt-2 leading-relaxed h-[40px]">
                                            {strategy.description}
                                        </CardDescription>
                                    )}
                                </CardHeader>
                                <CardContent className="pb-4 flex-1">
                                    <div className="grid grid-cols-2 gap-y-4 gap-x-2 bg-[var(--secondary)] rounded-md p-3">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">Trades</span>
                                            <span className="text-sm font-semibold">{strategy.tradeCount}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">Total P&L</span>
                                            <span className={cn("text-sm font-mono font-semibold", pnlClass(strategy.totalPnl))}>{formatPnl(strategy.totalPnl)}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">Win Rate</span>
                                            <span className="text-sm font-semibold">{strategy.winRate !== null ? `${strategy.winRate.toFixed(1)}%` : '—'}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">Profit Factor</span>
                                            <span className="text-sm font-semibold">{strategy.profitFactor !== null ? strategy.profitFactor.toFixed(2) : '—'}</span>
                                        </div>
                                    </div>
                                </CardContent>
                                <div className="px-6 pb-4 pt-0">
                                    <div className="h-px bg-[var(--border)] w-full mb-4" />
                                    <div className="flex items-center justify-between">
                                        <Button variant="ghost" size="sm" onClick={() => setViewingId(strategy.id)} className="h-8 px-3 text-xs">
                                            View Rules
                                        </Button>
                                        <div className="flex items-center space-x-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--muted-foreground)] hover:text-[var(--foreground)]" onClick={() => handleEdit(strategy)}>
                                                <PenLine size={14} />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--muted-foreground)] hover:text-[var(--color-red)]" onClick={() => setDeletingId(strategy.id)}>
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            </div>

            {/* Dialog: Create / Edit */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[550px] bg-[var(--background)] border-[var(--border)]">
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Edit Strategy' : 'New Strategy'}</DialogTitle>
                        <DialogDescription>
                            {editingId ? 'Update your playbook strategy details.' : 'Add a new trading playbook strategy.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Strategy Name</Label>
                            <Input id="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Bull Flag Breakout" />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="status">Status</Label>
                            <Select value={formData.status} onValueChange={(val: any) => setFormData({ ...formData, status: val })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="testing">Testing</SelectItem>
                                    <SelectItem value="retired">Retired</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <div className="flex justify-between">
                                <Label htmlFor="description">Description <span className="text-[var(--muted-foreground)] font-normal">(optional)</span></Label>
                                <span className="text-xs text-[var(--muted-foreground)]">{formData.description.length}/200</span>
                            </div>
                            <Textarea
                                id="description"
                                maxLength={200}
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Brief summary..."
                                className="resize-none h-16"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="entry_rules">Entry Rules</Label>
                            <Textarea
                                id="entry_rules"
                                value={formData.entry_rules}
                                onChange={e => setFormData({ ...formData, entry_rules: e.target.value })}
                                placeholder="Describe your entry criteria, setups, and conditions..."
                                className="min-h-[100px]"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="invalidation_conditions">Invalidation Conditions</Label>
                            <Textarea
                                id="invalidation_conditions"
                                value={formData.invalidation_conditions}
                                onChange={e => setFormData({ ...formData, invalidation_conditions: e.target.value })}
                                placeholder="Describe what would invalidate this trade setup..."
                                className="min-h-[100px]"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saveMutation.isPending}>Cancel</Button>
                        <Button onClick={() => saveMutation.mutate(formData)} disabled={!formData.name.trim() || saveMutation.isPending}>
                            {saveMutation.isPending ? 'Saving...' : editingId ? 'Save Changes' : 'Create Strategy'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm */}
            <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
                <AlertDialogContent className="bg-[var(--background)] border-[var(--border)]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete strategy?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will unlink this strategy from all associated trades, but the rules & stats will be permanently deleted. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); deleteMutation.mutate(deletingId!) }}
                            className="bg-[var(--color-red)] text-white hover:bg-[var(--color-red)]/90"
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* View Rules Sheet */}
            <Sheet open={!!viewingId} onOpenChange={(open) => !open && setViewingId(null)}>
                <SheetContent className="bg-[var(--background)] border-l border-[var(--border)] sm:max-w-md w-full overflow-y-auto">
                    {viewingStrategy && (
                        <>
                            <SheetHeader className="pb-6 mb-6 border-b border-[var(--border)] text-left">
                                <div className="flex items-center gap-3 mb-2">
                                    <SheetTitle className="text-xl">{viewingStrategy.name}</SheetTitle>
                                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider border shrink-0", statusBadge(viewingStrategy.status))}>
                                        {viewingStrategy.status}
                                    </span>
                                </div>
                                {viewingStrategy.description && (
                                    <SheetDescription className="text-base text-[var(--muted-foreground)]">
                                        {viewingStrategy.description}
                                    </SheetDescription>
                                )}
                            </SheetHeader>

                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-3 flex items-center gap-2">
                                        <Check size={14} /> Entry Rules
                                    </h3>
                                    {viewingStrategy.entry_rules ? (
                                        <div className="text-sm bg-[var(--secondary)] p-4 rounded-md border border-[var(--border)] whitespace-pre-wrap leading-relaxed">
                                            {viewingStrategy.entry_rules}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-[var(--muted-foreground)] italic">No rules defined yet.</p>
                                    )}
                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-3 flex items-center gap-2">
                                        <AlertCircle size={14} /> Invalidation Conditions
                                    </h3>
                                    {viewingStrategy.invalidation_conditions ? (
                                        <div className="text-sm bg-[var(--color-red-muted)]/20 p-4 rounded-md border border-[var(--color-red)]/20 whitespace-pre-wrap leading-relaxed text-[var(--foreground)]">
                                            {viewingStrategy.invalidation_conditions}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-[var(--muted-foreground)] italic">No conditions defined yet.</p>
                                    )}
                                </div>
                            </div>

                            <div className="mt-12 pt-6 border-t border-[var(--border)]">
                                <Button
                                    className="w-full"
                                    variant="outline"
                                    onClick={() => {
                                        setViewingId(null);
                                        handleEdit(viewingStrategy);
                                    }}
                                >
                                    <PenLine size={16} className="mr-2" /> Edit Strategy
                                </Button>
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    )
}
