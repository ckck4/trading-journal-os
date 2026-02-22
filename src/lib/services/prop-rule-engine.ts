import { createAdminClient } from '@/lib/supabase/admin'
import { migrateRulesJson } from '@/lib/prop-migrate'
import type {
  StageRules,
  RuleResult,
  RuleStatus,
  EvaluateRulesResult,
  OverallStatus,
} from '@/types/prop'

// ─── Internal DB Row Types ────────────────────────────────────────────────────

type DailySummaryRow = {
  trading_day: string
  trade_count: number
  net_pnl: string
}

type EvalRow = {
  id: string
  user_id: string
  account_id: string
  template_id: string
  stage: string
  status: string
  start_date: string
  end_date: string | null
}

type TemplateRow = {
  id: string
  rules_json: unknown
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DEFAULT_STAGE_RULES: StageRules = {
  profitTarget: null,
  maxDailyLoss: null,
  maxTrailingDrawdown: null,
  minTradingDays: null,
  consistencyPct: null,
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function getStageRules(rulesJsonRaw: unknown, stage: string): StageRules {
  const migrated = migrateRulesJson(rulesJsonRaw)
  const found = migrated.stages.find((s) => s.key === stage)
  return found?.rules ?? migrated.stages[0]?.rules ?? DEFAULT_STAGE_RULES
}

function naRule(): RuleResult {
  return {
    status: 'pass',
    current: 0,
    threshold: null,
    progress: 100,
    direction: 'toward_target',
  }
}

// ─── Rule Engine ─────────────────────────────────────────────────────────────

/**
 * Pure server function — evaluates all prop firm rules for an active evaluation.
 * Reads daily_summaries for the account from eval start_date to today.
 * Uses admin client internally (bypasses RLS).
 * Called from API routes that have already authenticated the user.
 */
export async function evaluateRules(
  accountId: string,
  evaluationId: string
): Promise<EvaluateRulesResult> {
  const admin = createAdminClient()

  // 1. Fetch evaluation record
  const { data: evalData, error: evalErr } = await admin
    .from('prop_evaluations')
    .select('id, user_id, account_id, template_id, stage, status, start_date, end_date')
    .eq('id', evaluationId)
    .single()

  if (evalErr || !evalData) {
    throw new Error(`[evaluateRules] Evaluation not found: ${evaluationId}`)
  }

  const evalRow = evalData as EvalRow

  if (evalRow.account_id !== accountId) {
    throw new Error(`[evaluateRules] accountId mismatch for evaluation ${evaluationId}`)
  }

  // 2. Fetch template rules_json
  const { data: tmplData, error: tmplErr } = await admin
    .from('prop_templates')
    .select('id, rules_json')
    .eq('id', evalRow.template_id)
    .single()

  if (tmplErr || !tmplData) {
    throw new Error(`[evaluateRules] Template not found: ${evalRow.template_id}`)
  }

  const template = tmplData as TemplateRow
  const stageRules = getStageRules(template.rules_json, evalRow.stage)

  // 3. Fetch daily_summaries from start_date to today
  const today = new Date().toISOString().split('T')[0]

  const { data: summaryData, error: summaryErr } = await admin
    .from('daily_summaries')
    .select('trading_day, trade_count, net_pnl')
    .eq('user_id', evalRow.user_id)
    .eq('account_id', accountId)
    .gte('trading_day', evalRow.start_date)
    .lte('trading_day', today)
    .order('trading_day', { ascending: true })

  if (summaryErr) {
    throw new Error(`[evaluateRules] Failed to query daily_summaries: ${summaryErr.message}`)
  }

  const summaries = (summaryData ?? []) as DailySummaryRow[]

  // Days with at least one trade
  const tradingDays = summaries.filter((s) => s.trade_count > 0)

  // ─── Rule A: Max Daily Loss ────────────────────────────────────────────────
  // Pass if worst day >= threshold; violation if below; warning if within 20%

  let maxDailyLoss: RuleResult

  if (stageRules.maxDailyLoss === null) {
    maxDailyLoss = naRule()
  } else {
    const threshold = stageRules.maxDailyLoss           // e.g. -1500
    const warningThreshold = threshold * 0.8            // e.g. -1200
    const worstDay =
      tradingDays.length > 0
        ? Math.min(...tradingDays.map((s) => parseFloat(s.net_pnl)))
        : 0

    const progress = clamp(
      Math.round((Math.abs(worstDay) / Math.abs(threshold)) * 100),
      0,
      100
    )

    let status: RuleStatus
    if (worstDay < threshold) {
      status = 'violation'
    } else if (worstDay < warningThreshold) {
      status = 'warning'
    } else {
      status = 'pass'
    }

    maxDailyLoss = {
      status,
      current: Math.round(worstDay * 100) / 100,
      threshold,
      progress,
      direction: 'toward_limit',
    }
  }

  // ─── Rule B: Max Trailing Drawdown ────────────────────────────────────────
  // Trailing drawdown = worst (running_pnl - peak) across all days
  // Violation if worst drawdown < threshold (e.g. -2000)

  let maxTrailingDrawdown: RuleResult

  if (stageRules.maxTrailingDrawdown === null) {
    maxTrailingDrawdown = naRule()
  } else {
    const threshold = stageRules.maxTrailingDrawdown    // e.g. -2000
    const warningThreshold = threshold * 0.8            // e.g. -1600

    let runningPnl = 0
    let peak = 0
    let worstDrawdown = 0

    for (const s of summaries) {
      runningPnl += parseFloat(s.net_pnl)
      if (runningPnl > peak) peak = runningPnl
      const drawdown = runningPnl - peak  // <= 0
      if (drawdown < worstDrawdown) worstDrawdown = drawdown
    }

    const progress = clamp(
      Math.round((Math.abs(worstDrawdown) / Math.abs(threshold)) * 100),
      0,
      100
    )

    let status: RuleStatus
    if (worstDrawdown < threshold) {
      status = 'violation'
    } else if (worstDrawdown < warningThreshold) {
      status = 'warning'
    } else {
      status = 'pass'
    }

    maxTrailingDrawdown = {
      status,
      current: Math.round(worstDrawdown * 100) / 100,
      threshold,
      progress,
      direction: 'toward_limit',
    }
  }

  // ─── Rule C: Min Trading Days ──────────────────────────────────────────────
  // Pass if distinct active days >= threshold; pending otherwise

  let minTradingDays: RuleResult

  if (stageRules.minTradingDays === null) {
    minTradingDays = naRule()
  } else {
    const threshold = stageRules.minTradingDays
    const activeDays = tradingDays.length
    const progress = clamp(Math.round((activeDays / threshold) * 100), 0, 100)
    const status: RuleStatus = activeDays >= threshold ? 'pass' : 'pending'

    minTradingDays = {
      status,
      current: activeDays,
      threshold,
      progress,
      direction: 'toward_target',
    }
  }

  // ─── Rule D: Consistency ──────────────────────────────────────────────────
  // No single day > (consistency_threshold / 100) * profit_target
  // Only meaningful when there is a profit target and positive days

  let consistency: RuleResult

  if (stageRules.consistencyPct === null || stageRules.profitTarget === null) {
    consistency = naRule()
  } else {
    const threshold = stageRules.consistencyPct
    const profitTarget = stageRules.profitTarget
    const maxAllowedPnl = (threshold / 100) * Math.max(0, profitTarget)
    const positiveDays = summaries.filter((s) => parseFloat(s.net_pnl) > 0)

    if (positiveDays.length === 0 || maxAllowedPnl <= 0) {
      consistency = {
        status: 'pending',
        current: 0,
        threshold,
        progress: 0,
        direction: 'toward_limit',
      }
    } else {
      const maxDayPnl = Math.max(...positiveDays.map((s) => parseFloat(s.net_pnl)))
      const maxDayPct = (maxDayPnl / profitTarget) * 100
      const roundedPct = Math.round(maxDayPct * 10) / 10
      const progress = clamp(Math.round((maxDayPnl / maxAllowedPnl) * 100), 0, 100)
      const status: RuleStatus = maxDayPnl > maxAllowedPnl ? 'violation' : 'pass'

      consistency = {
        status,
        current: roundedPct,
        threshold,
        progress,
        direction: 'toward_limit',
      }
    }
  }

  // ─── Rule E: Profit Target ────────────────────────────────────────────────
  // Pass if cumulative net P&L >= threshold; pending with progress % otherwise

  let profitTarget: RuleResult

  if (stageRules.profitTarget === null) {
    profitTarget = naRule()
  } else {
    const threshold = stageRules.profitTarget
    const totalPnl = summaries.reduce((sum, s) => sum + parseFloat(s.net_pnl), 0)
    const progress = clamp(Math.round((Math.max(0, totalPnl) / threshold) * 100), 0, 100)
    const status: RuleStatus = totalPnl >= threshold ? 'pass' : 'pending'

    profitTarget = {
      status,
      current: Math.round(totalPnl * 100) / 100,
      threshold,
      progress,
      direction: 'toward_target',
    }
  }

  // ─── Overall Status ───────────────────────────────────────────────────────

  const allRules = [maxDailyLoss, maxTrailingDrawdown, minTradingDays, consistency, profitTarget]

  const hasViolation = allRules.some((r) => r.status === 'violation')
  const hasWarning = allRules.some((r) => r.status === 'warning')
  const allPass = allRules.every((r) => r.status === 'pass')

  let overallStatus: OverallStatus
  if (hasViolation) {
    overallStatus = 'violation'
  } else if (allPass) {
    overallStatus = 'passed'
  } else if (hasWarning) {
    overallStatus = 'warning'
  } else {
    overallStatus = 'on_track'
  }

  // ─── Summary Text ─────────────────────────────────────────────────────────

  const ruleNames = [
    'Max Daily Loss',
    'Max Trailing Drawdown',
    'Min Trading Days',
    'Consistency',
    'Profit Target',
  ]
  let summary: string

  if (overallStatus === 'passed') {
    summary = 'All rules satisfied — ready to advance'
  } else if (overallStatus === 'violation') {
    summary = 'Rule violation detected — review required'
  } else if (overallStatus === 'warning') {
    summary = 'Approaching limit — trade carefully'
  } else {
    const pendingRules = allRules
      .map((r, i) => (r.status === 'pending' ? ruleNames[i] : null))
      .filter(Boolean)
    summary =
      pendingRules.length > 0
        ? `In progress — ${pendingRules.join(', ')} pending`
        : 'On track — keep trading'
  }

  return {
    rules: { maxDailyLoss, maxTrailingDrawdown, minTradingDays, consistency, profitTarget },
    overallStatus,
    summary,
  }
}
