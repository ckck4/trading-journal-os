'use client'

import { X, Upload } from 'lucide-react'
import { useImportModalStore } from '@/stores/import-modal'
import { cn } from '@/lib/utils'

export function ImportModal() {
  const { open, closeModal } = useImportModalStore()

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={closeModal}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-modal-title"
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2',
          'rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-lg)]',
          'p-6'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Upload size={18} className="text-[var(--color-accent-primary)]" />
            <h2 id="import-modal-title" className="text-base font-semibold text-[var(--foreground)]">
              Import Trades
            </h2>
          </div>
          <button
            onClick={closeModal}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-colors duration-150"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Drop zone placeholder */}
        <div className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed',
          'border-[var(--border)] bg-[var(--background)] py-12 px-6 text-center',
          'hover:border-[var(--color-accent-primary)] transition-colors duration-150'
        )}>
          <Upload size={32} className="text-[var(--muted-foreground)]" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-[var(--foreground)]">Drop your CSV file here</p>
            <p className="text-xs text-[var(--muted-foreground)]">or click to browse — Tradovate fills format supported</p>
          </div>
          <button className={cn(
            'mt-1 rounded-md border border-[var(--border)] bg-[var(--secondary)]',
            'px-4 py-1.5 text-xs font-medium text-[var(--foreground)]',
            'hover:border-[var(--color-accent-primary)] transition-colors duration-150'
          )}>
            Browse file
          </button>
        </div>

        {/* Footer note */}
        <p className="mt-3 text-xs text-[var(--muted-foreground)]">
          Import pipeline coming soon. Accepted: Tradovate fills CSV.
        </p>
      </div>
    </>
  )
}
