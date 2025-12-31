'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Users,
  UtensilsCrossed,
  Trash2,
  Clock,
  Target,
  ChevronLeft,
  ChevronRight,
  Play,
} from 'lucide-react'
import clsx from 'clsx'

interface SidebarProps {
  clientName?: string
  lastUpdated?: string
  onRunAnalysis?: () => void
  isRunning?: boolean
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { id: 'team', label: 'Team', icon: Users, path: '/team' },
  { id: 'menu', label: 'Menu', icon: UtensilsCrossed, path: '/menu' },
  { id: 'waste', label: 'Waste', icon: Trash2, path: '/waste' },
  { id: 'time', label: 'Time', icon: Clock, path: '/time' },
  { id: 'actions', label: 'Actions', icon: Target, path: '/actions' },
]

export function Sidebar({ clientName = 'Melrose', lastUpdated, onRunAnalysis, isRunning }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const width = collapsed ? 64 : 240

  return (
    <motion.aside
      initial={false}
      animate={{ width }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="fixed left-0 top-0 h-screen z-40"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--card-border)',
      }}
    >
      <div className="h-full flex flex-col">
        {/* Logo Section */}
        <div className="p-6 border-b" style={{ borderColor: 'var(--card-border)' }}>
          {!collapsed ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2"
            >
              <div
                className="text-page-title"
                style={{
                  background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-cyan) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.4))',
                }}
              >
                HTX TAP
              </div>
            </motion.div>
          ) : (
            <div className="flex justify-center">
              <div
                className="text-2xl font-bold"
                style={{
                  background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-cyan) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                H
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.path
            const Icon = item.icon

            return (
              <motion.button
                key={item.id}
                onClick={() => router.push(item.path)}
                whileHover={{ x: collapsed ? 0 : 4 }}
                whileTap={{ scale: 0.98 }}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all',
                  isActive && 'nav-active'
                )}
                style={{
                  backgroundColor: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={20} />
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-body font-medium"
                  >
                    {item.label}
                  </motion.span>
                )}
              </motion.button>
            )
          })}
        </nav>

        {/* Client Selector */}
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 border-t"
            style={{ borderColor: 'var(--card-border)' }}
          >
            <div className="text-caption muted mb-2">CLIENT NAME</div>
            <div className="text-body font-medium">{clientName}</div>
          </motion.div>
        )}

        {/* Last Updated */}
        {!collapsed && lastUpdated && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4 pb-4"
          >
            <div className="text-caption muted mb-1">Last Updated</div>
            <div className="text-body">{lastUpdated}</div>
          </motion.div>
        )}

        {/* Run Analysis Button */}
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4"
          >
            <motion.button
              onClick={onRunAnalysis}
              disabled={isRunning}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--text-primary)',
                boxShadow: 'var(--glow-accent)',
                animation: isRunning ? 'pulse 2s infinite' : undefined,
              }}
            >
              <Play size={16} />
              {isRunning ? 'Running...' : 'Run Analysis'}
            </motion.button>
          </motion.div>
        )}

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--card-border)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          {collapsed ? (
            <ChevronRight size={14} style={{ color: 'var(--text-secondary)' }} />
          ) : (
            <ChevronLeft size={14} style={{ color: 'var(--text-secondary)' }} />
          )}
        </button>
      </div>
    </motion.aside>
  )
}
