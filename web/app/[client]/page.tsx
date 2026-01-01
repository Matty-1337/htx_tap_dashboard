'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

const VALID_CLIENTS = ['melrose', 'bestregard', 'fancy'] as const
type ValidClient = typeof VALID_CLIENTS[number]

const CLIENT_NAMES: Record<ValidClient, string> = {
  melrose: 'Melrose',
  bestregard: 'Bestregard',
  fancy: 'Fancy',
}

/**
 * Normalize client param from Next.js route params
 * Handles: string | string[] | undefined
 * Sanity checks: "melrose", "Melrose", "melrose%20" all normalize to "melrose"
 */
function normalizeClientParam(param: string | string[] | undefined): string | null {
  if (!param) return null
  
  // Handle array case (shouldn't happen but be safe)
  const paramStr = Array.isArray(param) ? param[0] : param
  
  // Decode URL encoding and normalize
  try {
    const decoded = decodeURIComponent(paramStr)
    const trimmed = decoded.trim()
    const normalized = trimmed.toLowerCase()
    return normalized
  } catch {
    // If decode fails, just use as-is with toLowerCase
    return paramStr.trim().toLowerCase()
  }
}

export default function ClientLoginPage() {
  const params = useParams()
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Normalize client param robustly
  const normalizedClient = normalizeClientParam(params?.client)
  
  // Validate client (synchronous check)
  const clientId: ValidClient | null = normalizedClient && VALID_CLIENTS.includes(normalizedClient as ValidClient)
    ? (normalizedClient as ValidClient)
    : null

  // Don't render if invalid
  if (!clientId || !VALID_CLIENTS.includes(clientId)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>404 - Client Not Found</h1>
          <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>Invalid client route. Valid clients: melrose, bestregard, fancy</p>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 text-white rounded-md focus:outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--accent-primary)',
              borderRadius: 'var(--radius-md)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1'
            }}
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
        let errorMessage = data.error || 'Invalid access code'
        if (data.devHint) {
          errorMessage += ` (${data.devHint})`
        }
        setError(errorMessage)
      }
    } catch (err) {
      setError('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-md w-full space-y-8 p-8 rounded-lg shadow-md" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--card-border)' }}>
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
            HTX TAP Analytics – {clientName}
          </h2>
          <p className="mt-2 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            Enter your access code to continue
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* Hidden clientId field - locked to route param */}
          <input type="hidden" name="clientId" value={clientId} />
          
          <div>
            <label htmlFor="code" className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Access Code
            </label>
            <input
              id="code"
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1 block w-full px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--card-border)',
                borderRadius: 'var(--radius-md)',
                caretColor: 'var(--text-primary)',
              }}
              placeholder="Enter access code"
              required
              autoFocus
            />
            <style>{`
              #code::placeholder {
                color: var(--text-muted);
              }
              #code:focus {
                border-color: var(--accent-primary) !important;
                --tw-ring-color: var(--accent-primary);
              }
            `}</style>
          </div>
          {error && (
            <div className="text-sm" style={{ color: 'var(--status-danger)' }}>{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50"
            style={{
              backgroundColor: 'var(--accent-primary)',
              borderRadius: 'var(--radius-md)',
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.opacity = '0.9'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = loading ? '0.5' : '1'
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}
