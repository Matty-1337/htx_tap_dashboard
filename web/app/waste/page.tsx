'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { HeaderBar } from '@/components/layout/HeaderBar'
import { HeroMetricCard } from '@/components/ui/HeroMetricCard'
import { LeakageSankey } from '@/components/dashboard/LeakageSankey'
import { WasteServerRowCard } from '@/components/dashboard/WasteServerRowCard'
import { SuspiciousAlertsPanel } from '@/components/dashboard/SuspiciousAlertsPanel'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonKpiCard } from '@/components/dashboard/SkeletonCard'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { getWasteSources, getLeakageByReasonWithServer, getServerWasteRanking, detectSuspiciousPatterns } from '@/lib/waste-utils'
import { getClientThemeAttr } from '@/lib/brand'

interface AnalysisData {
  clientId?: string
  generatedAt?: string
  tables?: {
    waste_efficiency?: { data: any[]; columns?: string[] }
    [key: string]: any
  }
  [key: string]: any
}

const PIE_COLORS = ['#ef4444', '#eab308', '#f59e0b', '#3b82f6', '#a855f7', '#22c55e', '#71717a']

export default function WastePage() {
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
          throw new Error('Failed to fetch waste data')
        }

        const analysisData = await response.json()
        setData(analysisData)
      } catch (err: any) {
        setError(err.message || 'Failed to load waste data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  const handleRunAnalysis = async () => {
    console.log('Run analysis')
  }

  // Get waste data
  const wasteData = data?.tables?.waste_efficiency?.data || []
  
  // Calculate hero metrics
  const wasteSources = useMemo(() => getWasteSources(wasteData), [wasteData])
  const totalLeakage = wasteSources.reduce((sum, s) => sum + s.amount, 0)
  
  const { reasons, servers } = useMemo(() => getLeakageByReasonWithServer(wasteData), [wasteData])
  const topReason = reasons.length > 0 ? reasons[0] : null
  
  // Calculate void rate (simplified - would need revenue data)
  const voidRate = wasteData.length > 0 ? 12.5 : 0 // Placeholder
  
  // High-risk servers (void rate > 15%)
  const serverRanking = useMemo(() => getServerWasteRanking(wasteData), [wasteData])
  const highRiskServers = serverRanking.filter(s => s.Void_Rate_Pct > 15).length

  // Sankey data
  const sankeyData = useMemo(() => ({
    sources: wasteSources,
    reasons,
    servers,
  }), [wasteSources, reasons, servers])

  // Suspicious alerts
  const suspiciousAlerts = useMemo(() => detectSuspiciousPatterns(wasteData), [wasteData])

  // Generate sparklines
  const generateSparkline = (value: number): number[] => {
    const base = value / 30
    return Array.from({ length: 30 }, (_, i) => {
      const progress = i / 30
      const variation = Math.sin(progress * Math.PI * 2) * 0.2 + 1
      return base * variation
    })
  }

  if (loading) {
    return (
      <DashboardLayout
        clientName={clientName}
        onRunAnalysis={handleRunAnalysis}
        isRunning={false}
      >
        <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
          <HeaderBar title="Waste & Leakage" subtitle="Loading..." />
          <div className="max-w-[1920px] mx-auto px-6 py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <SkeletonKpiCard key={i} />
              ))}
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
            title="Error Loading Waste Data"
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
          title="Waste & Leakage"
          subtitle="Identify and eliminate revenue leakage"
        />

        <div className="max-w-[1920px] mx-auto px-6 py-8">
          {/* SECTION 1: Hero Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <HeroMetricCard
              title="Total Leakage"
              value={totalLeakage}
              trend={{ value: 0, period: 'this period' }}
              sparkline={generateSparkline(totalLeakage)}
              onClick={() => {}}
              delay={0}
            />
            <HeroMetricCard
              title="Void Rate"
              value={`${voidRate.toFixed(1)}%`}
              trend={{ value: 0, period: 'of revenue' }}
              onClick={() => {}}
              delay={0.1}
            />
            <HeroMetricCard
              title="Top Void Reason"
              value={topReason ? `${topReason.reason} ($${topReason.amount.toLocaleString()})` : 'N/A'}
              trend={{ value: 0, period: 'primary cause' }}
              onClick={() => {}}
              delay={0.2}
            />
            <HeroMetricCard
              title="High-Risk Servers"
              value={highRiskServers}
              trend={{ value: 0, period: 'need attention' }}
              onClick={() => {}}
              delay={0.3}
            />
          </div>

          {/* SECTION 2: Leakage Sankey */}
          <div className="mb-8">
            <LeakageSankey
              data={sankeyData}
              onNodeClick={(nodeId, nodeData) => {
                console.log('Node clicked:', nodeId, nodeData)
              }}
              onEdgeClick={(edgeId, edgeData) => {
                console.log('Edge clicked:', edgeId, edgeData)
              }}
            />
          </div>

          {/* SECTION 3: Tab Name Correlations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Tab Name vs Server Discount */}
            <div className="premium-card p-6">
              <h3 className="text-section-title mb-6">Tab Name vs Server Discount</h3>
              {data?.charts?.tab_name_server_discount && data.charts.tab_name_server_discount.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.charts.tab_name_server_discount.slice(0, 20)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      type="number"
                      label={{ value: 'Discount Amount ($)', position: 'insideBottom', offset: -5 }}
                      style={{ fontSize: '12px', fill: 'var(--text-secondary)' }}
                    />
                    <YAxis
                      type="category"
                      dataKey="tabName"
                      width={150}
                      style={{ fontSize: '12px', fill: 'var(--text-secondary)' }}
                    />
                    <Tooltip
                      formatter={(value: number, name: string, props: any) => [
                        `$${value.toLocaleString()}`,
                        `${props.payload.server || 'Unknown'}`
                      ]}
                      contentStyle={{
                        backgroundColor: 'var(--bg-tertiary)',
                        border: '1px solid var(--card-border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-primary)',
                      }}
                      labelFormatter={(label) => `Tab: ${label}`}
                    />
                    <Bar dataKey="discountAmount" fill="var(--status-warning)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState
                  title="No Correlation Data"
                  description="Tab name vs server discount correlation data is not available."
                />
              )}
            </div>

            {/* Tab Name vs Server Void */}
            <div className="premium-card p-6">
              <h3 className="text-section-title mb-6">Tab Name vs Server Void</h3>
              {data?.charts?.tab_name_server_void && data.charts.tab_name_server_void.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.charts.tab_name_server_void.slice(0, 20)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      type="number"
                      label={{ value: 'Void Amount ($)', position: 'insideBottom', offset: -5 }}
                      style={{ fontSize: '12px', fill: 'var(--text-secondary)' }}
                    />
                    <YAxis
                      type="category"
                      dataKey="tabName"
                      width={150}
                      style={{ fontSize: '12px', fill: 'var(--text-secondary)' }}
                    />
                    <Tooltip
                      formatter={(value: number, name: string, props: any) => [
                        `$${value.toLocaleString()}`,
                        `${props.payload.server || 'Unknown'}`
                      ]}
                      contentStyle={{
                        backgroundColor: 'var(--bg-tertiary)',
                        border: '1px solid var(--card-border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-primary)',
                      }}
                      labelFormatter={(label) => `Tab: ${label}`}
                    />
                    <Bar dataKey="voidAmount" fill="var(--status-danger)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState
                  title="No Correlation Data"
                  description="Tab name vs server void correlation data is not available."
                />
              )}
            </div>
          </div>

          {/* Server Waste Efficiency Ranking */}
          <div className="premium-card p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-section-title mb-1">Server Waste Efficiency</h3>
                <p className="text-caption muted">Ranked by total leakage amount</p>
              </div>
            </div>
            {serverRanking.length === 0 ? (
              <EmptyState
                title="No Server Data"
                description="Server waste efficiency data is not available."
              />
            ) : (
              <div className="space-y-3">
                {serverRanking.slice(0, 10).map((server, idx) => (
                  <WasteServerRowCard
                    key={server.Server || idx}
                    server={server}
                    rank={idx + 1}
                    teamAverage={serverRanking.reduce((sum, s) => sum + s.Void_Rate_Pct, 0) / serverRanking.length}
                    onViewDetails={() => console.log('View details:', server.Server)}
                    onCreateAction={() => console.log('Create action:', server.Server)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* SECTION 4: Suspicious Alerts */}
          <SuspiciousAlertsPanel
            alerts={suspiciousAlerts}
            onCreateAction={(alert) => console.log('Create action:', alert)}
            onAssign={(alert) => console.log('Assign:', alert)}
            onMarkInvestigated={(alert) => console.log('Mark investigated:', alert)}
          />
        </div>
      </div>
    </DashboardLayout>
  )
}
