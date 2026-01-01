'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { HeaderBar } from '@/components/layout/HeaderBar'
import { HeroMetricCard } from '@/components/ui/HeroMetricCard'
import { MenuBCGMatrix } from '@/components/dashboard/MenuBCGMatrix'
import { VolatilityAlertBanner } from '@/components/dashboard/VolatilityAlertBanner'
import { VolatilityRowCard } from '@/components/dashboard/VolatilityRowCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonKpiCard } from '@/components/dashboard/SkeletonCard'
import { getChaosItems, classifyMenuItems } from '@/lib/data-utils'
import { getClientThemeAttr } from '@/lib/brand'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface AnalysisData {
  clientId?: string
  generatedAt?: string
  tables?: {
    menu_volatility?: { data: any[]; columns?: string[] }
    [key: string]: any
  }
  [key: string]: any
}

interface MenuItem {
  Item: string
  Category: string | null
  Revenue: number
  Count: number
  Volatility: number
}

export default function MenuPage() {
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
          throw new Error('Failed to fetch menu data')
        }

        const analysisData = await response.json()
        setData(analysisData)
      } catch (err: any) {
        setError(err.message || 'Failed to load menu data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  const handleRunAnalysis = async () => {
    console.log('Run analysis')
  }

  // Get menu data
  const menuData = data?.tables?.menu_volatility?.data || []
  
  // Transform to MenuItem format
  const menuItems: MenuItem[] = useMemo(() => {
    if (!menuData || menuData.length === 0) return []

    return menuData.map((row: any) => {
      const itemKey = row.Item || row.item || row.item_name || 'Unknown'
      const category = row.Category || row.category || null
      const revenue = typeof row.Revenue === 'number' ? row.Revenue : (typeof row.revenue === 'number' ? row.revenue : 0)
      const count = typeof row.Count === 'number' ? row.Count : (typeof row.count === 'number' ? row.count : 0)
      const volatility = typeof row.Volatility === 'number' ? row.Volatility : (typeof row.volatility === 'number' ? row.volatility : 0)

      return {
        Item: itemKey,
        Category: category,
        Revenue: revenue,
        Count: count,
        Volatility: volatility,
      }
    }).filter((item: MenuItem) => item.Revenue > 0 || item.Count > 0)
  }, [menuData])

  // Calculate summary metrics
  const menuRevenue = menuItems.reduce((sum, item) => sum + item.Revenue, 0)
  const itemsSold = menuItems.reduce((sum, item) => sum + item.Count, 0)
  const avgMargin = menuItems.length > 0
    ? menuItems.reduce((sum, item) => sum + (item.Revenue / Math.max(item.Count, 1)), 0) / menuItems.length
    : 0

  // Get stars count (from BCG classification)
  const buckets = classifyMenuItems(menuData)
  const starsCount = buckets.stars.length

  // Get volatility items
  const volatilityItems = getChaosItems(menuData, 50, 0)
  const removeItems = volatilityItems.filter(item => item.Volatility > 200)
  const investigateItems = volatilityItems.filter(item => item.Volatility > 100 && item.Volatility <= 200)

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const categoryMap = new Map<string, { revenue: number; count: number; items: number }>()
    
    menuItems.forEach(item => {
      const cat = item.Category || 'Uncategorized'
      const existing = categoryMap.get(cat) || { revenue: 0, count: 0, items: 0 }
      categoryMap.set(cat, {
        revenue: existing.revenue + item.Revenue,
        count: existing.count + item.Count,
        items: existing.items + 1,
      })
    })

    return Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      revenue: data.revenue,
      count: data.count,
      items: data.items,
      avgPrice: data.count > 0 ? data.revenue / data.count : 0,
    })).sort((a, b) => b.revenue - a.revenue)
  }, [menuItems])

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
          <HeaderBar title="Menu" subtitle="Loading..." />
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
            title="Error Loading Menu Data"
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
          title="Menu Engineering"
          subtitle="Optimize your menu for profitability and popularity"
        />

        <div className="max-w-[1920px] mx-auto px-6 py-8">
          {/* Summary Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <HeroMetricCard
              title="Menu Revenue"
              value={menuRevenue}
              trend={{ value: 0, period: 'this period' }}
              sparkline={generateSparkline(menuRevenue)}
              onClick={() => {}}
              delay={0}
            />
            <HeroMetricCard
              title="Items Sold"
              value={itemsSold}
              trend={{ value: 0, period: 'total units' }}
              sparkline={generateSparkline(itemsSold)}
              onClick={() => {}}
              delay={0.1}
            />
            <HeroMetricCard
              title="Avg Margin %"
              value={`${avgMargin.toFixed(1)}%`}
              trend={{ value: 0, period: 'per item' }}
              onClick={() => {}}
              delay={0.2}
            />
            <HeroMetricCard
              title="Stars"
              value={starsCount}
              trend={{ value: 0, period: 'top performers' }}
              onClick={() => {}}
              delay={0.3}
            />
          </div>

          {/* BCG Matrix Section */}
          <div className="mb-8">
            {menuItems.length === 0 ? (
              <EmptyState
                title="No Menu Data Available"
                description="Menu engineering data is not available. Run analysis to generate menu metrics."
                action={{
                  label: 'Run Analysis',
                  onClick: handleRunAnalysis,
                }}
              />
            ) : (
              <MenuBCGMatrix
                data={menuItems}
                onItemClick={(item, quadrant) => {
                  console.log('Item clicked:', item, quadrant)
                }}
              />
            )}
          </div>

          {/* Volatility Alert Banner */}
          {(removeItems.length > 0 || investigateItems.length > 0) && (
            <VolatilityAlertBanner
              removeCount={removeItems.length}
              investigateCount={investigateItems.length}
            />
          )}

          {/* Volatility Analysis Card Rows */}
          {volatilityItems.length > 0 && (
            <div className="premium-card p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-section-title mb-1">Menu Volatility Analysis</h3>
                  <p className="text-caption muted">Items sorted by volatility (waste/sales ratio)</p>
                </div>
              </div>
              <div className="space-y-3">
                {volatilityItems.slice(0, 20).map((item, idx) => (
                  <VolatilityRowCard
                    key={item.Item || idx}
                    item={{
                      Item: item.Item || 'Unknown',
                      Category: null,
                      Volatility: item.Volatility || 0,
                      Revenue: item.Revenue || 0,
                      Count: item.Count || 0,
                    }}
                    index={idx}
                    onInvestigate={() => console.log('Investigate:', item.Item)}
                    onCreateAction={() => console.log('Create action:', item.Item)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Category Performance Breakdown */}
          {categoryBreakdown.length > 0 && (
            <div className="premium-card p-6 mb-8">
              <h3 className="text-section-title mb-6">Category Performance</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="category"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    style={{ fontSize: '12px', fill: 'var(--text-secondary)' }}
                  />
                  <YAxis style={{ fontSize: '12px', fill: 'var(--text-secondary)' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--card-border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill="var(--accent-primary)" name="Revenue ($)" />
                  <Bar dataKey="count" fill="var(--accent-cyan)" name="Units Sold" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Optimization Recommendations Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="premium-card p-6"
          >
            <h3 className="text-section-title mb-4">Menu Optimization Recommendations</h3>
            <div className="space-y-4">
              {removeItems.length > 0 && (
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid var(--status-danger)' }}>
                  <div className="text-body font-semibold mb-2">Remove High-Volatility Items</div>
                  <div className="text-caption muted">
                    {removeItems.length} items have volatility over 200%, indicating significant waste. Consider removing these items to reduce losses.
                  </div>
                </div>
              )}
              {buckets.investigate.length > 0 && (
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)', borderLeft: '4px solid var(--status-warning)' }}>
                  <div className="text-body font-semibold mb-2">Promote High-Value Items</div>
                  <div className="text-caption muted">
                    {buckets.investigate.length} items have high revenue but may need promotion. Review these items to increase sales volume.
                  </div>
                </div>
              )}
              {buckets.stars.length > 0 && (
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', borderLeft: '4px solid var(--status-success)' }}>
                  <div className="text-body font-semibold mb-2">Protect Star Performers</div>
                  <div className="text-caption muted">
                    {buckets.stars.length} items are your stars - high revenue, high volume, low volatility. Ensure these items are always available and well-promoted.
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  )
}
