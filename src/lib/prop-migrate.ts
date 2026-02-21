import type { TemplateStage } from '@/types/prop'

const EMPTY_RULES = {
  profitTarget: null,
  maxDailyLoss: null,
  maxTrailingDrawdown: null,
  minTradingDays: null,
  consistencyPct: null,
}

/**
 * Migrates rules_json to the new stages-array format.
 *
 * Old format: { evaluation: StageRules, pa: StageRules, funded: StageRules }
 * New format: { stages: [{ key, label, rules: StageRules }] }
 *
 * Pure function — importable from both client and server code.
 */
export function migrateRulesJson(raw: unknown): { stages: TemplateStage[] } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { stages: [] }
  }

  const obj = raw as Record<string, unknown>

  // Already new format — ensure all rules have maxTrailingDrawdown
  if (Array.isArray(obj.stages)) {
    return {
      stages: (obj.stages as TemplateStage[]).map((s) => ({
        ...s,
        rules: { ...EMPTY_RULES, ...s.rules },
      })),
    }
  }

  // Old format: { evaluation: StageRules, pa: StageRules, funded: StageRules }
  const legacyMap = [
    { key: 'evaluation', label: 'Evaluation' },
    { key: 'pa', label: 'PA' },
    { key: 'funded', label: 'Funded' },
  ]

  const stages: TemplateStage[] = legacyMap
    .filter(({ key }) => key in obj)
    .map(({ key, label }) => {
      const r = (obj[key] ?? {}) as Record<string, unknown>
      return {
        key,
        label,
        rules: {
          profitTarget: (r.profitTarget ?? null) as number | null,
          maxDailyLoss: (r.maxDailyLoss ?? null) as number | null,
          maxTrailingDrawdown: null,
          minTradingDays: (r.minTradingDays ?? null) as number | null,
          consistencyPct: (r.consistencyPct ?? null) as number | null,
        },
      }
    })

  if (stages.length === 0) {
    // Fallback: scaffold with 3 default stages
    return {
      stages: legacyMap.map(({ key, label }) => ({
        key,
        label,
        rules: { ...EMPTY_RULES },
      })),
    }
  }

  return { stages }
}
