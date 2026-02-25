'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { Confluence } from '@/types/grading'

export function ConfigureClient() {
    const router = useRouter()

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
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

            <CategoryWeightsSection />
            <ScoringRubricSection />
            <GradingRulesSection />
        </div>
    )
}

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

    const weights = settingsData?.data?.grading_weights || {
        risk_management: 25,
        execution: 20,
        discipline: 25,
        strategy: 15,
        efficiency: 15
    }

    const [localWeights, setLocalWeights] = useState(weights)

    useEffect(() => {
        if (settingsData?.data?.grading_weights) {
            setLocalWeights(settingsData.data.grading_weights)
        }
    }, [settingsData?.data?.grading_weights])

    const total: number = Object.values(localWeights).reduce((a: number, b: any) => a + (Number(b) || 0), 0)
    const isValid = total === 100

    const updateSettings = useMutation({
        mutationFn: async (newWeights: any) => {
            const res = await fetch('/api/finance/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ grading_weights: newWeights })
            })
            if (!res.ok) throw new Error('Failed to update weights')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance-settings'] })
            // Ensure grading dashboard gets the update too
            localStorage.setItem('grading-weights', JSON.stringify(localWeights))
        }
    })

    const handleChange = (key: string, val: string) => {
        setLocalWeights((prev: any) => ({ ...prev, [key]: val === '' ? 0 : Number(val) }))
    }

    if (isLoading) return <Card><CardContent className="p-6">Loading...</CardContent></Card>

    return (
        <Card>
            <CardHeader className="flex flex-row items-start sm:items-center justify-between">
                <div>
                    <CardTitle>Category Weights</CardTitle>
                    <CardDescription>Weights must add up to exactly 100%.</CardDescription>
                </div>
                <Button
                    disabled={!isValid || updateSettings.isPending}
                    onClick={() => updateSettings.mutate(localWeights)}
                    size="sm"
                >
                    <Save className="w-4 h-4 mr-2" />
                    {updateSettings.isPending ? 'Saving...' : 'Save Weights'}
                </Button>
            </CardHeader>
            <CardContent>
                <div className="space-y-4 max-w-sm">
                    {[
                        { k: 'risk_management', label: 'Risk Management' },
                        { k: 'execution', label: 'Execution' },
                        { k: 'discipline', label: 'Discipline' },
                        { k: 'strategy', label: 'Strategy' },
                        { k: 'efficiency', label: 'Efficiency' }
                    ].map(({ k, label }) => (
                        <div key={k} className="flex items-center justify-between">
                            <Label>{label}</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    value={localWeights[k] || ''}
                                    onChange={(e) => handleChange(k, e.target.value)}
                                    className="w-20 text-right font-mono"
                                    min="0"
                                    max="100"
                                />
                                <span className="text-[var(--muted-foreground)]">%</span>
                            </div>
                        </div>
                    ))}
                    <div className="pt-4 mt-4 border-t flex justify-between items-center">
                        <span className="text-sm font-semibold">Total</span>
                        <span className={cn("text-sm font-mono font-bold", isValid ? "text-[#22C55E]" : "text-[#EF4444]")}>
                            {total}%
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function ScoringRubricSection() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Scoring Rubric</CardTitle>
                <CardDescription>System-wide grading thresholds (fixed for now).</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="border rounded bg-[#22C55E]/10 border-[#22C55E]/30 p-3 text-center">
                        <div className="text-[#22C55E] font-mono font-bold text-lg">90-100</div>
                        <div className="text-xs text-[#22C55E] uppercase tracking-wider mt-1">Excellent</div>
                    </div>
                    <div className="border rounded bg-[#3B82F6]/10 border-[#3B82F6]/30 p-3 text-center">
                        <div className="text-[#3B82F6] font-mono font-bold text-lg">75-89</div>
                        <div className="text-xs text-[#3B82F6] uppercase tracking-wider mt-1">Good</div>
                    </div>
                    <div className="border rounded bg-[#F59E0B]/10 border-[#F59E0B]/30 p-3 text-center">
                        <div className="text-[#F59E0B] font-mono font-bold text-lg">60-74</div>
                        <div className="text-xs text-[#F59E0B] uppercase tracking-wider mt-1">Average</div>
                    </div>
                    <div className="border rounded bg-[#F97316]/10 border-[#F97316]/30 p-3 text-center">
                        <div className="text-[#F97316] font-mono font-bold text-lg">40-59</div>
                        <div className="text-xs text-[#F97316] uppercase tracking-wider mt-1">Poor</div>
                    </div>
                    <div className="border rounded bg-[#EF4444]/10 border-[#EF4444]/30 p-3 text-center">
                        <div className="text-[#EF4444] font-mono font-bold text-lg">0-39</div>
                        <div className="text-xs text-[#EF4444] uppercase tracking-wider mt-1">Critical</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

type GradingRule = {
    grade: 'A+' | 'A' | 'B+' | 'B' | 'B-' | 'C'
    type: 'specific' | 'threshold'
    required_confluence_ids?: string[]
    min_count?: number
}

function GradingRulesSection() {
    const queryClient = useQueryClient()
    const [selectedStrategyId, setSelectedStrategyId] = useState<string>('')

    const { data: strategiesData } = useQuery({
        queryKey: ['strategies'],
        queryFn: async () => {
            const res = await fetch('/api/strategies')
            if (!res.ok) throw new Error('Failed to fetch strategies')
            return res.json()
        }
    })

    const { data: confluencesData } = useQuery({
        queryKey: ['confluences'],
        queryFn: async () => {
            const res = await fetch('/api/confluences')
            if (!res.ok) throw new Error('Failed to fetch confluences')
            return res.json()
        }
    })

    const strategies = strategiesData?.data || []
    const confluences: Confluence[] = confluencesData?.data || []

    const selectedStrategy = strategies.find((s: any) => s.id === selectedStrategyId)
    const [localRules, setLocalRules] = useState<GradingRule[]>([])

    useEffect(() => {
        if (selectedStrategy) {
            setLocalRules(selectedStrategy.grading_rules || [])
        } else {
            setLocalRules([])
        }
    }, [selectedStrategy])

    const updateStrategy = useMutation({
        mutationFn: async (payload: { id: string, rules: GradingRule[] }) => {
            const res = await fetch(`/api/strategies/${payload.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ grading_rules: payload.rules })
            })
            if (!res.ok) throw new Error('Failed to update strategy')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['strategies'] })
            queryClient.invalidateQueries({ queryKey: ['strategy', selectedStrategyId] })
        }
    })

    const handleSaveRules = () => {
        if (!selectedStrategyId) return
        updateStrategy.mutate({ id: selectedStrategyId, rules: localRules })
    }

    const addRule = () => {
        setLocalRules([...localRules, { type: 'threshold', grade: 'A', min_count: 1 }])
    }

    const removeRule = (index: number) => {
        setLocalRules(localRules.filter((_, i) => i !== index))
    }

    const updateRule = (index: number, updates: Partial<GradingRule>) => {
        const next = [...localRules]
        next[index] = { ...next[index], ...updates }
        setLocalRules(next)
    }

    const GRADES = ['A+', 'A', 'B+', 'B', 'B-', 'C']

    return (
        <Card>
            <CardHeader className="flex flex-row items-start sm:items-center justify-between">
                <div>
                    <CardTitle>Strategy Auto-Grading Rules</CardTitle>
                    <CardDescription>Define how trades should be automatically graded based on confluences.</CardDescription>
                </div>
                {selectedStrategyId && (
                    <Button
                        disabled={updateStrategy.isPending}
                        onClick={handleSaveRules}
                        size="sm"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {updateStrategy.isPending ? 'Saving...' : 'Save Rules'}
                    </Button>
                )}
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <Label className="mb-2 block">Select Strategy</Label>
                    <Select value={selectedStrategyId} onValueChange={setSelectedStrategyId}>
                        <SelectTrigger className="w-full max-w-sm">
                            <SelectValue placeholder="Choose a strategy..." />
                        </SelectTrigger>
                        <SelectContent>
                            {strategies.map((s: any) => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {selectedStrategyId && (
                    <div className="space-y-4 pt-4 border-t">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold">Rules Structure</h3>
                            <Button variant="outline" size="sm" onClick={addRule}>
                                <Plus className="w-4 h-4 mr-2" /> Add Rule
                            </Button>
                        </div>

                        {localRules.length === 0 ? (
                            <p className="text-sm text-[var(--muted-foreground)]">No grading rules defined for this strategy. Add a rule to enable auto-grading.</p>
                        ) : (
                            <div className="space-y-3">
                                {localRules.map((rule, idx) => (
                                    <div key={idx} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center p-3 sm:p-4 rounded-lg border bg-[var(--sidebar)]/50">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono font-semibold text-[var(--muted-foreground)] w-5">{idx + 1}.</span>
                                            <Select value={rule.grade} onValueChange={(val: any) => updateRule(idx, { grade: val })}>
                                                <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <span className="text-sm text-[var(--muted-foreground)] px-2">IF</span>

                                        <Select value={rule.type} onValueChange={(val: any) => updateRule(idx, { type: val })}>
                                            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="threshold">Threshold</SelectItem>
                                                <SelectItem value="specific">Specific Items</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        <div className="flex-1 flex flex-wrap gap-2 w-full">
                                            {rule.type === 'threshold' ? (
                                                <div className="flex items-center gap-2 w-full">
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        className="w-20 font-mono"
                                                        value={rule.min_count || 1}
                                                        onChange={(e) => updateRule(idx, { min_count: parseInt(e.target.value) || 1 })}
                                                    />
                                                    <span className="text-sm">confluences are checked</span>
                                                </div>
                                            ) : (
                                                <div className="w-full flex flex-col gap-2">
                                                    <span className="text-sm">These specific items are checked:</span>
                                                    <div className="flex flex-col gap-1 w-full bg-[var(--background)] p-3 rounded border max-h-40 overflow-y-auto">
                                                        {confluences.map(c => {
                                                            const isChecked = rule.required_confluence_ids?.includes(c.id) || false;
                                                            return (
                                                                <div key={c.id} className="flex items-center space-x-2">
                                                                    <Checkbox
                                                                        id={`${idx}-${c.id}`}
                                                                        checked={isChecked}
                                                                        onCheckedChange={(checked) => {
                                                                            const current = rule.required_confluence_ids || [];
                                                                            const next = checked
                                                                                ? [...current, c.id]
                                                                                : current.filter(id => id !== c.id);
                                                                            updateRule(idx, { required_confluence_ids: next });
                                                                        }}
                                                                    />
                                                                    <label htmlFor={`${idx}-${c.id}`} className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                                        {c.name}
                                                                    </label>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <Button variant="ghost" size="icon" className="text-[var(--destructive)] shrink-0 self-end sm:self-center" onClick={() => removeRule(idx)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
