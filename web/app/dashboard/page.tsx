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
import { formatKey } from '@/lib/ui'
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

export default function DashboardPage() {
  const [data, setData] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeSection, setActiveSection] = useState('overview')
  const [isRunning, setIsRunning] = useState(false)
  const router = useRouter()
  const sectionRefs = useRef<Record<string, HTMLElement>>({})

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

      const response = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  // Loading state
  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Sticky Header Skeleton */}
        <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm">
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <GlassCard className="max-w-md">
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/login')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Back to Login
              </button>
              <button
                onClick={fetchAnalysis}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </GlassCard>
      </div>
    )
  }

  // Extract KPIs
  const kpis = data?.kpis || {}
  const kpiEntries = Object.entries(kpis).slice(0, 6)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Sticky Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900">HTX TAP Analytics</h1>
              <span className="text-gray-400">•</span>
              <span className="text-lg font-medium text-gray-700">{clientName}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                <div>Last updated {formatTime(data?.generatedAt)}</div>
                {data?.executionTimeSeconds && (
                  <div className="text-xs text-gray-500">Execution {data.executionTimeSeconds}s</div>
                )}
              </div>
              <button
                onClick={handleRunAnalysis}
                disabled={isRunning}
                className={clsx(
                  'px-4 py-2 rounded-lg font-medium transition-all',
                  'bg-indigo-600 text-white hover:bg-indigo-700',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'shadow-lg shadow-indigo-200/50 hover:shadow-xl hover:shadow-indigo-300/50'
                )}
              >
                {isRunning ? 'Running...' : 'Run Analysis'}
              </button>
              <button
                onClick={handleLogout}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="flex max-w-7xl mx-auto">
        {/* Left Navigation Rail */}
        <aside className="w-64 flex-shrink-0 sticky top-20 h-[calc(100vh-5rem)] pt-8 pl-6">
          <nav className="space-y-2">
            {NAV_SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={clsx(
                  'w-full text-left px-4 py-2 rounded-lg transition-all',
                  activeSection === section.id
                    ? 'bg-indigo-50 text-indigo-700 font-medium shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
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
            <AnimatePresence>
              {kpiEntries.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {kpiEntries.map(([key, value], idx) => (
                    <KpiCard key={key} label={key} value={value} delay={idx * 0.1} />
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
            <DataTablePreview
              data={data?.tables?.waste_efficiency?.data || []}
              columns={data?.tables?.waste_efficiency?.columns}
              title="Waste Efficiency Analysis"
            />
          </Section>

          {/* Team Section */}
          <Section
            id="team"
            title="Team Performance"
            ref={(el) => {
              if (el) sectionRefs.current.team = el
            }}
          >
            <DataTablePreview
              data={data?.tables?.employee_performance?.data || []}
              columns={data?.tables?.employee_performance?.columns}
              title="Employee Performance"
            />
          </Section>

          {/* Menu Section */}
          <Section
            id="menu"
            title="Menu Analysis"
            ref={(el) => {
              if (el) sectionRefs.current.menu = el
            }}
          >
            <DataTablePreview
              data={data?.tables?.menu_volatility?.data || []}
              columns={data?.tables?.menu_volatility?.columns}
              title="Menu Volatility"
            />
          </Section>
        </main>
      </div>
    </div>
  )
}
