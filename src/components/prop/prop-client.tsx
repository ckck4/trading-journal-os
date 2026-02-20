'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronDown,
  ChevronRight,
  Plus,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Building2,
  DollarSign,
  Settings2,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  PropEvaluation,
  PropTemplate,
  Payout,
  EvaluateRulesResult,
  RuleResult,
  RuleStatus,
  OverallStatus,
  RulesJson,
  StageRules,
} from '@/types/prop'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt$(n: number | string): string {
  const num = typeof n === 'string' ? parseFloat(n) : n
  const abs = Math.abs(num)
  const sign = num < 0 ? '-' : num > 0 ? '+' : ''
  return `${sign}$${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const STAGE_ORDER = ['evaluation', 'pa', 'funded'] as const
type Stage = typeof STAGE_ORDER[number]

function nextStage(current: string): Stage | null {
  const idx = STAGE_ORDER.indexOf(current as Stage)
  return idx >= 0 && idx < STAGE_ORDER.length - 1 ? STAGE_ORDER[idx + 1] : null
}

const STAGE_LABELS: Record<string, string> = { evaluation: 'EVAL', pa: 'PA', funded: 'FUNDED' }
const STAGE_COLORS: Record<string, string> = {
  evaluation: 'bg-[var(--color-accent-muted)] text-[var(--color-accent-primary)]',
  pa: 'bg-[var(--color-yellow-muted)] text-[var(--color-yellow)]',
  funded: 'bg-[var(--color-green-muted)] text-[var(--color-green)]',
}
const OVERALL_COLORS: Record<OverallStatus, string> = {
  on_track: 'text-[var(--color-green)]',
  warning: 'text-[var(--color-yellow)]',
  violation: 'text-[var(--color-red)]',
  passed: 'text-[var(--color-green)]',
}
const OVERALL_ICONS: Record<OverallStatus, typeof CheckCircle2> = {
  on_track: CheckCircle2,
  warning: AlertTriangle,
  violation: XCircle,
  passed: CheckCircle2,
}
const RULE_LABELS: Record<string, string> = {
  maxDailyLoss: 'Max Daily Loss',
  minTradingDays: 'Min Trading Days',
  consistency: 'Consistency',
  profitTarget: 'Profit Target',
}

// ─── Rule status indicator ────────────────────────────────────────────────────

function RuleStatusIcon({ status }: { status: RuleStatus }) {
  const configs: Record<RuleStatus, { icon: typeof CheckCircle2; color: string }> = {
    pass: { icon: CheckCircle2, color: 'text-[var(--color-green)]' },
    warning: { icon: AlertTriangle, color: 'text-[var(--color-yellow)]' },
    violation: { icon: XCircle, color: 'text-[var(--color-red)]' },
    pending: { icon: Clock, color: 'text-[var(--muted-foreground)]' },
  }
  const { icon: Icon, color } = configs[status]
  return <Icon className={cn('w-4 h-4 flex-shrink-0', color)} />
}

// ─── Rule row inside eval card ────────────────────────────────────────────────

function RuleRow({ label, rule }: { label: string; rule: RuleResult }) {
  const barColor =
    rule.status === 'violation'
      ? 'bg-[var(--color-red)]'
      : rule.status === 'warning'
      ? 'bg-[var(--color-yellow)]'
      : rule.direction === 'toward_limit'
      ? 'bg-[var(--color-green)]'
      : 'bg-[var(--color-accent-primary)]'

  const currentLabel =
    rule.threshold === null
      ? 'N/A'
      : rule.direction === 'toward_limit'
      ? `${fmt$(rule.current)} / ${fmt$(rule.threshold)}`
      : label === 'Min Trading Days'
      ? `${rule.current} / ${rule.threshold} days`
      : label === 'Consistency'
      ? `${rule.current}% / ${rule.threshold}%`
      : `${fmt$(rule.current)} / ${fmt$(rule.threshold)}`

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <RuleStatusIcon status={rule.status} />
        <span className="text-xs text-[var(--foreground)] flex-1">{label}</span>
        <span className="text-[11px] font-mono text-[var(--muted-foreground)]">{currentLabel}</span>
      </div>
      {rule.threshold !== null && (
        <div className="ml-6 h-1.5 w-full rounded-full bg-[var(--secondary)] overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-300', barColor)}
            style={{ width: `${rule.progress}%` }}
          />
        </div>
      )}
    </div>
  )
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────

function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  wide?: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative z-10 w-full mx-4 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-2xl p-6 max-h-[90vh] overflow-y-auto',
          wide ? 'max-w-lg' : 'max-w-md'
        )}
      >
        <h3 className="text-base font-semibold text-[var(--foreground)] mb-4">{title}</h3>
        {children}
      </div>
    </div>
  )
}

// ─── Eval Card ────────────────────────────────────────────────────────────────

function EvalCard({
  evaluation,
  onAdvance,
  onConfigure,
  onDelete,
}: {
  evaluation: PropEvaluation
  onAdvance: (evaluation: PropEvaluation) => void
  onConfigure: (evaluation: PropEvaluation) => void
  onDelete: (evaluation: PropEvaluation) => void
}) {
  const { data: statusData, isLoading: statusLoading } = useQuery<{ status: EvaluateRulesResult }>({
    queryKey: ['eval-status', evaluation.id],
    queryFn: () =>
      fetch(`/api/prop/evaluations/${evaluation.id}/status`).then((r) => {
        if (!r.ok) throw new Error('Failed to fetch status')
        return r.json()
      }),
    staleTime: 60_000,
    retry: 1,
  })

  const ruleStatus = statusData?.status
  const next = nextStage(evaluation.stage)
  const account = evaluation.account
  const OverallIcon = ruleStatus ? OVERALL_ICONS[ruleStatus.overallStatus] : Clock

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 flex flex-col gap-4">
      {/* Card header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-[var(--foreground)]">
            {account?.name ?? 'Unknown Account'}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {account?.broker ?? ''} · Started {fmtDate(evaluation.startDate)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={cn(
              'text-[11px] font-bold tracking-widest px-2 py-0.5 rounded',
              STAGE_COLORS[evaluation.stage] ?? STAGE_COLORS.evaluation
            )}
          >
            {STAGE_LABELS[evaluation.stage] ?? evaluation.stage.toUpperCase()}
          </span>
          {ruleStatus && (
            <div className="flex items-center gap-1">
              <OverallIcon
                className={cn('w-3.5 h-3.5', OVERALL_COLORS[ruleStatus.overallStatus])}
              />
              <span
                className={cn('text-[11px] font-semibold', OVERALL_COLORS[ruleStatus.overallStatus])}
              >
                {ruleStatus.overallStatus.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          )}
          <button
            onClick={() => onConfigure(evaluation)}
            className="p-1 rounded text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5 transition-colors"
            title="Configure"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(evaluation)}
            className="p-1 rounded text-[var(--muted-foreground)] hover:text-[var(--color-red)] hover:bg-[var(--color-red-muted)] transition-colors"
            title="Delete evaluation"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Rules */}
      <div className="flex flex-col gap-3">
        {statusLoading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-7 rounded bg-[var(--secondary)] animate-pulse" />
            ))}
          </div>
        ) : ruleStatus ? (
          (Object.entries(ruleStatus.rules) as [string, RuleResult][]).map(([key, rule]) => (
            <RuleRow key={key} label={RULE_LABELS[key] ?? key} rule={rule} />
          ))
        ) : (
          <p className="text-xs text-[var(--muted-foreground)]">Could not load rule status.</p>
        )}
      </div>

      {/* Summary + action */}
      {ruleStatus && (
        <p className="text-[11px] text-[var(--muted-foreground)]">{ruleStatus.summary}</p>
      )}

      {next && (
        <button
          onClick={() => onAdvance(evaluation)}
          className="flex items-center justify-center gap-2 w-full py-2 rounded-md border border-[var(--border)] text-sm text-[var(--foreground)] hover:bg-white/5 transition-colors"
        >
          Advance to {STAGE_LABELS[next]}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
      {!next && (
        <div className="text-center text-xs text-[var(--muted-foreground)] py-1">
          Funded stage — final level
        </div>
      )}
    </div>
  )
}

// ─── No-Eval Card ─────────────────────────────────────────────────────────────

function NoEvalCard({
  account,
  onConfigure,
}: {
  account: { id: string; name: string; broker: string; startingBalance?: string }
  onConfigure: (account: { id: string; name: string; broker: string; startingBalance?: string }) => void
}) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--card)]/50 p-5 flex flex-col gap-3 opacity-70">
      <div>
        <p className="text-base font-semibold text-[var(--foreground)]">{account.name}</p>
        <p className="text-xs text-[var(--muted-foreground)]">{account.broker}</p>
      </div>
      <p className="text-xs text-[var(--muted-foreground)]">No evaluation configured</p>
      <button
        onClick={() => onConfigure(account)}
        className="flex items-center justify-center gap-2 w-full py-2 rounded-md border border-[var(--border)] text-sm text-[var(--muted-foreground)] hover:bg-white/5 hover:text-[var(--foreground)] transition-colors"
      >
        <Settings2 className="w-3.5 h-3.5" />
        Configure
      </button>
    </div>
  )
}

// ─── Template editor ──────────────────────────────────────────────────────────

const STAGE_KEYS: Stage[] = ['evaluation', 'pa', 'funded']
const RULE_FIELDS: Array<{ key: keyof StageRules; label: string; hint: string }> = [
  { key: 'profitTarget', label: 'Profit Target ($)', hint: 'e.g. 3000' },
  { key: 'maxDailyLoss', label: 'Max Daily Loss ($)', hint: 'e.g. -1500' },
  { key: 'minTradingDays', label: 'Min Trading Days', hint: 'e.g. 10 (or blank for N/A)' },
  { key: 'consistencyPct', label: 'Consistency (%)', hint: 'e.g. 30 (or blank for N/A)' },
]

const DEFAULT_STAGE_RULES: StageRules = {
  profitTarget: null,
  maxDailyLoss: null,
  minTradingDays: null,
  consistencyPct: null,
}

function TemplateEditor({
  template,
  onSave,
  onDelete,
  onSetDefault,
}: {
  template: PropTemplate
  onSave: (id: string, updates: Partial<PropTemplate>) => void
  onDelete: (id: string) => void
  onSetDefault: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [firmName, setFirmName] = useState(template.firmName)
  const [templateName, setTemplateName] = useState(template.templateName)
  const [dirty, setDirty] = useState(false)

  // BUG 1 FIX: normalize rules_json — ensure all 3 stages always exist with defaults
  const normalizedRules: RulesJson = {
    evaluation: { ...DEFAULT_STAGE_RULES, ...(template.rulesJson?.evaluation ?? {}) },
    pa: { ...DEFAULT_STAGE_RULES, ...(template.rulesJson?.pa ?? {}) },
    funded: { ...DEFAULT_STAGE_RULES, ...(template.rulesJson?.funded ?? {}) },
  }

  const [rules, setRules] = useState<RulesJson>(normalizedRules)

  function setRule(stage: Stage, field: keyof StageRules, raw: string) {
    const val = raw === '' ? null : parseFloat(raw)
    setRules((prev) => ({
      ...prev,
      [stage]: { ...prev[stage], [field]: isNaN(val as number) ? null : val },
    }))
    setDirty(true)
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
      {/* Header */}
      <button
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/5 transition-colors rounded-lg"
        onClick={() => setExpanded((e) => !e)}
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-[var(--muted-foreground)]" />
        ) : (
          <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)]" />
        )}
        <Building2 className="w-4 h-4 text-[var(--muted-foreground)]" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-[var(--foreground)]">
            {template.firmName} — {template.templateName}
          </span>
          <span className="text-[11px] text-[var(--muted-foreground)] ml-2">
            v{template.version}
          </span>
        </div>
        {template.isDefault && (
          <span className="text-[10px] font-bold tracking-widest px-2 py-0.5 rounded bg-[var(--color-accent-muted)] text-[var(--color-accent-primary)]">
            DEFAULT
          </span>
        )}
      </button>

      {/* Expanded editor */}
      {expanded && (
        <div className="border-t border-[var(--border)] p-4 flex flex-col gap-4">
          {/* Name fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[var(--muted-foreground)] uppercase tracking-wider">
                Firm Name
              </label>
              <input
                className="px-3 py-1.5 rounded-md border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)]"
                value={firmName}
                onChange={(e) => { setFirmName(e.target.value); setDirty(true) }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[var(--muted-foreground)] uppercase tracking-wider">
                Template Name
              </label>
              <input
                className="px-3 py-1.5 rounded-md border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)]"
                value={templateName}
                onChange={(e) => { setTemplateName(e.target.value); setDirty(true) }}
              />
            </div>
          </div>

          {/* Rules per stage */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STAGE_KEYS.map((stage) => (
              <div key={stage} className="flex flex-col gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  {stage === 'pa' ? 'PA' : stage.charAt(0).toUpperCase() + stage.slice(1)}
                </h4>
                {RULE_FIELDS.map(({ key, label, hint }) => (
                  <div key={key} className="flex flex-col gap-0.5">
                    <label className="text-[10px] text-[var(--muted-foreground)]">{label}</label>
                    <input
                      type="number"
                      placeholder={hint}
                      value={rules[stage][key] ?? ''}
                      onChange={(e) => setRule(stage, key, e.target.value)}
                      className="px-2 py-1 rounded border border-[var(--border)] bg-[var(--background)] text-xs font-mono text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)]"
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
            {!template.isDefault && (
              <button
                onClick={() => onSetDefault(template.id)}
                className="text-xs px-3 py-1.5 rounded border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5 transition-colors"
              >
                Set as Default
              </button>
            )}
            <button
              onClick={() => onDelete(template.id)}
              className="text-xs px-3 py-1.5 rounded border border-[var(--color-red)]/30 text-[var(--color-red)] hover:bg-[var(--color-red-muted)] transition-colors"
            >
              Delete
            </button>
            {dirty && (
              <button
                onClick={() => {
                  onSave(template.id, {
                    firmName,
                    templateName,
                    rulesJson: rules,
                  })
                  setDirty(false)
                }}
                className="ml-auto text-xs px-3 py-1.5 rounded bg-[var(--color-accent-primary)] text-white hover:bg-[var(--color-accent-hover)] transition-colors"
              >
                Save Changes
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Configure modal form type ────────────────────────────────────────────────

type ConfigureTarget = {
  accountId: string
  accountName: string
  broker: string
  startingBalance: string
  existingEval: PropEvaluation | null
}

type ConfigureForm = {
  accountName: string
  startingBalance: string
  templateId: string
  stage: string
  startDate: string
  profitTargetOverride: string
  status: string
}

// ─── Field label helper ───────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs text-[var(--muted-foreground)]">{children}</label>
  )
}

function FieldInput({
  type = 'text',
  value,
  onChange,
  placeholder,
}: {
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)]"
    />
  )
}

function FieldSelect({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)]"
    >
      {children}
    </select>
  )
}

// ─── Main PropClient ──────────────────────────────────────────────────────────

export function PropClient() {
  const queryClient = useQueryClient()

  // Modal state
  const [advanceModal, setAdvanceModal] = useState<PropEvaluation | null>(null)
  const [deleteEvalModal, setDeleteEvalModal] = useState<PropEvaluation | null>(null)
  const [logPayoutModal, setLogPayoutModal] = useState(false)
  const [showTemplates, setShowTemplates] = useState(true)

  // Configure modal state
  const [configureModal, setConfigureModal] = useState<ConfigureTarget | null>(null)
  const [configureForm, setConfigureForm] = useState<ConfigureForm>({
    accountName: '',
    startingBalance: '',
    templateId: '',
    stage: 'evaluation',
    startDate: new Date().toISOString().split('T')[0],
    profitTargetOverride: '',
    status: 'active',
  })

  // Log payout form state
  const [payoutForm, setPayoutForm] = useState({
    evaluationId: '',
    amount: '',
    status: 'pending',
    notes: '',
  })

  // ─── Queries ────────────────────────────────────────────────────────────────

  const evalsQuery = useQuery<{ evaluations: PropEvaluation[] }>({
    queryKey: ['prop-evaluations'],
    queryFn: () => fetch('/api/prop/evaluations').then((r) => r.json()),
    staleTime: 30_000,
  })

  const accountsQuery = useQuery<{
    accounts: Array<{ id: string; name: string; broker: string; startingBalance?: string }>
  }>({
    queryKey: ['accounts'],
    queryFn: () => fetch('/api/accounts').then((r) => r.json()),
    staleTime: 300_000,
  })

  const templatesQuery = useQuery<{ templates: PropTemplate[] }>({
    queryKey: ['prop-templates'],
    queryFn: () => fetch('/api/prop/templates').then((r) => r.json()),
    staleTime: 300_000,
  })

  const payoutsQuery = useQuery<{ payouts: Payout[] }>({
    queryKey: ['prop-payouts'],
    queryFn: () => fetch('/api/prop/payouts').then((r) => r.json()),
    staleTime: 30_000,
  })

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const advanceStageMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) =>
      fetch(`/api/prop/evaluations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage, startDate: new Date().toISOString().split('T')[0] }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prop-evaluations'] })
      queryClient.invalidateQueries({ queryKey: ['eval-status'] })
      setAdvanceModal(null)
    },
  })

  const deleteEvalMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/prop/evaluations/${id}`, { method: 'DELETE' }).then((r) => {
        if (!r.ok) throw new Error('Failed to delete evaluation')
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prop-evaluations'] })
      queryClient.invalidateQueries({ queryKey: ['eval-status'] })
      setDeleteEvalModal(null)
    },
  })

  const configureMutation = useMutation({
    mutationFn: async ({ target, form }: { target: ConfigureTarget; form: ConfigureForm }) => {
      const tasks: Promise<Response>[] = []

      // Update account if name or balance changed
      if (form.accountName !== target.accountName || form.startingBalance !== target.startingBalance) {
        tasks.push(
          fetch(`/api/accounts/${target.accountId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: form.accountName.trim(),
              startingBalance: parseFloat(form.startingBalance) || 0,
            }),
          })
        )
      }

      if (target.existingEval) {
        // Update existing evaluation
        tasks.push(
          fetch(`/api/prop/evaluations/${target.existingEval.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              templateId: form.templateId || undefined,
              stage: form.stage,
              status: form.status,
              startDate: form.startDate,
              profitTargetOverride: form.profitTargetOverride
                ? parseFloat(form.profitTargetOverride)
                : null,
            }),
          })
        )
      } else if (form.templateId) {
        // Create new evaluation
        tasks.push(
          fetch('/api/prop/evaluations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accountId: target.accountId,
              templateId: form.templateId,
              stage: form.stage,
              startDate: form.startDate,
              status: form.status,
            }),
          })
        )
      }

      const results = await Promise.all(tasks)
      for (const r of results) {
        if (!r.ok) throw new Error(`Request failed: ${r.status}`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prop-evaluations'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['eval-status'] })
      setConfigureModal(null)
    },
  })

  const logPayoutMutation = useMutation({
    mutationFn: (body: { evaluationId: string; amount: string; status: string; notes: string }) =>
      fetch('/api/prop/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prop-payouts'] })
      setLogPayoutModal(false)
      setPayoutForm({ evaluationId: '', amount: '', status: 'pending', notes: '' })
    },
  })

  const markPayoutPaidMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/prop/payouts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid' }),
      }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['prop-payouts'] }),
  })

  const saveTemplateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<PropTemplate> }) =>
      fetch(`/api/prop/templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firmName: updates.firmName,
          templateName: updates.templateName,
          rulesJson: updates.rulesJson,
        }),
      }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['prop-templates'] }),
  })

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/prop/templates/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['prop-templates'] }),
  })

  const setDefaultTemplateMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/prop/templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['prop-templates'] }),
  })

  // ─── Derived data ────────────────────────────────────────────────────────────

  const evaluations = evalsQuery.data?.evaluations ?? []
  const accounts = accountsQuery.data?.accounts ?? []
  const templates = templatesQuery.data?.templates ?? []
  const payouts = payoutsQuery.data?.payouts ?? []

  const activeEvals = evaluations.filter((e) => e.status === 'active')
  const activeEvalAccountIds = new Set(activeEvals.map((e) => e.accountId))
  const accountsWithoutEval = accounts.filter((a) => !activeEvalAccountIds.has(a.id))

  const defaultTemplate = templates.find((t) => t.isDefault) ?? templates[0]

  // ─── Open configure modal ────────────────────────────────────────────────────

  function openConfigureModal(
    account: { id: string; name: string; broker: string; startingBalance?: string },
    existingEval: PropEvaluation | null
  ) {
    // Auto-detect LucidFlex template for accounts matching LFE*
    const isLFE = /^LFE/i.test(account.name)
    const lucidTemplate = isLFE
      ? (templates.find((t) => /lucid/i.test(t.firmName)) ?? null)
      : null

    const autoTemplateId =
      existingEval?.templateId ??
      lucidTemplate?.id ??
      defaultTemplate?.id ??
      ''

    const startingBalance =
      account.startingBalance ??
      existingEval?.account?.startingBalance ??
      '0'

    setConfigureForm({
      accountName: account.name,
      startingBalance,
      templateId: autoTemplateId,
      stage: existingEval?.stage ?? 'evaluation',
      startDate: existingEval?.startDate ?? new Date().toISOString().split('T')[0],
      profitTargetOverride:
        existingEval?.profitTargetOverride != null
          ? String(existingEval.profitTargetOverride)
          : '',
      status: existingEval?.status ?? 'active',
    })

    setConfigureModal({
      accountId: account.id,
      accountName: account.name,
      broker: account.broker,
      startingBalance,
      existingEval,
    })

    // Fetch earliest trading day for default start date (only if creating new eval)
    if (!existingEval) {
      fetch(`/api/accounts/${account.id}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { earliestTradingDay?: string | null } | null) => {
          if (data?.earliestTradingDay) {
            setConfigureForm((f) => ({ ...f, startDate: data.earliestTradingDay! }))
          }
        })
        .catch(() => {})
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="px-6 py-6 flex flex-col gap-8">
      {/* ── Section 1: Account Cards ──────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-[var(--foreground)]">Prop Firm HQ</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
              Evaluation funnel, rule status, and payout tracker.
            </p>
          </div>
        </div>

        {evalsQuery.isLoading || accountsQuery.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-64 rounded-lg bg-[var(--card)] border border-[var(--border)] animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {/* Active eval cards */}
            {activeEvals.map((evaluation) => (
              <EvalCard
                key={evaluation.id}
                evaluation={evaluation}
                onAdvance={setAdvanceModal}
                onDelete={setDeleteEvalModal}
                onConfigure={(ev) => {
                  const acct = ev.account
                    ? {
                        id: ev.accountId,
                        name: ev.account.name,
                        broker: ev.account.broker,
                        startingBalance: ev.account.startingBalance,
                      }
                    : { id: ev.accountId, name: 'Unknown', broker: '' }
                  openConfigureModal(acct, ev)
                }}
              />
            ))}
            {/* Accounts without eval */}
            {accountsWithoutEval.map((account) => (
              <NoEvalCard
                key={account.id}
                account={account}
                onConfigure={(a) => openConfigureModal(a, null)}
              />
            ))}
            {/* Empty state */}
            {activeEvals.length === 0 && accountsWithoutEval.length === 0 && (
              <div className="col-span-full flex items-center justify-center h-32 rounded-lg border border-dashed border-[var(--border)] text-sm text-[var(--muted-foreground)]">
                No accounts found. Add a trading account first.
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Section 2: Payout Tracker ─────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[var(--foreground)] flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[var(--muted-foreground)]" />
            Payout Tracker
          </h2>
          <button
            onClick={() => setLogPayoutModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm bg-[var(--color-accent-primary)] text-white hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Log Payout
          </button>
        </div>

        <div className="rounded-lg border border-[var(--border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--secondary)]">
                {['Account', 'Amount', 'Payout #', 'Status', 'Requested', 'Paid', 'Notes', ''].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payoutsQuery.isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[var(--muted-foreground)] text-sm">
                    Loading…
                  </td>
                </tr>
              ) : payouts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[var(--muted-foreground)] text-sm">
                    No payouts logged yet.
                  </td>
                </tr>
              ) : (
                payouts.map((payout) => {
                  const isPaid = payout.status === 'paid'
                  const evalRecord = payout.evaluation as {
                    stage?: string
                    account?: { name?: string }
                  } | undefined
                  return (
                    <tr
                      key={payout.id}
                      className="border-b border-[var(--border)] hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                        {evalRecord?.account?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-[var(--color-green)]">
                        {fmt$(payout.amount)}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)]">
                        #{payout.payoutNumber}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider',
                            isPaid
                              ? 'bg-[var(--color-green-muted)] text-[var(--color-green)]'
                              : 'bg-[var(--color-yellow-muted)] text-[var(--color-yellow)]'
                          )}
                        >
                          {payout.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)] text-xs">
                        {fmtDate(payout.requestedAt)}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)] text-xs">
                        {fmtDate(payout.paidAt)}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)] text-xs max-w-[120px] truncate">
                        {payout.notes ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        {!isPaid && (
                          <button
                            onClick={() => markPayoutPaidMutation.mutate(payout.id)}
                            className="text-xs text-[var(--color-green)] hover:underline"
                          >
                            Mark paid
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Section 3: Template Manager ───────────────────────────────────────── */}
      <section>
        <button
          className="flex items-center gap-2 mb-4 text-base font-semibold text-[var(--foreground)] hover:text-[var(--foreground)] w-full text-left"
          onClick={() => setShowTemplates((v) => !v)}
        >
          {showTemplates ? (
            <ChevronDown className="w-4 h-4 text-[var(--muted-foreground)]" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)]" />
          )}
          <TrendingUp className="w-4 h-4 text-[var(--muted-foreground)]" />
          Template Manager
          <span className="text-sm font-normal text-[var(--muted-foreground)]">
            ({templates.length} template{templates.length !== 1 ? 's' : ''})
          </span>
        </button>

        {showTemplates && (
          <div className="flex flex-col gap-3">
            {templatesQuery.isLoading ? (
              <div className="h-16 rounded-lg bg-[var(--card)] border border-[var(--border)] animate-pulse" />
            ) : templates.length === 0 ? (
              <div className="text-sm text-[var(--muted-foreground)] py-4">
                No templates found.
              </div>
            ) : (
              templates.map((template) => (
                <TemplateEditor
                  key={template.id}
                  template={template}
                  onSave={(id, updates) => saveTemplateMutation.mutate({ id, updates })}
                  onDelete={(id) => deleteTemplateMutation.mutate(id)}
                  onSetDefault={(id) => setDefaultTemplateMutation.mutate(id)}
                />
              ))
            )}

            {/* Add new template */}
            <button
              onClick={() => {
                const body = {
                  firmName: 'Custom',
                  templateName: 'New Template',
                  rulesJson: {
                    evaluation: { profitTarget: null, maxDailyLoss: null, minTradingDays: null, consistencyPct: null },
                    pa: { profitTarget: null, maxDailyLoss: null, minTradingDays: null, consistencyPct: null },
                    funded: { profitTarget: null, maxDailyLoss: null, minTradingDays: null, consistencyPct: null },
                  },
                  isDefault: false,
                }
                fetch('/api/prop/templates', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(body),
                })
                  .then(() => queryClient.invalidateQueries({ queryKey: ['prop-templates'] }))
                  .catch(console.error)
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-[var(--border)] text-sm text-[var(--muted-foreground)] hover:bg-white/5 hover:text-[var(--foreground)] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Template
            </button>
          </div>
        )}
      </section>

      {/* ── Modal: Configure Account ──────────────────────────────────────────── */}
      <Modal
        open={configureModal !== null}
        onClose={() => setConfigureModal(null)}
        title={configureModal ? `Configure — ${configureModal.accountName}` : 'Configure'}
        wide
      >
        {configureModal && (
          <div className="flex flex-col gap-4">
            {/* Row 1: Account name + Starting balance */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <FieldLabel>Account Name</FieldLabel>
                <FieldInput
                  value={configureForm.accountName}
                  onChange={(v) => setConfigureForm((f) => ({ ...f, accountName: v }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <FieldLabel>Starting Balance ($)</FieldLabel>
                <FieldInput
                  type="number"
                  value={configureForm.startingBalance}
                  onChange={(v) => setConfigureForm((f) => ({ ...f, startingBalance: v }))}
                  placeholder="e.g. 50000"
                />
              </div>
            </div>

            {/* Row 2: Template */}
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Prop Template</FieldLabel>
              <FieldSelect
                value={configureForm.templateId}
                onChange={(v) => setConfigureForm((f) => ({ ...f, templateId: v }))}
              >
                <option value="">Select template…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.firmName} — {t.templateName}
                  </option>
                ))}
              </FieldSelect>
            </div>

            {/* Row 3: Stage + Status */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <FieldLabel>Stage</FieldLabel>
                <FieldSelect
                  value={configureForm.stage}
                  onChange={(v) => setConfigureForm((f) => ({ ...f, stage: v }))}
                >
                  <option value="evaluation">Evaluation</option>
                  <option value="pa">PA</option>
                  <option value="funded">Funded</option>
                </FieldSelect>
              </div>
              <div className="flex flex-col gap-1.5">
                <FieldLabel>Status</FieldLabel>
                <FieldSelect
                  value={configureForm.status}
                  onChange={(v) => setConfigureForm((f) => ({ ...f, status: v }))}
                >
                  <option value="active">Active</option>
                  <option value="passed">Passed</option>
                  <option value="failed">Failed</option>
                  <option value="withdrawn">Withdrawn</option>
                </FieldSelect>
              </div>
            </div>

            {/* Row 4: Start date + Profit target override */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <FieldLabel>Start Date</FieldLabel>
                <FieldInput
                  type="date"
                  value={configureForm.startDate}
                  onChange={(v) => setConfigureForm((f) => ({ ...f, startDate: v }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <FieldLabel>Profit Target Override ($) <span className="text-[10px] opacity-60">optional</span></FieldLabel>
                <FieldInput
                  type="number"
                  value={configureForm.profitTargetOverride}
                  onChange={(v) => setConfigureForm((f) => ({ ...f, profitTargetOverride: v }))}
                  placeholder="Leave blank for template default"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setConfigureModal(null)}
                className="px-4 py-2 rounded-md border border-[var(--border)] text-sm text-[var(--muted-foreground)] hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                disabled={configureMutation.isPending}
                onClick={() => configureMutation.mutate({ target: configureModal, form: configureForm })}
                className="px-4 py-2 rounded-md bg-[var(--color-accent-primary)] text-white text-sm hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
              >
                {configureMutation.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: Delete Evaluation ─────────────────────────────────────────── */}
      <Modal
        open={deleteEvalModal !== null}
        onClose={() => setDeleteEvalModal(null)}
        title="Delete Evaluation"
      >
        {deleteEvalModal && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-[var(--muted-foreground)]">
              Delete this evaluation for{' '}
              <strong className="text-[var(--foreground)]">
                {deleteEvalModal.account?.name ?? 'this account'}
              </strong>
              ? This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteEvalModal(null)}
                className="px-4 py-2 rounded-md border border-[var(--border)] text-sm text-[var(--muted-foreground)] hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                disabled={deleteEvalMutation.isPending}
                onClick={() => deleteEvalMutation.mutate(deleteEvalModal.id)}
                className="px-4 py-2 rounded-md bg-[var(--color-red)] text-white text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {deleteEvalMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: Advance Stage ──────────────────────────────────────────────── */}
      <Modal
        open={advanceModal !== null}
        onClose={() => setAdvanceModal(null)}
        title="Advance to Next Stage"
      >
        {advanceModal && (() => {
          const next = nextStage(advanceModal.stage)
          return (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-[var(--muted-foreground)]">
                Are you sure you want to advance{' '}
                <strong className="text-[var(--foreground)]">
                  {advanceModal.account?.name}
                </strong>{' '}
                from{' '}
                <strong className="text-[var(--foreground)]">
                  {STAGE_LABELS[advanceModal.stage]}
                </strong>{' '}
                to{' '}
                <strong className="text-[var(--foreground)]">
                  {next ? STAGE_LABELS[next] : '—'}
                </strong>
                ?
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                The start date for the new stage will be set to today.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setAdvanceModal(null)}
                  className="px-4 py-2 rounded-md border border-[var(--border)] text-sm text-[var(--muted-foreground)] hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  disabled={!next || advanceStageMutation.isPending}
                  onClick={() => {
                    if (next) advanceStageMutation.mutate({ id: advanceModal.id, stage: next })
                  }}
                  className="px-4 py-2 rounded-md bg-[var(--color-accent-primary)] text-white text-sm hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
                >
                  {advanceStageMutation.isPending ? 'Advancing…' : 'Confirm Advance'}
                </button>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* ── Modal: Log Payout ─────────────────────────────────────────────────── */}
      <Modal
        open={logPayoutModal}
        onClose={() => setLogPayoutModal(false)}
        title="Log Payout"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Evaluation</FieldLabel>
            <FieldSelect
              value={payoutForm.evaluationId}
              onChange={(v) => setPayoutForm((f) => ({ ...f, evaluationId: v }))}
            >
              <option value="">Select evaluation…</option>
              {activeEvals.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.account?.name ?? e.accountId} — {STAGE_LABELS[e.stage]}
                </option>
              ))}
            </FieldSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Amount ($)</FieldLabel>
            <FieldInput
              type="number"
              value={payoutForm.amount}
              onChange={(v) => setPayoutForm((f) => ({ ...f, amount: v }))}
              placeholder="e.g. 500"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Status</FieldLabel>
            <FieldSelect
              value={payoutForm.status}
              onChange={(v) => setPayoutForm((f) => ({ ...f, status: v }))}
            >
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </FieldSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Notes (optional)</FieldLabel>
            <FieldInput
              value={payoutForm.notes}
              onChange={(v) => setPayoutForm((f) => ({ ...f, notes: v }))}
              placeholder="e.g. First payout"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setLogPayoutModal(false)}
              className="px-4 py-2 rounded-md border border-[var(--border)] text-sm text-[var(--muted-foreground)] hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              disabled={!payoutForm.evaluationId || !payoutForm.amount || logPayoutMutation.isPending}
              onClick={() => logPayoutMutation.mutate(payoutForm)}
              className="px-4 py-2 rounded-md bg-[var(--color-accent-primary)] text-white text-sm hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
            >
              {logPayoutMutation.isPending ? 'Saving…' : 'Log Payout'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
