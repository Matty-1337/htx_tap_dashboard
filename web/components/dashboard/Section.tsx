'use client'

import { ReactNode, forwardRef } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'

interface SectionProps {
  id: string
  title: string
  children: ReactNode
  className?: string
}

export const Section = forwardRef<HTMLElement, SectionProps>(
  ({ id, title, children, className }, ref) => {
    return (
      <section
        ref={ref}
        id={id}
        className={clsx('scroll-mt-24 mb-16', className)}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-semibold mb-6" style={{ color: 'var(--text)' }}>{title}</h2>
          {children}
        </motion.div>
      </section>
    )
  }
)

Section.displayName = 'Section'
