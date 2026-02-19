// Grading types — shared between API routes and client components

export type RubricCategory = {
  id: string
  rubricId: string
  name: string
  weight: number      // 0-100, all weights in a rubric must sum to 100
  maxScore: number    // e.g. 10
  sortOrder: number
  description: string | null
}

export type Rubric = {
  id: string
  userId: string
  name: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
  categories: RubricCategory[]
}

export type TradeGrade = {
  id: string
  tradeId: string
  rubricId: string
  // categoryScores: { [categoryId]: score }
  categoryScores: Record<string, number>
  numericScore: number      // 0-100 weighted average
  letterGrade: string       // A, B, C, D
  confluenceResults: unknown[]
  notes: string | null
  createdAt: string
  updatedAt: string
  rubric?: Rubric            // populated on GET
}

export type ComputeGradeResult = {
  numericScore: number
  letterGrade: string
  categoryScores: Record<string, number>
}
