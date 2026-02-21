import { create } from 'zustand'

export type DatePreset = 'today' | 'this_week' | 'this_month' | 'last_30d' | 'custom'

export interface FiltersState {
  accountIds: string[]
  datePreset: DatePreset
  dateFrom: string | null
  dateTo: string | null
  sessionIds: string[]
  instruments: string[]
  strategyIds: string[]

  setAccounts: (ids: string[]) => void
  setDatePreset: (preset: DatePreset) => void
  setDateRange: (from: string | null, to: string | null) => void
  setSessions: (ids: string[]) => void
  setInstruments: (symbols: string[]) => void
  setStrategies: (ids: string[]) => void
  reset: () => void
}

const defaultState = {
  accountIds: [],
  datePreset: 'this_month' as DatePreset,
  dateFrom: null,
  dateTo: null,
  sessionIds: [],
  instruments: [],
  strategyIds: [],
}

export const useFiltersStore = create<FiltersState>((set) => ({
  ...defaultState,

  setAccounts: (ids) => set({ accountIds: ids }),
  setDatePreset: (preset) => set({ datePreset: preset }),
  setDateRange: (from, to) => set({ dateFrom: from, dateTo: to }),
  setSessions: (ids) => set({ sessionIds: ids }),
  setInstruments: (symbols) => set({ instruments: symbols }),
  setStrategies: (ids) => set({ strategyIds: ids }),
  reset: () => set(defaultState),
}))
