'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { motion } from 'framer-motion'
import clsx from 'clsx'

interface ServerGradeDonutProps {
  grades: {
    a: number
    b: number
    c: number
    d?: number
  }
  className?: string
}

const GRADE_COLORS = {
  a: '#22c55e', // Green
  b: '#22d3ee', // Cyan
  c: '#f59e0b', // Amber
  d: '#ef4444', // Red
}

export function ServerGradeDonut({ grades, className }: ServerGradeDonutProps) {
  const data = [
    { name: 'A Grade', value: grades.a, color: GRADE_COLORS.a },
    { name: 'B Grade', value: grades.b, color: GRADE_COLORS.b },
    { name: 'C Grade', value: grades.c, color: GRADE_COLORS.c },
    ...(grades.d ? [{ name: 'D Grade', value: grades.d, color: GRADE_COLORS.d }] : []),
  ].filter((item) => item.value > 0)

  const total = data.reduce((sum, item) => sum + item.value, 0)

  if (total === 0) {
    return (
      <div className={clsx('premium-card p-6', className)}>
        <h3 className="text-card-title mb-4">Server Grade Distribution</h3>
        <div className="text-center py-8">
          <p className="text-body muted">No server data available</p>
        </div>
      </div>
    )
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      const percentage = ((data.value / total) * 100).toFixed(0)
      return (
        <div
          className="px-4 py-2 rounded-lg"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--card-border)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <p className="text-body font-medium" style={{ color: data.payload.color }}>
            {data.name}
          </p>
          <p className="text-caption muted">
            {data.value} servers ({percentage}%)
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={clsx('premium-card p-6', className)}
    >
      <h3 className="text-card-title mb-4">Server Grade Distribution</h3>
      
      <div className="flex items-center gap-6">
        <ResponsiveContainer width="60%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        <div className="flex-1 space-y-3">
          {data.map((item) => {
            const percentage = ((item.value / total) * 100).toFixed(0)
            return (
              <div key={item.name} className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <div className="flex-1">
                  <div className="text-body font-medium">{item.name}</div>
                  <div className="text-caption muted">{item.value} servers</div>
                </div>
                <div className="text-body font-semibold">{percentage}%</div>
              </div>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}
