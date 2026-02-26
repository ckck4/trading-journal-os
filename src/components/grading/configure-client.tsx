'use client'

import React, { useState, useEffect, Suspense, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Save, Plus, Trash2, ArrowUp, ArrowDown, Settings2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { Confluence } from '@/types/grading'

export function ConfigureClient() {
    return (
        <Suspense fallback={<div className="p-8 text-[var(--muted-foreground)]">Loading configuration...</div>}>
            <ConfigureContent />
        </Suspense>
    )
}

function ConfigureContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const initialStrategyId = searchParams.get('strategy') || ''

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-32">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push('/grading')}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Configure Grading</h1>
                    <p className="text-[var(--muted-foreground)]">Manage category weights, score definitions, and strategy rules.</p>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-12 items-start">
                <div className="lg:col-span-4 space-y-8">
                    <CategoryWeightsSection />
                    <ScoringRubricSection />
                </div>
                <div className="lg:col-span-8">
                    <GradingRulesSection initialStrategyId={initialStrategyId} />
                </div>
            </div>
        </div>
    )
}

// ============================================================================
// Section A: Global Category Weights
// ============================================================================
type WeightItem = { id: string, name: string, weight: number }

function CategoryWeightsSection() {
    const queryClient = useQueryClient()
    const { data: settingsData, isLoading } = useQuery({
        queryKey: ['finance-settings'],
        queryFn: async () => {
            const res = await fetch('/api/finance/settings')
            if (!res.ok) throw new Error('Failed to fetch settings')
            return res.json()
        }
    })

    const [localWeights, setLocalWeights] = useState<WeightItem[]>([])

    useEffect(() => {
        if (settingsData?.data?.grading_weights) {
            const parsed = Object.entries(settingsData.data.grading_weights).map(([k, v]) => ({
                id: crypto.randomUUID(),
                name: k,
                weight: Number(v) || 0
            }))
            setLocalWeights(parsed.length > 0 ? parsed : [
                { id: crypto.randomUUID(), name: 'Risk Management', weight: 25 },
                { id: crypto.randomUUID(), name: 'Execution', weight: 20 },
                { id: crypto.randomUUID(), name: 'Discipline', weight: 25 },
                { id: crypto.randomUUID(), name: 'Strategy', weight: 15 },
                { id: crypto.randomUUID(), name: 'Efficiency', weight: 15 }
            ])
        } else if (settingsData) {
            setLocalWeights([
                { id: crypto.randomUUID(), name: 'Risk Management', weight: 25 },
                { id: crypto.randomUUID(), name: 'Execution', weight: 20 },
                { id: crypto.randomUUID(), name: 'Discipline', weight: 25 },
                { id: crypto.randomUUID(), name: 'Strategy', weight: 15 },
                { id: crypto.randomUUID(), name: 'Efficiency', weight: 15 }
            ])
        }
    }, [settingsData])

    const total = localWeights.reduce((sum, item) => sum + item.weight, 0)
    const isValid = total === 100

    const updateSettings = useMutation({
        mutationFn: async (weightsArray: WeightItem[]) => {
            const payloadObj = weightsArray.reduce((acc, curr) => {
                const key = curr.name.trim() || 'Unnamed Category'
                acc[key] = curr.weight
                return acc
            }, {} as Record<string, number>)

            const res = await fetch('/api/finance/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ grading_weights: payloadObj })
            })
            if (!res.ok) throw new Error('Failed to update weights')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance-settings'] })
        }
    })

    const addCategory = () => {
        setLocalWeights([...localWeights, { id: crypto.randomUUID(), name: 'New Category', weight: 0 }])
    }

    const removeCategory = (id: string) => {
        setLocalWeights(localWeights.filter(w => w.id !== id))
    }

    const updateCategory = (id: string, field: 'name' | 'weight', value: string | number) => {
        setLocalWeights(localWeights.map(w => w.id === id ? { ...w, [field]: value } : w))
    }

    if (isLoading) return <Card><CardContent className="p-6">Loading weights...</CardContent></Card>

    return (
        <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-start justify-between pb-4">
                <div>
                    <CardTitle className="text-lg">Global Category Weights</CardTitle>
                    <CardDescription>Define how scores are weighted globally.</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
                <div className="space-y-3">
                    {localWeights.map((w) => (
                        <div key={w.id} className="flex items-center gap-2">
                            <Input
                                value={w.name}
                                onChange={(e) => updateCategory(w.id, 'name', e.target.value)}
                                className="flex-1"
                                placeholder="Category Name"
                            />
                            <div className="relative w-24 flex-shrink-0">
                                <Input
                                    type="number"
                                    value={w.weight === 0 ? '' : w.weight}
                                    onChange={(e) => updateCategory(w.id, 'weight', e.target.value === '' ? 0 : Number(e.target.value))}
                                    className="pr-6 text-right font-mono"
                                    min="0" max="100"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted-foreground)]">%</span>
                            </div>
                            <Button variant="ghost" size="icon" className="shrink-0 text-[var(--muted-foreground)] hover:text-[var(--color-red)]" onClick={() => removeCategory(w.id)}>
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                </div>
                <Button variant="outline" size="sm" onClick={addCategory} className="w-full mt-2 border-dashed">
                    <Plus className="w-4 h-4 mr-2" /> Add Category
                </Button>
            </CardContent>
            <CardFooter className="pt-4 border-t flex items-center justify-between bg-[var(--secondary)]/30">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--muted-foreground)]">Total Weight:</span>
                    <span className={cn("text-base font-mono font-bold", isValid ? "text-[var(--color-green)]" : "text-[var(--color-red)]")}>
                        {total}%
                    </span>
                </div>
                <Button
                    disabled={!isValid || updateSettings.isPending}
                    onClick={() => updateSettings.mutate(localWeights)}
                    size="sm"
                >
                    <Save className="w-4 h-4 mr-2" />
                    {updateSettings.isPending ? 'Saving...' : 'Save Weights'}
                </Button>
            </CardFooter>
        </Card>
    )
}

