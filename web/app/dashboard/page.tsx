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
  clientId: string
  generatedAt: string
  kpis: Record<string, number>
  charts: {
    hourly_revenue?: Array<{ Hour: number; 'Net Price': number }>
    day_of_week?: Array<{ DayOfWeek: string; 'Net Price': number }>
  }
  tables: {
    waste_efficiency?: { data: any[]; columns: string[] }
    employee_performance?: { data: any[]; columns: string[] }
    menu_volatility?: { data: any[]; columns: string[] }
  }
  executionTimeSeconds: number
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
        const errorMessage = errorData.error || errorData.details || `HTTP ${response.status}: Failed to fetch analysis data`
        throw new Error(errorMessage)
      }

      const analysisData = await response.json()
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">Error: {error}</div>
      </div>
    )
  }

  // Prepare chart data
  const chartData = data?.charts?.hourly_revenue?.map((item: any) => ({
    hour: item.Hour || item.hour || 0,
    revenue: item['Net Price'] || item.revenue || 0,
  })) || []

  // Get first table for display
  const firstTable = data?.tables?.waste_efficiency || data?.tables?.employee_performance || data?.tables?.menu_volatility
  const tableData = firstTable?.data || []
  const tableColumns = firstTable?.columns || []

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {clientId.charAt(0).toUpperCase() + clientId.slice(1)} Analytics Dashboard
          </h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Logout
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {Object.entries(data?.kpis || {}).slice(0, 4).map(([key, value]) => (
            <div key={key} className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-600 capitalize">
                {key.replace(/_/g, ' ')}
              </div>
              <div className="text-2xl font-bold text-gray-900 mt-2">
                {typeof value === 'number' ? value.toLocaleString() : String(value)}
              </div>
            </div>
          ))}
        </div>

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
        {tableData.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">
              {firstTable === data?.tables?.waste_efficiency ? 'Waste Efficiency' :
               firstTable === data?.tables?.employee_performance ? 'Employee Performance' :
               'Menu Volatility'}
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {tableColumns.slice(0, 5).map((col: string) => (
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
                  {tableData.slice(0, 10).map((row: any, idx: number) => (
                    <tr key={idx}>
                      {tableColumns.slice(0, 5).map((col: string) => (
                        <td key={col} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-8 text-sm text-gray-500">
          Generated at: {data?.generatedAt} | Execution time: {data?.executionTimeSeconds}s
        </div>
      </div>
    </div>
  )
}
