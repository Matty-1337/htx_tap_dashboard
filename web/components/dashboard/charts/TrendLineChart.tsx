'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { ChartCard } from './ChartCard'
import clsx from 'clsx'

interface TrendLineChartProps {
  data: any[]
  xKey: string
  yKey: string
  title?: string
  subtitle?: string
  selectedValue?: string | number
  onPointClick?: (value: string | number) => void
  className?: string
}

export function TrendLineChart({
  data,
  xKey,
  yKey,
  title = 'Trend',
  subtitle,
  selectedValue,
  onPointClick,
  className,
}: TrendLineChartProps) {
  if (!data || data.length === 0) {
    return null
  }

  const handleClick = (data: any) => {
    if (onPointClick && data?.activePayload?.[0]?.payload) {
      const value = data.activePayload[0].payload[xKey]
      onPointClick(value)
    }
  }

  return (
    <ChartCard title={title} subtitle={subtitle} className={className}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} onClick={handleClick}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey={xKey}
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey={yKey}
            stroke="#6366f1"
            strokeWidth={selectedValue ? 3 : 2}
            dot={{ fill: '#6366f1', r: 4 }}
            activeDot={{ r: 6 }}
            name={yKey}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
