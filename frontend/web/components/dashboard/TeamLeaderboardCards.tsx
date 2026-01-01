'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { ServerGradeCard } from './ServerGradeCard'
import { EmptyState } from '@/components/ui/EmptyState'
import clsx from 'clsx'

interface Server {
  Server: string
  Revenue: number
  Transactions: number
  Void_Rate_Pct: number
  Void_Amount: number
}

interface TeamLeaderboardCardsProps {
  servers: Server[]
  teamAverages: {
    avgRevenue: number
    avgTransactions: number
    avgVoidRate: number
  }
  coachingInsightsMap?: Record<string, Array<{ title: string; rationale: string; priority: 'high' | 'medium' | 'low' }>>
  onServerClick?: (server: Server) => void
}

type SortField = 'Revenue' | 'Transactions' | 'Void_Rate_Pct'
type SortDirection = 'asc' | 'desc'

export function TeamLeaderboardCards({
  servers,
  teamAverages,
  coachingInsightsMap = {},
  onServerClick,
}: TeamLeaderboardCardsProps) {
  const [sortField, setSortField] = useState<SortField>('Revenue')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  if (servers.length === 0) {
    return (
      <EmptyState
        title="No Team Data Available"
        description="Team performance data is not available. Run analysis to generate team metrics."
      />
    )
  }

  // Calculate grades for each server
  const calculateGrade = (server: Server, index: number, total: number): 'A' | 'B' | 'C' | 'D' => {
    const percentile = (index / total) * 100
    if (percentile <= 25) return 'A'
    if (percentile <= 75) return 'B'
    if (server.Void_Rate_Pct > teamAverages.avgVoidRate * 1.5) return 'D'
    return 'C'
  }

  // Generate personality tags
  const getPersonalityTag = (server: Server): string | undefined => {
    if (server.Void_Rate_Pct < teamAverages.avgVoidRate * 0.8) {
      return 'Consistent Performer'
    }
    if (server.Revenue > teamAverages.avgRevenue * 1.2) {
      return 'Top Performer'
    }
    if (server.Void_Rate_Pct > teamAverages.avgVoidRate * 1.3) {
      return 'Needs Coaching'
    }
    return undefined
  }

  // Sort servers
  const sortedServers = [...servers].sort((a, b) => {
    const aVal = a[sortField] || 0
    const bVal = b[sortField] || 0
    return sortDirection === 'desc' ? bVal - aVal : aVal - bVal
  })

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const SortButton = ({ field, label }: { field: SortField; label: string }) => {
    const isActive = sortField === field
    return (
      <button
        onClick={() => handleSort(field)}
        className={clsx(
          'flex items-center gap-1 px-3 py-2 rounded-lg text-body font-medium transition-all',
          isActive && 'bg-accent-primary/10'
        )}
        style={{
          backgroundColor: isActive ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
          color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
          border: isActive ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
        }}
      >
        {label}
        {isActive ? (
          sortDirection === 'desc' ? (
            <ArrowDown size={14} />
          ) : (
            <ArrowUp size={14} />
          )
        ) : (
          <ArrowUpDown size={14} />
        )}
      </button>
    )
  }

  return (
    <div className="premium-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-section-title">Team Leaderboard</h3>
        <div className="flex items-center gap-2">
          <SortButton field="Revenue" label="Revenue" />
          <SortButton field="Transactions" label="Transactions" />
          <SortButton field="Void_Rate_Pct" label="Waste Rate" />
        </div>
      </div>

      <div className="space-y-4">
        {sortedServers.map((server, index) => {
          const grade = calculateGrade(server, index, sortedServers.length)
          const personalityTag = getPersonalityTag(server)
          const insights = coachingInsightsMap[server.Server] || []

          return (
            <ServerGradeCard
              key={server.Server}
              server={server}
              rank={index + 1}
              grade={grade}
              teamAverages={teamAverages}
              coachingInsights={insights}
              personalityTag={personalityTag}
              onViewProfile={() => onServerClick?.(server)}
            />
          )
        })}
      </div>
    </div>
  )
}
