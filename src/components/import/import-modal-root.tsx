'use client'

import { useImportModalStore } from '@/stores/import-modal'
import { ImportModal } from './import-modal'

/**
 * Thin client wrapper that connects the Zustand import-modal store
 * to the ImportModal component's open/onClose props.
 * Keeps (app)/layout.tsx as a server component.
 */
export function ImportModalRoot() {
  const { open, closeModal } = useImportModalStore()
  return <ImportModal open={open} onClose={closeModal} />
}
