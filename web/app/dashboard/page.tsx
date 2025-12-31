'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

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
  [key: string]: any // Allow additional keys
}

export default function DashboardPage() {
  const [data, setData] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [clientId, setClientId] = useState('')
  const router = useRouter()

  useEffect(() => {
    // Get clientId from session (we'll extract it from the API response)
    fetchAnalysis()
  }, [])

  const fetchAnalysis = async () => {
    setLoading(true)
    setError('')

    try {
      // First, get clientId from session via API
      const sessionRes = await fetch('/api/session')
      if (!sessionRes.ok) {
        router.push('/login')
        return
      }
      const session = await sessionRes.json()
      setClientId(session.clientId)

      // Fetch analysis data through Next.js API route (same-origin)
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
      
      // Guard against oversized payloads - limit table rows to 500
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

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' })
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading dashboard...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-700">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Return to Login
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">No data available</div>
      </div>
    )
  }

  // Prepare chart data with safe optional chaining
  const chartData = data?.charts?.hourly_revenue?.map((item: any) => ({
    hour: item?.Hour || item?.hour || 0,
    revenue: item?.['Net Price'] || item?.revenue || item?.Revenue || 0,
  })).filter((item: any) => item.revenue > 0) || []

  // Find first available table (schema-tolerant)
  const findFirstTable = () => {
    if (!data?.tables) return null
    
    // Try known table keys first
    const knownKeys = ['waste_efficiency', 'employee_performance', 'menu_volatility']
    for (const key of knownKeys) {
      const table = data.tables[key]
      if (table?.data && Array.isArray(table.data) && table.data.length > 0) {
        return { key, ...table }
      }
    }
    
    // Fallback: find any table with data array
    for (const [key, value] of Object.entries(data.tables)) {
      if (value && typeof value === 'object' && 'data' in value) {
        const table = value as any
        if (Array.isArray(table.data) && table.data.length > 0) {
          return { key, ...table }
        }
      }
    }
    
    return null
  }

  const firstTable = findFirstTable()
  const tableData = firstTable?.data?.slice(0, 50) || [] // Limit to 50 rows
  const tableColumns = firstTable?.columns || (tableData.length > 0 ? Object.keys(tableData[0]).slice(0, 10) : []) // Limit to 10 columns

  // Extract KPIs with fallback
  const kpis = data?.kpis || {}
  const kpiEntries = Object.entries(kpis).slice(0, 6) // Limit to 6 KPIs

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {(data?.clientId || clientId || 'Analytics').charAt(0).toUpperCase() + (data?.clientId || clientId || 'Analytics').slice(1)} Analytics Dashboard
          </h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Logout
          </button>
        </div>

        {/* Success Banner */}
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mb-6">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold">Run succeeded</span>
          </div>
        </div>

        {/* KPI Cards */}
        {kpiEntries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {kpiEntries.map(([key, value]) => (
              <div key={key} className="bg-white p-6 rounded-lg shadow">
                <div className="text-sm text-gray-600 capitalize">
                  {key.replace(/_/g, ' ')}
                </div>
                <div className="text-2xl font-bold text-gray-900 mt-2">
                  {typeof value === 'number' 
                    ? (key.includes('pct') || key.includes('rate') 
                        ? `${value.toFixed(2)}%` 
                        : key.includes('revenue') || key.includes('premium')
                        ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : value.toLocaleString())
                    : String(value)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-6">
            <p>No KPIs available. Available keys: {Object.keys(data).join(', ')}</p>
          </div>
        )}

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-xl font-semibold mb-4">Revenue by Hour</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Table */}
        {tableData.length > 0 ? (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">
              {firstTable?.key === 'waste_efficiency' ? 'Waste Efficiency' :
               firstTable?.key === 'employee_performance' ? 'Employee Performance' :
               firstTable?.key === 'menu_volatility' ? 'Menu Volatility' :
               firstTable?.key ? firstTable.key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) :
               'Data Preview'}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Showing {tableData.length} of {firstTable?.data?.length || tableData.length} rows, {tableColumns.length} columns
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {tableColumns.map((col: string) => (
                      <th
                        key={col}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tableData.map((row: any, idx: number) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {tableColumns.map((col: string) => {
                        const value = row?.[col]
                        return (
                          <td key={col} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {value !== null && value !== undefined 
                              ? (typeof value === 'number' 
                                  ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                                  : String(value))
                              : '-'}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-6">
            <p>No table data available. Tables found: {data?.tables ? Object.keys(data.tables).join(', ') : 'none'}</p>
          </div>
        )}

        <div className="mt-8 text-sm text-gray-500">
          {data?.generatedAt && `Generated at: ${new Date(data.generatedAt).toLocaleString()} | `}
          {data?.executionTimeSeconds && `Execution time: ${data.executionTimeSeconds}s`}
        </div>
      </div>
    </div>
  )
}
