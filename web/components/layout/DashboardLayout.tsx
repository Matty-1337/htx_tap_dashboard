'use client'

import { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'

interface DashboardLayoutProps {
  children: ReactNode
  clientName?: string
  lastUpdated?: string
  onRunAnalysis?: () => void
  isRunning?: boolean
}

export function DashboardLayout({
  children,
  clientName,
  lastUpdated,
  onRunAnalysis,
  isRunning,
}: DashboardLayoutProps) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Sidebar
        clientName={clientName}
        lastUpdated={lastUpdated}
        onRunAnalysis={onRunAnalysis}
        isRunning={isRunning}
      />

      <main className="flex-1 ml-[240px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
