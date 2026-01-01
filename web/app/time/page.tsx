'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { HeaderBar } from '@/components/layout/HeaderBar'
import { HeroMetricCard } from '@/components/ui/HeroMetricCard'
import { RevenueHeatmap } from '@/components/dashboard/RevenueHeatmap'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonKpiCard } from '@/components/dashboard/SkeletonCard'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { getClientThemeAttr } from '@/lib/brand'

interface AnalysisData {
  clientId?: string
  generatedAt?: string
  charts?: {
    hourly_revenue?: Array<{ hour?: number; revenue?: number }>
    day_of_week?: Array<{ day?: string; revenue?: number }>
  }
  tables?: {
    [key: string]: any
  }
  [key: string]: any
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAYPART_MAP: Record<string, { label: string; hours: number[] }> = {
  lunch: { label: 'Lunch', hours: [11, 12, 13, 14] },
  dinner: { label: 'Dinner', hours: [17, 18, 19, 20, 21] },
  late_night: { label: 'Late Night', hours: [22, 23, 0, 1, 2] },
}

export default function TimePage() {
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
          throw new Error('Failed to fetch time data')
        }

        const analysisData = await response.json()
        setData(analysisData)
      } catch (err: any) {
        setError(err.message || 'Failed to load time data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  const handleRunAnalysis = async () => {
    console.log('Run analysis')
  }

  // Get chart data
  const hourlyRevenue = data?.charts?.hourly_revenue || []
  const dayOfWeek = data?.charts?.day_of_week || []

  // Calculate hero metrics
  const peakHour = useMemo(() => {
    if (hourlyRevenue.length === 0) return { hour: 0, revenue: 0 }
    const peak = hourlyRevenue.reduce((max, item) => 
      (item.revenue || 0) > (max.revenue || 0) ? item : max
    , hourlyRevenue[0])
    return { hour: peak.hour || 0, revenue: peak.revenue || 0 }
  }, [hourlyRevenue])

  const bestDay = useMemo(() => {
    if (dayOfWeek.length === 0) return { day: 'N/A', revenue: 0 }
    const best = dayOfWeek.reduce((max, item) => 
      (item.revenue || 0) > (max.revenue || 0) ? item : max
    , dayOfWeek[0])
    return { day: best.day || 'N/A', revenue: best.revenue || 0 }
  }, [dayOfWeek])

  // Find golden window (highest revenue hour+day combination)
  const goldenWindow = useMemo(() => {
    // Build heatmap data to find peak
    const heatmapMap = new Map<string, number>()
    hourlyRevenue.forEach(item => {
      const hour = item.hour ?? 0
      dayOfWeek.forEach(dayItem => {
        const day = dayItem.day || 'Mon'
        const key = `${hour}-${day}`
        // Simplified: use hourly revenue as proxy
        heatmapMap.set(key, (heatmapMap.get(key) || 0) + (item.revenue || 0))
      })
    })

    let maxRevenue = 0
    let goldenHour = 0
    let goldenDay = 'Mon'
    heatmapMap.forEach((revenue, key) => {
      if (revenue > maxRevenue) {
        maxRevenue = revenue
        const [h, d] = key.split('-')
        goldenHour = parseInt(h) || 0
        goldenDay = d || 'Mon'
      }
    })

    return { hour: goldenHour, day: goldenDay, revenue: maxRevenue }
  }, [hourlyRevenue, dayOfWeek])

  // Calculate missed opportunity (revenue in non-peak hours)
  const totalRevenue = hourlyRevenue.reduce((sum, item) => sum + (item.revenue || 0), 0)
  const missedOpportunity = totalRevenue > 0 
    ? totalRevenue - (peakHour.revenue * 24) // Simplified calculation
    : 0

  // Daypart analysis
  const daypartAnalysis = useMemo(() => {
    const analysis: Array<{ label: string; revenue: number; hours: number[] }> = []
    
    Object.entries(DAYPART_MAP).forEach(([key, config]) => {
      const revenue = hourlyRevenue
        .filter(item => config.hours.includes(item.hour || 0))
        .reduce((sum, item) => sum + (item.revenue || 0), 0)
      
      analysis.push({
        label: config.label,
        revenue,
        hours: config.hours,
      })
    })

    return analysis.sort((a, b) => b.revenue - a.revenue)
  }, [hourlyRevenue])

  // Format hour for display
  const formatHour = (hour: number) => {
    if (hour === 0) return '12AM'
    if (hour < 12) return `${hour}AM`
    if (hour === 12) return '12PM'
    return `${hour - 12}PM`
  }

  // Generate sparklines
  const generateSparkline = (value: number): number[] => {
    const base = value / 30
    return Array.from({ length: 30 }, (_, i) => {
      const progress = i / 30
      const variation = Math.sin(progress * Math.PI * 2) * 0.2 + 1
      return base * variation
    })
  }

  // Build heatmap data
  const heatmapData = useMemo(() => {
    const data: Array<{ hour?: number; day?: string; revenue?: number }> = []
    
    hourlyRevenue.forEach(hourItem => {
      dayOfWeek.forEach(dayItem => {
        data.push({
          hour: hourItem.hour,
          day: dayItem.day,
          revenue: (hourItem.revenue || 0) * 0.1, // Simplified: distribute hourly across days
        })
      })
    })

    return data
  }, [hourlyRevenue, dayOfWeek])

  if (loading) {
    return (
      <DashboardLayout
        clientName={clientName}
        onRunAnalysis={handleRunAnalysis}
        isRunning={false}
      >
        <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
          <HeaderBar title="Time Analysis" subtitle="Loading..." />
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
            title="Error Loading Time Data"
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
          title="Time Analysis"
          subtitle="Optimize revenue by understanding time-based patterns"
        />

        <div className="max-w-[1920px] mx-auto px-6 py-8">
          {/* SECTION 1: Hero Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <HeroMetricCard
              title="Peak Hour Revenue"
              value={peakHour.revenue}
              trend={{ value: 0, period: `at ${formatHour(peakHour.hour)}` }}
              sparkline={generateSparkline(peakHour.revenue)}
              onClick={() => {}}
              delay={0}
            />
            <HeroMetricCard
              title="Best Day"
              value={`${bestDay.day} ($${bestDay.revenue.toLocaleString()})`}
              trend={{ value: 0, period: 'highest revenue' }}
              onClick={() => {}}
              delay={0.1}
            />
            <HeroMetricCard
              title="Golden Window"
              value={`${goldenWindow.day} ${formatHour(goldenWindow.hour)} ($${goldenWindow.revenue.toLocaleString()})`}
              trend={{ value: 0, period: 'peak concentration' }}
              onClick={() => {}}
              delay={0.2}
            />
            <HeroMetricCard
              title="Missed Opportunity"
              value={missedOpportunity}
              trend={{ value: 0, period: 'potential revenue' }}
              sparkline={generateSparkline(missedOpportunity)}
              onClick={() => {}}
              delay={0.3}
            />
          </div>

          {/* SECTION 2: Revenue Heatmap */}
          <div className="mb-8">
            {heatmapData.length === 0 ? (
              <EmptyState
                title="No Time Data Available"
                description="Time-based revenue data is not available. Run analysis to generate time patterns."
                action={{
                  label: 'Run Analysis',
                  onClick: handleRunAnalysis,
                }}
              />
            ) : (
              <RevenueHeatmap
                data={heatmapData}
                onCellClick={(hour, day) => {
                  console.log('Cell clicked:', hour, day)
                }}
              />
            )}
          </div>

          {/* SECTION 3: Hourly Revenue Bar Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="premium-card p-6">
              <h3 className="text-section-title mb-6">Hourly Revenue</h3>
              {hourlyRevenue.length === 0 ? (
                <EmptyState
                  title="No Hourly Data"
                  description="Hourly revenue data is not available."
                />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={hourlyRevenue.map(item => ({ hour: item.hour || 0, revenue: item.revenue || 0 }))}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="hour"
                      label={{ value: 'Hour of Day', position: 'insideBottom', offset: -5 }}
                      tickFormatter={formatHour}
                      style={{ fontSize: '12px', fill: 'var(--text-secondary)' }}
                    />
                    <YAxis
                      label={{ value: 'Revenue ($)', angle: -90, position: 'insideLeft' }}
                      style={{ fontSize: '12px', fill: 'var(--text-secondary)' }}
                    />
                    <Tooltip
                      formatter={(value: number) => `$${value.toLocaleString()}`}
                      labelFormatter={(label) => `Hour: ${formatHour(label)}`}
                      contentStyle={{
                        backgroundColor: 'var(--bg-tertiary)',
                        border: '1px solid var(--card-border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <Bar dataKey="revenue" fill="var(--accent-primary)" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* SECTION 4: Day-of-Week Comparison */}
            <div className="premium-card p-6">
              <h3 className="text-section-title mb-6">Day-of-Week Comparison</h3>
              {dayOfWeek.length === 0 ? (
                <EmptyState
                  title="No Day-of-Week Data"
                  description="Day-of-week revenue data is not available."
                />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dayOfWeek.map(item => ({ day: item.day || 'Unknown', revenue: item.revenue || 0 }))}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="day"
                      label={{ value: 'Day of Week', position: 'insideBottom', offset: -5 }}
                      style={{ fontSize: '12px', fill: 'var(--text-secondary)' }}
                    />
                    <YAxis
                      label={{ value: 'Revenue ($)', angle: -90, position: 'insideLeft' }}
                      style={{ fontSize: '12px', fill: 'var(--text-secondary)' }}
                    />
                    <Tooltip
                      formatter={(value: number) => `$${value.toLocaleString()}`}
                      contentStyle={{
                        backgroundColor: 'var(--bg-tertiary)',
                        border: '1px solid var(--card-border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <Bar dataKey="revenue" fill="var(--accent-cyan)" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* SECTION 5: Daypart Analysis */}
          <div className="premium-card p-6 mb-8">
            <h3 className="text-section-title mb-6">Daypart Analysis</h3>
            {daypartAnalysis.length === 0 ? (
              <EmptyState
                title="No Daypart Data"
                description="Daypart analysis data is not available."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {daypartAnalysis.map((daypart, idx) => (
                  <motion.div
                    key={daypart.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="premium-card p-6"
                    style={{
                      borderLeft: `4px solid var(--accent-primary)`,
                    }}
                  >
                    <div className="text-caption muted mb-2">{daypart.label}</div>
                    <div className="text-metric-medium mb-2">${daypart.revenue.toLocaleString()}</div>
                    <div className="text-caption muted">
                      Hours: {daypart.hours.map(h => formatHour(h)).join(', ')}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 6: Labor Alignment Recommendations */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="premium-card p-6"
          >
            <h3 className="text-section-title mb-4">Labor Alignment Recommendations</h3>
            <EmptyState
              title="Labor Data Not Connected"
              description="Connect your labor scheduling system to receive personalized recommendations for aligning staff with peak revenue hours."
              action={{
                label: 'Connect Labor System',
                onClick: () => console.log('Connect labor system'),
              }}
            />
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  )
}
