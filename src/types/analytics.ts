// Analytics API response types — shared between API routes and client components

export type DayResult = {
  tradingDay: string          // YYYY-MM-DD
  tradeCount: number
  winCount: number
  lossCount: number
  breakevenCount: number
  netPnl: number
  grossPnl: number
  commissionTotal: number
  winRate: number | null      // 0-100
  profitFactor: number | null
  avgR: number | null
  cumulativePnl: number
}

export type AnalyticsSummary = {
  netPnl: number
  winRate: number             // 0-100
  profitFactor: number
  avgR: number
  totalTrades: number
  winCount: number
  lossCount: number
  avgWinner: number
  avgLoser: number
  largestWin: number
  largestLoss: number
  bestDay: { date: string; netPnl: number } | null
  worstDay: { date: string; netPnl: number } | null
}

export type BreakdownEntry = {
  key: string
  label: string
  wins: number
  losses: number
  breakevens: number
  netPnl: number
  winRate: number | null
}

export type AnalyticsBreakdowns = {
  byInstrument: BreakdownEntry[]
  bySession: BreakdownEntry[]
  byStrategy: BreakdownEntry[]
  rMultiples: number[]
  durations: number[]         // in seconds
}
