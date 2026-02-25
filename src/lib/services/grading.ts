import type { RubricCategory, ComputeGradeResult } from '@/types/grading-legacy'

/**
 * Converts a numeric score (0-100) to a letter grade.
 * A >= 90, B >= 75, C >= 60, D < 60
 */
function toLetterGrade(numericScore: number): string {
  if (numericScore >= 90) return 'A'
  if (numericScore >= 75) return 'B'
  if (numericScore >= 60) return 'C'
  return 'D'
}

/**
 * Computes a weighted grade from category scores.
 *
 * Formula: sum(score/max_score * weight) / sum(weight) * 100
 *
 * Only categories that appear in both categoryScores and the categories array
 * are included. If no valid categories, returns { numericScore: 0, letterGrade: 'D', categoryScores: {} }.
 */
export function computeGrade(
  categoryScores: Record<string, number>,
  categories: RubricCategory[]
): ComputeGradeResult {
  // Filter to categories that have a score provided
  const validCategories = categories.filter((c) => categoryScores[c.id] !== undefined)

  if (validCategories.length === 0) {
    return { numericScore: 0, letterGrade: 'D', categoryScores: {} }
  }

  let weightedSum = 0
  let totalWeight = 0
  const includedScores: Record<string, number> = {}

  for (const category of validCategories) {
    const score = categoryScores[category.id]
    const maxScore = category.maxScore > 0 ? category.maxScore : 1
    const weight = parseFloat(String(category.weight))

    weightedSum += (score / maxScore) * weight
    totalWeight += weight
    includedScores[category.id] = score
  }

  const numericScore = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0
  const letterGrade = toLetterGrade(numericScore)

  return {
    numericScore,
    letterGrade,
    categoryScores: includedScores,
  }
}

/**
 * Creates auto-grade scores where each category receives Math.floor(maxScore / 2).
 */
export function createAutoGrade(
  categories: RubricCategory[]
): Record<string, number> {
  const scores: Record<string, number> = {}
  for (const category of categories) {
    scores[category.id] = Math.floor(category.maxScore / 2)
  }
  return scores
}
