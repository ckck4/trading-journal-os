'use client'

import { cn } from '@/lib/utils'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'
import type { BalanceData, EquityPoint } from '@/types/dashboard'

interface CombinedEquityBalanceWidgetProps {
    balanceData: BalanceData | null
    equityData: EquityPoint[]
    isLoading?: boolean
}

function fmt$(n: number): string {
    const abs = Math.abs(n)
    const sign = n < 0 ? '-' : n > 0 ? '+' : ''
    return `${sign}$${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function CombinedEquityBalanceWidget({ balanceData, equityData, isLoading }: CombinedEquityBalanceWidgetProps) {
    if (isLoading) {
        return (
            <div className="h-full flex flex-col gap-4 p-1">
                {/* Top skeleton */}
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between">
                        <div className="h-4 w-24 rounded bg-[var(--secondary)] animate-pulse" />
                        <div className="h-4 w-20 rounded bg-[var(--secondary)] animate-pulse" />
                    </div>
                    <div className="h-8 w-36 rounded bg-[var(--secondary)] animate-pulse" />
                    <div className="h-3 w-48 rounded bg-[var(--secondary)] animate-pulse mt-1" />
                </div>
                {/* Bottom skeleton */}
                <div className="flex-1 rounded bg-[var(--secondary)] animate-pulse min-h-[120px]" />
            </div>
        )
    }

    if (!balanceData) {
        return (
            <div className="h-full flex items-center justify-center">
                <p className="text-sm text-[var(--muted-foreground)]">Select an account</p>
            </div>
        )
    }

    const drawdownPct =
        balanceData.maxDailyLossThreshold !== null && balanceData.maxDailyLossThreshold !== 0
            ? Math.min(
                100,
                Math.round((Math.abs(balanceData.maxDailyLoss) / Math.abs(balanceData.maxDailyLossThreshold)) * 100)
            )
            : 0

    const hasEquityData = equityData.length > 0
    const finalEquityValue = hasEquityData ? equityData[equityData.length - 1].value : 0
    const isEquityPositive = finalEquityValue >= 0
    const strokeColor = isEquityPositive ? '#3B82F6' : '#EF4444'

    return (
        <div className="h-full flex flex-col gap-4 p-1">
            {/* ── Top Section: Account Balance & Stats ── */}
            <div className="flex flex-col">
                <div className="flex items-baseline justify-between mb-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                        Account Balance
                    </span>
                    <span
                        className={cn(
                            'text-[12px] font-mono',
                            balanceData.netPnl >= 0 ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'
                        )}
                    >
                        {fmt$(balanceData.netPnl)}
                    </span>
                </div>

                {/* Current balance */}
                <span className="text-3xl font-mono font-bold tracking-tight text-[var(--foreground)]">
                    ${balanceData.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>

                {/* Start Balance & Drawdown text */}
                <div className="flex items-center justify-between mt-2">
                    <div className="text-xs text-[var(--muted-foreground)]">
                        Started at ${balanceData.startingBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                    {balanceData.maxDailyLossThreshold !== null && (
                        <div className="text-xs text-[var(--muted-foreground)]">
                            Daily PnL: <span className={balanceData.maxDailyLoss >= 0 ? "text-[var(--color-green)]" : "text-[var(--color-red)]"}>{fmt$(balanceData.maxDailyLoss)}</span>
                            {' '}<span className="opacity-50">/ {fmt$(balanceData.maxDailyLossThreshold)}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Bottom Section: Equity Curve Chart ── */}
            <div className="flex flex-col flex-1 min-h-[140px] border-t border-[var(--border)] pt-4 mt-2">
                <div className="flex items-baseline justify-between mb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                        Equity Curve (30d)
                    </span>
                    <span
                        className="text-xs font-mono font-medium"
                        style={{ color: strokeColor }}
                    >
                        {finalEquityValue >= 0 ? '+' : ''}$
                        {Math.abs(finalEquityValue).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}
                    </span>
                </div>

                <div className="flex-1 min-h-0 relative">
                    {!hasEquityData ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <p className="text-xs text-[var(--muted-foreground)]">No data yet</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={equityData} margin={{ top: 8, right: 4, left: 4, bottom: 4 }}>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'var(--card)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        color: 'var(--foreground)',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                                    }}
                                    formatter={(value: number | undefined) => [
                                        value != null ? `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '$0.00',
                                        'Equity',
                                    ]}
                                    labelStyle={{ color: 'var(--muted-foreground)', marginBottom: '4px' }}
                                    labelFormatter={(label) => label}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke={strokeColor}
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 4, fill: strokeColor, stroke: 'var(--card)', strokeWidth: 2 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        </div>
    )
}
