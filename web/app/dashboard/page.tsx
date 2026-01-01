'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { HeaderBar } from '@/components/layout/HeaderBar'
import { HeroMetricCard } from '@/components/ui/HeroMetricCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonKpiCard } from '@/components/dashboard/SkeletonCard'
import { ServerGradeDonut } from '@/components/dashboard/ServerGradeDonut'
import { RevenueHeatmap } from '@/components/dashboard/RevenueHeatmap'
import { TopPerformersCard } from '@/components/dashboard/TopPerformersCard'
import { NeedsAttentionCard } from '@/components/dashboard/NeedsAttentionCard'
import { ActionRail } from '@/components/dashboard/ActionRail'
import { getTeamLeaderboard, getWasteBreakdown } from '@/lib/data-utils'
import { ActionItem } from '@/lib/action-engine'
import { getClientThemeAttr } from '@/lib/brand'
import clsx from 'clsx'

interface AnalysisData {
  clientId?: string
  generatedAt?: string
  kpis?: Record<string, number>
  charts?: {
    hourly_revenue?: Array<any>
    day_of_week?: Array<any>
  }
  tables?: {
    employee_performance?: { data: any[]; columns?: string[] }
    waste_efficiency?: { data: any[]; columns?: string[] }
    menu_volatility?: { data: any[]; columns?: string[] }
    [key: string]: any
  }
  dataCoverage?: {
    minDate?: string | null
    maxDate?: string | null
    dateCol?: string | null
    rowCount?: number
    columnsSample?: string[]
  }
  executionTimeSeconds?: number
  [key: string]: any
}

type Filters = {
  datePreset?: '7d' | '30d' | '90d' | 'mtd'
}

