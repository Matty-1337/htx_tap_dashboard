'use client'

import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'

interface VolatilityAlertBannerProps {
  removeCount: number
  investigateCount: number
}

export function VolatilityAlertBanner({ removeCount, investigateCount }: VolatilityAlertBannerProps) {
  const totalActionItems = removeCount + investigateCount

  if (totalActionItems === 0) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="premium-card p-6 mb-6"
      style={{
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderLeft: '4px solid var(--status-danger)',
      }}
    >
      <div className="flex items-center gap-4">
        <div
          className="flex items-center justify-center w-12 h-12 rounded-full"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            color: 'var(--status-danger)',
          }}
        >
          <AlertTriangle size={24} />
        </div>
        <div className="flex-1">
          <h3 className="text-card-title mb-1">🚨 Immediate Action Required</h3>
          <p className="text-body">
            {totalActionItems} {totalActionItems === 1 ? 'item' : 'items'} need{' '}
            {removeCount > 0 && investigateCount > 0
              ? 'to be removed or investigated'
              : removeCount > 0
              ? 'to be removed from menu'
              : 'investigation'}
            {removeCount > 0 && (
              <span className="font-semibold"> ({removeCount} remove, {investigateCount} investigate)</span>
            )}
          </p>
        </div>
      </div>
    </motion.div>
  )
}
