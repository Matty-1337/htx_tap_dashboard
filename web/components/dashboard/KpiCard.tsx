'use client'

import { motion } from 'framer-motion'
import { formatKpiValue, formatKey } from '@/lib/ui'
import clsx from 'clsx'

interface KpiCardProps {
  label: string
  value: number | string | null | undefined
  filteredValue?: number | string | null | undefined
  delay?: number
  className?: string
}

export function KpiCard({ label, value, filteredValue, delay = 0, className }: KpiCardProps) {
  const formattedValue = formatKpiValue(label, value)
  const formattedFilteredValue = filteredValue !== undefined ? formatKpiValue(label, filteredValue) : null
  const displayLabel = formatKey(label)
  
  // Calculate delta percentage
  const delta = filteredValue !== undefined && value !== null && value !== undefined && typeof value === 'number' && typeof filteredValue === 'number'
    ? ((filteredValue - value) / value) * 100
    : null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      className={clsx('surface p-6 kpi-accent transition-all duration-300', className)}
    >
      <div className="text-sm font-medium mb-2 muted">{displayLabel}</div>
      <div className="text-3xl font-bold" style={{ color: 'var(--text)' }}>{formattedValue}</div>
      {formattedFilteredValue && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm muted">Filtered: {formattedFilteredValue}</span>
          {delta !== null && (
            <span
              className="text-xs font-medium px-2 py-0.5 rounded"
              style={{
                backgroundColor: delta < 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                color: delta < 0 ? 'rgba(239, 68, 68, 1)' : 'rgba(34, 197, 94, 1)',
              }}
            >
              Δ {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
            </span>
          )}
        </div>
      )}
    </motion.div>
  )
}
