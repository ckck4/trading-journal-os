import { create } from 'zustand'

interface ImportModalState {
  open: boolean
  openModal: () => void
  closeModal: () => void
}

export const useImportModalStore = create<ImportModalState>((set) => ({
  open: false,
  openModal: () => set({ open: true }),
  closeModal: () => set({ open: false }),
}))
