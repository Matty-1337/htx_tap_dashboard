'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ActionItem, Priority, Assignee } from '@/lib/action-engine'
import { PillBadge } from './PillBadge'
import clsx from 'clsx'

interface ActionRailProps {
  actions: ActionItem[]
  onActionUpdate?: () => void
}

export function ActionRail({ actions, onActionUpdate }: ActionRailProps) {
  const [activeTab, setActiveTab] = useState<'open' | 'completed'>('open')
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set())
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [assignees, setAssignees] = useState<Record<string, Assignee>>({})
  const [assigneeFilter, setAssigneeFilter] = useState<'All' | Assignee>('All')

  const openActions = actions.filter((a) => !completedIds.has(a.id))
  const completedActions = actions.filter((a) => completedIds.has(a.id))

  // Filter by assignee if filter is active
  const filteredOpenActions = assigneeFilter === 'All' 
    ? openActions 
    : openActions.filter(a => {
        const assignee = assignees[a.id] ?? a.assignee ?? 'GM'
        return assignee === assigneeFilter
      })

  // Sort: pinned first, then by priority and impact
  const sortedActions = [...filteredOpenActions].sort((a, b) => {
    const aPinned = pinnedIds.has(a.id)
    const bPinned = pinnedIds.has(b.id)
    if (aPinned !== bPinned) return aPinned ? -1 : 1

    const priorityOrder = { high: 3, medium: 2, low: 1 }
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    }
    return (b.estimatedImpactUsd || 0) - (a.estimatedImpactUsd || 0)
  })

  const displayActions = activeTab === 'open' ? sortedActions : completedActions

  const setAssigneeFor = async (id: string, value: Assignee) => {
    setAssignees((prev) => ({ ...prev, [id]: value }))
    
    // Persist to Supabase
    try {
      const response = await fetch(`/api/actions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignee: value }),
      })
      if (response.ok && onActionUpdate) {
        onActionUpdate()
      }
    } catch (err) {
      console.error('Failed to update assignee:', err)
    }
  }

  const handleMarkDone = async (id: string) => {
    setCompletedIds((prev) => new Set([...prev, id]))
    setPinnedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    
    // Persist to Supabase
    try {
      const response = await fetch(`/api/actions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' }),
      })
      if (response.ok && onActionUpdate) {
        onActionUpdate()
      }
    } catch (err) {
      console.error('Failed to mark done:', err)
    }
  }

  const handlePin = (id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const copyActions = () => {
    // Only include OPEN actions (not completed)
    const openActionsForCopy = actions.filter((a) => !completedIds.has(a.id))
    
    // Group actions by assignee
    const groupedByAssignee: Record<Assignee, ActionItem[]> = {
      'GM': [],
      'Manager 1': [],
      'Manager 2': [],
    }

    openActionsForCopy.forEach((action) => {
      const assignee = assignees[action.id] ?? action.assignee ?? 'GM'
      groupedByAssignee[assignee].push(action)
    })

    // Build markdown grouped by assignee
    const sections: string[] = []
    
    if (groupedByAssignee['GM'].length > 0) {
      sections.push('# GM Action Items\n')
      sections.push('## GM')
      groupedByAssignee['GM'].forEach((action) => {
        const priorityEmoji = { high: '🔴', medium: '🟡', low: '🟢' }[action.priority]
        const impact = action.estimatedImpactUsd
          ? ` (Est. upside: $${action.estimatedImpactUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })})`
          : ''
        sections.push(`\n**${priorityEmoji} ${action.title}${impact}**\n${action.rationale}\n${action.steps.slice(0, 3).map((s) => `- ${s}`).join('\n')}`)
      })
    }

    if (groupedByAssignee['Manager 1'].length > 0) {
      sections.push('\n\n## Manager 1')
      groupedByAssignee['Manager 1'].forEach((action) => {
        const priorityEmoji = { high: '🔴', medium: '🟡', low: '🟢' }[action.priority]
        const impact = action.estimatedImpactUsd
          ? ` (Est. upside: $${action.estimatedImpactUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })})`
          : ''
        sections.push(`\n**${priorityEmoji} ${action.title}${impact}**\n${action.rationale}\n${action.steps.slice(0, 3).map((s) => `- ${s}`).join('\n')}`)
      })
    }

    if (groupedByAssignee['Manager 2'].length > 0) {
      sections.push('\n\n## Manager 2')
      groupedByAssignee['Manager 2'].forEach((action) => {
        const priorityEmoji = { high: '🔴', medium: '🟡', low: '🟢' }[action.priority]
        const impact = action.estimatedImpactUsd
          ? ` (Est. upside: $${action.estimatedImpactUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })})`
          : ''
        sections.push(`\n**${priorityEmoji} ${action.title}${impact}**\n${action.rationale}\n${action.steps.slice(0, 3).map((s) => `- ${s}`).join('\n')}`)
      })
    }

    const markdown = sections.join('\n')
    navigator.clipboard.writeText(markdown)
    // Could add a toast notification here
  }

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'high':
        return { color: 'var(--primary)', glow: 'var(--glow)' }
      case 'medium':
        return { color: 'var(--secondary)', glow: 'none' }
      case 'low':
        return { color: 'var(--muted)', glow: 'none' }
    }
  }

  return (
    <aside className="hidden lg:block w-80 flex-shrink-0 sticky top-20 h-[calc(100vh-5rem)] pt-8 pr-6">
      <div className="surface p-6 h-full overflow-y-auto" style={{ borderRadius: 'var(--radius)' }}>
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-1" style={{ color: 'var(--text)' }}>
            Action Items
          </h2>
          <p className="text-xs muted">Based on latest run</p>
        </div>

        {/* Assignee Filter */}
        <div className="mb-4">
          <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: 'rgba(var(--muted-rgb, 107, 114, 128), 0.1)' }}>
            {(['All', 'GM', 'Manager 1', 'Manager 2'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setAssigneeFilter(filter)}
                className="flex-1 px-2 py-1 text-xs font-medium transition-colors rounded"
                style={{
                  backgroundColor: assigneeFilter === filter ? 'var(--primary)' : 'transparent',
                  color: assigneeFilter === filter ? 'var(--text)' : 'var(--muted)',
                }}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b" style={{ borderColor: 'var(--card-border)' }}>
          <button
            onClick={() => setActiveTab('open')}
            className={clsx('px-4 py-2 text-sm font-medium transition-colors', activeTab === 'open' && 'border-b-2')}
            style={{
              color: activeTab === 'open' ? 'var(--primary)' : 'var(--muted)',
              borderBottomColor: activeTab === 'open' ? 'var(--primary)' : 'transparent',
            }}
          >
            Open ({openActions.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={clsx('px-4 py-2 text-sm font-medium transition-colors', activeTab === 'completed' && 'border-b-2')}
            style={{
              color: activeTab === 'completed' ? 'var(--primary)' : 'var(--muted)',
              borderBottomColor: activeTab === 'completed' ? 'var(--primary)' : 'transparent',
            }}
          >
            Completed ({completedActions.length})
          </button>
        </div>

        {/* Copy Actions Button */}
        {displayActions.length > 0 && (
          <button
            onClick={copyActions}
            className="w-full mb-4 px-3 py-2 text-sm transition-colors"
            style={{
              backgroundColor: 'var(--surface)',
              color: 'var(--text)',
              border: '1px solid var(--card-border)',
              borderRadius: 'var(--radius)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(var(--muted-rgb, 107, 114, 128), 0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--surface)'
            }}
          >
            📋 Copy Actions
          </button>
        )}

        {/* Actions List */}
        <div className="space-y-4">
          <AnimatePresence>
            {displayActions.length === 0 ? (
              <div className="text-center py-8 muted text-sm">No {activeTab} actions</div>
            ) : (
              displayActions.map((action) => {
                const isExpanded = expandedIds.has(action.id)
                const isPinned = pinnedIds.has(action.id)
                const priorityStyle = getPriorityColor(action.priority)
                const assignee = assignees[action.id] ?? action.assignee ?? 'GM'

                return (
                  <motion.div
                    key={action.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="surface p-4"
                    style={{
                      borderRadius: 'var(--radius)',
                      boxShadow: action.priority === 'high' ? priorityStyle.glow : 'var(--shadow)',
                    }}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <PillBadge
                            variant="default"
                            className="text-xs"
                            style={{
                              backgroundColor: priorityStyle.color,
                              color: 'var(--text)',
                              opacity: 0.2,
                            }}
                          >
                            {action.priority.toUpperCase()}
                          </PillBadge>
                          {isPinned && <span className="text-xs">📌</span>}
                        </div>
                        <h3
                          className="font-semibold text-sm cursor-pointer"
                          style={{ color: 'var(--text)' }}
                          onClick={() => toggleExpand(action.id)}
                        >
                          {action.title}
                        </h3>
                      </div>
                    </div>

                    {/* Assignee Dropdown */}
                    <div className="mb-2">
                      <label className="text-xs muted mb-1 block">Assigned to</label>
                      <select
                        value={assignee}
                        onChange={(e) => setAssigneeFor(action.id, e.target.value as Assignee)}
                        className="w-full text-xs px-2 py-1 transition-colors"
                        style={{
                          backgroundColor: 'var(--surface)',
                          border: '1px solid var(--card-border)',
                          color: 'var(--text)',
                          borderRadius: 'var(--radius)',
                        }}
                        onFocus={(e) => {
                          e.target.style.outline = '2px solid var(--primary)'
                          e.target.style.outlineOffset = '2px'
                        }}
                        onBlur={(e) => {
                          e.target.style.outline = 'none'
                        }}
                      >
                        <option value="GM">GM</option>
                        <option value="Manager 1">Manager 1</option>
                        <option value="Manager 2">Manager 2</option>
                      </select>
                    </div>

                    {/* Impact */}
                    {action.estimatedImpactUsd && (
                      <div className="text-xs mb-2" style={{ color: 'var(--secondary)' }}>
                        Est. upside: ${action.estimatedImpactUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                    )}

                    {/* Rationale */}
                    <p className="text-xs mb-3 muted">{action.rationale}</p>

                    {/* Steps (expandable) */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mb-3">
                            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text)' }}>
                              Steps:
                            </p>
                            <ul className="space-y-1">
                              {action.steps.map((step, idx) => (
                                <li key={idx} className="text-xs muted flex items-start gap-2">
                                  <span className="mt-1">•</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Actions */}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => toggleExpand(action.id)}
                        className="text-xs px-2 py-1 transition-colors"
                        style={{
                          color: 'var(--primary)',
                          borderRadius: 'calc(var(--radius) / 2)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(var(--primary-rgb, 99, 102, 241), 0.1)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }}
                      >
                        {isExpanded ? 'Collapse' : 'Expand'}
                      </button>
                      {activeTab === 'open' && (
                        <>
                          <button
                            onClick={() => handlePin(action.id)}
                            className="text-xs px-2 py-1 transition-colors"
                            style={{
                              color: isPinned ? 'var(--secondary)' : 'var(--muted)',
                              borderRadius: 'calc(var(--radius) / 2)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(var(--muted-rgb, 107, 114, 128), 0.1)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent'
                            }}
                          >
                            {isPinned ? '📌 Pinned' : 'Pin'}
                          </button>
                          <button
                            onClick={() => handleMarkDone(action.id)}
                            className="text-xs px-2 py-1 transition-colors ml-auto"
                            style={{
                              color: 'var(--primary)',
                              borderRadius: 'calc(var(--radius) / 2)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(var(--primary-rgb, 99, 102, 241), 0.1)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent'
                            }}
                          >
                            ✓ Done
                          </button>
                        </>
                      )}
                    </div>
                  </motion.div>
                )
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </aside>
  )
}
