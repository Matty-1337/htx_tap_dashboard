'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/dashboard/GlassCard'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { SkeletonKpiCard, SkeletonTable } from '@/components/dashboard/SkeletonCard'
import { Section } from '@/components/dashboard/Section'
import { DataTablePreview } from '@/components/dashboard/DataTablePreview'
import { PillBadge } from '@/components/dashboard/PillBadge'
import { ActiveFilters } from '@/components/dashboard/ActiveFilters'
import { DateRangeSelector } from '@/components/dashboard/DateRangeSelector'
import { TrendLineChart } from '@/components/dashboard/charts/TrendLineChart'
import { BreakdownBarChart } from '@/components/dashboard/charts/BreakdownBarChart'
import { DonutStatusChart } from '@/components/dashboard/charts/DonutStatusChart'
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart'
import { ActionRail } from '@/components/dashboard/ActionRail'
import { TeamLeaderboardCard } from '@/components/dashboard/TeamLeaderboardCard'
import { CoachingSnapshotCard } from '@/components/dashboard/CoachingSnapshotCard'
import { CoachingInsightsList } from '@/components/dashboard/CoachingInsightsList'
import { MenuBuckets } from '@/components/dashboard/MenuBuckets'
import { MenuQuadrantChart } from '@/components/dashboard/charts/MenuQuadrantChart'
import { formatKey } from '@/lib/ui'
import {
  getStatusBreakdown,
  getTopWasteServers,
  filterData,
  calculateKpiFromData,
  findColumn,
  getWasteBreakdown,
  getLeakageByReason,
  getWasteByCategory,
  getTrendIndicator,
  getTeamLeaderboard,
  getServerSnapshot,
  getTeamAverages,
  getCoachingInsights,
  getChaosItems,
  classifyMenuItems,
  getMenuQuadrantData,
} from '@/lib/data-utils'
import { getClientThemeAttr } from '@/lib/brand'
import { ActionItem } from '@/lib/action-engine'
import { startTour, startFullWalkthrough } from '@/lib/tours/driver'
import { ClientKey, TourSection } from '@/lib/tours/types'
import clsx from 'clsx'

interface AnalysisData {
  clientId?: string
  folder?: string
  generatedAt?: string
  kpis?: Record<string, number>
  charts?: {
    hourly_revenue?: Array<any>
    day_of_week?: Array<any>
  }
  tables?: {
    waste_efficiency?: { data: any[]; columns?: string[] }
    employee_performance?: { data: any[]; columns?: string[] }
    menu_volatility?: { data: any[]; columns?: string[] }
    [key: string]: any
  }
  executionTimeSeconds?: number
  [key: string]: any
}

const NAV_SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'waste', label: 'Waste' },
  { id: 'team', label: 'Team' },
  { id: 'menu', label: 'Menu' },
]

type Filters = {
  selectedServer?: string
  selectedStatus?: string
  selectedCategory?: string
  datePreset?: '7d' | '30d' | '90d' | 'mtd'
}

