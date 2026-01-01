'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, AlertTriangle, User } from 'lucide-react'
import clsx from 'clsx'

interface WasteServer {
  Server: string
  Leakage: number
  Void_Rate_Pct: number
  Trend?: number // % change vs prior period
  RiskLevel?: 'high' | 'medium' | 'low'
}

interface WasteServerRowCardProps {
  server: WasteServer
  rank: number
  teamAverage?: number
  onViewDetails?: () => void
  onCreateAction?: () => void
}

const getRiskLevel = (voidRate: number, teamAverage: number = 12): 'high' | 'medium' | 'low' => {
  if (voidRate > teamAverage * 1.5) return 'high'
  if (voidRate > teamAverage * 1.2) return 'medium'
  return 'low'
}

const RISK_CONFIG = {
  high: {
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: '#ef4444',
    label: 'High Risk',
    icon: AlertTriangle,
  },
  medium: {
    color: '#eab308',
    bgColor: 'rgba(234, 179, 8, 0.1)',
    borderColor: '#eab308',
    label: 'Medium Risk',
    icon: AlertTriangle,
  },
  low: {
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.05)',
    borderColor: '#22c55e',
    label: 'Low Risk',
    icon: null,
  },
}

export function WasteServerRowCard({
  server,
  rank,
  teamAverage = 12,
  onViewDetails,
  onCreateAction,
}: WasteServerRowCardProps) {
  const riskLevel = server.RiskLevel || getRiskLevel(server.Void_Rate_Pct, teamAverage)
  const config = RISK_CONFIG[riskLevel]
  const Icon = config.icon

  const isImproving = server.Trend !== undefined && server.Trend < 0
  const isWorsening = server.Trend !== undefined && server.Trend > 0

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="premium-card p-4"
      style={{
        borderLeft: `4px solid ${config.borderColor}`,
        backgroundColor: riskLevel === 'high' ? config.bgColor : 'transparent',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          {/* Rank */}
          <div className="text-metric-small font-bold" style={{ color: 'var(--text-muted)', minWidth: '40px' }}>
            #{rank}
          </div>

          {/* Server Info */}
          <div className="flex items-center gap-3 flex-1">
            {Icon && (
              <div
                className="flex items-center justify-center w-10 h-10 rounded-full"
                style={{
                  backgroundColor: `${config.color}20`,
                  color: config.color,
                }}
              >
                <Icon size={18} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <User size={16} style={{ color: 'var(--text-secondary)' }} />
                <h4 className="text-card-title truncate">{server.Server}</h4>
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
            </div>
          </div>

          {/* Metrics */}
          <div className="flex items-center gap-6 text-body">
            <div>
              <div className="text-caption muted mb-1">Leakage</div>
              <div className="font-semibold" style={{ color: 'var(--status-danger)' }}>
                ${server.Leakage.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-caption muted mb-1">Void Rate</div>
              <div className="font-semibold" style={{ color: config.color }}>
                {server.Void_Rate_Pct.toFixed(1)}%
              </div>
            </div>
            {server.Trend !== undefined && (
              <div>
                <div className="text-caption muted mb-1">Trend</div>
                <div className="flex items-center gap-1">
                  {isImproving ? (
                    <TrendingDown size={14} style={{ color: 'var(--status-success)' }} />
                  ) : isWorsening ? (
                    <TrendingUp size={14} style={{ color: 'var(--status-danger)' }} />
                  ) : null}
                  <span
                    className="font-semibold"
                    style={{ color: isImproving ? 'var(--status-success)' : isWorsening ? 'var(--status-danger)' : 'var(--text-secondary)' }}
                  >
                    {isImproving ? '↓' : isWorsening ? '↑' : '—'} {Math.abs(server.Trend).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {onViewDetails && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onViewDetails}
                className="px-3 py-2 rounded-lg text-body font-medium transition-all"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--card-border)',
                  color: 'var(--text-primary)',
                }}
              >
                View Details
              </motion.button>
            )}
            {onCreateAction && riskLevel !== 'low' && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onCreateAction}
                className="px-3 py-2 rounded-lg text-body font-medium transition-all"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'var(--text-primary)',
                  boxShadow: riskLevel === 'high' ? 'var(--glow-danger)' : 'none',
                }}
              >
                Create Action
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
