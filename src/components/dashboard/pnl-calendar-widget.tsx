'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFiltersStore } from '@/stores/filters'
import type { Trade } from '@/types/trades'

// Helpers
function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay()
}

function fmtMon(d: Date) {
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function fmtStrDate(date: Date) {
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function PnlCalendarWidget() {
    const [calendarDate, setCalendarDate] = useState(new Date())
    const [hoveredDay, setHoveredDay] = useState<{
        day: number
        month: number
        year: number
        x: number
        y: number
        pnl: number
        trades: number
        winRate: number
    } | null>(null)
    const { accountIds } = useFiltersStore()
    const accountId = accountIds[0] ?? ''

    const year = calendarDate.getFullYear()
    const month = calendarDate.getMonth()

    // Determine query range based on month bounds
    const startDate = new Date(year, month, 1)
    const endDate = new Date(year, month + 1, 0)

    // We fetch all trades within finding range
    const fromStr = fmtStrDate(startDate) + 'T00:00:00'
    const toStr = fmtStrDate(endDate) + 'T23:59:59'

    const { data: fetchRes, isLoading } = useQuery<{ trades: Trade[] }>({
        queryKey: ['trades', accountId, fromStr, toStr],
        queryFn: async () => {
            const res = await fetch(`/api/trades?account_id=${accountId}&date_from=${fromStr.split('T')[0]}&date_to=${toStr.split('T')[0]}`)
            if (!res.ok) throw new Error('Failed to fetch trades')
            return res.json()
        },
        enabled: !!accountId
    })

    const trades = fetchRes?.trades || []

    // Grouping logic
    const daysInMonth = getDaysInMonth(year, month)
    const firstDay = getFirstDayOfMonth(year, month)

    // Setup day map
    const dayStats: Record<number, { pnl: number, count: number, winCount: number, maxR: number | null }> = {}
    for (let i = 1; i <= daysInMonth; i++) {
        dayStats[i] = { pnl: 0, count: 0, winCount: 0, maxR: null }
    }

    let monthlyTotal = 0
    let monthlyDaysTraded = 0

    trades.forEach(t => {
        const tDate = new Date(t.tradingDay + 'T12:00:00')
        // Verify it belongs to currently viewed month
        if (tDate.getFullYear() === year && tDate.getMonth() === month) {
            const d = tDate.getDate()
            dayStats[d].pnl += parseFloat(t.netPnl)
            dayStats[d].count += 1
            if (parseFloat(t.netPnl) > 0) dayStats[d].winCount += 1
            if (t.rMultiple) {
                const rVal = parseFloat(t.rMultiple)
                dayStats[d].maxR = dayStats[d].maxR === null ? rVal : Math.max(dayStats[d].maxR!, rVal)
            }
        }
    })

    for (let i = 1; i <= daysInMonth; i++) {
        monthlyTotal += dayStats[i].pnl
        if (dayStats[i].count > 0) monthlyDaysTraded++
    }

    // Prev / Next actions
    const prevMonth = () => setCalendarDate(new Date(year, month - 1, 1))
    const nextMonth = () => setCalendarDate(new Date(year, month + 1, 1))

    // Grid rendering logic
    const weeks: { days: (number | null)[], pnl: number, daysTraded: number }[] = []
    let currentWeek: (number | null)[] = Array(7).fill(null)
    let currentDay = 1
    let weekPnl = 0
    let weekDaysTraded = 0

    // Fill first week offset
    for (let i = firstDay; i < 7 && currentDay <= daysInMonth; i++) {
        currentWeek[i] = currentDay
        weekPnl += dayStats[currentDay].pnl
        if (dayStats[currentDay].count > 0) weekDaysTraded++
        currentDay++
    }
    weeks.push({ days: currentWeek, pnl: weekPnl, daysTraded: weekDaysTraded })

    while (currentDay <= daysInMonth) {
        currentWeek = Array(7).fill(null)
        weekPnl = 0
        weekDaysTraded = 0
        for (let i = 0; i < 7 && currentDay <= daysInMonth; i++) {
            currentWeek[i] = currentDay
            weekPnl += dayStats[currentDay].pnl
            if (dayStats[currentDay].count > 0) weekDaysTraded++
            currentDay++
        }
        weeks.push({ days: currentWeek, pnl: weekPnl, daysTraded: weekDaysTraded })
    }

    const todayStr = fmtStrDate(new Date())

    return (
        <div className="flex flex-col h-full w-full">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#71717A] mb-2">P&L Calendar</h3>

            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <button onClick={prevMonth} className="text-[#71717A] hover:text-[#4ADE80] transition-colors duration-150">
                        <ChevronLeft size={18} />
                    </button>
                    <span className="text-[#FFFFFF] font-semibold text-[14px] w-28 text-center">{fmtMon(calendarDate)}</span>
                    <button onClick={nextMonth} className="text-[#71717A] hover:text-[#4ADE80] transition-colors duration-150">
                        <ChevronRight size={18} />
                    </button>
                </div>
                <div className="text-right">
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-[10px] text-[#52525B] font-semibold uppercase">Monthly:</span>
                        <span className={cn("text-sm font-mono-data font-semibold", monthlyTotal >= 0 ? "text-[#4ADE80]" : "text-[#EF4444]")}>
                            {monthlyTotal >= 0 ? '+' : ''}${Math.abs(monthlyTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[11px] text-[#71717A] ml-2">{monthlyDaysTraded} days</span>
                    </div>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 min-h-0 flex flex-col">
                {/* Day headers */}
                <div className="grid grid-cols-8 gap-1 mb-1 shrink-0">
                    {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(col => (
                        <div key={col} className="text-[#52525B] text-[10px] uppercase text-center font-medium">
                            {col}
                        </div>
                    ))}
                    <div className="text-[#52525B] text-[10px] uppercase text-right font-medium pr-1">
                        WEEK
                    </div>
                </div>

                {/* Weeks */}
                <div className="flex-1 flex flex-col gap-1 min-h-0 overflow-y-auto pr-1">
                    {isLoading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="h-4 w-4 rounded-full border-2 border-[var(--border)] border-t-[var(--muted-foreground)] animate-spin" />
                        </div>
                    ) : (
                        weeks.map((week, wIdx) => (
                            <div key={wIdx} className="grid grid-cols-8 gap-1 flex-1 min-h-[50px]">
                                {week.days.map((dayNum, dIdx) => {
                                    if (dayNum === null) {
                                        return <div key={dIdx} className="bg-transparent border border-transparent rounded-[6px]" />
                                    }

                                    const stats = dayStats[dayNum]
                                    const hasTrades = stats.count > 0
                                    const isProfit = stats.pnl >= 0

                                    const isToday = fmtStrDate(new Date(year, month, dayNum)) === todayStr

                                    return (
                                        <div key={dIdx}
                                            className={cn(
                                                "relative rounded-[6px] p-1.5 flex flex-col",
                                                hasTrades && isProfit ? "bg-[rgba(74,222,128,0.15)] border border-[rgba(74,222,128,0.3)] hover:brightness-110 transition-all cursor-default" :
                                                    hasTrades && !isProfit ? "bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.3)] hover:brightness-110 transition-all cursor-default" :
                                                        "bg-transparent border border-[#1f1f23]",
                                                isToday && !hasTrades && "border-[#4ADE80]"
                                            )}
                                            onMouseEnter={(e) => {
                                                if (!hasTrades) return
                                                const rect = e.currentTarget.getBoundingClientRect()
                                                setHoveredDay({
                                                    day: dayNum,
                                                    month,
                                                    year,
                                                    x: rect.left + rect.width / 2,
                                                    y: rect.top,
                                                    pnl: stats.pnl,
                                                    trades: stats.count,
                                                    winRate: (stats.winCount / stats.count) * 100
                                                })
                                            }}
                                            onMouseLeave={() => setHoveredDay(null)}
                                        >
                                            <span className="text-[11px] text-[#A1A1AA] absolute pl-0.5 pt-0.5">{dayNum}</span>

                                            {hasTrades && (
                                                <div className="mt-auto text-right w-full">
                                                    <div className={cn("text-[11px] font-mono-data", isProfit ? "text-[#4ADE80]" : "text-[#EF4444]")}>
                                                        {isProfit ? '+' : ''}${Math.abs(stats.pnl).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                                                    </div>
                                                    <div className="flex justify-between items-center w-full mt-0.5">
                                                        <span className="text-[10px] text-[#A1A1AA]">
                                                            {stats.maxR !== null ? `${stats.maxR.toFixed(1)}R` : ''}
                                                        </span>
                                                        <span className="text-[10px] text-[#71717A]">
                                                            {stats.count} {stats.count === 1 ? 'tr' : 'trs'}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}

                                {/* Week Summary col */}
                                <div className="flex flex-col items-end justify-center pl-2">
                                    <span className="text-[10px] text-[#52525B]">WEEK {wIdx + 1}</span>
                                    {week.daysTraded > 0 ? (
                                        <>
                                            <span className={cn("text-[12px] font-mono-data font-medium", week.pnl >= 0 ? "text-[#4ADE80]" : "text-[#EF4444]")}>
                                                {week.pnl >= 0 ? '+' : ''}${Math.abs(week.pnl).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                                            </span>
                                            <span className="text-[10px] text-[#71717A] mt-0.5">{week.daysTraded} days</span>
                                        </>
                                    ) : (
                                        <span className="text-[12px] font-mono-data text-[#52525B] mt-0.5">—</span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Tooltip */}
            {hoveredDay && typeof window !== 'undefined' && (
                <div
                    className="fixed pointer-events-none z-50 flex flex-col"
                    style={{
                        top: hoveredDay.y - 8,
                        left: hoveredDay.x,
                        transform: 'translate(-50%, -100%)',
                        background: '#18181B',
                        border: '1px solid #27272A',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                        minWidth: '140px'
                    }}
                >
                    <span className="text-[#A1A1AA] text-[12px] mb-1">
                        {new Date(hoveredDay.year, hoveredDay.month, hoveredDay.day).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </span>
                    <span className={cn(
                        "font-mono-data text-[14px] font-semibold mb-2",
                        hoveredDay.pnl >= 0 ? "text-[#4ADE80]" : "text-[#EF4444]"
                    )}>
                        {hoveredDay.pnl >= 0 ? '+' : ''}${Math.abs(hoveredDay.pnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <div className="flex justify-between items-center">
                        <span className="text-[#71717A] text-[11px]">{hoveredDay.trades} {hoveredDay.trades === 1 ? 'trade' : 'trades'}</span>
                        <span className="text-[#FFFFFF] text-[11px]">{hoveredDay.winRate.toFixed(1)}%</span>
                    </div>
                </div>
            )}
        </div>
    )
}
