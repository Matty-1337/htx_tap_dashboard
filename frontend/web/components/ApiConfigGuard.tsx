'use client'

import { useEffect, useState } from 'react'

/**
 * API Configuration Guard
 * 
 * Checks that NEXT_PUBLIC_API_BASE_URL is set in production.
 * Shows a visible error banner if missing.
 */
export function ApiConfigGuard({ children }: { children: React.ReactNode }) {
  const [apiBaseUrl, setApiBaseUrl] = useState<string | null>(null)
  const [showError, setShowError] = useState(false)

  useEffect(() => {
    // Strictly require NEXT_PUBLIC_API_BASE_URL - no hardcoded fallback
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
    
    setApiBaseUrl(apiBaseUrl || null)
    
    // In production, require the env var - show error banner if missing
    if (isProduction && !apiBaseUrl) {
      setShowError(true)
      console.error('[ApiConfigGuard] NEXT_PUBLIC_API_BASE_URL is missing in production!')
      console.error('[ApiConfigGuard] Set it in Vercel: Project → Settings → Environment Variables')
    } else if (!apiBaseUrl) {
      // In dev, warn but don't block
      console.warn('[ApiConfigGuard] NEXT_PUBLIC_API_BASE_URL not set (dev mode)')
    } else {
      console.log(`[ApiConfigGuard] API Base URL: ${apiBaseUrl}`)
    }
  }, [])

  if (showError) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-primary)',
        padding: '2rem'
      }}>
        <div style={{
          maxWidth: '600px',
          padding: '2rem',
          backgroundColor: 'var(--bg-secondary)',
          border: '2px solid var(--status-danger)',
          borderRadius: '8px',
          boxShadow: 'var(--shadow-card)'
        }}>
          <h1 style={{
            color: 'var(--status-danger)',
            fontSize: '1.5rem',
            fontWeight: 'bold',
            marginBottom: '1rem'
          }}>
            ⚠️ API Configuration Missing
          </h1>
          <p style={{
            color: 'var(--text-primary)',
            marginBottom: '1rem',
            lineHeight: '1.6'
          }}>
            The backend API URL is not configured. This application cannot function without it.
          </p>
          <div style={{
            backgroundColor: 'var(--bg-tertiary)',
            padding: '1rem',
            borderRadius: '4px',
            marginBottom: '1rem',
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            color: 'var(--text-secondary)'
          }}>
            <div style={{ marginBottom: '0.5rem' }}>Required Environment Variable:</div>
            <div style={{ color: 'var(--accent-primary)' }}>
              NEXT_PUBLIC_API_BASE_URL
            </div>
            <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>Expected Value:</div>
            <div style={{ color: 'var(--accent-primary)' }}>
              https://htxtapdashboard-production.up.railway.app
            </div>
          </div>
          <div style={{
            color: 'var(--text-secondary)',
            fontSize: '0.875rem',
            lineHeight: '1.6'
          }}>
            <p style={{ marginBottom: '0.5rem' }}><strong>To fix:</strong></p>
            <ol style={{ paddingLeft: '1.5rem', margin: 0 }}>
              <li>Go to Vercel Dashboard → Your Project → Settings → Environment Variables</li>
              <li>Add <code style={{ backgroundColor: 'var(--bg-primary)', padding: '2px 4px', borderRadius: '2px' }}>NEXT_PUBLIC_API_BASE_URL</code></li>
              <li>Set value to: <code style={{ backgroundColor: 'var(--bg-primary)', padding: '2px 4px', borderRadius: '2px' }}>https://htxtapdashboard-production.up.railway.app</code></li>
              <li>Apply to: <strong>Production</strong> and <strong>Preview</strong></li>
              <li>Redeploy the application</li>
            </ol>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
