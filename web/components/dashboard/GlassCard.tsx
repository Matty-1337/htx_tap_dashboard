'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'
import clsx from 'clsx'
import { cardStyles } from '@/lib/ui'

interface GlassCardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  delay?: number
}

export function GlassCard({ children, className, hover = true, delay = 0 }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={hover ? { y: -4, transition: { duration: 0.2 } } : undefined}
      className={clsx(className)}
      style={{
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--card-border)',
        borderRadius: 'var(--radius)',
        borderWidth: '1px',
        borderStyle: 'solid',
        boxShadow: 'var(--shadow)',
      }}
      onMouseEnter={(e) => {
        if (hover) {
          e.currentTarget.style.boxShadow = 'var(--glow), var(--shadow)'
        }
      }}
      onMouseLeave={(e) => {
        if (hover) {
          e.currentTarget.style.boxShadow = 'var(--shadow)'
        }
      }}
    >
      {children}
    </motion.div>
  )
}
