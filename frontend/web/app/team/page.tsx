'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { HeaderBar } from '@/components/layout/HeaderBar'
import { HeroMetricCard } from '@/components/ui/HeroMetricCard'
import { ServerGradeDonut } from '@/components/dashboard/ServerGradeDonut'
import { TeamLeaderboardCards } from '@/components/dashboard/TeamLeaderboardCards'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonKpiCard } from '@/components/dashboard/SkeletonCard'
import { getTeamLeaderboard, getTeamAverages, getCoachingInsights } from '@/lib/data-utils'
import { getClientThemeAttr } from '@/lib/brand'
import { Lightbulb, Users, TrendingUp, Award } from 'lucide-react'

interface AnalysisData {
  clientId?: string
  generatedAt?: string
  tables?: {
    employee_performance?: { data: any[]; columns?: string[] }
    [key: string]: any
  }
  [key: string]: any
}

export default function TeamPage() {
  const [data, setData] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [clientName, setClientName] = useState('Analytics')
  const [themeAttr, setThemeAttr] = useState('default')
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError('')

      try {
        const sessionRes = await fetch('/api/session')
        if (!sessionRes.ok) {
          router.push('/login')
          return
        }

        const session = await sessionRes.json()
        if (session.clientId) {
          setClientName(session.clientId.charAt(0).toUpperCase() + session.clientId.slice(1))
          setThemeAttr(getClientThemeAttr(session.clientId))
        }

        // Fetch analysis data
        const response = await fetch('/api/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            params: {
              dateRange: {
                preset: '30d',
                // Backend computes start/end from dataset max date when preset is provided
              },
            },
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to fetch team data')
        }

        const analysisData = await response.json()
        setData(analysisData)
      } catch (err: any) {
        setError(err.message || 'Failed to load team data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  const handleRunAnalysis = async () => {
    // Trigger analysis
    console.log('Run analysis')
  }

  // Get employee data
  const employeeData = data?.tables?.employee_performance?.data || []
  const teamLeaderboard = getTeamLeaderboard(employeeData, 50, 'Revenue')
  const teamAverages = getTeamAverages(employeeData)

  // Calculate server grades
  const totalServers = teamLeaderboard.length
  const serverGrades = {
    a: Math.max(0, Math.floor(totalServers * 0.25)),
    b: Math.max(0, Math.floor(totalServers * 0.5)),
    c: Math.max(0, totalServers - Math.floor(totalServers * 0.75)),
    d: teamLeaderboard.filter(s => s.Void_Rate_Pct > teamAverages.avgVoidRate * 1.5).length,
  }

  // Build coaching insights map
  const coachingInsightsMap: Record<string, Array<{ title: string; rationale: string; priority: 'high' | 'medium' | 'low' }>> = {}
  teamLeaderboard.forEach((server) => {
    const snapshot = {
      Server: server.Server,
      Revenue: server.Revenue,
      Transactions: server.Transactions,
      Void_Amount: server.Void_Amount,
      Void_Rate_Pct: server.Void_Rate_Pct,
    }
    const insights = getCoachingInsights(snapshot, teamAverages)
    if (insights.length > 0) {
      coachingInsightsMap[server.Server] = insights
    }
  })

  // Calculate summary metrics
  const totalServersCount = teamLeaderboard.length
  const avgSPH = teamAverages.avgRevenue / Math.max(teamAverages.avgTransactions / 10, 1)
  const topSPH = teamLeaderboard.length > 0
    ? teamLeaderboard[0].Revenue / Math.max(teamLeaderboard[0].Transactions / 10, 1)
    : 0
  const totalSales = teamLeaderboard.reduce((sum, s) => sum + s.Revenue, 0)

  // Generate sparklines
  const generateSparkline = (value: number): number[] => {
    const base = value / 30
    return Array.from({ length: 30 }, (_, i) => {
      const progress = i / 30
      const variation = Math.sin(progress * Math.PI * 2) * 0.2 + 1
      return base * variation
    })
  }

  // Get coaching recommendations (top 3 insights)
  const allInsights = Object.values(coachingInsightsMap).flat()
  const topRecommendations = allInsights
    .filter(i => i.priority === 'high')
    .slice(0, 3)

  if (loading) {
    return (
      <DashboardLayout
        clientName={clientName}
        onRunAnalysis={handleRunAnalysis}
        isRunning={false}
      >
        <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
          <HeaderBar title="Team" subtitle="Loading..." />
          <div className="max-w-[1920px] mx-auto px-6 py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <SkeletonKpiCard key={i} />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <SkeletonKpiCard />
              <SkeletonKpiCard />
            </div>
            <SkeletonKpiCard />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error && !data) {
    return (
      <DashboardLayout
        clientName={clientName}
        onRunAnalysis={handleRunAnalysis}
        isRunning={false}
      >
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
          <EmptyState
            title="Error Loading Team Data"
            description={error}
            action={{
              label: 'Retry',
              onClick: () => window.location.reload(),
            }}
          />
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
          title="Team Performance"
          subtitle="Deep dive into server performance and coaching opportunities"
        />

        <div className="max-w-[1920px] mx-auto px-6 py-8">
          {/* Summary Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <HeroMetricCard
              title="Total Servers"
              value={totalServersCount}
              onClick={() => {}}
              delay={0}
            />
            <HeroMetricCard
              title="Avg SPH"
              value={`$${Math.round(avgSPH).toLocaleString()}/hr`}
              trend={{ value: 0, period: 'team average' }}
              sparkline={generateSparkline(avgSPH)}
              onClick={() => {}}
              delay={0.1}
            />
            <HeroMetricCard
              title="Top SPH"
              value={`$${Math.round(topSPH).toLocaleString()}/hr`}
              trend={{ value: 0, period: 'best performer' }}
              sparkline={generateSparkline(topSPH)}
              onClick={() => {}}
              delay={0.2}
            />
            <HeroMetricCard
              title="Total Sales"
              value={totalSales}
              trend={{ value: 0, period: 'this period' }}
              sparkline={generateSparkline(totalSales)}
              onClick={() => {}}
              delay={0.3}
            />
          </div>

          {/* Grade Distribution + Performance by Grade */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {employeeData.length === 0 ? (
              <EmptyState
                title="No Server Data Available"
                description="Server performance data is not available. Run analysis to generate team metrics."
              />
            ) : (
              <>
                <ServerGradeDonut grades={serverGrades} />
                
                {/* Performance by Grade Bar Chart (placeholder - would use Recharts) */}
                <div className="premium-card p-6">
                  <h3 className="text-card-title mb-4">Performance by Grade</h3>
                  <div className="text-center py-12">
                    <p className="text-body muted">Chart visualization coming soon</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Sortable Leaderboard */}
          <div className="mb-8">
            {employeeData.length === 0 ? (
              <EmptyState
                title="No Team Data Available"
                description="Team performance data is not available. Run analysis to generate team metrics."
              />
            ) : (
              <TeamLeaderboardCards
                servers={teamLeaderboard}
                teamAverages={teamAverages}
                coachingInsightsMap={coachingInsightsMap}
                onServerClick={(server) => {
                  console.log('View server:', server)
                }}
              />
            )}
          </div>

          {/* Coaching Recommendations Panel */}
          {topRecommendations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="premium-card p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <Lightbulb size={24} style={{ color: 'var(--accent-primary)' }} />
                <h3 className="text-section-title">Coaching Recommendations</h3>
              </div>
              <div className="space-y-4">
                {topRecommendations.map((rec, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="p-4 rounded-lg"
                    style={{
                      backgroundColor: 'rgba(99, 102, 241, 0.05)',
                      borderLeft: '3px solid var(--accent-primary)',
                    }}
                  >
                    <div className="text-body font-medium mb-2">{rec.title}</div>
                    <div className="text-caption muted">{rec.rationale}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
