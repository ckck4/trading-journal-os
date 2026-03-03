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
        <div className="w-[40%] flex flex-col h-full bg-[#18181B] border-l border-[#27272A]">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-[#27272A]">
                <h2 className="text-[16px] font-semibold text-[#FFFFFF]">
                    {trade ? 'Trade Notes' : 'Daily Journal'}
                </h2>
                <span className="text-[12px] text-[#52525B] mt-1 block">
                    {headerText}
                </span>
            </div>

            {/* Editor Body */}
            <div className="flex-1 p-6 flex flex-col min-h-0 bg-transparent">
                {/* Context Label */}
                <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] text-[#71717A] uppercase tracking-[0.08em] font-medium">
                        Notes
                    </label>
                    {trade && (
                        <span className="text-[#A1A1AA] text-[12px] font-mono-data">
                            {trade.rootSymbol} · {new Date(trade.entryTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </span>
                    )}
                </div>

                <textarea
                    className={cn(
                        'flex-1 w-full resize-none p-3 font-mono text-[14px] leading-relaxed min-h-[160px]',
                        'bg-[#09090B] border border-[#27272A] rounded-[8px] text-[#E4E4E7]',
                        'focus:outline-none focus:border-[rgba(74,222,128,0.4)] focus:shadow-[0_0_0_1px_rgba(74,222,128,0.1)] focus:ring-0',
                        'transition-colors duration-200 placeholder:text-[#52525B]',
                        !trade && 'opacity-60 cursor-not-allowed'
                    )}
                    placeholder={trade ? "Write your journal entry..." : "Select a trade to write notes..."}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={!trade || isSaving}
                />

                {/* Save Action */}
                <div className="shrink-0 pt-3">
                    <button
                        onClick={handleSave}
                        disabled={!trade || isSaving}
                        className={cn(
                            'w-full flex items-center justify-center px-4 py-2 rounded-[6px] text-sm font-semibold transition-colors duration-150 relative h-9',
                            'bg-[#4ADE80] text-[#000000] hover:bg-[#22c55e]',
                            'disabled:opacity-50 disabled:cursor-not-allowed',
                            showSaved && 'bg-[#22c55e] text-white'
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
