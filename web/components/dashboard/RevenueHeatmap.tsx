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
const getColorForValue = (value: number, maxValue: number): string => {
  if (maxValue === 0) return '#1e1b4b'
  const ratio = value / maxValue
  
  if (ratio < 0.2) return '#1e1b4b'
  if (ratio < 0.4) return '#312e81'
  if (ratio < 0.6) return '#4f46e5'
  if (ratio < 0.8) return '#6366f1'
  return '#22d3ee'
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

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

  const isGoldenCell = (hour: number, day: string) => {
    return hour === goldenWindow.hour && day === goldenWindow.day
  }

  return (
    <div className="premium-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-section-title mb-1">Revenue Heatmap</h3>
          <p className="text-caption muted">Revenue concentration by hour and day</p>
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
                    const isGolden = isGoldenCell(hour, day)
                    const isHovered = hoveredCell?.hour === hour && hoveredCell?.day === day
                    const percentage = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0

                    return (
                      <motion.div
                        key={key}
                        className="flex-1 mx-0.5 h-8 rounded cursor-pointer relative"
                        style={{
                          backgroundColor: color,
                          opacity: revenue === 0 ? 0.1 : 0.8,
                          boxShadow: isGolden
                            ? '0 0 12px rgba(34, 211, 238, 0.6)'
                            : isHovered
                            ? '0 0 8px rgba(99, 102, 241, 0.4)'
                            : 'none',
                          animation: isGolden ? 'pulse 2s infinite' : undefined,
                        }}
                        onMouseEnter={() => setHoveredCell({ hour, day })}
                        onMouseLeave={() => setHoveredCell(null)}
                        onClick={() => onCellClick?.(hour, day)}
                        whileHover={{ scale: 1.1, zIndex: 10 }}
                        title={`${day} ${formatHour(hour)}: $${revenue.toLocaleString()} (${percentage.toFixed(1)}%)`}
                      >
                        {isGolden && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Sparkles size={12} style={{ color: '#22d3ee' }} />
                          </div>
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
