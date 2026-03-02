// ============================================================
// Dashboard / Command Center — Shared Types
// ============================================================

import type { EvaluateRulesResult } from './prop'

export interface BalanceData {
  startingBalance: number
  currentBalance: number
  netPnl: number                       // cumulative net P&L
  maxDailyLoss: number                 // worst single day's pnl (0 if no days)
  maxDailyLossThreshold: number | null // template maxDailyLoss limit (null if no eval)
}

export interface EquityPoint {
  date: string
  value: number
}

export interface DailyPnlData {
  netPnl: number
  tradeCount: number
  winCount: number
  lossCount: number
}

export interface WinRateData {
  winRate: number
  totalTrades: number
  profitFactor: number
}

export interface RecentTrade {
  id: string
  instrument: string
  side: string
  netPnl: number
  entryTime: string
  grade: string | null
}

export interface GoalData {
  id: string
  name: string
  metric: string
  currentValue: number
  targetValue: number
  progress: number       // 0–100
  targetOperator: string
}

export interface WidgetData {
  balance: BalanceData | null
  equityCurve: EquityPoint[]
  dailyPnl: DailyPnlData | null
  winRate: WinRateData | null
  propRules: EvaluateRulesResult | null
  recentTrades: RecentTrade[]
  goals: GoalData[]
}
