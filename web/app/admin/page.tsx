'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const VALID_CLIENTS = ['melrose', 'fancy', 'bestregard'] as const
type ValidClient = typeof VALID_CLIENTS[number]

const CLIENT_NAMES: Record<ValidClient, string> = {
  melrose: 'Melrose',
  fancy: 'Fancy',
  bestregard: 'Best Regards',
}

export default function AdminPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [viewClient, setViewClient] = useState<ValidClient | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  // Check admin session on mount
  useEffect(() => {
    checkAdminSession()
  }, [])

  const checkAdminSession = async () => {
    try {
      const response = await fetch('/api/admin/session')
      if (response.ok) {
        const data = await response.json()
        setAuthenticated(data.authenticated)
        if (data.viewClient && VALID_CLIENTS.includes(data.viewClient as ValidClient)) {
          setViewClient(data.viewClient as ValidClient)
        }
      }
    } catch (err) {
      console.error('Failed to check admin session:', err)
    } finally {
      setCheckingAuth(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      if (response.ok) {
        setAuthenticated(true)
        setCode('')
        // Re-check session to get viewClient if set
        await checkAdminSession()
      } else {
        const data = await response.json()
        setError(data.error || 'Invalid access code')
      }
    } catch (err) {
      setError('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleViewClientChange = async (clientId: ValidClient) => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/view-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })

      if (response.ok) {
        setViewClient(clientId)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to set view client')
      }
    } catch (err) {
      setError('Failed to set view client. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDashboard = () => {
    if (viewClient) {
      router.push('/dashboard')
    }
  }

  // Show loading state while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show login form if not authenticated
  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              HTX TAP Analytics – Admin
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Enter admin access code to continue
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                Admin Access Code
              </label>
              <input
                id="code"
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter admin access code"
                required
                autoFocus
              />
            </div>
            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Show admin dashboard with client switcher
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            HTX TAP Analytics – Admin
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            View client dashboards
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <div>
            <label htmlFor="client-select" className="block text-sm font-medium text-gray-700 mb-2">
              Select Client to View
            </label>
            <select
              id="client-select"
              value={viewClient || ''}
              onChange={(e) => handleViewClientChange(e.target.value as ValidClient)}
              disabled={loading}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
            >
              <option value="">-- Select a client --</option>
              {VALID_CLIENTS.map((client) => (
                <option key={client} value={client}>
                  {CLIENT_NAMES[client]}
                </option>
              ))}
            </select>
          </div>

          {viewClient && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                <strong>Current viewing:</strong> {CLIENT_NAMES[viewClient]}
              </p>
            </div>
          )}

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <button
            onClick={handleOpenDashboard}
            disabled={!viewClient || loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Open Dashboard'}
          </button>
        </div>
      </div>
    </div>
  )
}
