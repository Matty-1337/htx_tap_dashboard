'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { HeaderBar } from '@/components/layout/HeaderBar'
import { ActionRail } from '@/components/dashboard/ActionRail'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonKpiCard } from '@/components/dashboard/SkeletonCard'
import { ActionItem } from '@/lib/action-engine'
import { getClientThemeAttr } from '@/lib/brand'
import { Trophy, TrendingUp, CheckCircle2 } from 'lucide-react'

export default function ActionsPage() {
  const [actionItems, setActionItems] = useState<ActionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [roleNames, setRoleNames] = useState<{ gmName?: string; manager1Name?: string; manager2Name?: string }>({})
  const router = useRouter()

  useEffect(() => {
    const fetchActions = async () => {
      try {
        const response = await fetch('/api/actions')
        if (response.ok) {
          const result = await response.json()
          setActionItems(result.actions || [])
        }
      } catch (err) {
        console.error('Failed to fetch actions:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchActions()
  }, [])

  useEffect(() => {
    const fetchRoleNames = async () => {
      try {
        const response = await fetch('/api/roles')
        if (response.ok) {
          const result = await response.json()
          setRoleNames({
            gmName: result.gmName || undefined,
            manager1Name: result.manager1Name || undefined,
            manager2Name: result.manager2Name || undefined,
          })
        }
      } catch (err) {
        console.error('Failed to fetch role names:', err)
      }
    }
    fetchRoleNames()
  }, [])

  // Get session data for client name
  const [clientName, setClientName] = useState('Analytics')
  const [themeAttr, setThemeAttr] = useState('default')

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch('/api/session')
        if (response.ok) {
          const result = await response.json()
          const clientId = result.clientId
          if (clientId) {
            setClientName(clientId.charAt(0).toUpperCase() + clientId.slice(1))
            setThemeAttr(getClientThemeAttr(clientId))
          }
        }
      } catch (err) {
        console.error('Failed to fetch session:', err)
      }
    }
    fetchSession()
  }, [])

  const handleRunAnalysis = async () => {
    // Trigger analysis - would need to implement
    console.log('Run analysis')
  }

  // Calculate impact metrics
  // Note: ActionItem doesn't have status - completion is tracked in ActionRail component
  // For now, we'll show all actions as open and calculate from priority
  const openHighPriority = actionItems.filter(a => a.priority === 'high').length
  const totalImpact = actionItems.reduce((sum, a) => sum + (a.estimatedImpactUsd || 0), 0)
  const completedThisWeek = 0 // Would need to track completion separately

  // Calculate streak (consecutive days with completed actions)
  const streak = 0 // Would calculate from completion dates

  if (loading) {
    return (
      <DashboardLayout
        clientName={clientName}
        onRunAnalysis={handleRunAnalysis}
        isRunning={false}
      >
        <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
          <HeaderBar title="Actions" subtitle="Loading..." />
          <div className="max-w-[1920px] mx-auto px-6 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <SkeletonKpiCard />
              <SkeletonKpiCard />
              <SkeletonKpiCard />
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      clientName={clientName}
      onRunAnalysis={handleRunAnalysis}
      isRunning={false}
    >
      <div data-client-theme={themeAttr} className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <HeaderBar
          title="Action Items"
          subtitle="Track, prioritize, and complete actions to improve performance"
        />

        <div className="max-w-[1920px] mx-auto px-6 py-8">
          {/* Impact Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="premium-card p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <Trophy size={24} style={{ color: 'var(--accent-primary)' }} />
                <h3 className="text-card-title">Impact Score</h3>
              </div>
              <div className="text-metric-large mb-2">
                ${totalImpact.toLocaleString()}
              </div>
              <p className="text-caption muted">Total value from completed actions</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="premium-card p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp size={24} style={{ color: 'var(--status-warning)' }} />
                <h3 className="text-card-title">Open High Priority</h3>
              </div>
              <div className="text-metric-large mb-2">
                {openHighPriority}
              </div>
              <p className="text-caption muted">Actions requiring immediate attention</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="premium-card p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 size={24} style={{ color: 'var(--status-success)' }} />
                <h3 className="text-card-title">Completed This Week</h3>
              </div>
              <div className="text-metric-large mb-2">
                {completedThisWeek}
              </div>
              <p className="text-caption muted">
                {streak > 0 ? `${streak} day streak!` : 'Keep up the momentum'}
              </p>
            </motion.div>
          </div>

          {/* Main Action Items Panel */}
          <div className="mb-8">
            {actionItems.length === 0 ? (
              <EmptyState
                title="No Action Items Yet"
                description="Action items will appear here once analysis data is available. Run analysis to generate actionable insights."
                action={{
                  label: 'Run Analysis',
                  onClick: handleRunAnalysis,
                }}
              />
            ) : (
              <ActionRail
                actions={actionItems}
                roleNames={roleNames}
                onActionUpdate={async () => {
                  const response = await fetch('/api/actions')
                  if (response.ok) {
                    const result = await response.json()
                    setActionItems(result.actions || [])
                  }
                }}
              />
            )}
          </div>

          {/* AI-Suggested Generator (Coming Soon) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="premium-card p-6"
          >
            <h3 className="text-card-title mb-4">AI Action Generator</h3>
            <div className="text-center py-12">
              <p className="text-body muted mb-4">
                Automatically generate action items from your data insights
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-3 rounded-lg font-medium transition-all"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--card-border)',
                  color: 'var(--text-primary)',
                }}
                disabled
              >
                Coming Soon
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  )
}
