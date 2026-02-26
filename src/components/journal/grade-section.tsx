'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Check, Settings2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import type { TradeGrade, Confluence } from '@/types/grading'

type GradingRule = {
  grade: 'A+' | 'A' | 'B+' | 'B' | 'B-' | 'C'
  type: 'specific' | 'threshold' | 'exact'
  required_confluence_ids?: string[]
  min_count?: number
  exact_count?: number
}

interface GradeSectionProps {
  tradeId: string
  strategyId: string
}

const GRADES = ['A+', 'A', 'B+', 'B', 'B-', 'C'] as const
type GradeValue = typeof GRADES[number]

function getGradeColor(grade: string, isSelected: boolean): string {
  if (!isSelected) return 'bg-[var(--secondary)] text-[var(--muted-foreground)] border-transparent'
  switch (grade) {
    case 'A+': return 'bg-[#22C55E] text-white border-transparent shadow-[#22C55E]/20 shadow-lg' // green
    case 'A': return 'bg-[#22C55E]/90 text-white border-transparent' // lighter green
    case 'B+': return 'bg-[#3B82F6] text-white border-transparent' // blue
    case 'B': return 'bg-[#E8EAF0] text-black border-transparent' // neutral
    case 'B-': return 'bg-[#F59E0B] text-white border-transparent' // amber
    case 'C': return 'bg-[#EF4444] text-white border-transparent' // red
    default: return 'bg-[var(--primary)] text-white border-transparent'
  }
}

