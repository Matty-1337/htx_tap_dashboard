'use client'

import { GlassCard } from './GlassCard'
import { KpiCard } from './KpiCard'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/ui'

interface CoachingSnapshotCardProps {
  snapshot: {
    Server: string
    Revenue: number
    Transactions: number
    Void_Amount: number
    Void_Rate_Pct: number
  } | null
  topReasons?: Array<{ reason: string; amount: number }>
}

export function CoachingSnapshotCard({ snapshot, topReasons }: CoachingSnapshotCardProps) {
  if (!snapshot) {
    return (
      <GlassCard>
        <div className="p-6 text-center">
          <p className="text-sm muted">Select a team member to view coaching snapshot</p>
        </div>
      </GlassCard>
    )
  }

  return (
    <GlassCard>
      <div className="p-6">
        <h3 className="text-xl font-semibold mb-6" style={{ color: 'var(--text)' }}>
          Coaching Snapshot: {snapshot.Server}
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <KpiCard
            title="Revenue"
            value={formatCurrency(snapshot.Revenue)}
            trend={null}
          />
          <KpiCard
            title="Transactions"
            value={formatNumber(snapshot.Transactions)}
            trend={null}
          />
          {snapshot.Void_Amount > 0 && (
            <KpiCard
              title="Void Amount"
              value={formatCurrency(snapshot.Void_Amount)}
              trend={null}
            />
          )}
          {snapshot.Void_Rate_Pct > 0 && (
            <KpiCard
              title="Void Rate"
              value={formatPercent(snapshot.Void_Rate_Pct)}
              trend={null}
            />
          )}
        </div>

        {topReasons && topReasons.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
              Top Leakage Reasons
            </h4>
            <div className="space-y-2">
              {topReasons.map((reason, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-md"
                  style={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--card-border)',
                    borderRadius: 'var(--radius)',
                  }}
                >
                  <span className="text-sm" style={{ color: 'var(--text)' }}>
                    {reason.reason}
                  </span>
                  <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
                    {formatCurrency(reason.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  )
}
