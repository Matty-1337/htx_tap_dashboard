'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

const VALID_CLIENTS = ['melrose', 'bestregard', 'fancy'] as const
type ValidClient = typeof VALID_CLIENTS[number]

const CLIENT_NAMES: Record<ValidClient, string> = {
  melrose: 'Melrose',
  bestregard: 'Bestregard',
  fancy: 'Fancy',
}

export default function ClientLoginPage() {
  const params = useParams()
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isValid, setIsValid] = useState(false)

  // Get client from params and validate
  const clientParam = params?.client as string
  const clientId = clientParam?.toLowerCase() as ValidClient

  // Validate client on mount
  useEffect(() => {
    if (!clientId || !VALID_CLIENTS.includes(clientId)) {
      // Redirect to 404 or login page
      router.push('/login')
    } else {
      setIsValid(true)
    }
  }, [clientId, router])

  // Don't render if invalid
  if (!isValid || !clientId || !VALID_CLIENTS.includes(clientId)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">404 - Client Not Found</h1>
          <p className="text-gray-600 mb-4">Invalid client route. Valid clients: melrose, bestregard, fancy</p>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Return to Login
          </button>
        </div>
      </div>
    )
  }

  const clientName = CLIENT_NAMES[clientId]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, code }),
      })

      if (response.ok) {
        router.push('/dashboard')
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            HTX TAP Analytics – {clientName}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your access code to continue
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* Hidden clientId field - locked to route param */}
          <input type="hidden" name="clientId" value={clientId} />
          
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700">
              Access Code
            </label>
            <input
              id="code"
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter access code"
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
