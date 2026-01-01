'use client'

import { motion } from 'framer-motion'
import { GlassCard } from './GlassCard'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/ui'
import clsx from 'clsx'

interface TeamLeaderboardCardProps {
  data: Array<{
    Server: string
    Revenue: number
    Transactions: number
    Void_Rate_Pct: number
    Void_Amount?: number
  }>
  selectedServer?: string
  onServerClick: (server: string) => void
  sortBy?: 'Revenue' | 'Transactions' | 'Void_Rate_Pct'
  onSortChange?: (sortBy: 'Revenue' | 'Transactions' | 'Void_Rate_Pct') => void
}

export function TeamLeaderboardCard({
  data,
  selectedServer,
  onServerClick,
  sortBy = 'Revenue',
  onSortChange,
}: TeamLeaderboardCardProps) {
  if (!data || data.length === 0) {
    return (
      <GlassCard>
        <div className="p-6 text-center">
          <p className="text-sm muted">No team data available for this period</p>
        </div>
      </GlassCard>
    )
  }

  return (
    <GlassCard>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
            Team Leaderboard
          </h3>
          {onSortChange && (
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: 'var(--muted)' }}>Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value as 'Revenue' | 'Transactions' | 'Void_Rate_Pct')}
                className="px-3 py-1 text-sm rounded-md"
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--card-border)',
                  color: 'var(--text)',
                  borderRadius: 'var(--radius)',
                }}
              >
                <option value="Revenue">Revenue</option>
                <option value="Transactions">Transactions</option>
                <option value="Void_Rate_Pct">Void Rate %</option>
              </select>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {data.map((server, index) => {
            const isSelected = selectedServer === server.Server
            return (
              <motion.div
                key={server.Server}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onServerClick(server.Server)}
                className={clsx(
                  'p-4 rounded-md cursor-pointer transition-all',
                  isSelected
                    ? 'ring-2'
                    : 'hover:bg-[rgba(var(--primary-rgb),0.05)]'
                )}
                style={{
                  backgroundColor: isSelected ? 'rgba(var(--primary-rgb),0.1)' : 'transparent',
                  border: isSelected ? '1px solid var(--primary)' : '1px solid transparent',
                  borderRadius: 'var(--radius)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm"
                      style={{
                        backgroundColor: index < 3 ? 'var(--primary)' : 'var(--surface)',
                        color: index < 3 ? 'white' : 'var(--text)',
                      }}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold" style={{ color: 'var(--text)' }}>
                        {server.Server}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--muted)' }}>
                        {formatNumber(server.Transactions)} transactions
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                        {formatCurrency(server.Revenue)}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--muted)' }}>
                        Revenue
                      </div>
                    </div>
                    {server.Void_Rate_Pct > 0 && (
                      <div className="text-right">
                        <div
                          className="text-sm font-medium"
                          style={{
                            color: server.Void_Rate_Pct > 5 ? 'var(--accent)' : 'var(--text)',
                          }}
                        >
                          {formatPercent(server.Void_Rate_Pct)}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--muted)' }}>
                          Void Rate
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </GlassCard>
  )
}
