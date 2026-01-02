'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import clsx from 'clsx'

interface RevenueHeatmapProps {
  data?: Array<{ hour?: number; day?: string; revenue?: number }>
  onCellClick?: (hour: number, day: string) => void
}

// Color scale: #1e1b4b → #312e81 → #4f46e5 → #6366f1 → #22d3ee
// Lower thresholds to make more cells visible (map "lights up" better)
const getColorForValue = (value: number, maxValue: number): string => {
  if (maxValue === 0) return '#1e1b4b'
  const ratio = value / maxValue
  
  // Lower thresholds: 5%, 15%, 30%, 50% (instead of 20%, 40%, 60%, 80%)
  if (ratio < 0.05) return '#1e1b4b'  // Very low: dark blue
  if (ratio < 0.15) return '#312e81'   // Low: medium dark blue
  if (ratio < 0.30) return '#4f46e5'   // Medium: indigo
  if (ratio < 0.50) return '#6366f1'   // High: light indigo
  return '#22d3ee'                     // Very high: cyan
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
// Heatmap displays 4PM-1AM plus 2AM row (11 hours: 16-23, 0-2)
const HOURS = [16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2]  // 4PM-11PM, 12AM-1AM, 2AM

export function RevenueHeatmap({ data = [], onCellClick }: RevenueHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{ hour: number; day: string } | null>(null)

  // Build heatmap data structure
  const heatmapData = useMemo(() => {
    const map = new Map<string, number>()
    let maxRevenue = 0

    data.forEach((item) => {
      const hour = item.hour ?? 0
      const day = item.day ?? 'Mon'
      const revenue = item.revenue ?? 0
      const key = `${hour}-${day}`
      
      map.set(key, (map.get(key) || 0) + revenue)
      maxRevenue = Math.max(maxRevenue, map.get(key) || 0)
    })

    return { map, maxRevenue }
  }, [data])

  // Find golden window (highest concentration)
  const goldenWindow = useMemo(() => {
    let maxRevenue = 0
    let goldenHour = 0
    let goldenDay = 'Mon'

    DAYS.forEach((day) => {
      HOURS.forEach((hour) => {
        const key = `${hour}-${day}`
        const revenue = heatmapData.map.get(key) || 0
        if (revenue > maxRevenue) {
          maxRevenue = revenue
          goldenHour = hour
          goldenDay = day
        }
      })
    })

    return { hour: goldenHour, day: goldenDay, revenue: maxRevenue }
  }, [heatmapData])

  const totalRevenue = Array.from(heatmapData.map.values()).reduce((a, b) => a + b, 0)
  const goldenPercentage = totalRevenue > 0 ? (goldenWindow.revenue / totalRevenue) * 100 : 0

  const formatHour = (hour: number) => {
    if (hour === 0) return '12AM'
    if (hour < 12) return `${hour}AM`
    if (hour === 12) return '12PM'
    return `${hour - 12}PM`
  }

  const formatRevenue = (revenue: number): string => {
    if (revenue === 0) return ''
    if (revenue >= 1000) {
      const thousands = revenue / 1000
      // Show one decimal place if < 10K, otherwise round to whole number
      return thousands < 10 ? `$${thousands.toFixed(1)}K` : `$${Math.round(thousands)}K`
    }
    return `$${Math.round(revenue)}`
  }

  return (
    <div className="premium-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-section-title mb-1">Revenue Heatmap: Day × Hour</h3>
          <p className="text-caption muted">Find your profit zones — darker green = more revenue</p>
        </div>
      </div>

      {heatmapData.maxRevenue === 0 ? (
        <div className="text-center py-12">
          <p className="text-body muted">No revenue data available for this period</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              {/* Day headers */}
              <div className="flex mb-2">
                <div className="w-16" /> {/* Hour column spacer */}
                {DAYS.map((day) => (
                  <div key={day} className="flex-1 text-center text-caption muted">
                    {day}
                  </div>
                ))}
              </div>

              {/* Hour rows */}
              {HOURS.map((hour) => (
                <div key={hour} className="flex items-center mb-1">
                  <div className="w-16 text-caption muted text-right pr-2">
                    {formatHour(hour)}
                  </div>
                  {DAYS.map((day) => {
                    const key = `${hour}-${day}`
                    const revenue = heatmapData.map.get(key) || 0
                    const color = getColorForValue(revenue, heatmapData.maxRevenue)
                    const isHovered = hoveredCell?.hour === hour && hoveredCell?.day === day
                    const percentage = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0

                    const revenueText = formatRevenue(revenue)
                    const textColor = revenue === 0 ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.95)'

                    return (
                      <motion.div
                        key={key}
                        className="flex-1 mx-0.5 h-8 rounded cursor-pointer relative flex items-center justify-center"
                        style={{
                          backgroundColor: color,
                          opacity: revenue === 0 ? 0.1 : 0.8,
                          boxShadow: isHovered
                            ? '0 0 8px rgba(99, 102, 241, 0.4)'
                            : 'none',
                        }}
                        onMouseEnter={() => setHoveredCell({ hour, day })}
                        onMouseLeave={() => setHoveredCell(null)}
                        onClick={() => onCellClick?.(hour, day)}
                        whileHover={{ scale: 1.1, zIndex: 10 }}
                        title={`${day} ${formatHour(hour)}: $${revenue.toLocaleString()} (${percentage.toFixed(1)}%)`}
                      >
                        {revenueText && (
                          <span 
                            className="text-xs font-semibold"
                            style={{ color: textColor, textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' }}
                          >
                            {revenueText}
                          </span>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#1e1b4b' }} />
                <span className="text-caption muted">Low ($0-5K)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#6366f1' }} />
                <span className="text-caption muted">Medium ($5-15K)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22d3ee' }} />
                <span className="text-caption muted">High ($15K+)</span>
              </div>
            </div>

            {/* Golden Window Callout */}
            {goldenWindow.revenue > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg"
                style={{
                  backgroundColor: 'rgba(34, 211, 238, 0.1)',
                  border: '1px solid rgba(34, 211, 238, 0.3)',
                }}
              >
                <Sparkles size={16} style={{ color: '#22d3ee' }} />
                <div>
                  <div className="text-body font-medium">
                    🌟 Golden Window: {goldenWindow.day} {formatHour(goldenWindow.hour)}
                  </div>
                  <div className="text-caption muted">
                    = {goldenPercentage.toFixed(1)}% of weekly revenue
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
