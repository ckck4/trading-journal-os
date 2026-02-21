'use client'

import { useState } from 'react'
import { TrendingUp, Star } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import type { Rubric, RubricCategory, TradeGrade } from '@/types/grading'

// ─── Live score computation ────────────────────────────────────────────────────

function computeLiveScore(
  scores: Record<string, number>,
  categories: RubricCategory[]
): { numeric: number; letter: string } {
  if (!categories.length) return { numeric: 0, letter: 'D' }
  let weightedSum = 0
  let totalWeight = 0
  for (const cat of categories) {
    const score = scores[cat.id] ?? 0
    const maxScore = cat.maxScore > 0 ? cat.maxScore : 1
    weightedSum += (score / maxScore) * cat.weight
    totalWeight += cat.weight
  }
  const numeric = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0
  const rounded = Math.round(numeric * 10) / 10
  const letter = rounded >= 90 ? 'A' : rounded >= 75 ? 'B' : rounded >= 60 ? 'C' : 'D'
  return { numeric: rounded, letter }
}

// ─── Letter grade badge style ──────────────────────────────────────────────────

function letterGradeBadgeClass(grade: string): string {
  if (grade === 'A') return 'bg-[var(--color-green-muted)] text-[var(--color-green)]'
  if (grade === 'B') return 'bg-[var(--color-blue)]/15 text-[var(--color-blue)]'
  if (grade === 'C') return 'bg-[var(--color-yellow-muted)] text-[var(--color-yellow)]'
  return 'bg-[var(--color-red-muted)] text-[var(--color-red)]'
}

// ─── Grade Editor ──────────────────────────────────────────────────────────────

