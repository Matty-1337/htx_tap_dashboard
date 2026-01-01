'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Star, XCircle } from 'lucide-react'
import clsx from 'clsx'

interface VolatilityItem {
  Item: string
  Category?: string | null
  Volatility: number
  Revenue: number
  Waste?: number
  Count?: number
  Net?: number
}

interface VolatilityRowCardProps {
  item: VolatilityItem
  index: number
  onInvestigate?: () => void
  onMarkResolved?: () => void
  onCreateAction?: () => void
}

type Status = 'remove' | 'investigate' | 'ok' | 'star'

const getStatus = (volatility: number, revenue: number, waste?: number): Status => {
  if (volatility > 200) return 'remove'
  if (volatility > 100) return 'investigate'
  if (volatility < 5 && revenue > 10000) return 'star'
  return 'ok'
}

const STATUS_CONFIG: Record<Status, {
  icon: typeof AlertTriangle
  color: string
  bgColor: string
  borderColor: string
  label: string
  pulse?: boolean
}> = {
  remove: {
    icon: XCircle,
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: '#ef4444',
    label: 'Remove',
    pulse: true,
  },
  investigate: {
    icon: AlertTriangle,
    color: '#eab308',
    bgColor: 'rgba(234, 179, 8, 0.1)',
    borderColor: '#eab308',
    label: 'Investigate',
  },
  ok: {
    icon: CheckCircle2,
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.05)',
    borderColor: '#22c55e',
    label: 'OK',
  },
  star: {
    icon: Star,
    color: '#fbbf24',
    bgColor: 'rgba(251, 191, 36, 0.1)',
    borderColor: '#fbbf24',
    label: 'Star Performer',
  },
}

export function VolatilityRowCard({
  item,
  index,
  onInvestigate,
  onMarkResolved,
  onCreateAction,
}: VolatilityRowCardProps) {
  const [expanded, setExpanded] = useState(false)
  const status = getStatus(item.Volatility, item.Revenue, item.Waste)
  const config = STATUS_CONFIG[status]

  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="premium-card p-4"
      style={{
        borderLeft: `4px solid ${config.borderColor}`,
        backgroundColor: expanded ? config.bgColor : 'transparent',
        animation: config.pulse ? 'pulse 2s infinite' : undefined,
      }}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1">
          {/* Status Icon */}
          <div
            className="flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0"
            style={{
              backgroundColor: `${config.color}20`,
              color: config.color,
            }}
          >
            <Icon size={20} />
          </div>

          {/* Item Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-card-title truncate">{item.Item}</h4>
              <span
                className="px-2 py-0.5 rounded text-caption font-medium"
                style={{
                  backgroundColor: `${config.color}20`,
                  color: config.color,
                }}
              >
                {config.label}
              </span>
            </div>
            {item.Category && (
              <p className="text-caption muted mb-2">Category: {item.Category}</p>
            )}

            {/* Metrics Row */}
            <div className="flex flex-wrap items-center gap-4 text-body">
              <div>
                <span className="text-caption muted">Volatility: </span>
                <span className="font-semibold" style={{ color: config.color }}>
                  {item.Volatility.toFixed(0)}%
                </span>
              </div>
              {item.Revenue > 0 && (
                <div>
                  <span className="text-caption muted">Sales: </span>
                  <span className="font-semibold">${item.Revenue.toLocaleString()}</span>
                </div>
              )}
              {item.Waste !== undefined && item.Waste > 0 && (
                <div>
                  <span className="text-caption muted">Waste: </span>
                  <span className="font-semibold">${item.Waste.toLocaleString()}</span>
                </div>
              )}
              {item.Net !== undefined && (
                <div>
                  <span className="text-caption muted">Net: </span>
                  <span className="font-semibold" style={{ color: item.Net < 0 ? '#ef4444' : '#22c55e' }}>
                    ${item.Net.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Expand Toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-2 rounded-lg transition-colors flex-shrink-0"
          style={{
            backgroundColor: expanded ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
            color: 'var(--text-secondary)',
          }}
        >
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {/* Action Buttons (always visible for remove/investigate) */}
      {(status === 'remove' || status === 'investigate') && (
        <div className="flex flex-wrap gap-2 mt-4">
          {onInvestigate && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onInvestigate}
              className="px-4 py-2 rounded-lg text-body font-medium transition-all"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--card-border)',
                color: 'var(--text-primary)',
              }}
            >
              Investigate
            </motion.button>
          )}
          {onCreateAction && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onCreateAction}
              className="px-4 py-2 rounded-lg text-body font-medium transition-all"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--text-primary)',
                boxShadow: 'var(--glow-accent)',
              }}
            >
              Create Action
            </motion.button>
          )}
          {onMarkResolved && status === 'investigate' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onMarkResolved}
              className="px-4 py-2 rounded-lg text-body font-medium transition-all"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--card-border)',
                color: 'var(--text-primary)',
              }}
            >
              Mark Resolved
            </motion.button>
          )}
        </div>
      )}

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="pt-4 mt-4 border-t" style={{ borderColor: 'var(--card-border)' }}>
              <div className="text-body">
                {status === 'remove' && (
                  <p className="mb-2">
                    This item has extremely high volatility ({item.Volatility.toFixed(0)}%), indicating significant waste relative to sales.
                    {item.Waste && item.Revenue && (
                      <span className="block mt-1">
                        Net impact: <strong>${item.Net?.toLocaleString()}</strong> (Sales: ${item.Revenue.toLocaleString()}, Waste: ${item.Waste.toLocaleString()})
                      </span>
                    )}
                  </p>
                )}
                {status === 'investigate' && (
                  <p className="mb-2">
                    This item shows elevated volatility ({item.Volatility.toFixed(0)}%) that warrants investigation.
                    Review ordering patterns, storage, or preparation methods to identify the root cause.
                  </p>
                )}
                {status === 'star' && (
                  <p className="mb-2">
                    ⭐ This is a star performer - high revenue with low volatility. Consider promoting this item or using it as a model for other menu items.
                  </p>
                )}
                {status === 'ok' && (
                  <p className="mb-2 text-muted">
                    This item is operating within acceptable volatility parameters.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
