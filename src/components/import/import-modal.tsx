'use client'

import { useRef, useState } from 'react'
import { X, Upload, FileText } from 'lucide-react'
import { useImportModalStore } from '@/stores/import-modal'
import { cn } from '@/lib/utils'

export function ImportModal() {
  const { open, closeModal } = useImportModalStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setSelectedFile(file)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0] ?? null
    if (file && file.name.endsWith('.csv')) {
      setSelectedFile(file)
    }
  }

  function handleClose() {
    setSelectedFile(null)
    setIsDragging(false)
    // Reset the input so the same file can be re-selected after clearing
    if (fileInputRef.current) fileInputRef.current.value = ''
    closeModal()
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
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
            onClick={handleClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-colors duration-150"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          id="csv-upload"
          type="file"
          accept=".csv"
          className="sr-only"
          onChange={handleFileChange}
        />

        {/* Drop zone — label makes the whole area clickable */}
        <label
          htmlFor="csv-upload"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed',
            'bg-[var(--background)] py-12 px-6 text-center cursor-pointer',
            'transition-colors duration-150',
            isDragging
              ? 'border-[var(--color-accent-primary)] bg-[var(--color-accent-muted)]'
              : selectedFile
              ? 'border-[var(--color-green)] bg-[var(--color-green-muted)]'
              : 'border-[var(--border)] hover:border-[var(--color-accent-primary)]'
          )}
        >
          {selectedFile ? (
            <>
              <FileText size={32} className="text-[var(--color-green)]" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-[var(--foreground)]">{selectedFile.name}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {(selectedFile.size / 1024).toFixed(1)} KB — click to change
                </p>
              </div>
            </>
          ) : (
            <>
              <Upload size={32} className={isDragging ? 'text-[var(--color-accent-primary)]' : 'text-[var(--muted-foreground)]'} />
              <div className="space-y-1">
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {isDragging ? 'Drop to upload' : 'Drop your CSV file here'}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">or click to browse — Tradovate fills format supported</p>
              </div>
            </>
          )}
        </label>

        {/* Footer: note + Start Import button */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-[var(--muted-foreground)]">
            Accepted: Tradovate fills CSV.
          </p>
          <button
            disabled={!selectedFile}
            className={cn(
              'rounded-md px-4 py-1.5 text-xs font-medium transition-colors duration-150',
              selectedFile
                ? 'bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--color-accent-hover)]'
                : 'bg-[var(--muted)] text-[var(--muted-foreground)] cursor-not-allowed'
            )}
          >
            Start Import
          </button>
        </div>
      </div>
    </>
  )
}
