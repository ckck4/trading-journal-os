// ============================================================
// Prop Firm HQ — Shared Types
// ============================================================

export type RuleStatus = 'pass' | 'warning' | 'violation' | 'pending'
export type OverallStatus = 'on_track' | 'warning' | 'violation' | 'passed'

// ─── Template / Rules Shape ───────────────────────────────────────────────────

export interface StageRules {
  profitTarget: number | null
  maxDailyLoss: number | null      // negative number, e.g. -1500
  minTradingDays: number | null
  consistencyPct: number | null    // e.g. 30 means no single day > 30% of total profit
}

export interface RulesJson {
  evaluation: StageRules
  pa: StageRules
  funded: StageRules
}

// ─── Rule Engine Result ───────────────────────────────────────────────────────

export interface RuleResult {
  status: RuleStatus
  current: number                      // raw current value
  threshold: number | null             // rule threshold (null = N/A)
  progress: number                     // 0–100
  direction: 'toward_target' | 'toward_limit'
}

export interface EvaluateRulesResult {
  rules: {
    maxDailyLoss: RuleResult
    minTradingDays: RuleResult
    consistency: RuleResult
    profitTarget: RuleResult
  }
  overallStatus: OverallStatus
  summary: string
}

// ─── Domain Types ─────────────────────────────────────────────────────────────

export interface PropTemplate {
  id: string
  userId: string
  firmName: string
  templateName: string
  version: number
  isDefault: boolean
  rulesJson: RulesJson
  createdAt: string
  updatedAt: string
}

export interface PropEvaluation {
  id: string
  userId: string
  accountId: string
  templateId: string
  stage: string
  status: string
  startDate: string
  endDate: string | null
  cumulativePnl: string
  maxDrawdown: string
  consistencyPct: string | null
  daysTraded: number
  violations: unknown[]
  profitTargetOverride: string | null
  createdAt: string
  updatedAt: string
  // Joined from accounts
  account?: {
    id: string
    name: string
    broker: string
    startingBalance: string
  }
  // Joined from prop_templates
  template?: {
    id: string
    templateName: string
    firmName: string
    rulesJson: RulesJson
  }
}

export interface Payout {
  id: string
  evaluationId: string
  userId: string
  amount: string
  payoutNumber: number
  status: string
  requestedAt: string
  paidAt: string | null
  notes: string | null
  // Joined
  evaluation?: {
    id: string
    stage: string
    accountId: string
    account?: { name: string }
  }
}
