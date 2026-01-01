'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'
import { X, AlertCircle } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import clsx from 'clsx'

interface MenuItem {
  Item: string
  Category: string | null
  Revenue: number
  Count: number
  Volatility: number
}

interface MenuBCGMatrixProps {
  data: MenuItem[]
  onItemClick?: (item: MenuItem, quadrant: string) => void
  className?: string
}

type Quadrant = 'stars' | 'plowhorses' | 'puzzles' | 'dogs'

const QUADRANT_CONFIG: Record<Quadrant, {
  label: string
  color: string
  bgTint: string
  description: string
  action: string
}> = {
  stars: {
    label: 'Stars ⭐',
    color: '#22c55e',
    bgTint: 'rgba(34, 197, 94, 0.1)',
    description: 'High popularity, high revenue - your best performers',
    action: 'Protect and promote these items',
  },
  plowhorses: {
    label: 'Plowhorses 🐴',
    color: '#3b82f6',
    bgTint: 'rgba(59, 130, 246, 0.1)',
    description: 'High volume, lower revenue per unit - pricing opportunity',
    action: 'Consider upselling or repricing to increase margin',
  },
  puzzles: {
    label: 'Puzzles 🧩',
    color: '#eab308',
    bgTint: 'rgba(234, 179, 8, 0.1)',
    description: 'High revenue, lower volume - promotion opportunity',
    action: 'Promote these items to increase volume',
  },
  dogs: {
    label: 'Dogs 🐕',
    color: '#ef4444',
    bgTint: 'rgba(239, 68, 68, 0.1)',
    description: 'Low popularity, low revenue - candidates for removal',
    action: 'Consider removing or refreshing these items',
  },
}