export default function DashboardPage() {
  const [data, setData] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeSection, setActiveSection] = useState('overview')
  const [isRunning, setIsRunning] = useState(false)
  const [filters, setFilters] = useState<Filters>({ datePreset: '30d' }) // Default to 30 days
  const [tourDropdownOpen, setTourDropdownOpen] = useState(false)
  const [teamSortBy, setTeamSortBy] = useState<'Revenue' | 'Transactions' | 'Void_Rate_Pct'>('Revenue')
  const router = useRouter()
  const sectionRefs = useRef<Record<string, HTMLElement>>({})
  const tourDropdownRef = useRef<HTMLDivElement>(null)

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' })
    router.push('/login')
  }

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

      // Build dateRange payload
      const dateRange: { preset: string; start?: string; end?: string } = {
        preset: filters.datePreset || '30d',
      }
      
      // Calculate start/end dates based on preset
      const now = new Date()
      const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
      
      let startDate: Date
      if (filters.datePreset === '7d') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      } else if (filters.datePreset === '30d') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      } else if (filters.datePreset === '90d') {
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      } else if (filters.datePreset === 'mtd') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
      } else {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // Default to 30d
      }
      
      dateRange.start = startDate.toISOString()
      dateRange.end = endDate.toISOString()

      const response = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          params: {
            dateRange,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.details || errorData.message || `HTTP ${response.status}: Failed to fetch analysis data`
        throw new Error(errorMessage)
      }

      const analysisData = await response.json()
      
      // Guard against oversized payloads
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

  // Run analysis
  const handleRunAnalysis = async () => {
    setIsRunning(true)
    await fetchAnalysis()
    setIsRunning(false)
  }

  useEffect(() => {
    fetchAnalysis()
  }, [])

  // Scrollspy for navigation
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -70% 0px',
      threshold: 0,
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id)
        }
      })
    }, observerOptions)

    Object.values(sectionRefs.current).forEach((el) => {
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [data])

  // Close tour dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tourDropdownRef.current && !tourDropdownRef.current.contains(event.target as Node)) {
        setTourDropdownOpen(false)
      }
    }

    if (tourDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [tourDropdownOpen])

  // Get clientKey helper
  const getClientKey = (): ClientKey => {
    return (data?.clientId?.toLowerCase() === 'fancy' ? 'fancy' :
      data?.clientId?.toLowerCase() === 'bestregard' ? 'bestregard' : 'melrose') as ClientKey
  }

  // Launch tour for specific section
  const launchTour = (section: TourSection | 'full') => {
    setTourDropdownOpen(false)
    const clientKey = getClientKey()
    
    if (section === 'full') {
      startFullWalkthrough(clientKey)
    } else {
      startTour({ clientKey, section })
    }
  }

  // Scroll to section
  const scrollToSection = (id: string) => {
    const element = sectionRefs.current[id]
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Format time
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

  // Get theme attribute for CSS binding
  const themeAttr = data?.clientId ? getClientThemeAttr(data.clientId) : 'default'

  // Loading state
  if (loading && !data) {
    return (
      <div data-client-theme="default" className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
        {/* Sticky Header Skeleton */}
        <div className="sticky top-0 z-50 backdrop-blur-md border-b shadow-sm" style={{ backgroundColor: 'rgba(var(--surface-rgb, 255, 255, 255), 0.8)', borderColor: 'var(--card-border)' }}>
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
              <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {[...Array(6)].map((_, i) => (
              <SkeletonKpiCard key={i} />
            ))}
          </div>
          {[...Array(3)].map((_, i) => (
            <SkeletonTable key={i} />
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error && !data) {
    return (
      <div data-client-theme="default" className="min-h-screen flex items-center justify-center bg-[var(--bg)] text-[var(--text)]">
        <GlassCard className="max-w-md">
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(var(--primary-rgb, 99, 102, 241), 0.1)' }}>
              <svg className="w-8 h-8" style={{ color: 'var(--primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text)' }}>Error Loading Dashboard</h2>
            <p className="mb-6" style={{ color: 'var(--muted)' }}>{error}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/login')}
                className="px-4 py-2 transition-colors"
                style={{
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text)',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--card-border)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(var(--muted-rgb, 107, 114, 128), 0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--surface)'
                }}
              >
                Back to Login
              </button>
              <button
                onClick={fetchAnalysis}
                className="px-4 py-2 text-white transition-colors"
                style={{
                  backgroundColor: 'var(--primary)',
                  borderRadius: 'var(--radius)',
                  boxShadow: 'var(--shadow)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = 'var(--glow)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'var(--shadow)'
                }}
              >
                Retry
              </button>
            </div>
          </div>
        </GlassCard>
      </div>
    )
  }

  // Handle filter changes
  const handleSetFilter = (key: keyof Filters, value: string | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleRemoveFilter = (key: keyof Filters) => {
    setFilters(prev => {
      const newFilters = { ...prev }
      delete newFilters[key]
      return newFilters
    })
  }

  const handleClearFilters = () => {
    setFilters({ datePreset: '30d' }) // Keep date preset when clearing
  }

  // Handle date preset change (triggers refetch)
  const handleDatePresetChange = (preset: '7d' | '30d' | '90d' | 'mtd') => {
    setFilters(prev => ({ ...prev, datePreset: preset }))
    // Trigger refetch after state update
    setTimeout(() => {
      fetchAnalysis()
    }, 0)
  }

  // Handle row click
  const handleRowClick = (row: any) => {
    const serverKey = findColumn([row], ['server', 'employee', 'name'])
    const statusKey = findColumn([row], ['status'])
    const categoryKey = findColumn([row], ['category', 'type'])

    if (serverKey && row[serverKey]) {
      handleSetFilter('selectedServer', row[serverKey] === filters.selectedServer ? undefined : row[serverKey])
    }
    if (statusKey && row[statusKey]) {
      handleSetFilter('selectedStatus', row[statusKey] === filters.selectedStatus ? undefined : row[statusKey])
    }
    if (categoryKey && row[categoryKey]) {
      handleSetFilter('selectedCategory', row[categoryKey] === filters.selectedCategory ? undefined : row[categoryKey])
    }
  }

  // Derive chart data from tables
  const employeeData = data?.tables?.employee_performance?.data || []
  const wasteData = data?.tables?.waste_efficiency?.data || []
  const menuData = data?.tables?.menu_volatility?.data || []

  const statusBreakdown = getStatusBreakdown(employeeData)
  const topWasteServers = getTopWasteServers(wasteData, 8)
  
  // Team section data
  const teamLeaderboard = getTeamLeaderboard(employeeData, 10, teamSortBy)
  const serverSnapshot = filters.selectedServer ? getServerSnapshot(employeeData, filters.selectedServer) : null
  const teamAverages = getTeamAverages(employeeData)
  const coachingInsights = serverSnapshot ? getCoachingInsights(serverSnapshot, teamAverages, wasteData) : []
  
  // Get top leakage reasons for selected server
  const serverTopReasons = filters.selectedServer && wasteData.length > 0
    ? getLeakageByReason(
        wasteData.filter(row => {
          const serverKey = findColumn(wasteData, ['server', 'employee'])
          return serverKey && row[serverKey]?.toString().toLowerCase() === filters.selectedServer?.toLowerCase()
        }),
        5
      )
    : []
  
  // Waste section data
  const wasteBreakdown = getWasteBreakdown(wasteData)
  const leakageByReason = getLeakageByReason(wasteData, 10)
  const wasteByCategory = getWasteByCategory(wasteData)
  
  // Menu section data
  const chaosItems = getChaosItems(menuData, 15, 0)
  const menuBuckets = classifyMenuItems(menuData)
  const menuQuadrantData = getMenuQuadrantData(menuData)

  // Filter tables based on active filters
  const filteredWasteData = filterData(wasteData, filters)
  const filteredEmployeeData = filterData(employeeData, filters)
  const filteredMenuData = filterData(menuData, filters)

  // Calculate filtered KPIs
  const calculateFilteredKpi = (kpiKey: string): number | null => {
    if (!filters.selectedServer && !filters.selectedStatus && !filters.selectedCategory) {
      return null
    }

    // Try to calculate from filtered data
    if (kpiKey.toLowerCase().includes('revenue')) {
      return calculateKpiFromData(filteredWasteData, kpiKey) || calculateKpiFromData(filteredEmployeeData, kpiKey)
    }
    if (kpiKey.toLowerCase().includes('waste')) {
      return calculateKpiFromData(filteredWasteData, kpiKey)
    }
    
    return null
  }

  // Load persisted action items from Supabase
  const [actionItems, setActionItems] = useState<ActionItem[]>([])
  const [actionsLoading, setActionsLoading] = useState(true)
  const [roleNames, setRoleNames] = useState<{ gmName?: string; manager1Name?: string; manager2Name?: string }>({})

  // Fetch role names on mount
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

  // Fetch actions on mount
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

  // Generate and persist actions when "Run Analysis" completes
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

  const topActions = actionItems.filter((a) => a.priority === 'high').slice(0, 3)

  // Extract KPIs
  const kpis = data?.kpis || {}
  const kpiEntries = Object.entries(kpis).slice(0, 6).map(([key, value]) => ({
    key,
    value,
    filteredValue: calculateFilteredKpi(key),
  }))

  return (
    <div data-client-theme={themeAttr} className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Sticky Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-50 backdrop-blur-md border-b shadow-sm"
        style={{
          backgroundColor: 'rgba(var(--surface-rgb, 255, 255, 255), 0.8)',
          borderColor: 'var(--card-border)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>HTX TAP Analytics</h1>
              <span style={{ color: 'var(--muted)' }}>•</span>
              <span className="text-lg font-medium" style={{ color: 'var(--text)' }}>{clientName}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm" style={{ color: 'var(--muted)' }}>
                <div>Last updated {formatTime(data?.generatedAt)}</div>
                {data?.executionTimeSeconds && (
                  <div className="text-xs">Execution {data.executionTimeSeconds}s</div>
                )}
              </div>
              <div className="relative" ref={tourDropdownRef}>
                <button
                  onClick={() => setTourDropdownOpen(!tourDropdownOpen)}
                  className="px-4 py-2 text-sm font-medium transition-all flex items-center gap-2"
                  style={{
                    backgroundColor: tourDropdownOpen ? 'rgba(var(--primary-rgb, 99, 102, 241), 0.1)' : 'var(--surface)',
                    color: 'var(--text)',
                    border: '1px solid var(--card-border)',
                    borderRadius: 'var(--radius)',
                  }}
                  onMouseEnter={(e) => {
                    if (!tourDropdownOpen) {
                      e.currentTarget.style.backgroundColor = 'rgba(var(--primary-rgb, 99, 102, 241), 0.1)'
                      e.currentTarget.style.borderColor = 'var(--primary)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!tourDropdownOpen) {
                      e.currentTarget.style.backgroundColor = 'var(--surface)'
                      e.currentTarget.style.borderColor = 'var(--card-border)'
                    }
                  }}
                >
                  <span>🎯 Tour</span>
                  <svg
                    className="w-4 h-4 transition-transform"
                    style={{ transform: tourDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {tourDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-48 rounded-md shadow-lg z-50"
                    style={{
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--card-border)',
                      boxShadow: 'var(--shadow)',
                    }}
                  >
                    <div className="py-1">
                      <button
                        onClick={() => launchTour('overview')}
                        className="w-full text-left px-4 py-2 text-sm transition-colors"
                        style={{
                          color: 'var(--text)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(var(--primary-rgb, 99, 102, 241), 0.1)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }}
                      >
                        Overview
                      </button>
                      <button
                        onClick={() => launchTour('waste')}
                        className="w-full text-left px-4 py-2 text-sm transition-colors"
                        style={{
                          color: 'var(--text)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(var(--primary-rgb, 99, 102, 241), 0.1)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }}
                      >
                        Waste
                      </button>
                      <button
                        onClick={() => launchTour('team')}
                        className="w-full text-left px-4 py-2 text-sm transition-colors"
                        style={{
                          color: 'var(--text)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(var(--primary-rgb, 99, 102, 241), 0.1)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }}
                      >
                        Team
                      </button>
                      <button
                        onClick={() => launchTour('menu')}
                        className="w-full text-left px-4 py-2 text-sm transition-colors"
                        style={{
                          color: 'var(--text)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(var(--primary-rgb, 99, 102, 241), 0.1)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }}
                      >
                        Menu
                      </button>
                      <button
                        onClick={() => launchTour('rail')}
                        className="w-full text-left px-4 py-2 text-sm transition-colors"
                        style={{
                          color: 'var(--text)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(var(--primary-rgb, 99, 102, 241), 0.1)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }}
                      >
                        Action Rail
                      </button>
                      <div
                        className="border-t my-1"
                        style={{ borderColor: 'var(--card-border)' }}
                      />
                      <button
                        onClick={() => launchTour('full')}
                        className="w-full text-left px-4 py-2 text-sm font-medium transition-colors"
                        style={{
                          color: 'var(--primary)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(var(--primary-rgb, 99, 102, 241), 0.1)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }}
                      >
                        Full Walkthrough
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
              <button
                onClick={handleRunAnalysis}
                disabled={isRunning}
                className={clsx(
                  'px-4 py-2 font-medium transition-all primary-btn',
                  'text-white',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
                style={{
                  backgroundColor: 'var(--primary)',
                  borderRadius: 'var(--radius)',
                  boxShadow: 'var(--shadow)',
                }}
                onMouseEnter={(e) => {
                  if (!isRunning) {
                    e.currentTarget.style.boxShadow = 'var(--glow)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isRunning) {
                    e.currentTarget.style.boxShadow = 'var(--shadow)'
                  }
                }}
              >
                {isRunning ? 'Running...' : 'Run Analysis'}
              </button>
              <button
                onClick={handleLogout}
                className="px-3 py-2 text-sm transition-colors"
                style={{
                  color: 'var(--muted)',
                  borderRadius: 'var(--radius)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text)'
                  e.currentTarget.style.backgroundColor = 'rgba(var(--muted-rgb, 107, 114, 128), 0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--muted)'
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="flex max-w-[1920px] mx-auto">
        {/* Left Navigation Rail */}
        <aside className="w-64 flex-shrink-0 sticky top-20 h-[calc(100vh-5rem)] pt-8 pl-6">
          <nav className="space-y-2">
            {NAV_SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={clsx(
                  'w-full text-left px-4 py-2 transition-all'
                )}
                style={{
                  borderRadius: 'var(--radius)',
                  color: activeSection === section.id ? 'var(--primary)' : 'var(--muted)',
                  backgroundColor: activeSection === section.id ? 'rgba(var(--primary-rgb, 99, 102, 241), 0.1)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (activeSection !== section.id) {
                    e.currentTarget.style.backgroundColor = 'rgba(var(--muted-rgb, 107, 114, 128), 0.1)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeSection !== section.id) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }
                }}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 px-6 py-8">
          {/* Overview Section */}
          <Section
            id="overview"
            title="Overview"
            ref={(el) => {
              if (el) sectionRefs.current.overview = el
            }}
          >
            {/* Interactive Insights */}
            {(statusBreakdown.length > 0 || topWasteServers.length > 0) && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Interactive Insights</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Left: Status Donut + Top Waste Bar (stacked) */}
                  <div className="space-y-6">
                    {statusBreakdown.length > 0 && (
                      <DonutStatusChart
                        data={statusBreakdown}
                        nameKey="name"
                        valueKey="value"
                        title="Status Distribution"
                        selectedStatus={filters.selectedStatus}
                        onSliceClick={(status) => handleSetFilter('selectedStatus', status === filters.selectedStatus ? undefined : status)}
                      />
                    )}
                    {topWasteServers.length > 0 && (
                      <BreakdownBarChart
                        data={topWasteServers}
                        categoryKey="Server"
                        valueKey="Waste"
                        title="Top Waste Servers"
                        selectedCategory={filters.selectedServer}
                        onBarClick={(server) => handleSetFilter('selectedServer', server === filters.selectedServer ? undefined : server)}
                      />
                    )}
                  </div>
                  
                  {/* Right: Trend charts (if available) */}
                  <div className="space-y-6">
                    {data?.charts?.hourly_revenue && data.charts.hourly_revenue.length > 0 && (
                      <div data-tour="overview.revenue_hour">
                        <TrendLineChart
                          data={data.charts.hourly_revenue}
                          xKey="Hour"
                          yKey="Net Price"
                          title="Revenue by Hour"
                        />
                      </div>
                    )}
                    {(() => {
                      const dayOfWeekData = data?.charts?.day_of_week
                      
                      // Debug: log actual structure in development (client-side only)
                      if (typeof window !== 'undefined' && dayOfWeekData && dayOfWeekData.length > 0) {
                        console.log('[Revenue by Day] Data structure:', dayOfWeekData[0])
                        console.log('[Revenue by Day] Available keys:', Object.keys(dayOfWeekData[0] || {}))
                      }
                      
                      // Normalize data: map to expected shape { Day, "Net Price" }
                      const normalizeDayOfWeekData = (rawData: any[]) => {
                        if (!rawData || rawData.length === 0) return []
                        
                        return rawData.map((item: any) => {
                          // Try to find Day key (case-insensitive, handle variations)
                          const dayKey = Object.keys(item).find(
                            k => k.toLowerCase() === 'day' || 
                                 k.toLowerCase() === 'dayofweek' ||
                                 k.toLowerCase() === 'day_of_week'
                          ) || 'Day'
                          
                          // Try to find revenue/value key (case-insensitive, handle variations)
                          const valueKey = Object.keys(item).find(
                            k => k.toLowerCase() === 'net price' ||
                                 k.toLowerCase() === 'netprice' ||
                                 k.toLowerCase() === 'revenue' ||
                                 k.toLowerCase() === 'value' ||
                                 k.toLowerCase() === 'amount'
                          ) || 'Net Price'
                          
                          return {
                            'Day': item[dayKey] || item.Day || '',
                            'Net Price': item[valueKey] || item['Net Price'] || item.revenue || item.value || 0
                          }
                        })
                      }
                      
                      // Treat undefined/null/empty array the same - show empty state
                      if (!dayOfWeekData || dayOfWeekData.length === 0) {
                        return (
                          <GlassCard className="p-6">
                            <div className="text-center py-8">
                              <p className="text-sm muted">No data available for this period</p>
                            </div>
                          </GlassCard>
                        )
                      }
                      
                      const normalizedData = normalizeDayOfWeekData(dayOfWeekData)
                      
                      if (normalizedData.length > 0) {
                        return (
                          <div data-tour="overview.revenue_day">
                            <TrendLineChart
                              data={normalizedData}
                              xKey="Day"
                              yKey="Net Price"
                              title="Revenue by Day"
                              subtitle="Daily revenue distribution"
                            />
                          </div>
                        )
                      }
                      
                      // Fallback empty state
                      return (
                        <GlassCard className="p-6">
                          <div className="text-center py-8">
                            <p className="text-sm muted">No data available for this period</p>
                          </div>
                        </GlassCard>
                      )
                    })()}
                  </div>
                </div>

                {/* Date Range Selector */}
                <div className="mb-6" data-tour="overview.filters">
                  <DateRangeSelector
                    preset={filters.datePreset || '30d'}
                    onPresetChange={handleDatePresetChange}
                  />
                </div>

                {/* Active Filters */}
                <ActiveFilters
                  filters={filters}
                  onRemoveFilter={handleRemoveFilter}
                  onClearAll={handleClearFilters}
                />
              </div>
            )}

            {/* Top Actions Card */}
            {topActions.length > 0 && (
              <div className="mb-8" data-tour="overview.top_actions">
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>Top Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {topActions.map((action) => (
                    <GlassCard key={action.id} className="p-4">
                      <div className="flex items-start gap-2 mb-2">
                        <PillBadge
                          variant="default"
                          className="text-xs"
                          style={{
                            backgroundColor: 'var(--primary)',
                            color: 'var(--text)',
                            opacity: 0.2,
                          }}
                        >
                          {action.priority.toUpperCase()}
                        </PillBadge>
                      </div>
                      <h4 className="font-semibold text-sm mb-2" style={{ color: 'var(--text)' }}>
                        {action.title}
                      </h4>
                      {action.estimatedImpactUsd && (
                        <p className="text-xs mb-2" style={{ color: 'var(--secondary)' }}>
                          Est. upside: ${action.estimatedImpactUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                      )}
                      <p className="text-xs muted line-clamp-2">{action.rationale}</p>
                    </GlassCard>
                  ))}
                </div>
              </div>
            )}

            {/* KPI Cards */}
            <AnimatePresence>
              {kpiEntries.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-tour="overview.kpis">
                  {kpiEntries.map(({ key, value, filteredValue }, idx) => (
                    <KpiCard
                      key={key}
                      label={key}
                      value={value}
                      filteredValue={filteredValue}
                      delay={idx * 0.1}
                    />
                  ))}
                </div>
              ) : (
                <GlassCard>
                  <div className="p-6 text-center text-gray-500">
                    <p>No KPIs available</p>
                  </div>
                </GlassCard>
              )}
            </AnimatePresence>
          </Section>

          {/* Waste Section */}
          <Section
            id="waste"
            title="Waste Efficiency"
            ref={(el) => {
              if (el) sectionRefs.current.waste = el
            }}
          >
            {/* A) Waste Summary Breakdown */}
            {wasteBreakdown.length > 0 ? (
              <div className="mb-8" data-tour="waste.breakdown">
                <StackedBarChart
                  data={wasteBreakdown}
                  title="Leakage Breakdown"
                  subtitle="Void, Discount, and Removal totals"
                />
              </div>
            ) : (
              <div className="mb-8">
                <GlassCard className="p-6">
                  <div className="text-center py-8">
                    <p className="text-sm muted">No leakage breakdown data available for this period</p>
                  </div>
                </GlassCard>
              </div>
            )}

            {/* B) Leakage by Reason */}
            {leakageByReason.length > 0 ? (
              <div className="mb-8" data-tour="waste.by_reason">
                <BreakdownBarChart
                  data={leakageByReason}
                  categoryKey="reason"
                  valueKey="amount"
                  title="Leakage by Reason"
                  subtitle="Top reasons driving waste"
                  maxItems={10}
                  onBarClick={(reason) => handleSetFilter('selectedCategory', reason === filters.selectedCategory ? undefined : reason)}
                  selectedCategory={filters.selectedCategory}
                />
              </div>
            ) : (
              <div className="mb-8">
                <GlassCard className="p-6">
                  <div className="text-center py-8">
                    <p className="text-sm muted">No leakage reason data available for this period</p>
                  </div>
                </GlassCard>
              </div>
            )}

            {/* C) Category Grouping Table */}
            {wasteByCategory.length > 0 ? (
              <div className="mb-8" data-tour="waste.by_category">
                <GlassCard className="p-6">
                  <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
                    Waste by Category
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b" style={{ borderColor: 'var(--card-border)' }}>
                          <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--muted)' }}>
                            Category
                          </th>
                          <th className="text-right py-3 px-4 text-sm font-medium" style={{ color: 'var(--muted)' }}>
                            Amount
                          </th>
                          <th className="text-right py-3 px-4 text-sm font-medium" style={{ color: 'var(--muted)' }}>
                            Count
                          </th>
                          <th className="text-right py-3 px-4 text-sm font-medium" style={{ color: 'var(--muted)' }}>
                            Trend
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {wasteByCategory.map((item) => {
                          // D) Trend indicators (placeholder - no historical data)
                          const trend = getTrendIndicator(item.amount, null)
                          return (
                            <tr
                              key={item.category}
                              className="border-b cursor-pointer hover:bg-[rgba(var(--primary-rgb,99,102,241),0.05)] transition-colors"
                              style={{ borderColor: 'var(--card-border)' }}
                              onClick={() => handleSetFilter('selectedCategory', item.category === filters.selectedCategory ? undefined : item.category)}
                            >
                              <td className="py-3 px-4 text-sm" style={{ color: 'var(--text)' }}>
                                {item.category}
                              </td>
                              <td className="py-3 px-4 text-sm text-right font-medium" style={{ color: 'var(--text)' }}>
                                ${item.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </td>
                              <td className="py-3 px-4 text-sm text-right" style={{ color: 'var(--muted)' }}>
                                {item.count}
                              </td>
                              <td className="py-3 px-4 text-sm text-right" style={{ color: 'var(--muted)' }}>
                                <span className="text-xs">{trend.symbol}</span>
                                {trend.value !== null && (
                                  <span className="ml-1 text-xs">{trend.value.toFixed(1)}%</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </GlassCard>
              </div>
            ) : (
              <div className="mb-8">
                <GlassCard className="p-6">
                  <div className="text-center py-8">
                    <p className="text-sm muted">No category data available for this period</p>
                  </div>
                </GlassCard>
              </div>
            )}

            {/* Original Waste Table (keep for detailed view) */}
            <div className="mb-8" data-tour="waste.detail_table">
              <DataTablePreview
                data={filteredWasteData}
                columns={data?.tables?.waste_efficiency?.columns}
                title="Waste Efficiency Analysis"
                onRowClick={handleRowClick}
              />
            </div>
          </Section>

          {/* Team Section */}
          <Section
            id="team"
            title="Team Performance"
            ref={(el) => {
              if (el) sectionRefs.current.team = el
            }}
          >
            <div className="space-y-6">
              {/* Team Leaderboard */}
              <div data-tour="team.leaderboard">
                <TeamLeaderboardCard
                  data={teamLeaderboard}
                  selectedServer={filters.selectedServer}
                onServerClick={(server) => {
                  handleSetFilter('selectedServer', server === filters.selectedServer ? undefined : server)
                  // Scroll to detail section after a brief delay
                  setTimeout(() => {
                    const detailEl = document.getElementById('team-detail')
                    if (detailEl) {
                      detailEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                  }, 100)
                }}
                sortBy={teamSortBy}
                onSortChange={setTeamSortBy}
                />
              </div>

              {/* Server Detail View */}
              <div id="team-detail" data-tour="team.snapshot">
                <CoachingSnapshotCard
                  snapshot={serverSnapshot}
                  topReasons={serverTopReasons}
                />
              </div>

              {/* Coaching Insights */}
              {coachingInsights.length > 0 && (
                <div data-tour="team.coaching_insights">
                  <CoachingInsightsList insights={coachingInsights} />
                </div>
              )}

              {/* Full Employee Performance Table (below detail view) */}
              <DataTablePreview
                data={filteredEmployeeData}
                columns={data?.tables?.employee_performance?.columns}
                title="All Employee Performance"
                onRowClick={handleRowClick}
              />
            </div>
          </Section>

          {/* Menu Section */}
          <Section
            id="menu"
            title="Menu Analysis"
            ref={(el) => {
              if (el) sectionRefs.current.menu = el
            }}
          >
            {menuData.length === 0 ? (
              <GlassCard>
                <div className="p-6 text-center">
                  <p className="text-sm muted">No menu data available for this period</p>
                </div>
              </GlassCard>
            ) : (
              <div className="space-y-6">
                {/* Chaos Items Visualization */}
                {chaosItems.length > 0 && (
                  <div data-tour="menu.chaos">
                    <BreakdownBarChart
                      data={chaosItems}
                      categoryKey="Item"
                      valueKey="Volatility"
                      title="Top Chaos Items"
                      subtitle="Items with highest volatility"
                      maxItems={15}
                      onBarClick={(item) => {
                        // Scroll to table and highlight item (could add item filter later)
                        const tableEl = document.getElementById('menu-volatility-table')
                        if (tableEl) {
                          tableEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }
                      }}
                    />
                  </div>
                )}

                {/* Menu Buckets */}
                <div data-tour="menu.buckets">
                  <MenuBuckets
                    buckets={menuBuckets}
                    onItemClick={(item) => {
                      // Scroll to table
                      const tableEl = document.getElementById('menu-volatility-table')
                      if (tableEl) {
                        tableEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }
                    }}
                  />
                </div>

                {/* Menu Engineering Quadrant */}
                {menuQuadrantData.length > 0 && (
                  <div data-tour="menu.quadrant">
                    <MenuQuadrantChart
                      data={menuQuadrantData}
                      title="Menu Engineering Quadrant"
                      subtitle="Popularity vs Average Price"
                      onPointClick={(item) => {
                        // Scroll to table
                        const tableEl = document.getElementById('menu-volatility-table')
                        if (tableEl) {
                          tableEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }
                      }}
                    />
                  </div>
                )}

                {/* Menu Volatility Table */}
                <div id="menu-volatility-table" data-tour="menu.table">
                  <DataTablePreview
                    data={filteredMenuData}
                    columns={data?.tables?.menu_volatility?.columns}
                    title="Menu Volatility"
                    onRowClick={handleRowClick}
                  />
                </div>
              </div>
            )}
          </Section>
        </main>

        {/* Right Action Rail */}
        <ActionRail 
          actions={actionItems}
          roleNames={roleNames}
          onActionUpdate={async () => {
            // Refresh actions from server
            try {
              const response = await fetch('/api/actions')
              if (response.ok) {
                const result = await response.json()
                setActionItems(result.actions || [])
              }
            } catch (err) {
              console.error('Failed to refresh actions:', err)
            }
          }}
        />
      </div>
    </div>
  )
}
