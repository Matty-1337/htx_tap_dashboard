'use client'

import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

interface GoldenHoursBoxProps {
  revenue: number
  percentage: number
  orders: number
  hours?: string
}

export function GoldenHoursBox({ revenue, percentage, orders, hours = '10PM-1AM' }: GoldenHoursBoxProps) {
  // Don't render if no revenue
  if (revenue === 0) return null

  const [startHour, endHour] = hours.split('-')

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="premium-card p-8 mb-8 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 159, 67, 0.05) 100%)',
        border: '2px solid rgba(255, 215, 0, 0.4)',
      }}
    >
      {/* Decorative sparkles */}
      <div className="absolute top-4 right-4 opacity-20">
        <Sparkles size={48} style={{ color: '#ffd700' }} />
      </div>

      <div className="text-center relative z-10">
        {/* Title */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles size={24} style={{ color: '#ffd700' }} />
          <h3 className="text-2xl font-bold" style={{ color: '#ffd700' }}>
            🔥 Golden Hours Identified
          </h3>
        </div>

        {/* Time Display */}
        <div className="text-5xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          {startHour} — {endHour}
        </div>
        <p className="text-body muted mb-8">
          This {hours.includes('PM') ? '3-hour' : 'peak'} window generates more revenue than the other hours combined
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-8 mt-8">
          <div className="text-center">
            <div className="text-3xl font-bold mb-1" style={{ color: '#ffd700' }}>
              ${(revenue / 1000).toFixed(0)}K
            </div>
            <div className="text-caption muted">Revenue Generated</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold mb-1" style={{ color: '#ffd700' }}>
              {percentage.toFixed(1)}%
            </div>
            <div className="text-caption muted">Of Total Revenue</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold mb-1" style={{ color: '#ffd700' }}>
              {orders.toLocaleString()}
            </div>
            <div className="text-caption muted">Orders</div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