export function GradeSection({ tradeId, strategyId }: GradeSectionProps) {
  const queryClient = useQueryClient()

  // 1. Fetch Grade
  const { data: gradeData, isLoading: isLoadingGrade } = useQuery<{ data: TradeGrade & { confluence_ids: string[] } }>({
    queryKey: ['trade-grade', tradeId],
    queryFn: async () => {
      const res = await fetch(`/api/trades/${tradeId}/grade`)
      if (!res.ok) throw new Error('Failed to fetch trade grade')
      return res.json()
    },
    staleTime: 0, // Always fetch fresh to ensure sync with panel open
  })

  // 2. Fetch Confluences
  const { data: confluencesData, isLoading: isLoadingConfluences } = useQuery<{ data: Confluence[] }>({
    queryKey: ['confluences', strategyId],
    queryFn: async () => {
      if (!strategyId) return { data: [] }
      const res = await fetch(`/api/confluences?strategy_id=${strategyId}`)
      if (!res.ok) throw new Error('Failed to fetch confluences')
      return res.json()
    },
    enabled: !!strategyId,
    staleTime: 5 * 60 * 1000,
  })

  // 2.5 Fetch Finance Settings to get global weights & rubric
  const { data: settingsData } = useQuery({
    queryKey: ['finance-settings'],
    queryFn: async () => {
      const res = await fetch('/api/finance/settings')
      if (!res.ok) throw new Error('Failed to fetch settings')
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
  })

  const confluences = confluencesData?.data || []
  const existingGrade = gradeData?.data

  // 3. Fetch Strategy Rules & Overrides
  const { data: strategyData } = useQuery<{ data: { grading_rules: GradingRule[], category_overrides?: Record<string, number> | null } }>({
    queryKey: ['strategy', strategyId],
    queryFn: async () => {
      if (!strategyId) return { data: { grading_rules: [] } }
      const res = await fetch(`/api/strategies/${strategyId}`)
      if (!res.ok) throw new Error('Failed to fetch strategy')
      return res.json()
    },
    enabled: !!strategyId,
    staleTime: 5 * 60 * 1000,
  })

  const activeCategoriesObj = strategyData?.data?.category_overrides || settingsData?.data?.grading_weights || {}
  const activeCategoryEntries = Object.entries(activeCategoriesObj).slice(0, 5) // max 5 mapped to db columns
  const hasOverrides = !!strategyData?.data?.category_overrides

  const dynamicRubric = settingsData?.data?.grading_rubric || {}

  const [showHowItWorks, setShowHowItWorks] = useState(false)
  useEffect(() => {
    const seen = localStorage.getItem('seen-grading-how-it-works')
    if (!seen) {
      setShowHowItWorks(true)
    }
  }, [])
  const toggleHowItWorks = () => {
    setShowHowItWorks(prev => !prev)
    localStorage.setItem('seen-grading-how-it-works', 'true')
  }

  // Form State
  const [grade, setGrade] = useState<GradeValue | null>(null)
  const [autoGraded, setAutoGraded] = useState(false)
  const [scores, setScores] = useState({
    risk_management_score: '',
    execution_score: '',
    discipline_score: '',
    strategy_score: '',
    efficiency_score: ''
  })
  const [notes, setNotes] = useState('')
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // Pre-fill from existing grade
  useEffect(() => {
    if (existingGrade) {
      setGrade(existingGrade.grade as GradeValue)
      setScores({
        risk_management_score: existingGrade.riskManagementScore?.toString() || '',
        execution_score: existingGrade.executionScore?.toString() || '',
        discipline_score: existingGrade.disciplineScore?.toString() || '',
        strategy_score: existingGrade.strategyScore?.toString() || '',
        efficiency_score: existingGrade.efficiencyScore?.toString() || ''
      })
      setNotes(existingGrade.notes || '')
      if (existingGrade.confluence_ids) {
        setCheckedIds(new Set(existingGrade.confluence_ids))
      }
    } else {
      // Reset if no grade
      setGrade(null)
      setScores({
        risk_management_score: '',
        execution_score: '',
        discipline_score: '',
        strategy_score: '',
        efficiency_score: ''
      })
      setNotes('')
      setCheckedIds(new Set())
    }
  }, [existingGrade])

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!grade) throw new Error("Grade is required")
      const payload = {
        grade,
        risk_management_score: scores.risk_management_score ? parseFloat(scores.risk_management_score) : null,
        execution_score: scores.execution_score ? parseFloat(scores.execution_score) : null,
        discipline_score: scores.discipline_score ? parseFloat(scores.discipline_score) : null,
        strategy_score: scores.strategy_score ? parseFloat(scores.strategy_score) : null,
        efficiency_score: scores.efficiency_score ? parseFloat(scores.efficiency_score) : null,
        notes: notes || null,
        confluence_ids: Array.from(checkedIds)
      }
      const res = await fetch(`/api/trades/${tradeId}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to save grade')
      }
      return res.json()
    },
    onMutate: () => setSaveStatus('saving'),
    onSuccess: () => {
      setSaveStatus('saved')
      // Invalidate related lists
      queryClient.invalidateQueries({ queryKey: ['trades'] })
      queryClient.invalidateQueries({ queryKey: ['grading-summary'] })
      queryClient.invalidateQueries({ queryKey: ['trade-grade', tradeId] })
      setTimeout(() => setSaveStatus('idle'), 2000)
    },
    onError: () => {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  })

  const toggleConfluence = (id: string) => {
    const next = new Set(checkedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setCheckedIds(next)

    // Evaluate Auto-grading
    const rules = strategyData?.data?.grading_rules || []
    if (rules.length > 0) {
      let matchedGrade: GradeValue | null = null
      for (const rule of rules) {
        if (rule.type === 'specific' && rule.required_confluence_ids) {
          const hasAll = rule.required_confluence_ids.every((cid: string) => next.has(cid))
          if (hasAll) {
            matchedGrade = rule.grade as GradeValue
            break
          }
        } else if (rule.type === 'threshold' && rule.min_count !== undefined) {
          if (next.size >= rule.min_count) {
            matchedGrade = rule.grade as GradeValue
            break
          }
        } else if (rule.type === 'exact' && rule.exact_count !== undefined) {
          if (next.size === rule.exact_count) {
            matchedGrade = rule.grade as GradeValue
            break
          }
        }
      }
      if (matchedGrade) {
        setGrade(matchedGrade)
        setAutoGraded(true)
      } else {
        setAutoGraded(false)
      }
    }
  }

  const handleScoreChange = (field: keyof typeof scores, val: string) => {
    // Only allow numbers, max 100
    if (val !== '' && (isNaN(Number(val)) || Number(val) < 0 || Number(val) > 100)) return
    setScores(prev => ({ ...prev, [field]: val }))
  }

  if (isLoadingGrade) {
    return <div className="text-sm text-[var(--muted-foreground)]">Loading grade...</div>
  }

  return (
    <div className="space-y-6">

      {/* ── How It Works Collapsible ── */}
      <div className="bg-[var(--secondary)]/20 border border-[var(--border)] rounded-md overflow-hidden">
        <button
          onClick={toggleHowItWorks}
          className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)]/40 transition-colors"
        >
          <span>How Grading Works</span>
          <span className="text-lg leading-none">{showHowItWorks ? '−' : '+'}</span>
        </button>
        {showHowItWorks && (
          <div className="px-3 pb-3 pt-1 border-t border-[var(--border)] text-sm text-[var(--muted-foreground)] space-y-2 border-l-2 border-l-[var(--color-blue)]">
            <p>1. <strong>Confluences:</strong> Check off the rules met for this trade.</p>
            <p>2. <strong>Auto-Grade:</strong> The system assigns a letter grade based on matched confluences (configured in Strategy settings).</p>
            <p>3. <strong>Categories:</strong> Score individual execution categories out of 100.</p>
            <div className="pt-2">
              <a href={`/grading/configure${strategyId ? `?strategy=${strategyId}` : ''}`} className="text-[var(--color-blue)] hover:underline text-xs flex items-center gap-1">
                <Settings2 className="w-3 h-3" /> Configure Grading Rules
              </a>
            </div>
          </div>
        )}
      </div>

      {/* ── Confluences ── */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase text-[var(--muted-foreground)] tracking-wide">
          Confluences Present
        </h4>

        {!strategyId ? (
          <div className="text-sm px-3 py-2.5 bg-[var(--color-blue)]/10 text-[var(--color-blue)] rounded border border-[var(--color-blue)]/20">
            Tag this trade with a strategy to see confluences.
          </div>
        ) : isLoadingConfluences ? (
          <div className="text-sm text-[var(--muted-foreground)]">Loading confluences...</div>
        ) : confluences.length === 0 ? (
          <div className="text-sm px-3 py-2.5 bg-[var(--secondary)] text-[var(--muted-foreground)] rounded border border-[var(--border)]">
            No confluences defined for this strategy yet. Add them in the Strategies page.
          </div>
        ) : (
          <div className="space-y-1 bg-[var(--secondary)]/30 rounded-md border border-[var(--border)] overflow-hidden">
            {confluences.map(ci => (
              <label
                key={ci.id}
                onClick={() => toggleConfluence(ci.id)}
                className="flex items-center justify-between px-3 py-2 hover:bg-[var(--secondary)] cursor-pointer transition-colors border-b border-[var(--border)] last:border-0 group"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-4 h-4 rounded-sm border flex items-center justify-center transition-colors",
                    checkedIds.has(ci.id)
                      ? "bg-[var(--primary)] border-[var(--primary)] text-white"
                      : "border-[var(--muted-foreground)]/40 bg-transparent group-hover:border-[var(--muted-foreground)]"
                  )}>
                    {checkedIds.has(ci.id) && <Check size={12} strokeWidth={3} />}
                  </div>
                  <span className={cn(
                    "text-sm transition-colors",
                    checkedIds.has(ci.id) ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"
                  )}>
                    {ci.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase text-[var(--muted-foreground)] px-1.5 py-0.5 rounded bg-[var(--background)] border border-[var(--border)]">
                    {ci.category}
                  </span>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* ── Category Scores ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase text-[var(--muted-foreground)] tracking-wide flex items-center gap-2">
            Category Scores
            {hasOverrides && <span className="bg-[var(--color-blue)]/20 text-[var(--color-blue)] text-[10px] px-1.5 py-0.5 rounded normal-case">Strategy Overrides</span>}
          </h4>
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          {activeCategoryEntries.length === 0 ? (
            <div className="text-sm px-3 py-2.5 bg-[var(--secondary)] text-[var(--muted-foreground)] rounded border border-[var(--border)]">
              No categories configured.
            </div>
          ) : activeCategoryEntries.map(([label, weight], index) => {
            const dbScoreKeys = ['risk_management_score', 'execution_score', 'discipline_score', 'strategy_score', 'efficiency_score'] as const
            const key = dbScoreKeys[index]
            if (!key) return null
            return (
              <div key={label} className="flex items-center justify-between px-3 py-1.5 bg-[var(--secondary)]/50 rounded-md border border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--foreground)]">{label}</span>
                  <span className="text-[10px] text-[var(--muted-foreground)]">{String(weight)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={scores[key]}
                    onChange={(e) => handleScoreChange(key, e.target.value)}
                    placeholder="—"
                    className={cn(
                      "w-12 h-7 bg-[var(--background)] border border-[var(--border)] rounded text-right px-2 font-mono text-xs text-[var(--foreground)]",
                      "focus:border-[var(--ring)] focus:ring-1 focus:ring-[var(--ring)] focus:outline-none placeholder:text-[var(--muted-foreground)]/50"
                    )}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Grade Selector ── */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase text-[var(--muted-foreground)] tracking-wide">
          Grade
        </h4>
        <div className="flex gap-1">
          {GRADES.map((g) => {
            const isSelected = grade === g
            const customLabel = dynamicRubric[g] // use custom label from rubric if exists
            return (
              <button
                key={g}
                onClick={() => {
                  setGrade(g)
                  setAutoGraded(false)
                }}
                title={customLabel}
                className={cn(
                  "flex-1 py-1 flex flex-col items-center justify-center rounded-md font-bold text-sm border transition-all duration-200",
                  getGradeColor(g, isSelected),
                  !isSelected && "hover:bg-[var(--secondary)]/80 hover:text-[var(--foreground)] border-[var(--border)]"
                )}
              >
                <span>{g}</span>
                {customLabel && isSelected && <span className="text-[9px] font-normal leading-tight opacity-90 truncate max-w-full px-1">{String(customLabel)}</span>}
              </button>
            )
          })}
        </div>
        {autoGraded && (
          <p className="text-[10px] text-[var(--muted-foreground)] text-center mt-1 animate-in fade-in slide-in-from-top-1">
            Auto-graded · tap to override
          </p>
        )}
      </div>

      {/* ── Notes ── */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase text-[var(--muted-foreground)] tracking-wide">
          Notes
        </h4>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Grading notes..."
          rows={3}
          className={cn(
            'w-full resize-none rounded-md border border-[var(--border)]',
            'bg-[var(--secondary)]/50 text-[var(--foreground)]',
            'px-3 py-2 text-sm placeholder:text-[var(--muted-foreground)]',
            'focus:outline-none focus:ring-1 focus:ring-[var(--ring)] focus:border-[var(--ring)]',
            'transition-colors duration-150'
          )}
        />
      </div>

      {/* ── Save ── */}
      <button
        onClick={() => saveMutation.mutate()}
        disabled={saveStatus === 'saving' || !grade}
        className={cn(
          "w-full py-2.5 rounded-md text-sm font-semibold transition-all",
          grade
            ? "bg-[var(--primary)] text-white hover:opacity-90 shadow-sm"
            : "bg-[var(--secondary)] text-[var(--muted-foreground)] cursor-not-allowed border border-[var(--border)]"
        )}
      >
        {saveStatus === 'saving' ? 'Saving...' :
          saveStatus === 'saved' ? 'Grade saved ✓' :
            saveStatus === 'error' ? 'Error saving grade' : 'Save Grade'}
      </button>

    </div>
  )
}
