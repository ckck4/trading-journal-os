import { useState, useEffect } from 'react'
import { Check, AlignLeft, Paperclip, Hash, Save as SaveIcon } from 'lucide-react'
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

    return (
        <div className="w-[40%] p-6 overflow-y-auto shrink-0 hidden sm:block">
            <div className="bg-[#18181B] border border-[#27272A] rounded-[12px] p-0 overflow-hidden h-fit w-full flex flex-col">

                {/* HEADER ROW */}
                <div className="px-4 py-3 flex items-center justify-between border-b border-[#27272A]">
                    <div className="flex items-center gap-2">
                        <AlignLeft size={16} className="text-[#4ADE80]" />
                        <span className="text-[#FFFFFF] font-semibold text-[14px]">
                            Daily Journal
                        </span>
                    </div>
                    <span className="text-[#52525B] text-[11px] italic">
                        Auto-saving enabled...
                    </span>
                </div>

                {/* TEXTAREA */}
                <textarea
                    className={cn(
                        'w-full min-h-[120px] resize-none p-4 text-[13px]',
                        'bg-transparent border-none outline-none text-[#A1A1AA]',
                        'placeholder:text-[#52525B]',
                        !trade && 'opacity-60 cursor-not-allowed'
                    )}
                    placeholder="Reflect on today's execution. Were the entries disciplined? How was the risk management..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={!trade || isSaving}
                />

                {/* BOTTOM BAR */}
                <div className="px-4 py-2.5 flex items-center justify-between border-t border-[#27272A]">
                    <div className="flex items-center gap-2">
                        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-transparent border border-[#27272A] rounded-[6px] text-[#71717A] text-xs hover:border-[#4ADE80] hover:text-[#A1A1AA] transition-colors">
                            <Paperclip size={14} />
                            Add Screenshot
                        </button>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-transparent border border-[#27272A] rounded-[6px] text-[#71717A] text-xs hover:border-[#4ADE80] hover:text-[#A1A1AA] transition-colors">
                            <Hash size={14} />
                            Tags
                        </button>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={!trade || isSaving}
                        className={cn(
                            'flex items-center gap-1.5 px-4 py-1.5 rounded-[6px] text-sm font-semibold transition-colors duration-150 relative',
                            'bg-[#4ADE80] text-[#000000] hover:bg-[#22c55e]',
                            'disabled:opacity-50 disabled:cursor-not-allowed',
                            showSaved && 'bg-[#22c55e] text-white'
                        )}
                    >
                        {showSaved ? (
                            <>
                                <Check size={14} />
                                Saved
                            </>
                        ) : isSaving ? (
                            'Saving...'
                        ) : (
                            <>
                                <SaveIcon size={14} />
                                Save Notes
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    )
}
