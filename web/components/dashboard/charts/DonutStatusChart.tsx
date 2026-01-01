'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { ChartCard } from './ChartCard'
import clsx from 'clsx'

interface DonutStatusChartProps {
  data: any[]
  nameKey: string
  valueKey: string
  title?: string
  subtitle?: string
  selectedStatus?: string
  onSliceClick?: (status: string) => void
  className?: string
}

const COLORS = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff', '#f3f4f6']

export function DonutStatusChart({
  data,
  nameKey,
  valueKey,
  title = 'Status Distribution',
  subtitle,
  selectedStatus,
  onSliceClick,
  className,
}: DonutStatusChartProps) {
  if (!data || data.length === 0) {
    return null
  }

  const handleClick = (data: any) => {
    if (onSliceClick && data) {
      const status = data[nameKey]
      onSliceClick(status)
    }
  }

  return (
    <ChartCard title={title} subtitle={subtitle} className={className}>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            innerRadius={50}
            fill="#8884d8"
            dataKey={valueKey}
            onClick={handleClick}
          >
            {data.map((entry, index) => {
              const isSelected = entry[nameKey] === selectedStatus
              return (
                <Cell
                  key={`cell-${index}`}
                  fill={isSelected ? COLORS[0] : COLORS[index % COLORS.length]}
                  stroke={isSelected ? '#4f46e5' : 'none'}
                  strokeWidth={isSelected ? 3 : 0}
                />
              )
            })}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
