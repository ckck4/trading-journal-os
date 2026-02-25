// Grading types — shared between API routes and client components

export type Confluence = {
  id: string
  userId: string
  strategyId: string
  name: string
  weight: number
  category: string
  createdAt: string
}

export type TradeGrade = {
  id: string
  userId: string
  tradeId: string
  grade: string
  riskManagementScore: number | null
  executionScore: number | null
  disciplineScore: number | null
  strategyScore: number | null
  efficiencyScore: number | null
  notes: string | null
  createdAt: string
  updatedAt: string
}
