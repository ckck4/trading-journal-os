export type RubricCategory = {
    id: string
    rubricId: string
    name: string
    weight: number
    maxScore: number
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

export type ComputeGradeResult = {
    numericScore: number
    letterGrade: string
    categoryScores: Record<string, number>
}
