'use client'

import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'
import type { EquityPoint } from '@/types/dashboard'

interface EquityCurveWidgetProps {
  data: EquityPoint[]
  isLoading?: boolean
}

export function EquityCurveWidget({ data, isLoading }: EquityCurveWidgetProps) {
  if (isLoading) {
    return (
      <div className="h-full flex flex-col gap-2 p-1">
        <div className="h-4 w-28 rounded bg-[var(--secondary)] animate-pulse" />
        <div className="flex-1 rounded bg-[var(--secondary)] animate-pulse" />
      </div>
    )
  }

  const hasData = data.length > 0
  const finalValue = hasData ? data[data.length - 1].value : 0
  const isPositive = finalValue >= 0
  const strokeColor = isPositive ? 'var(--color-green)' : 'var(--color-red)'

  if (!hasData) {
    return (
      <div className="h-full flex flex-col gap-2 p-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Equity Curve (30d)
        </span>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-[var(--muted-foreground)]">No data yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col gap-2 p-1">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Equity Curve (30d)
        </span>
        <span
          className="text-sm font-mono font-semibold"
          style={{ color: strokeColor }}
        >
          {finalValue >= 0 ? '+' : ''}$
          {Math.abs(finalValue).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                fontSize: '11px',
                color: 'var(--foreground)',
              }}
              formatter={(value: number | undefined) => [
                value != null ? `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '$0.00',
                'Equity',
              ]}
              labelFormatter={(label) => label}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={strokeColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, fill: strokeColor }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
