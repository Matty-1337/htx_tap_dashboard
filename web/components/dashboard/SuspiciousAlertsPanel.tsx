'use client'

import { motion } from 'framer-motion'
import { AlertTriangle, Clock, User, TrendingUp } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import clsx from 'clsx'

interface SuspiciousAlert {
  id: string
  type: 'repeated_voids' | 'late_night_spike' | 'outlier_behavior' | 'pattern_anomaly'
  title: string
  description: string
  server?: string
  estimatedImpact: number
  recommendedAction: string
  priority: 'high' | 'medium' | 'low'
}

interface SuspiciousAlertsPanelProps {
  alerts: SuspiciousAlert[]
  onCreateAction?: (alert: SuspiciousAlert) => void
  onAssign?: (alert: SuspiciousAlert) => void
  onMarkInvestigated?: (alert: SuspiciousAlert) => void
  className?: string
}

const ALERT_CONFIG: Record<SuspiciousAlert['type'], {
  icon: typeof AlertTriangle
  color: string
  bgColor: string
}> = {
  repeated_voids: {
    icon: AlertTriangle,
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
  },
  late_night_spike: {
    icon: Clock,
    color: '#eab308',
    bgColor: 'rgba(234, 179, 8, 0.1)',
  },
  outlier_behavior: {
    icon: TrendingUp,
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
  },
  pattern_anomaly: {
    icon: AlertTriangle,
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)',
  },
}

export function SuspiciousAlertsPanel({
  alerts,
  onCreateAction,
  onAssign,
  onMarkInvestigated,
  className,
}: SuspiciousAlertsPanelProps) {
  if (alerts.length === 0) {
    return (
      <div className={clsx('premium-card p-6', className)}>
        <h3 className="text-section-title mb-4">Suspicious Pattern Alerts</h3>
        <EmptyState
          title="All Clear"
          description="No suspicious patterns detected. Your waste metrics are operating within normal parameters."
          icon={<div className="text-6xl">✅</div>}
        />
      </div>
    )
  }

  // Sort by priority and impact
  const sortedAlerts = [...alerts].sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    }
    return b.estimatedImpact - a.estimatedImpact
  })

  return (
    <div className={clsx('premium-card p-6', className)}>
      <div className="flex items-center gap-3 mb-6">
        <AlertTriangle size={24} style={{ color: 'var(--status-warning)' }} />
        <h3 className="text-section-title">Suspicious Pattern Alerts</h3>
      </div>

      <div className="space-y-4">
        {sortedAlerts.map((alert, idx) => {
          const config = ALERT_CONFIG[alert.type]
          const Icon = config.icon

          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="p-4 rounded-lg"
              style={{
                backgroundColor: config.bgColor,
                borderLeft: `4px solid ${config.color}`,
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: `${config.color}20`,
                      color: config.color,
                    }}
                  >
                    <Icon size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-card-title">{alert.title}</h4>
                      <span
                        className="px-2 py-0.5 rounded text-caption font-medium"
                        style={{
                          backgroundColor: alert.priority === 'high' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                          color: alert.priority === 'high' ? '#ef4444' : '#eab308',
                        }}
                      >
                        {alert.priority.toUpperCase()}
                      </span>
                    </div>
                    {alert.server && (
                      <div className="flex items-center gap-1 text-caption muted mb-2">
                        <User size={12} />
                        {alert.server}
                      </div>
                    )}
                    <p className="text-body mb-2">{alert.description}</p>
                    <div className="text-caption muted mb-2">
                      <strong>Recommended:</strong> {alert.recommendedAction}
                    </div>
                    <div className="text-body font-semibold" style={{ color: 'var(--status-danger)' }}>
                      Estimated Impact: ${alert.estimatedImpact.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 mt-4">
                {onCreateAction && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onCreateAction(alert)}
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
                {onAssign && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onAssign(alert)}
                    className="px-4 py-2 rounded-lg text-body font-medium transition-all"
                    style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--card-border)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    Assign
                  </motion.button>
                )}
                {onMarkInvestigated && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onMarkInvestigated(alert)}
                    className="px-4 py-2 rounded-lg text-body font-medium transition-all"
                    style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--card-border)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    Mark Investigated
                  </motion.button>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