export function MenuBCGMatrix({ data, onItemClick, className }: MenuBCGMatrixProps) {
  const [selectedItem, setSelectedItem] = useState<(MenuItem & { quadrant?: Quadrant; isLowSample?: boolean; avgPrice?: number }) | null>(null)
  const [selectedQuadrant, setSelectedQuadrant] = useState<Quadrant | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('All')

  // Calculate medians for quadrant split
  const { xMid, yMid, chartData } = useMemo(() => {
    if (!data || data.length === 0) {
      return { xMid: 0, yMid: 0, chartData: [] }
    }

    const counts = data.map(d => d.Count).filter(v => v > 0).sort((a, b) => a - b)
    const revenues = data.map(d => d.Revenue).filter(v => v > 0).sort((a, b) => a - b)

    const getMedian = (arr: number[]) => {
      if (arr.length === 0) return 0
      const mid = Math.floor(arr.length / 2)
      return arr.length % 2 === 0 ? (arr[mid - 1] + arr[mid]) / 2 : arr[mid]
    }

    const xMid = getMedian(counts)
    const yMid = getMedian(revenues)

    // Filter by category if needed
    const filtered = categoryFilter === 'All'
      ? data
      : data.filter(item => item.Category === categoryFilter)

    // Classify each item into quadrant
    const chartData = filtered.map(item => {
      const quadrant: Quadrant =
        item.Count >= xMid && item.Revenue >= yMid ? 'stars' :
        item.Count >= xMid && item.Revenue < yMid ? 'plowhorses' :
        item.Count < xMid && item.Revenue >= yMid ? 'puzzles' :
        'dogs'

      return {
        ...item,
        x: item.Count,
        y: item.Revenue,
        quadrant,
        avgPrice: item.Count > 0 ? item.Revenue / item.Count : 0,
        isLowSample: item.Count <= 2,
      }
    })

    return { xMid, yMid, chartData }
  }, [data, categoryFilter])

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>()
    data.forEach(item => {
      if (item.Category) cats.add(item.Category)
    })
    return ['All', ...Array.from(cats).sort()]
  }, [data])

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null

    const item = payload[0].payload
    const quadrant = item.quadrant as Quadrant
    const config = QUADRANT_CONFIG[quadrant] || QUADRANT_CONFIG.stars

    return (
      <div
        className="p-4 rounded-lg"
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          border: `2px solid ${config.color}`,
          boxShadow: 'var(--shadow-elevated)',
          minWidth: '200px',
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-body font-bold">{item.Item}</span>
          {item.isLowSample && (
            <span
              className="px-2 py-0.5 rounded text-caption"
              style={{
                backgroundColor: 'rgba(234, 179, 8, 0.2)',
                color: '#eab308',
              }}
            >
              Low sample
            </span>
          )}
        </div>
        {item.Category && (
          <div className="text-caption muted mb-2">Category: {item.Category}</div>
        )}
        <div className="space-y-1 text-caption">
          <div>Revenue: <span className="font-semibold">${item.Revenue.toLocaleString()}</span></div>
          <div>Count: <span className="font-semibold">{item.Count}</span></div>
          <div>Avg Price: <span className="font-semibold">${item.avgPrice.toFixed(2)}</span></div>
          {item.Volatility > 0 && (
            <div>Volatility: <span className="font-semibold">{item.Volatility.toFixed(1)}%</span></div>
          )}
        </div>
        <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--card-border)' }}>
          <div className="text-caption font-medium" style={{ color: config.color }}>
            {config.label}
          </div>
        </div>
      </div>
    )
  }

  const handlePointClick = (data: any) => {
    if (data && data.payload) {
      setSelectedItem(data.payload)
      setSelectedQuadrant(data.payload.quadrant)
      onItemClick?.(data.payload, data.payload.quadrant)
    }
  }

  if (!data || data.length === 0) {
    return (
      <div className={clsx('premium-card p-6', className)}>
        <EmptyState
          title="No Menu Data Available"
          description="Menu engineering data is not available. Run analysis to generate menu metrics."
        />
      </div>
    )
  }

  return (
    <>
      <div className={clsx('premium-card p-6', className)}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-section-title mb-1">Menu Engineering Matrix</h3>
            <p className="text-caption muted">Profitability vs Popularity</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-lg text-body"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--card-border)',
                color: 'var(--text-primary)',
              }}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={500}>
          <ScatterChart
            margin={{ top: 20, right: 20, bottom: 60, left: 80 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke="var(--text-muted)" />
            
            {/* Quadrant reference lines */}
            <ReferenceLine
              x={xMid}
              stroke="var(--text-muted)"
              strokeDasharray="2 2"
              opacity={0.5}
              label={{ value: 'Median Count', position: 'top' }}
            />
            <ReferenceLine
              y={yMid}
              stroke="var(--text-muted)"
              strokeDasharray="2 2"
              opacity={0.5}
              label={{ value: 'Median Revenue', position: 'right', angle: -90 }}
            />

            <XAxis
              type="number"
              dataKey="x"
              name="Count"
              label={{ value: 'Popularity (Units Sold)', position: 'insideBottom', offset: -10 }}
              style={{ fontSize: '12px', fill: 'var(--text-secondary)' }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Revenue"
              label={{ value: 'Profitability (Revenue $)', angle: -90, position: 'insideLeft' }}
              style={{ fontSize: '12px', fill: 'var(--text-secondary)' }}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            {/* Quadrant background tints (using custom shapes would be better, but this works) */}
            <Scatter
              data={chartData}
              dataKey="y"
              onClick={handlePointClick}
              style={{ cursor: 'pointer' }}
            >
              {chartData.map((entry, index) => {
                const config = QUADRANT_CONFIG[entry.quadrant]
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={config.color}
                    opacity={0.7}
                  />
                )
              })}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>

        {/* Quadrant Legend */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(QUADRANT_CONFIG).map(([key, config]) => {
          const quadrant = key as Quadrant
          const count = chartData.filter(d => d.quadrant === quadrant).length
            return (
              <div
                key={key}
                className="p-3 rounded-lg"
                style={{
                  backgroundColor: config.bgTint,
                  border: `1px solid ${config.color}40`,
                }}
              >
                <div className="text-body font-semibold mb-1" style={{ color: config.color }}>
                  {config.label}
                </div>
                <div className="text-caption muted mb-1">{config.description}</div>
                <div className="text-caption font-medium">{count} items</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Item Detail Modal */}
      <AnimatePresence>
        {selectedItem && selectedQuadrant && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
            onClick={() => {
              setSelectedItem(null)
              setSelectedQuadrant(null)
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="premium-card p-8 max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-section-title">{selectedItem.Item}</h3>
                    {selectedItem.isLowSample === true && (
                      <span
                        className="px-2 py-1 rounded text-caption"
                        style={{
                          backgroundColor: 'rgba(234, 179, 8, 0.2)',
                          color: '#eab308',
                        }}
                      >
                        Low sample
                      </span>
                    )}
                  </div>
                  {selectedItem.Category && (
                    <p className="text-body muted">Category: {selectedItem.Category}</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedItem(null)
                    setSelectedQuadrant(null)
                  }}
                  className="p-2 rounded-lg transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mb-6 p-4 rounded-lg" style={{
                backgroundColor: QUADRANT_CONFIG[selectedQuadrant].bgTint,
                borderLeft: `4px solid ${QUADRANT_CONFIG[selectedQuadrant].color}`,
              }}>
                <div className="text-body font-semibold mb-2" style={{ color: QUADRANT_CONFIG[selectedQuadrant].color }}>
                  {QUADRANT_CONFIG[selectedQuadrant].label}
                </div>
                <div className="text-caption muted mb-2">{QUADRANT_CONFIG[selectedQuadrant].description}</div>
                <div className="text-body font-medium">{QUADRANT_CONFIG[selectedQuadrant].action}</div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <div className="text-caption muted mb-1">Revenue</div>
                  <div className="text-body font-semibold">${selectedItem.Revenue.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-caption muted mb-1">Count</div>
                  <div className="text-body font-semibold">{selectedItem.Count}</div>
                </div>
                <div>
                  <div className="text-caption muted mb-1">Avg Price</div>
                  <div className="text-body font-semibold">${(selectedItem.Revenue / Math.max(selectedItem.Count, 1)).toFixed(2)}</div>
                </div>
                {selectedItem.Volatility > 0 && (
                  <div>
                    <div className="text-caption muted mb-1">Volatility</div>
                    <div className="text-body font-semibold">{selectedItem.Volatility.toFixed(1)}%</div>
                  </div>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  // Hook into Actions flow
                  console.log('Create action for:', selectedItem.Item)
                  setSelectedItem(null)
                  setSelectedQuadrant(null)
                }}
                className="w-full px-6 py-3 rounded-lg font-medium transition-all"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'var(--text-primary)',
                  boxShadow: 'var(--glow-accent)',
                }}
              >
                Create Action Item
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
