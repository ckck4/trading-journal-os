'use client'

import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Trade } from '@/types/trades'
import { useQueryClient } from '@tanstack/react-query'

interface NotebookPanelProps {
    trade: Trade | null
}

function formatDate(dateStr: string) {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function NotebookPanel({ trade }: NotebookPanelProps) {
    const queryClient = useQueryClient()
    const [notes, setNotes] = useState(trade?.notes || '')
    const [isSaving, setIsSaving] = useState(false)
    const [showSaved, setShowSaved] = useState(false)

    // Sync state when selected trade changes
    useEffect(() => {
        setNotes(trade?.notes || '')
        setShowSaved(false)
    }, [trade?.id, trade?.notes])

    const handleSave = async () => {
        if (!trade) return

        setIsSaving(true)
        try {
            const res = await fetch(`/api/trades/${trade.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ notes }),
            })

            if (!res.ok) throw new Error('Failed to save notes')

            // Invalidate queries so the list gets the updated notes text on next load
            await queryClient.invalidateQueries({ queryKey: ['trades'] })

            setShowSaved(true)
            setTimeout(() => setShowSaved(false), 2000)
        } catch (err) {
            console.error('Error saving notes:', err)
            // Standard app practice: toast or subtle alert, but for brevity here we log
        } finally {
            setIsSaving(false)
        }
    }

    // Header string
    const headerText = trade
        ? `${trade.rootSymbol} • ${formatDate(trade.tradingDay)}`
        : formatDate(new Date().toISOString().split('T')[0])

    return (
        <div className="w-[40%] flex flex-col h-full bg-[var(--background)]">
            {/* Header */}
            <div className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-[var(--border)]">
                <h2 className="text-sm font-semibold text-[var(--foreground)]">
                    {trade ? 'Trade Notes' : 'Daily Journal'}
                </h2>
                <span className="text-xs text-[var(--muted-foreground)] whitespace-nowrap overflow-hidden text-ellipsis">
                    {headerText}
                </span>
            </div>

            {/* Editor Body */}
            <div className="flex-1 p-6 flex flex-col min-h-0 bg-[var(--background)]">
                <textarea
                    className={cn(
                        'flex-1 w-full resize-none rounded-lg p-4 font-mono text-sm leading-relaxed',
                        'bg-[#14171E] border border-[#2A2F3E] text-[#E8EAF0]',
                        'focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)] focus:border-transparent',
                        'transition-colors duration-200 placeholder:text-[var(--muted-foreground)]',
                        !trade && 'opacity-60 cursor-not-allowed'
                    )}
                    placeholder={trade ? "Write your journal entry..." : "Select a trade to write notes..."}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={!trade || isSaving}
                />

                {/* Footer/Save Action */}
                <div className="shrink-0 pt-4 flex items-center justify-end">
                    <button
                        onClick={handleSave}
                        disabled={!trade || isSaving}
                        className={cn(
                            'relative flex items-center justify-center h-9 px-4 rounded-md text-sm font-medium transition-all duration-200',
                            'bg-[var(--foreground)] text-[var(--background)] hover:opacity-90',
                            'disabled:opacity-50 disabled:cursor-not-allowed',
                            showSaved && 'bg-[var(--color-green)] text-white hover:opacity-100'
                        )}
                    >
                        {showSaved ? (
                            <>
                                <Check size={16} className="mr-2" />
                                Saved
                            </>
                        ) : isSaving ? (
                            'Saving...'
                        ) : (
                            'Save Notes'
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
