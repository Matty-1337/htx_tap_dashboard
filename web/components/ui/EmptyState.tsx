'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx(
        'premium-card text-center py-12 px-6',
        className
      )}
    >
      {icon && (
        <div className="mb-4 flex justify-center">
          {icon}
        </div>
      )}
      <h3 className="text-card-title mb-2">{title}</h3>
      {description && (
        <p className="text-body muted mb-6 max-w-md mx-auto">{description}</p>
      )}
      {action && (
        <motion.button
          onClick={action.onClick}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="px-6 py-3 rounded-lg font-medium transition-all"
          style={{
            backgroundColor: 'var(--accent-primary)',
            color: 'var(--text-primary)',
            boxShadow: 'var(--glow-accent)',
          }}
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  )
}
