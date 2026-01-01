'use client'

import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import clsx from 'clsx'

interface AttentionItem {
  type: 'server' | 'menu' | 'other'
  name: string
  issue: string
  metric?: string
}

interface NeedsAttentionCardProps {
  items: AttentionItem[]
  className?: string
}

export function NeedsAttentionCard({ items, className }: NeedsAttentionCardProps) {
  if (items.length === 0) {
    return (
      <div className={clsx('premium-card p-6', className)}>
        <h3 className="text-card-title mb-4">Needs Attention</h3>
        <div className="text-center py-8">
          <p className="text-body muted">All systems operating normally</p>
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
      <div className="flex items-center gap-2 mb-6">
        <AlertTriangle size={20} style={{ color: 'var(--status-warning)' }} />
        <h3 className="text-card-title">Needs Attention</h3>
      </div>
      <div className="space-y-3">
        {items.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="flex items-start gap-3 p-4 rounded-lg"
            style={{
              backgroundColor: 'rgba(234, 179, 8, 0.1)',
              borderLeft: '3px solid var(--status-warning)',
            }}
          >
            <AlertTriangle size={16} style={{ color: 'var(--status-warning)', marginTop: '2px' }} />
            <div className="flex-1">
              <div className="text-body font-medium">{item.name}</div>
              <div className="text-caption muted mt-1">{item.issue}</div>
              {item.metric && (
                <div className="text-caption mt-1" style={{ color: 'var(--status-warning)' }}>
                  {item.metric}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