function GradeEditor({
  rubric,
  initialScores,
  isSaving,
  onSave,
  onCancel,
}: {
  rubric: Rubric
  initialScores: Record<string, number>
  isSaving: boolean
  onSave: (scores: Record<string, number>) => void
  onCancel: () => void
}) {
  const [scores, setScores] = useState<Record<string, number>>(initialScores)

  const live = computeLiveScore(scores, rubric.categories)

  return (
    <div className="space-y-4">
      {/* Live score preview */}
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-[var(--secondary)]">
        <span
          className={cn(
            'inline-flex items-center justify-center w-9 h-9 rounded-lg text-base font-bold',
            letterGradeBadgeClass(live.letter)
          )}
        >
          {live.letter}
        </span>
        <div>
          <span className="text-lg font-mono font-semibold text-[var(--foreground)]">
            {live.numeric.toFixed(1)}
          </span>
          <span className="text-sm text-[var(--muted-foreground)]"> / 100</span>
        </div>
      </div>

      {/* Category sliders */}
      <div className="space-y-3">
        {rubric.categories.map((cat) => {
          const value = scores[cat.id] ?? 0
          return (
            <div key={cat.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--foreground)]">{cat.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[var(--muted-foreground)]">
                    {cat.weight}% weight
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={cat.maxScore}
                      value={value}
                      onChange={(e) => {
                        const n = Math.min(cat.maxScore, Math.max(0, parseInt(e.target.value) || 0))
                        setScores((prev) => ({ ...prev, [cat.id]: n }))
                      }}
                      className="w-12 text-right bg-[var(--secondary)] text-sm font-mono text-[var(--foreground)] border border-[var(--border)] rounded px-1.5 py-0.5 focus:outline-none focus:border-[var(--ring)]"
                    />
                    <span className="text-[11px] text-[var(--muted-foreground)]">
                      /{cat.maxScore}
                    </span>
                  </div>
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={cat.maxScore}
                step={1}
                value={value}
                onChange={(e) =>
                  setScores((prev) => ({ ...prev, [cat.id]: parseInt(e.target.value) }))
                }
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, var(--color-accent-primary) ${(value / cat.maxScore) * 100}%, var(--border) ${(value / cat.maxScore) * 100}%)`,
                  accentColor: 'var(--color-accent-primary)',
                }}
              />
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => onSave(scores)}
          disabled={isSaving}
          className="flex-1 py-2 rounded-md bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : 'Save Grade'}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-2 rounded-md border border-[var(--border)] text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Main GradeSection ─────────────────────────────────────────────────────────

interface GradeSectionProps {
  tradeId: string
}

export function GradeSection({ tradeId }: GradeSectionProps) {
  const queryClient = useQueryClient()
  const [editorOpen, setEditorOpen] = useState(false)

  // Fetch default rubric
  const { data: rubricsData } = useQuery<{ rubrics: Rubric[] }>({
    queryKey: ['grading-rubrics'],
    queryFn: () => fetch('/api/grading/rubrics').then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  })
  const defaultRubric = rubricsData?.rubrics?.find((r) => r.isDefault) ?? null

  // Fetch existing grade
  const { data: gradeData, refetch: refetchGrade } = useQuery<{ grade: TradeGrade | null }>({
    queryKey: ['trade-grade', tradeId],
    queryFn: () =>
      fetch(`/api/trades/${tradeId}/grade`).then((r) => {
        if (!r.ok) return { grade: null }
        return r.json()
      }),
    staleTime: 30_000,
  })
  const existingGrade = gradeData?.grade ?? null

  // Save mutation
  const gradeMutation = useMutation({
    mutationFn: async (scores: Record<string, number>) => {
      if (!defaultRubric) throw new Error('No rubric')
      const res = await fetch(`/api/trades/${tradeId}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryScores: scores, rubricId: defaultRubric.id }),
      })
      if (!res.ok) throw new Error('Grade save failed')
      return res.json()
    },
    onSuccess: () => {
      refetchGrade()
      setEditorOpen(false)
      queryClient.invalidateQueries({ queryKey: ['trades'] })
    },
  })

  // ── No rubric configured ──
  if (!defaultRubric) {
    return (
      <div
        className={cn(
          'flex items-start gap-3 rounded-md border border-dashed border-[var(--border)]',
          'px-4 py-3 bg-[var(--secondary)]/40'
        )}
      >
        <TrendingUp size={16} className="text-[var(--muted-foreground)] shrink-0 mt-0.5" />
        <div className="text-sm text-[var(--muted-foreground)]">
          No grading rubric configured.{' '}
          <span className="text-[var(--primary)]">
            Set a default rubric in Settings → Grading.
          </span>
        </div>
      </div>
    )
  }

  // ── Editor open ──
  if (editorOpen) {
    const initialScores: Record<string, number> = existingGrade
      ? existingGrade.categoryScores
      : Object.fromEntries(
          defaultRubric.categories.map((c) => [c.id, Math.floor(c.maxScore / 2)])
        )

    return (
      <GradeEditor
        rubric={defaultRubric}
        initialScores={initialScores}
        isSaving={gradeMutation.isPending}
        onSave={(scores) => gradeMutation.mutate(scores)}
        onCancel={() => setEditorOpen(false)}
      />
    )
  }

  // ── Has existing grade, editor closed ──
  if (existingGrade) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'inline-flex items-center justify-center w-12 h-12 rounded-xl text-2xl font-bold',
              letterGradeBadgeClass(existingGrade.letterGrade)
            )}
          >
            {existingGrade.letterGrade}
          </span>
          <div>
            <div className="text-lg font-mono font-semibold text-[var(--foreground)]">
              {existingGrade.numericScore.toFixed(1)}
              <span className="text-sm text-[var(--muted-foreground)] font-normal"> / 100</span>
            </div>
            <div className="text-[11px] text-[var(--muted-foreground)] flex items-center gap-1">
              <Star size={9} className="text-[var(--primary)]" />
              {defaultRubric.name}
            </div>
          </div>
          <button
            onClick={() => setEditorOpen(true)}
            className="ml-auto text-xs px-2.5 py-1.5 rounded border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)] transition-colors"
          >
            Edit
          </button>
        </div>

        {/* Category score breakdown */}
        {defaultRubric.categories.length > 0 && (
          <div className="space-y-1.5">
            {defaultRubric.categories.map((cat) => {
              const score = existingGrade.categoryScores[cat.id] ?? 0
              const pct = cat.maxScore > 0 ? (score / cat.maxScore) * 100 : 0
              return (
                <div key={cat.id} className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[var(--muted-foreground)]">{cat.name}</span>
                    <span className="text-[11px] font-mono text-[var(--foreground)]">
                      {score}/{cat.maxScore}
                    </span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-[var(--secondary)]">
                    <div
                      className="h-1 rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: 'var(--color-accent-primary)',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── No grade yet, editor closed ──
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-md border border-dashed border-[var(--border)]',
        'px-4 py-3 bg-[var(--secondary)]/40'
      )}
    >
      <div className="flex items-center gap-2">
        <TrendingUp size={15} className="text-[var(--muted-foreground)] shrink-0" />
        <span className="text-sm text-[var(--muted-foreground)]">Not graded yet</span>
      </div>
      <button
        onClick={() => setEditorOpen(true)}
        className="text-xs px-2.5 py-1.5 rounded bg-[var(--primary)] text-white hover:opacity-90 transition-opacity"
      >
        Grade this trade
      </button>
    </div>
  )
}
