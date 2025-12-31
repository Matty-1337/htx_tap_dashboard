import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const COOKIE_SECRET = process.env.COOKIE_SECRET || 'default-secret-change-in-production'

export async function POST(request: NextRequest) {
  try {
    // Read session cookie
    const session = request.cookies.get('session')

    if (!session || !session.value) {
      return NextResponse.json(
        { error: 'Not authenticated', details: 'No session cookie found' },
        { status: 401 }
      )
    }

    // Verify JWT and extract clientId
    let clientId: string
    try {
      const secret = new TextEncoder().encode(COOKIE_SECRET)
      const { payload } = await jwtVerify(session.value, secret)
      clientId = payload.clientId as string

      if (!clientId) {
        return NextResponse.json(
          { error: 'Invalid session: missing clientId', details: 'JWT payload missing clientId' },
          { status: 401 }
        )
      }
    } catch (error: any) {
      // Log JWT verification error for debugging (server-side only)
      console.error('JWT verification failed:', error.message || 'Unknown error')
      return NextResponse.json(
        { error: 'Invalid session', details: 'JWT verification failed' },
        { status: 401 }
      )
    }

    // Get Railway API base URL
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || 
                process.env.API_BASE_URL || 
                'http://localhost:8000'
    
    // Remove trailing slash if present
    const apiBase = base.replace(/\/$/, '')
    const railwayUrl = `${apiBase}/run`

    // Build request to Railway with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 120000) // 120s timeout

    try {
      const response = await fetch(railwayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clientId }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // Handle non-2xx responses
      if (!response.ok) {
        let errorDetails = 'Backend error'
        try {
          const errorText = await response.text()
          // Cap error message length to prevent leaking sensitive data
          errorDetails = errorText.length > 500 
            ? errorText.substring(0, 500) + '...' 
            : errorText
        } catch {
          errorDetails = `HTTP ${response.status} ${response.statusText}`
        }

        return NextResponse.json(
          { 
            error: 'Backend error',
            details: errorDetails,
            status: response.status
          },
          { status: response.status }
        )
      }

      // Parse and return successful response
      const data = await response.json()
      return NextResponse.json(data)

    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      
      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timeout: analysis took too long' },
          { status: 504 }
        )
      }

      return NextResponse.json(
        { 
          error: 'Failed to reach backend',
          details: fetchError.message || 'Network error'
        },
        { status: 502 }
      )
    }

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
