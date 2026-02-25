'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Plus, Trash2, Star, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Rubric, RubricCategory } from '@/types/grading-legacy'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function weightSum(categories: RubricCategory[]): number {
  return categories.reduce((s, c) => s + c.weight, 0)
}

// ─── Category Row ─────────────────────────────────────────────────────────────

function CategoryRow({
  category,
  onDelete,
  onUpdate,
}: {
  category: RubricCategory
  onDelete: (id: string) => void
  onUpdate: (id: string, patch: { name?: string; weight?: number; maxScore?: number }) => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(category.name)
  const [weight, setWeight] = useState(category.weight)
  const [maxScore, setMaxScore] = useState(category.maxScore)

  const handleSave = () => {
    onUpdate(category.id, { name, weight, maxScore })
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-2 px-3 rounded-md bg-[var(--secondary)] border border-[var(--border)]">
        <input
          className="flex-1 bg-transparent text-sm text-[var(--foreground)] border-b border-[var(--border)] focus:outline-none focus:border-[var(--ring)] pb-0.5"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Category name"
        />
        <div className="flex items-center gap-1 shrink-0">
          <label className="text-[11px] text-[var(--muted-foreground)]">Weight%</label>
          <input
            type="number"
            className="w-14 bg-[var(--card)] text-sm text-[var(--foreground)] border border-[var(--border)] rounded px-1.5 py-0.5 focus:outline-none focus:border-[var(--ring)]"
            value={weight}
            min={0}
            max={100}
            onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <label className="text-[11px] text-[var(--muted-foreground)]">Max</label>
          <input
            type="number"
            className="w-12 bg-[var(--card)] text-sm text-[var(--foreground)] border border-[var(--border)] rounded px-1.5 py-0.5 focus:outline-none focus:border-[var(--ring)]"
            value={maxScore}
            min={1}
            max={100}
            onChange={(e) => setMaxScore(parseInt(e.target.value) || 10)}
          />
        </div>
        <button
          onClick={handleSave}
          className="text-[11px] px-2 py-1 rounded bg-[var(--primary)] text-white hover:opacity-90 transition-opacity"
        >
          Save
        </button>
        <button
          onClick={() => { setName(category.name); setWeight(category.weight); setMaxScore(category.maxScore); setEditing(false) }}
          className="text-[11px] px-2 py-1 rounded bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-[var(--border)] transition-colors"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-[var(--secondary)]/60 group transition-colors">
      <span className="flex-1 text-sm text-[var(--foreground)]">{category.name}</span>
      <span className="text-[11px] text-[var(--muted-foreground)] font-mono shrink-0">
        {category.weight}%
      </span>
      <span className="text-[11px] text-[var(--muted-foreground)] font-mono shrink-0">
        /{category.maxScore}
      </span>
      <button
        onClick={() => setEditing(true)}
        className="text-[11px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] opacity-0 group-hover:opacity-100 transition-all px-1.5 py-0.5 rounded border border-transparent hover:border-[var(--border)]"
      >
        Edit
      </button>
      <button
        onClick={() => onDelete(category.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--muted-foreground)] hover:text-[var(--color-red)]"
        aria-label="Delete category"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

// ─── Add Category Form ────────────────────────────────────────────────────────

function AddCategoryForm({
  rubricId,
  existingCategories,
  onAdd,
  onCancel,
}: {
  rubricId: string
  existingCategories: RubricCategory[]
  onAdd: (rubricId: string, data: { name: string; weight: number; maxScore: number }) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [weight, setWeight] = useState(25)
  const [maxScore, setMaxScore] = useState(10)

  const currentTotal = weightSum(existingCategories) + weight
  const weightOk = Math.abs(currentTotal - 100) < 0.01

  const handleAdd = () => {
    if (!name.trim()) return
    onAdd(rubricId, { name: name.trim(), weight, maxScore })
  }

  return (
    <div className="mt-2 p-3 rounded-md border border-dashed border-[var(--border)] bg-[var(--secondary)]/40 space-y-2">
      <div className="flex items-center gap-2">
        <input
          className="flex-1 bg-[var(--card)] text-sm text-[var(--foreground)] border border-[var(--border)] rounded px-2.5 py-1.5 focus:outline-none focus:border-[var(--ring)]"
          placeholder="Category name (e.g. Setup Quality)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <div className="flex items-center gap-1 shrink-0">
          <label className="text-[11px] text-[var(--muted-foreground)]">Weight%</label>
          <input
            type="number"
            className="w-14 bg-[var(--card)] text-sm text-[var(--foreground)] border border-[var(--border)] rounded px-1.5 py-1.5 focus:outline-none focus:border-[var(--ring)]"
            value={weight}
            min={0}
            max={100}
            onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <label className="text-[11px] text-[var(--muted-foreground)]">Max</label>
          <input
            type="number"
            className="w-12 bg-[var(--card)] text-sm text-[var(--foreground)] border border-[var(--border)] rounded px-1.5 py-1.5 focus:outline-none focus:border-[var(--ring)]"
            value={maxScore}
            min={1}
            max={100}
            onChange={(e) => setMaxScore(parseInt(e.target.value) || 10)}
          />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'text-[11px]',
            weightOk ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'
          )}
        >
          Weight total: {currentTotal.toFixed(0)}% {!weightOk && '(must equal 100)'}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="text-xs px-2.5 py-1 rounded border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!name.trim() || !weightOk}
            className="text-xs px-2.5 py-1 rounded bg-[var(--primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add Category
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Rubric Row ───────────────────────────────────────────────────────────────

function RubricRow({
  rubric,
  onDelete,
  onSetDefault,
  onAddCategory,
  onDeleteCategory,
  onUpdateCategory,
}: {
  rubric: Rubric
  onDelete: (id: string) => void
  onSetDefault: (id: string) => void
  onAddCategory: (rubricId: string, data: { name: string; weight: number; maxScore: number }) => void
  onDeleteCategory: (categoryId: string) => void
  onUpdateCategory: (categoryId: string, patch: { name?: string; weight?: number; maxScore?: number }) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  const sum = weightSum(rubric.categories)
  const sumOk = rubric.categories.length === 0 || Math.abs(sum - 100) < 0.01

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      {/* Rubric header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 flex-1 text-left"
        >
          {expanded ? (
            <ChevronDown size={14} className="text-[var(--muted-foreground)] shrink-0" />
          ) : (
            <ChevronRight size={14} className="text-[var(--muted-foreground)] shrink-0" />
          )}
          <span className="text-sm font-medium text-[var(--foreground)]">{rubric.name}</span>
          {rubric.isDefault && (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-[var(--primary)]/15 text-[var(--primary)]">
              <Star size={9} />
              Default
            </span>
          )}
          {rubric.categories.length > 0 && (
            <span
              className={cn(
                'text-[11px] font-mono ml-auto',
                sumOk ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'
              )}
            >
              {sum.toFixed(0)}%
            </span>
          )}
        </button>
        {!rubric.isDefault && (
          <button
            onClick={() => onSetDefault(rubric.id)}
            className="text-[11px] px-2 py-1 rounded border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)] transition-colors shrink-0"
            title="Set as default rubric"
          >
            Set Default
          </button>
        )}
        {rubric.isDefault && (
          <span className="text-[11px] text-[var(--color-green)] flex items-center gap-1 shrink-0">
            <Check size={11} /> Active
          </span>
        )}
        <button
          onClick={() => onDelete(rubric.id)}
          className="text-[var(--muted-foreground)] hover:text-[var(--color-red)] transition-colors shrink-0"
          aria-label="Delete rubric"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Expanded: category list */}
      {expanded && (
        <div className="border-t border-[var(--border)] px-4 py-3 space-y-1">
          {rubric.categories.length === 0 && !showAddForm && (
            <p className="text-sm text-[var(--muted-foreground)] py-1">
              No categories yet. Add one below.
            </p>
          )}

          {!sumOk && rubric.categories.length > 0 && (
            <div className="text-[11px] text-[var(--color-red)] pb-1">
              Weights sum to {sum.toFixed(0)}% — must equal 100 to use this rubric.
            </div>
          )}

          {rubric.categories.map((cat) => (
            <CategoryRow
              key={cat.id}
              category={cat}
              onDelete={onDeleteCategory}
              onUpdate={onUpdateCategory}
            />
          ))}

          {showAddForm ? (
            <AddCategoryForm
              rubricId={rubric.id}
              existingCategories={rubric.categories}
              onAdd={(rid, data) => {
                onAddCategory(rid, data)
                setShowAddForm(false)
              }}
              onCancel={() => setShowAddForm(false)}
            />
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] mt-2 transition-colors"
            >
              <Plus size={12} /> Add Category
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function GradingSettingsClient() {
  const queryClient = useQueryClient()
  const [showNewForm, setShowNewForm] = useState(false)
  const [newRubricName, setNewRubricName] = useState('')

  // Fetch rubrics
  const { data, isLoading } = useQuery<{ rubrics: Rubric[] }>({
    queryKey: ['grading-rubrics'],
    queryFn: () => fetch('/api/grading/rubrics').then((r) => r.json()),
    staleTime: 30_000,
  })
  const rubrics = data?.rubrics ?? []

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['grading-rubrics'] })

  // Create rubric
  const createMutation = useMutation({
    mutationFn: (name: string) =>
      fetch('/api/grading/rubrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      }).then((r) => r.json()),
    onSuccess: () => {
      invalidate()
      setNewRubricName('')
      setShowNewForm(false)
    },
  })

  // Delete rubric
  const deleteRubricMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/grading/rubrics/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })

  // Set default
  const setDefaultMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/grading/rubrics/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      }).then((r) => r.json()),
    onSuccess: invalidate,
  })

  // Add category
  const addCategoryMutation = useMutation({
    mutationFn: ({ rubricId, data }: { rubricId: string; data: { name: string; weight: number; maxScore: number } }) =>
      fetch(`/api/grading/rubrics/${rubricId}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: invalidate,
  })

  // Delete category
  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/grading/categories/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })

  // Update category
  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { name?: string; weight?: number; maxScore?: number } }) =>
      fetch(`/api/grading/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      }).then((r) => r.json()),
    onSuccess: invalidate,
  })

  return (
    <div className="px-6 py-6 space-y-6 max-w-3xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--foreground)]">Grading Rubrics</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Configure trade grading rubrics with weighted criteria.
          </p>
        </div>
        {!showNewForm && (
          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus size={14} />
            New Rubric
          </button>
        )}
      </div>

      {/* New rubric form */}
      {showNewForm && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            Rubric Name
          </label>
          <div className="flex items-center gap-2">
            <input
              autoFocus
              className="flex-1 bg-[var(--secondary)] text-sm text-[var(--foreground)] border border-[var(--border)] rounded px-3 py-2 focus:outline-none focus:border-[var(--ring)]"
              placeholder="e.g. Standard Rubric, ICT Checklist…"
              value={newRubricName}
              onChange={(e) => setNewRubricName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newRubricName.trim()) {
                  createMutation.mutate(newRubricName.trim())
                }
              }}
            />
            <button
              onClick={() => createMutation.mutate(newRubricName.trim())}
              disabled={!newRubricName.trim() || createMutation.isPending}
              className="px-3 py-2 rounded bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              Create
            </button>
            <button
              onClick={() => { setShowNewForm(false); setNewRubricName('') }}
              className="px-3 py-2 rounded border border-[var(--border)] text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Rubric list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-14 rounded-lg border border-[var(--border)] bg-[var(--card)] animate-pulse" />
          ))}
        </div>
      ) : rubrics.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 rounded-lg border border-dashed border-[var(--border)] bg-[var(--card)]">
          <p className="text-sm text-[var(--muted-foreground)]">No rubrics yet.</p>
          <button
            onClick={() => setShowNewForm(true)}
            className="mt-2 text-sm text-[var(--primary)] hover:underline"
          >
            Create your first rubric
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {rubrics.map((rubric) => (
            <RubricRow
              key={rubric.id}
              rubric={rubric}
              onDelete={(id) => deleteRubricMutation.mutate(id)}
              onSetDefault={(id) => setDefaultMutation.mutate(id)}
              onAddCategory={(rubricId, data) =>
                addCategoryMutation.mutate({ rubricId, data })
              }
              onDeleteCategory={(id) => deleteCategoryMutation.mutate(id)}
              onUpdateCategory={(id, patch) => updateCategoryMutation.mutate({ id, patch })}
            />
          ))}
        </div>
      )}
    </div>
  )
}
