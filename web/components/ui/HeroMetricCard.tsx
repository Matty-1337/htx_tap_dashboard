'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import clsx from 'clsx'

interface HeroMetricCardProps {
  title: string
  value: string | number
  trend?: {
    value: number // percentage change
    period: string // e.g., "vs last period"
  }
  sparkline?: number[] // Array of values for sparkline
  onClick?: () => void
  className?: string
  delay?: number
  borderColor?: 'green' | 'gold' | 'red' | 'orange' | 'blue' // Colored top border
  detail?: string // Additional detail text below value (e.g., "17,406 orders processed")
}

export function HeroMetricCard({
  title,
  value,
  trend,
  sparkline,
  onClick,
  className,
  delay = 0,
  borderColor,
  detail,
}: HeroMetricCardProps) {
  const isPositive = trend && trend.value > 0
  const isNegative = trend && trend.value < 0
  const isNeutral = !trend || trend.value === 0

  // Format value
  const formattedValue = typeof value === 'number' 
    ? new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD',
        maximumFractionDigits: 0 
      }).format(value)
    : value

  // Border color mapping
  const borderColorMap = {
    green: '#00d4aa',
    gold: '#ffd700',
    red: '#ff4757',
    orange: '#ff9f43',
    blue: '#54a0ff',
  }

  const topBorderColor = borderColor ? borderColorMap[borderColor] : undefined

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onClick={onClick}
      className={clsx(
        'premium-card cursor-pointer group',
        className
      )}
      style={{
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Colored top border */}
      {topBorderColor && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            backgroundColor: topBorderColor,
          }}
        />
      )}
      {/* Title Row */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-card-title">{title}</span>
        {onClick && (
          <span className="text-caption muted opacity-0 group-hover:opacity-100 transition-opacity">
            Click to drill down →
          </span>
        )}
      </div>

      {/* Large Metric */}
      <div className="text-metric-large mb-2" style={{ color: 'var(--text-primary)' }}>
        {formattedValue}
      </div>

      {/* Detail Text */}
      {detail && (
        <div className="text-caption muted mb-2">
          {detail}
        </div>
      )}

      {/* Trend Indicator */}
      {trend && (
        <div className={clsx(
          'flex items-center gap-1 mb-4',
          isPositive && 'text-[var(--status-success)]',
          isNegative && 'text-[var(--status-danger)]',
          isNeutral && 'text-[var(--text-muted)]'
        )}>
          {isPositive && <TrendingUp size={16} />}
          {isNegative && <TrendingDown size={16} />}
          {isNeutral && <Minus size={16} />}
          <span className="text-caption font-medium">
            {isPositive ? '▲' : isNegative ? '▼' : '—'} {Math.abs(trend.value).toFixed(1)}% {trend.period}
          </span>
        </div>
      )}

      {/* Sparkline */}
      {sparkline && sparkline.length > 0 && (
        <div className="h-12 flex items-end gap-0.5">
          {sparkline.map((val, idx) => {
            const maxVal = Math.max(...sparkline)
            const height = (val / maxVal) * 100
            return (
              <div
                key={idx}
                className="flex-1 rounded-t"
                style={{
                  height: `${height}%`,
                  backgroundColor: isPositive 
                    ? 'var(--status-success)' 
                    : isNegative 
                    ? 'var(--status-danger)' 
                    : 'var(--text-muted)',
                  opacity: 0.7,
                  transition: 'all 0.3s ease',
                }}
              />
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
