'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts'
import { ChartCard } from './ChartCard'
import clsx from 'clsx'

interface StackedBarChartProps {
  data: Array<{ type: string; amount: number; percentage?: number }>
  title?: string
  subtitle?: string
  className?: string
}

const COLORS = ['#6366f1', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6']

export function StackedBarChart({
  data,
  title = 'Breakdown',
  subtitle,
  className,
}: StackedBarChartProps) {
  if (!data || data.length === 0) {
    return null
  }

  // Transform data for stacked bar chart
  const chartData = [
    {
      name: 'Leakage',
      ...data.reduce((acc, item, idx) => {
        acc[item.type] = item.amount
        return acc
      }, {} as Record<string, number>)
    }
  ]

  return (
    <ChartCard title={title} subtitle={subtitle} className={className}>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis type="number" stroke="#6b7280" style={{ fontSize: '12px' }} />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            width={80}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
            formatter={(value: number) => [
              `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
              ''
            ]}
          />
          <Legend />
          {data.map((item, index) => (
            <Bar
              key={item.type}
              dataKey={item.type}
              stackId="a"
              fill={COLORS[index % COLORS.length]}
              radius={index === data.length - 1 ? [0, 8, 8, 0] : [0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      {/* Show percentages if available */}
      {data.some(item => item.percentage !== undefined) && (
        <div className="mt-4 flex gap-4 flex-wrap text-sm" style={{ color: 'var(--muted)' }}>
          {data.map((item, index) => (
            <div key={item.type} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span>{item.type}: {item.percentage?.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}
    </ChartCard>
  )
}
