'use client'

import { motion } from 'framer-motion'
import { formatKpiValue, formatKey } from '@/lib/ui'
import clsx from 'clsx'

interface KpiCardProps {
  label: string
  value: number | string | null | undefined
  delay?: number
  className?: string
}

export function KpiCard({ label, value, delay = 0, className }: KpiCardProps) {
  const formattedValue = formatKpiValue(label, value)
  const displayLabel = formatKey(label)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      className={clsx(
        'bg-gradient-to-br from-white to-gray-50/50 backdrop-blur-sm',
        'border border-gray-200/50 rounded-xl p-6',
        'shadow-lg shadow-gray-200/30',
        'transition-all duration-300',
        className
      )}
    >
      <div className="text-sm font-medium text-gray-600 mb-2">{displayLabel}</div>
      <div className="text-3xl font-bold text-gray-900">{formattedValue}</div>
    </motion.div>
  )
}
