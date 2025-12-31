'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Lightbulb, User } from 'lucide-react'
import clsx from 'clsx'

interface ServerGradeCardProps {
  server: {
    Server: string
    Revenue: number
    Transactions: number
    Void_Rate_Pct: number
    Void_Amount: number
  }
  rank: number
  grade: 'A' | 'B' | 'C' | 'D'
  teamAverages: {
    avgRevenue: number
    avgTransactions: number
    avgVoidRate: number
  }
  coachingInsights?: Array<{ title: string; rationale: string; priority: 'high' | 'medium' | 'low' }>
  personalityTag?: string
  onViewProfile?: () => void
  onCoachingNotes?: () => void
  onScheduleOneOnOne?: () => void
}

const GRADE_CONFIG: Record<'A' | 'B' | 'C' | 'D', {
  color: string
  bgColor: string
  borderColor: string
  label: string
  glow: string
  pulse?: boolean
}> = {
  A: {
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
    label: 'Excellent',
    glow: 'var(--glow-success)',
  },
  B: {
    color: '#22d3ee',
    bgColor: 'rgba(34, 211, 238, 0.1)',
    borderColor: 'rgba(34, 211, 238, 0.3)',
    label: 'Good',
    glow: 'none',
  },
  C: {
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    label: 'Needs Improvement',
    glow: 'none',
  },
  D: {
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    label: 'Critical',
    glow: 'var(--glow-danger)',
    pulse: true,
  },
}

export function ServerGradeCard({
  server,
  rank,
  grade,
  teamAverages,
  coachingInsights = [],
  personalityTag,
  onViewProfile,
  onCoachingNotes,
  onScheduleOneOnOne,
}: ServerGradeCardProps) {
  const [expanded, setExpanded] = useState(false)
  const config = GRADE_CONFIG[grade]

  // Calculate Sales Per Hour (estimate from transactions)
  const estimatedHours = server.Transactions > 0 ? server.Transactions / 10 : 1
  const salesPerHour = server.Revenue / Math.max(estimatedHours, 1)

  // Calculate metric percentages for bars (relative to team average or max)
  const revenuePercent = teamAverages.avgRevenue > 0
    ? Math.min((server.Revenue / teamAverages.avgRevenue) * 100, 100)
    : 0
  const wastePercent = teamAverages.avgVoidRate > 0
    ? Math.min((server.Void_Rate_Pct / teamAverages.avgVoidRate) * 100, 100)
    : 0

  // Calculate bottle conversion (placeholder - would need actual data)
  const bottleConversion = 15.8 // Placeholder
  const foodAttachment = 28.4 // Placeholder

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="premium-card p-6"
      style={{
        borderLeft: `4px solid ${config.color}`,
        backgroundColor: expanded ? config.bgColor : 'transparent',
      }}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4 flex-1">
          {/* Rank Badge */}
          <div className="text-metric-small font-bold" style={{ color: 'var(--text-muted)' }}>
            #{rank}
          </div>

          {/* Grade Badge */}
          <motion.div
            className="flex items-center justify-center w-16 h-16 rounded-full font-bold text-2xl"
            style={{
              backgroundColor: config.color,
              color: 'white',
              boxShadow: config.glow !== 'none' ? config.glow : 'none',
              animation: config.pulse ? 'pulse 2s infinite' : undefined,
            }}
          >
            {grade}
          </motion.div>

          {/* Server Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <User size={18} style={{ color: 'var(--text-secondary)' }} />
              <h3 className="text-card-title">{server.Server}</h3>
            </div>
            {personalityTag && (
              <p className="text-caption muted">"{personalityTag}"</p>
            )}
            <div className="text-body font-semibold mt-1" style={{ color: config.color }}>
              ${salesPerHour.toLocaleString()}/hr
            </div>
          </div>
        </div>

        {/* Expand Toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-2 rounded-lg transition-colors"
          style={{
            backgroundColor: expanded ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
            color: 'var(--text-secondary)',
          }}
        >
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <div className="text-caption muted mb-1">Revenue</div>
          <div className="text-body font-semibold">${server.Revenue.toLocaleString()}</div>
          <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(99, 102, 241, 0.2)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${revenuePercent}%` }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="h-full rounded-full"
              style={{ backgroundColor: config.color }}
            />
          </div>
        </div>

        <div>
          <div className="text-caption muted mb-1">Waste Rate</div>
          <div className="text-body font-semibold">{server.Void_Rate_Pct.toFixed(1)}%</div>
          <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${wastePercent}%` }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="h-full rounded-full"
              style={{ backgroundColor: server.Void_Rate_Pct > teamAverages.avgVoidRate ? '#ef4444' : '#22c55e' }}
            />
          </div>
        </div>

        <div>
          <div className="text-caption muted mb-1">Bottle Conv</div>
          <div className="text-body font-semibold">{bottleConversion.toFixed(1)}%</div>
          <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(34, 211, 238, 0.2)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(bottleConversion / 20) * 100}%` }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="h-full rounded-full"
              style={{ backgroundColor: '#22d3ee' }}
            />
          </div>
        </div>

        <div>
          <div className="text-caption muted mb-1">Food Attach</div>
          <div className="text-body font-semibold">{foodAttachment.toFixed(1)}%</div>
          <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(foodAttachment / 30) * 100}%` }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="h-full rounded-full"
              style={{ backgroundColor: '#22c55e' }}
            />
          </div>
        </div>
      </div>

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
            <div className="pt-4 border-t" style={{ borderColor: 'var(--card-border)' }}>
              {/* Coaching Insights */}
              {coachingInsights.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb size={18} style={{ color: 'var(--accent-primary)' }} />
                    <h4 className="text-card-title">Coaching Insights</h4>
                  </div>
                  <div className="space-y-2">
                    {coachingInsights.map((insight, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg"
                        style={{
                          backgroundColor: 'rgba(99, 102, 241, 0.05)',
                          borderLeft: `3px solid ${config.color}`,
                        }}
                      >
                        <div className="text-body font-medium mb-1">{insight.title}</div>
                        <div className="text-caption muted">{insight.rationale}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {onViewProfile && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onViewProfile}
                    className="px-4 py-2 rounded-lg text-body font-medium transition-all"
                    style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--card-border)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    View Profile
                  </motion.button>
                )}
                {onCoachingNotes && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onCoachingNotes}
                    className="px-4 py-2 rounded-lg text-body font-medium transition-all"
                    style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--card-border)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    Coaching Notes
                  </motion.button>
                )}
                {onScheduleOneOnOne && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onScheduleOneOnOne}
                    className="px-4 py-2 rounded-lg text-body font-medium transition-all"
                    style={{
                      backgroundColor: 'var(--accent-primary)',
                      color: 'var(--text-primary)',
                      boxShadow: 'var(--glow-accent)',
                    }}
                  >
                    Schedule 1-on-1
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
