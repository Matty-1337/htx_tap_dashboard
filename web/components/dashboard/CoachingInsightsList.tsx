'use client'

import { motion } from 'framer-motion'
import { GlassCard } from './GlassCard'
import { PillBadge } from './PillBadge'
import clsx from 'clsx'

interface CoachingInsight {
  title: string
  rationale: string
  priority: 'high' | 'medium' | 'low'
}

interface CoachingInsightsListProps {
  insights: CoachingInsight[]
}

export function CoachingInsightsList({ insights }: CoachingInsightsListProps) {
  if (!insights || insights.length === 0) {
    return null
  }

  const getPriorityVariant = (priority: 'high' | 'medium' | 'low'): 'danger' | 'warning' | 'default' => {
    switch (priority) {
      case 'high':
        return 'danger'
      case 'medium':
        return 'warning'
      default:
        return 'default'
    }
  }

  return (
    <GlassCard>
      <div className="p-6">
        <h3 className="text-xl font-semibold mb-6" style={{ color: 'var(--text)' }}>
          Coaching Insights
        </h3>

        <div className="space-y-4">
          {insights.map((insight, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 rounded-md"
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--card-border)',
                borderRadius: 'var(--radius)',
              }}
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <h4 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                  {insight.title}
                </h4>
                <PillBadge variant={getPriorityVariant(insight.priority)}>
                  {insight.priority}
                </PillBadge>
              </div>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                {insight.rationale}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </GlassCard>
  )
}