export default function DashboardPage() {
  // ALL HOOKS MUST BE DECLARED AT THE TOP
  const [data, setData] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [filters, setFilters] = useState<Filters>({ datePreset: '30d' })
  const [actionItems, setActionItems] = useState<ActionItem[]>([])
  const [actionsLoading, setActionsLoading] = useState(true)
  const [roleNames, setRoleNames] = useState<{ gmName?: string; manager1Name?: string; manager2Name?: string }>({})
  const router = useRouter()

  // Fetch analysis data
  const fetchAnalysis = async () => {
    setLoading(true)
    setError('')

    try {
      const sessionRes = await fetch('/api/session')
      if (!sessionRes.ok) {
        router.push('/login')
        return
      }

      // For presets, send preset-only (backend computes dates relative to dataset max date)
      // For custom ranges (future), send start/end only
      const dateRange: { preset?: string; start?: string; end?: string } = {}
      
      const selectedPreset = filters.datePreset || '30d'
      
      // If a preset is selected, send preset-only (no start/end)
      if (selectedPreset) {
        dateRange.preset = selectedPreset
        // Explicitly omit start/end to let backend compute from dataset max date
      }
      // TODO: If custom date range is implemented in UI, send start/end only (no preset)
      
      // Defensive guard: warn in dev if both preset and start/end are accidentally included
      if (process.env.NODE_ENV !== 'production' && dateRange.preset && (dateRange.start || dateRange.end)) {
        console.warn(
          '[Dashboard] dateRange has both preset and start/end. Backend will ignore start/end and use preset-only.'
        )
      }

      const response = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ params: { dateRange } }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        // Build error message with dev-only details
        let errorMessage = errorData.error || errorData.details || errorData.message || `HTTP ${response.status}`
        
        // Append backend URL and tip if available (API only includes these in dev mode)
        if (errorData.backendUrl) {
          errorMessage += `\n\nBackend URL: ${errorData.backendUrl}`
        }
        if (errorData.tip) {
          errorMessage += `\n${errorData.tip}`
        }
        
        throw new Error(errorMessage)
      }

      const analysisData = await response.json()
      
      if (analysisData.tables) {
        Object.keys(analysisData.tables).forEach(key => {
          if (analysisData.tables[key]?.data && Array.isArray(analysisData.tables[key].data)) {
            analysisData.tables[key].data = analysisData.tables[key].data.slice(0, 500)
          }
        })
      }
      
      setData(analysisData)
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleRunAnalysis = async () => {
    setIsRunning(true)
    await fetchAnalysis()
    setIsRunning(false)
  }

  useEffect(() => {
    fetchAnalysis()
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
        setActionsLoading(false)
      }
    }
    fetchActions()
  }, [])

  useEffect(() => {
    if (data && !loading && !actionsLoading) {
      const generateAndPersist = async () => {
        try {
          const response = await fetch('/api/actions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payload: data, filters }),
          })
          if (response.ok) {
            const result = await response.json()
            setActionItems(result.actions || [])
          }
        } catch (err) {
          console.error('Failed to generate/persist actions:', err)
        }
      }
      generateAndPersist()
    }
  }, [data, loading, filters, actionsLoading])

  // Format time helper
  const formatTime = (timestamp?: string) => {
    if (!timestamp) return 'Never'
    try {
      const date = new Date(timestamp)
      return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return 'Invalid date'
    }
  }

  // Get client name
  const clientName = data?.clientId
    ? data.clientId.charAt(0).toUpperCase() + data.clientId.slice(1)
    : 'Analytics'

  const themeAttr = data?.clientId ? getClientThemeAttr(data.clientId) : 'default'

  // Calculate metrics and trends
  const kpis = data?.kpis || {}
  const revenue = kpis.Revenue || kpis.revenue || 0
  const leakage = kpis.Leakage || kpis.leakage || 0
  const alerts = actionItems.filter(a => a.priority === 'high').length
  const opportunity = kpis.Opportunity || kpis.opportunity || 0

  // Calculate trends (simplified - would need historical data for real trends)
  const revenueTrend = 8.2 // Placeholder - would calculate from historical
  const opportunityTrend = 15 // Placeholder

  // Generate sparkline data from chart data if available, otherwise generate placeholder
  const generateSparkline = (value: number, chartData?: any[]): number[] => {
    if (chartData && chartData.length > 0) {
      // Use actual chart data
      const valueKey = Object.keys(chartData[0]).find(k => 
        k.toLowerCase().includes('revenue') || 
        k.toLowerCase().includes('net price') ||
        k.toLowerCase().includes('value')
      )
      if (valueKey) {
        return chartData.map((item: any) => item[valueKey] || 0).slice(-30) // Last 30 points
      }
    }
    // Fallback: generate smooth curve
    const base = value / 30
    return Array.from({ length: 30 }, (_, i) => {
      const progress = i / 30
      const variation = Math.sin(progress * Math.PI * 2) * 0.2 + 1
      return base * variation
    })
  }

  // Get employee data for server grades
  const employeeData = data?.tables?.employee_performance?.data || []
  const teamLeaderboard = getTeamLeaderboard(employeeData, 10, 'Revenue')
  
  // Calculate server grades based on performance
  // Grade A: Top 25%, Grade B: 25-75%, Grade C: Bottom 25%
  const totalServers = teamLeaderboard.length
  const serverGrades = {
    a: Math.max(0, Math.floor(totalServers * 0.25)),
    b: Math.max(0, Math.floor(totalServers * 0.5)),
    c: Math.max(0, totalServers - Math.floor(totalServers * 0.75)),
    d: 0, // D grade would be for critical underperformers
  }

  // Get top performers (calculate SPH from Revenue/Transactions if Hours not available)
  const topPerformers = teamLeaderboard.slice(0, 3).map((server, idx) => {
    // Estimate hours from transactions (assume ~10 transactions per hour average)
    const estimatedHours = server.Transactions > 0 ? server.Transactions / 10 : 1
    const sph = server.Revenue / Math.max(estimatedHours, 1)
    return {
      name: server.Server || 'Unknown',
      metric: 'Sales Per Hour',
      value: `$${Math.round(sph).toLocaleString()}/hr`,
      rank: (idx + 1) as 1 | 2 | 3,
    }
  })

  // Get needs attention items
  const needsAttention: Array<{ type: 'server' | 'menu' | 'other'; name: string; issue: string; metric?: string }> = []
  
  // Add servers with high waste
  teamLeaderboard.forEach((server) => {
    const wasteRate = server.Void_Rate_Pct || 0
    if (wasteRate > 20) {
      needsAttention.push({
        type: 'server',
        name: server.Server || server.name || 'Unknown',
        issue: 'High waste rate - Training opportunity',
        metric: `${wasteRate.toFixed(1)}% waste`,
      })
    }
  })

  // Add menu items with high volatility (if data available)
  const menuData = data?.tables?.menu_volatility?.data || []
  const highVolatilityItems = menuData
    .filter((item: any) => {
      const volatility = item.Volatility || item.volatility || 0
      return volatility > 100
    })
    .slice(0, 3)
  
  highVolatilityItems.forEach((item: any) => {
    needsAttention.push({
      type: 'menu',
      name: item.Item || item.item || 'Unknown Item',
      issue: 'High volatility - Consider removing',
      metric: `${(item.Volatility || item.volatility || 0).toFixed(0)}% volatility`,
    })
  })

  // Format hourly revenue for heatmap
  // Try hourly_revenue first, then day_of_week, then generate from data
  const hourlyRevenueData = data?.charts?.hourly_revenue || []
  const dayOfWeekData = data?.charts?.day_of_week || []
  
  let heatmapData: Array<{ hour: number; day: string; revenue: number }> = []
  
  if (hourlyRevenueData.length > 0) {
    // Use hourly_revenue if available
    heatmapData = hourlyRevenueData.map((item: any) => {
      const hour = item.Hour || item.hour || 0
      const day = item.Day || item.day || 'Mon'
      const revenue = item['Net Price'] || item.revenue || item.value || 0
      return { hour, day, revenue }
    })
  } else if (dayOfWeekData.length > 0) {
    // Fallback: distribute day_of_week data across hours (simplified)
    const dayMap: Record<string, string> = {
      'Monday': 'Mon', 'Tuesday': 'Tue', 'Wednesday': 'Wed', 'Thursday': 'Thu',
      'Friday': 'Fri', 'Saturday': 'Sat', 'Sunday': 'Sun',
      'Mon': 'Mon', 'Tue': 'Tue', 'Wed': 'Wed', 'Thu': 'Thu',
      'Fri': 'Fri', 'Sat': 'Sat', 'Sun': 'Sun',
    }
    
    dayOfWeekData.forEach((item: any) => {
      const dayKey = Object.keys(item).find(k => k.toLowerCase().includes('day'))
      const valueKey = Object.keys(item).find(k => 
        k.toLowerCase().includes('revenue') || 
        k.toLowerCase().includes('net price') ||
        k.toLowerCase().includes('value')
      )
      const day = dayKey ? dayMap[item[dayKey]] || 'Mon' : 'Mon'
      const revenue = valueKey ? (item[valueKey] || 0) : 0
      
      // Distribute across peak hours (6PM-12AM)
      for (let hour = 18; hour <= 23; hour++) {
        heatmapData.push({ hour, day, revenue: revenue / 6 })
      }
    })
  }

  // Get this week's actions (top 3)
  const thisWeeksActions = actionItems
    .filter(a => a.priority === 'high')
    .slice(0, 3)
    .map(a => ({
      id: a.id,
      title: a.title,
      completed: false, // Would track completion state
    }))

  // Loading state with full skeleton
  if (loading && !data) {
    return (
      <DashboardLayout
        clientName={clientName}
        lastUpdated={undefined}
        onRunAnalysis={handleRunAnalysis}
        isRunning={isRunning}
      >
        <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
          <HeaderBar title="Dashboard" subtitle="Loading..." />
          <div className="max-w-[1920px] mx-auto px-6 py-8">
            {/* Hero Metrics Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <SkeletonKpiCard key={i} />
              ))}
            </div>
            
            {/* Server Grade + Actions Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <SkeletonKpiCard />
              <SkeletonKpiCard />
            </div>
            
            {/* Heatmap Skeleton */}
            <div className="mb-8">
              <SkeletonKpiCard />
            </div>
            
            {/* Bottom Row Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SkeletonKpiCard />
              <SkeletonKpiCard />
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Error state
  if (error && !data) {
    return (
      <DashboardLayout
        clientName={clientName}
        lastUpdated={undefined}
        onRunAnalysis={handleRunAnalysis}
        isRunning={isRunning}
      >
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
          <EmptyState
            title="Error Loading Dashboard"
            description={error}
            action={{
              label: 'Retry',
              onClick: fetchAnalysis,
            }}
          />
        </div>
      </DashboardLayout>
    )
  }

  // Get greeting
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  
  // Get client display name for greeting (priority: clientName > mapped from clientId > empty)
  const getClientDisplayName = (): string | null => {
    if (clientName && clientName !== 'Analytics') {
      return clientName
    }
    if (data?.clientId) {
      const id = data.clientId.toLowerCase()
      // Map clientId to display names
      const nameMap: Record<string, string> = {
        'melrose': 'Melrose',
        'bestregard': 'Best Regards',
        'fancy': 'Fancy',
      }
      return nameMap[id] || data.clientId.charAt(0).toUpperCase() + data.clientId.slice(1)
    }
    return null
  }
  
  const clientDisplayName = getClientDisplayName()
  const greetingName = clientDisplayName || (roleNames.gmName || null)

  return (
    <DashboardLayout
      clientName={clientName}
      lastUpdated={formatTime(data?.generatedAt)}
      onRunAnalysis={handleRunAnalysis}
      isRunning={isRunning}
    >
      <div data-client-theme={themeAttr} className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Header with Greeting */}
        <HeaderBar
          title={greetingName ? `${greeting}, ${greetingName}` : greeting}
          subtitle="Here's your business at a glance"
          datePreset={filters.datePreset}
          onDatePresetChange={(preset) => {
            setFilters({ datePreset: preset })
            setTimeout(() => fetchAnalysis(), 0)
          }}
          dataCoverage={data?.dataCoverage}
        />

        <div className="max-w-[1920px] mx-auto px-6 py-8">
          {/* Hero Metrics Row (4 cards) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <HeroMetricCard
              title="Revenue"
              value={revenue}
              trend={{ value: revenueTrend, period: 'vs last period' }}
              sparkline={generateSparkline(revenue, data?.charts?.hourly_revenue)}
              onClick={() => router.push('/time')}
              delay={0}
            />
            <HeroMetricCard
              title="Leakage"
              value={leakage}
              trend={{ value: leakage > 0 ? -12.3 : 0, period: 'of revenue' }}
              sparkline={generateSparkline(leakage)}
              onClick={() => router.push('/waste')}
              delay={0.1}
            />
            <HeroMetricCard
              title="Alerts"
              value={alerts}
              trend={alerts > 0 ? { value: 0, period: 'new items' } : undefined}
              onClick={() => router.push('/actions')}
              delay={0.2}
            />
            <HeroMetricCard
              title="Opportunity"
              value={opportunity}
              trend={{ value: opportunityTrend, period: 'vs last period' }}
              sparkline={generateSparkline(opportunity)}
              onClick={() => router.push('/actions')}
              delay={0.3}
            />
          </div>

          {/* Server Grade Distribution + This Week's Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {employeeData.length === 0 ? (
              <EmptyState
                title="No Server Data Available"
                description="Server performance data is not available. Run analysis to generate team metrics."
              />
            ) : (
              <ServerGradeDonut grades={serverGrades} />
            )}
            
            {/* This Week's Actions Mini Panel */}
            <div className="premium-card p-6">
              <h3 className="text-card-title mb-4">This Week's Actions</h3>
              <div className="space-y-3">
                {thisWeeksActions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-body muted mb-2">No high-priority actions this week</p>
                    <p className="text-caption muted">All systems operating normally</p>
                  </div>
                ) : (
                  thisWeeksActions.map((action) => (
                    <motion.div
                      key={action.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start gap-3 p-3 rounded-lg transition-all"
                      style={{
                        backgroundColor: 'rgba(99, 102, 241, 0.05)',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.1)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.05)'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={action.completed}
                        readOnly
                        className="mt-1 cursor-pointer"
                        style={{ accentColor: 'var(--accent-primary)' }}
                      />
                      <div className="flex-1 text-body">{action.title}</div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Revenue Heatmap */}
          <div className="mb-8">
            {heatmapData.length === 0 ? (
              <EmptyState
                title="No Revenue Data Available"
                description="Revenue heatmap data is not available for this period. Run analysis to generate data."
                action={{
                  label: 'Run Analysis',
                  onClick: handleRunAnalysis,
                }}
              />
            ) : (
              <RevenueHeatmap
                data={heatmapData}
                onCellClick={(hour, day) => {
                  // Filter data to this hour/day
                  console.log('Filter to:', hour, day)
                }}
              />
            )}
          </div>

          {/* Top Performers + Needs Attention */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TopPerformersCard performers={topPerformers} />
            <NeedsAttentionCard items={needsAttention} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
