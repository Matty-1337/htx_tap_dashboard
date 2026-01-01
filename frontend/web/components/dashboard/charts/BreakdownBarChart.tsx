'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ChartCard } from './ChartCard'
import clsx from 'clsx'

interface BreakdownBarChartProps {
  data: any[]
  categoryKey: string
  valueKey: string
  title?: string
  subtitle?: string
  selectedCategory?: string
  onBarClick?: (category: string) => void
  maxItems?: number
  className?: string
}

export function BreakdownBarChart({
  data,
  categoryKey,
  valueKey,
  title = 'Breakdown',
  subtitle,
  selectedCategory,
  onBarClick,
  maxItems = 8,
  className,
}: BreakdownBarChartProps) {
  if (!data || data.length === 0) {
    return null
  }

  // Sort and limit
  const sortedData = [...data]
    .sort((a, b) => {
      const aVal = typeof a[valueKey] === 'number' ? a[valueKey] : 0
      const bVal = typeof b[valueKey] === 'number' ? b[valueKey] : 0
      return bVal - aVal
    })
    .slice(0, maxItems)

  const handleClick = (data: any) => {
    if (onBarClick && data?.activePayload?.[0]?.payload) {
      const category = data.activePayload[0].payload[categoryKey]
      onBarClick(category)
    }
  }

  return (
    <ChartCard title={title} subtitle={subtitle} className={className}>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={sortedData} onClick={handleClick} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis type="number" stroke="#6b7280" style={{ fontSize: '12px' }} />
          <YAxis
            type="category"
            dataKey={categoryKey}
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            width={120}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          />
          <Bar dataKey={valueKey} radius={[0, 8, 8, 0]}>
            {sortedData.map((entry, index) => {
              const isSelected = entry[categoryKey] === selectedCategory
              return (
                <Cell
                  key={`cell-${index}`}
                  fill={isSelected ? '#6366f1' : '#818cf8'}
                  stroke={isSelected ? '#4f46e5' : 'none'}
                  strokeWidth={isSelected ? 2 : 0}
                />
              )
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
