'use client'

import { motion } from 'framer-motion'
import { Trophy, Medal, Award } from 'lucide-react'
import clsx from 'clsx'

interface Performer {
  name: string
  metric: string
  value: string | number
  rank: 1 | 2 | 3
}

interface TopPerformersCardProps {
  performers: Performer[]
  className?: string
}

const rankIcons = {
  1: Trophy,
  2: Medal,
  3: Award,
}

const rankColors = {
  1: '#FFD700', // Gold
  2: '#C0C0C0', // Silver
  3: '#CD7F32', // Bronze
}

export function TopPerformersCard({ performers, className }: TopPerformersCardProps) {
  if (performers.length === 0) {
    return (
      <div className={clsx('premium-card p-6', className)}>
        <h3 className="text-card-title mb-4">Top Performers</h3>
        <div className="text-center py-8">
          <p className="text-body muted">No performance data available</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx('premium-card p-6', className)}
    >
      <h3 className="text-card-title mb-6">Top Performers</h3>
      <div className="space-y-4">
        {performers.map((performer) => {
          const Icon = rankIcons[performer.rank]
          return (
            <motion.div
              key={performer.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: performer.rank * 0.1 }}
              className="flex items-center gap-4 p-4 rounded-lg"
              style={{
                backgroundColor: 'rgba(99, 102, 241, 0.05)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
              }}
            >
              <div
                className="flex items-center justify-center w-10 h-10 rounded-full"
                style={{
                  backgroundColor: `${rankColors[performer.rank]}20`,
                  color: rankColors[performer.rank],
                }}
              >
                <Icon size={20} />
              </div>
              <div className="flex-1">
                <div className="text-body font-medium">{performer.name}</div>
                <div className="text-caption muted">{performer.metric}</div>
              </div>
              <div className="text-body font-semibold">{performer.value}</div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