// ============================================================================
// Section C: Scoring Rubric
// ============================================================================
const DEFAULT_RUBRIC = [
    { grade: 'A+', label: 'Excellent', color: '#22C55E' },
    { grade: 'A', label: 'Great', color: '#22C55E' },
    { grade: 'B+', label: 'Good', color: '#3B82F6' },
    { grade: 'B', label: 'Average', color: '#E8EAF0' },
    { grade: 'B-', label: 'Poor', color: '#F59E0B' },
    { grade: 'C', label: 'Critical', color: '#EF4444' }
]

function ScoringRubricSection() {
    const queryClient = useQueryClient()
    const { data: settingsData, isLoading } = useQuery({
        queryKey: ['finance-settings'],
        queryFn: async () => {
            const res = await fetch('/api/finance/settings')
            if (!res.ok) throw new Error('Failed to fetch settings')
            return res.json()
        }
    })

    const [labels, setLabels] = useState<Record<string, string>>({})

    useEffect(() => {
        if (settingsData?.data?.grading_rubric) {
            setLabels(settingsData.data.grading_rubric)
        } else {
            // init from defaults
            const init: Record<string, string> = {}
            DEFAULT_RUBRIC.forEach(r => { init[r.grade] = r.label })
            setLabels(init)
        }
    }, [settingsData])

    const updateSettings = useMutation({
        mutationFn: async (newRubric: any) => {
            const res = await fetch('/api/finance/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ grading_rubric: newRubric })
            })
            if (!res.ok) throw new Error('Failed to update rubric')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance-settings'] })
        }
    })

    if (isLoading) return <Card><CardContent className="p-6">Loading rubric...</CardContent></Card>

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between pb-4">
                <div>
                    <CardTitle className="text-lg">Scoring Rubric</CardTitle>
                    <CardDescription>Customize the labels for each grade bracket.</CardDescription>
                </div>
                <Button
                    disabled={updateSettings.isPending}
                    onClick={() => updateSettings.mutate(labels)}
                    size="sm"
                >
                    <Save className="w-4 h-4 mr-2" />
                    Save Labels
                </Button>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {DEFAULT_RUBRIC.map((item) => (
                        <div key={item.grade} className="flex items-center gap-3">
                            <div
                                className="w-10 h-8 rounded shrink-0 flex items-center justify-center font-bold font-mono text-sm border shadow-sm"
                                style={{ backgroundColor: `${item.color}15`, color: item.color, borderColor: `${item.color}30` }}
                            >
                                {item.grade}
                            </div>
                            <Input
                                value={labels[item.grade] || ''}
                                onChange={(e) => setLabels({ ...labels, [item.grade]: e.target.value })}
                                placeholder={item.label}
                                className="h-8 text-sm"
                            />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card >
    )
}

// ============================================================================
// Section B: Strategy Grading Rules
// ============================================================================
type GradingRule = {
    id: string
    grade: string
    type: 'specific' | 'threshold' | 'exact'
    required_confluence_ids?: string[]
    min_count?: number
    exact_count?: number
}

function GradingRulesSection({ initialStrategyId }: { initialStrategyId: string }) {
    const queryClient = useQueryClient()
    const [strategyId, setStrategyId] = useState<string>(initialStrategyId)
    const [localRules, setLocalRules] = useState<GradingRule[]>([])
    const [localOverrides, setLocalOverrides] = useState<WeightItem[]>([])
    const [enableOverrides, setEnableOverrides] = useState(false)
    const [isAddRuleOpen, setIsAddRuleOpen] = useState(false)

    // Form stuff for adding confluences
    const [newConfName, setNewConfName] = useState('')
    const [newConfWeight, setNewConfWeight] = useState('1.0')
    const [newConfCat, setNewConfCat] = useState('Execution')

    const { data: strategiesData } = useQuery({
        queryKey: ['strategies'],
        queryFn: async () => {
            const res = await fetch('/api/strategies')
            if (!res.ok) throw new Error('Failed to fetch strategies')
            return res.json()
        }
    })

    const { data: confluencesData } = useQuery({
        queryKey: ['confluences', strategyId],
        queryFn: async () => {
            if (!strategyId) return { data: [] }
            const res = await fetch(`/api/confluences?strategy_id=${strategyId}`)
            if (!res.ok) throw new Error('Failed to fetch confluences')
            return res.json()
        },
        enabled: !!strategyId
    })

    const strategies = strategiesData?.data || []
    const confluences: Confluence[] = confluencesData?.data || []
    const selectedStrategy = strategies.find((s: any) => s.id === strategyId)

    useEffect(() => {
        if (selectedStrategy) {
            // Rules
            const parsedRules = (selectedStrategy.grading_rules || []).map((r: any) => ({
                id: crypto.randomUUID(),
                ...r
            }))
            setLocalRules(parsedRules)

            // Overrides
            if (selectedStrategy.category_overrides) {
                setEnableOverrides(true)
                const parsed = Object.entries(selectedStrategy.category_overrides).map(([k, v]) => ({
                    id: crypto.randomUUID(),
                    name: k,
                    weight: Number(v) || 0
                }))
                setLocalOverrides(parsed)
            } else {
                setEnableOverrides(false)
                setLocalOverrides([])
            }
        } else {
            setLocalRules([])
            setEnableOverrides(false)
            setLocalOverrides([])
        }
    }, [selectedStrategy])

    const updateStrategy = useMutation({
        mutationFn: async () => {
            // clean rules payload
            const rulesPayload = localRules.map(({ id, ...rest }) => rest)

            // clean overrides payload
            let overridesPayload = null
            if (enableOverrides) {
                overridesPayload = localOverrides.reduce((acc, curr) => {
                    const key = curr.name.trim() || 'Unnamed'
                    acc[key] = curr.weight
                    return acc
                }, {} as Record<string, number>)
            }

            const res = await fetch(`/api/strategies/${strategyId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    grading_rules: rulesPayload,
                    category_overrides: overridesPayload
                })
            })
            if (!res.ok) throw new Error('Failed to save strategy rules')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['strategies'] })
        }
    })

    const createConfluence = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/confluences', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    strategy_id: strategyId,
                    name: newConfName,
                    weight: Number(newConfWeight),
                    category: newConfCat
                })
            })
            if (!res.ok) throw new Error('Failed to create confluence')
            return res.json()
        },
        onSuccess: () => {
            setNewConfName('')
            setNewConfWeight('1.0')
            queryClient.invalidateQueries({ queryKey: ['confluences', strategyId] })
        }
    })

    const moveRule = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return
        if (direction === 'down' && index === localRules.length - 1) return
        const newRules = [...localRules]
        const target = direction === 'up' ? index - 1 : index + 1
        const temp = newRules[index]
        newRules[index] = newRules[target]
        newRules[target] = temp
        setLocalRules(newRules)
    }

    const deleteRule = (id: string) => {
        setLocalRules(localRules.filter(r => r.id !== id))
    }

    const { addCategoryOverride, removeCategoryOverride, updateCategoryOverride, overridesTotal, overridesValid } = useMemo(() => {
        return {
            addCategoryOverride: () => setLocalOverrides([...localOverrides, { id: crypto.randomUUID(), name: 'New Category', weight: 0 }]),
            removeCategoryOverride: (id: string) => setLocalOverrides(localOverrides.filter(w => w.id !== id)),
            updateCategoryOverride: (id: string, field: 'name' | 'weight', value: string | number) => setLocalOverrides(localOverrides.map(w => w.id === id ? { ...w, [field]: value } : w)),
            overridesTotal: localOverrides.reduce((s, w) => s + w.weight, 0),
            overridesValid: localOverrides.reduce((s, w) => s + w.weight, 0) === 100
        }
    }, [localOverrides])

    const canSave = !enableOverrides || overridesValid

    return (
        <Card className="flex flex-col h-full bg-[var(--background)]">
            <CardHeader className="pb-4 border-b">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div>
                        <CardTitle className="text-xl">Strategy Grading Rules</CardTitle>
                        <CardDescription>Setup confluences and auto-grading mapping.</CardDescription>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Select value={strategyId} onValueChange={setStrategyId}>
                            <SelectTrigger className="w-full sm:w-[250px]">
                                <SelectValue placeholder="Select Strategy..." />
                            </SelectTrigger>
                            <SelectContent>
                                {strategies.map((s: any) => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            disabled={!strategyId || updateStrategy.isPending || !canSave}
                            onClick={() => updateStrategy.mutate()}
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {updateStrategy.isPending ? 'Saving...' : 'Save Strategy'}
                        </Button>
                    </div>
                </div>
            </CardHeader>

            {!strategyId ? (
                <div className="p-16 text-center text-[var(--muted-foreground)] flex flex-col items-center">
                    <Settings2 className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-lg font-medium text-[var(--foreground)]">No Strategy Selected</p>
                    <p>Select a strategy above to configure its rules.</p>
                </div>
            ) : (
                <CardContent className="p-0 flex-1">
                    <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x border-b">

                        {/* LEFT COLUMN: Confluences */}
                        <div className="p-6 space-y-6 bg-[var(--background)]">
                            <div>
                                <h3 className="font-semibold text-base mb-1">Checklist Confluences</h3>
                                <p className="text-sm text-[var(--muted-foreground)]">Items required to take trades for this strategy.</p>
                            </div>

                            <div className="space-y-2">
                                {confluences.length === 0 ? (
                                    <div className="p-4 border border-dashed rounded-lg text-center text-sm text-[var(--muted-foreground)]">
                                        No confluences configured yet.
                                    </div>
                                ) : (
                                    confluences.map(c => (
                                        <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg bg-[var(--card)] shadow-sm">
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">{c.name}</p>
                                                <p className="text-xs text-[var(--muted-foreground)]">{c.category} • Wt: {c.weight}</p>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--muted-foreground)] opacity-50"><Trash2 className="w-4 h-4" /></Button>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="p-4 border rounded-lg bg-[var(--secondary)]/30 space-y-4">
                                <h4 className="text-sm font-semibold">Add Confluence</h4>
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Name</Label>
                                        <Input value={newConfName} onChange={e => setNewConfName(e.target.value)} placeholder="e.g. 5m FVG Sweep" className="h-8 text-sm" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs">Category</Label>
                                            <Select value={newConfCat} onValueChange={setNewConfCat}>
                                                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {['Risk Management', 'Execution', 'Discipline', 'Strategy', 'Efficiency', 'Custom'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Weight</Label>
                                            <Input type="number" step="0.5" value={newConfWeight} onChange={e => setNewConfWeight(e.target.value)} className="h-8 text-sm font-mono" />
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        className="w-full"
                                        disabled={!newConfName || createConfluence.isPending}
                                        onClick={() => createConfluence.mutate()}
                                    >
                                        <Plus className="w-4 h-4 mr-2" /> Add Confluence
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Grade Rules */}
                        <div className="p-6 space-y-6 bg-[var(--secondary)]/10">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold text-base mb-1">Auto-Grading Rules</h3>
                                    <p className="text-sm text-[var(--muted-foreground)]">Evaluated top to bottom.</p>
                                </div>
                                <Button size="sm" variant="secondary" onClick={() => setIsAddRuleOpen(true)}>
                                    <Plus className="w-4 h-4 mr-2" /> New Rule
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {localRules.length === 0 ? (
                                    <div className="p-6 border border-dashed border-[var(--border)] rounded-lg text-center text-sm text-[var(--muted-foreground)]">
                                        No grading rules defined.
                                    </div>
                                ) : (
                                    localRules.map((rule, idx) => (
                                        <div key={rule.id} className="group relative flex items-center justify-between p-4 border rounded-lg bg-[var(--card)] shadow-sm">
                                            <div className="flex flex-col gap-1 pr-12">
                                                <div className="flex items-center gap-2">
                                                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold font-mono border" style={{ color: DEFAULT_RUBRIC.find(r => r.grade === rule.grade)?.color || 'inherit', borderColor: 'currentcolor' }}>
                                                        Grade: {rule.grade}
                                                    </span>
                                                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--secondary)] text-[var(--muted-foreground)]">
                                                        {rule.type.toUpperCase()}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-[var(--muted-foreground)] mt-1">
                                                    {rule.type === 'threshold'
                                                        ? `Requires at least ${rule.min_count} of ${confluences.length} confluences.`
                                                        : rule.type === 'exact'
                                                            ? `Requires exactly ${rule.exact_count} of ${confluences.length} confluences.`
                                                            : `Requires ${rule.required_confluence_ids?.length || 0} specific confluences.`
                                                    }
                                                </p>
                                            </div>

                                            {/* Actions visible on hover */}
                                            <div className="absolute top-1/2 -translate-y-1/2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-6 w-6" disabled={idx === 0} onClick={() => moveRule(idx, 'up')}><ArrowUp className="w-3 h-3" /></Button>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-[var(--color-red)] hover:text-[var(--color-red)] hover:bg-[var(--color-red)]/10" onClick={() => deleteRule(rule.id)}><Trash2 className="w-3 h-3" /></Button>
                                                <Button variant="ghost" size="icon" className="h-6 w-6" disabled={idx === localRules.length - 1} onClick={() => moveRule(idx, 'down')}><ArrowDown className="w-3 h-3" /></Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                    </div>

                    {/* OVERRIDES SECTION */}
                    <div className="p-6 bg-[var(--background)]">
                        <div className="flex items-center justify-between border border-[var(--border)] rounded-lg p-4 bg-[var(--secondary)]/20">
                            <div>
                                <h4 className="font-semibold text-sm">Strategy Category Overrides</h4>
                                <p className="text-xs text-[var(--muted-foreground)]">Use custom category weights for trades in this strategy instead of global ones.</p>
                            </div>
                            <Switch checked={enableOverrides} onCheckedChange={(v) => {
                                setEnableOverrides(v)
                                if (v && localOverrides.length === 0) {
                                    // init with default fields
                                    setLocalOverrides([
                                        { id: crypto.randomUUID(), name: 'Strategy', weight: 80 },
                                        { id: crypto.randomUUID(), name: 'Execution', weight: 20 },
                                    ])
                                }
                            }} />
                        </div>

                        {enableOverrides && (
                            <div className="mt-4 p-4 border rounded-lg bg-[var(--card)]">
                                <div className="space-y-3 max-w-sm">
                                    {localOverrides.map((w) => (
                                        <div key={w.id} className="flex items-center gap-2">
                                            <Input value={w.name} onChange={(e) => updateCategoryOverride(w.id, 'name', e.target.value)} className="h-8 text-sm flex-1" placeholder="Category" />
                                            <div className="relative w-20 flex-shrink-0">
                                                <Input type="number" value={w.weight === 0 ? '' : w.weight} onChange={(e) => updateCategoryOverride(w.id, 'weight', e.target.value === '' ? 0 : Number(e.target.value))} className="h-8 text-sm text-right pr-6 font-mono" />
                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted-foreground)]">%</span>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--muted-foreground)] hover:text-[var(--color-red)]" onClick={() => removeCategoryOverride(w.id)}>
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button variant="outline" size="sm" onClick={addCategoryOverride} className="w-full h-8 text-xs border-dashed mt-2"><Plus className="w-3 h-3 mr-2" /> Add Override</Button>
                                </div>
                                <div className="max-w-sm flex justify-between items-center mt-4 pt-4 border-t">
                                    <span className="text-sm font-semibold">Override Total</span>
                                    <span className={cn("text-sm font-mono font-bold", overridesValid ? "text-[var(--color-green)]" : "text-[var(--color-red)]")}>{overridesTotal}%</span>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            )}

            {/* Dialog: Add Rule (Moved outside to prevent nesting issues) */}
            {isAddRuleOpen && (
                <AddRuleDialog
                    open={isAddRuleOpen}
                    onOpenChange={setIsAddRuleOpen}
                    confluences={confluences}
                    onAdd={(r) => {
                        setLocalRules([...localRules, { id: crypto.randomUUID(), ...r }])
                        setIsAddRuleOpen(false)
                    }}
                />
            )}
        </Card>
    )
}

function AddRuleDialog({ open, onOpenChange, confluences, onAdd }: {
    open: boolean,
    onOpenChange: (v: boolean) => void,
    confluences: Confluence[],
    onAdd: (rule: Omit<GradingRule, 'id'>) => void
}) {
    const [grade, setGrade] = useState('A')
    const [ruleType, setRuleType] = useState<'specific' | 'threshold' | 'exact'>('threshold')
    const [minCount, setMinCount] = useState(1)
    const [exactCount, setExactCount] = useState(1)
    const [reqIds, setReqIds] = useState<string[]>([])

    const toggleReq = (id: string) => {
        if (reqIds.includes(id)) {
            setReqIds(reqIds.filter(i => i !== id))
        } else {
            setReqIds([...reqIds, id])
        }
    }

    const handleSave = () => {
        onAdd({
            grade,
            type: ruleType,
            min_count: ruleType === 'threshold' ? minCount : undefined,
            exact_count: ruleType === 'exact' ? exactCount : undefined,
            required_confluence_ids: ruleType === 'specific' ? reqIds : undefined
        })
    }

    const isRuleValid = ruleType === 'threshold'
        ? (minCount > 0 && minCount <= confluences.length)
        : ruleType === 'exact'
            ? (exactCount > 0 && exactCount <= confluences.length)
            : (reqIds.length > 0)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle>Add Grading Rule</DialogTitle>
                    <DialogDescription>Create an auto-grade mapping for this strategy.</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label>Resulting Grade</Label>
                        <Select value={grade} onValueChange={setGrade}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {DEFAULT_RUBRIC.map(g => (
                                    <SelectItem key={g.grade} value={g.grade}>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono w-6" style={{ color: g.color }}>{g.grade}</span>
                                            <span className="text-[var(--muted-foreground)]">({g.label})</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-3">
                        <Label>Rule Type</Label>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <input type="radio" value="threshold" checked={ruleType === 'threshold'} onChange={() => setRuleType('threshold')} id="opt-threshold" className="peer sr-only" />
                                <label htmlFor="opt-threshold" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-[var(--secondary)] peer-checked:border-[var(--primary)] cursor-pointer">
                                    <span className="text-sm font-semibold">Min Count</span>
                                    <span className="text-xs text-[var(--muted-foreground)] mt-1">At least X confs</span>
                                </label>
                            </div>
                            <div>
                                <input type="radio" value="specific" checked={ruleType === 'specific'} onChange={() => setRuleType('specific')} id="opt-specific" className="peer sr-only" />
                                <label htmlFor="opt-specific" className="flex flex-col items-center justify-between text-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-[var(--secondary)] peer-checked:border-[var(--primary)] cursor-pointer">
                                    <span className="text-sm font-semibold">Specific</span>
                                    <span className="text-xs text-[var(--muted-foreground)] mt-1">Exact combinations</span>
                                </label>
                            </div>
                            <div>
                                <input type="radio" value="exact" checked={ruleType === 'exact'} onChange={() => setRuleType('exact')} id="opt-exact" className="peer sr-only" />
                                <label htmlFor="opt-exact" className="flex flex-col items-center justify-between text-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-[var(--secondary)] peer-checked:border-[var(--primary)] cursor-pointer">
                                    <span className="text-sm font-semibold">Exact Count</span>
                                    <span className="text-xs text-[var(--muted-foreground)] mt-1">Exactly X confs</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 rounded-lg bg-[var(--secondary)]/30 border border-[var(--border)]">
                        {ruleType === 'threshold' ? (
                            <div className="space-y-3">
                                <Label>Select Minimum Count</Label>
                                <Select value={String(minCount)} onValueChange={(v) => setMinCount(Number(v))}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.from({ length: Math.max(1, confluences.length) }).map((_, i) => (
                                            <SelectItem key={i + 1} value={String(i + 1)}>
                                                At least {i + 1} of {confluences.length} confluences
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : ruleType === 'exact' ? (
                            <div className="space-y-3">
                                <Label>Select Exact Count</Label>
                                <Select value={String(exactCount)} onValueChange={(v) => setExactCount(Number(v))}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.from({ length: Math.max(1, confluences.length) }).map((_, i) => (
                                            <SelectItem key={i + 1} value={String(i + 1)}>
                                                Exactly {i + 1} of {confluences.length} confluences
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <Label>Required Confluences</Label>
                                <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
                                    {confluences.length === 0 ? <p className="text-sm text-[var(--muted-foreground)]">No confluences available.</p> : null}
                                    {confluences.map(c => (
                                        <div key={c.id} className="flex items-center space-x-2">
                                            <Checkbox id={`req-${c.id}`} checked={reqIds.includes(c.id)} onCheckedChange={() => toggleReq(c.id)} />
                                            <label htmlFor={`req-${c.id}`} className="text-sm cursor-pointer">{c.name}</label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button disabled={!isRuleValid} onClick={handleSave}>Add Rule</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    )
}
