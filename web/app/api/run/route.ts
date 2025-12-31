import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const COOKIE_SECRET = process.env.COOKIE_SECRET || 'default-secret-change-in-production'

export async function POST(request: NextRequest) {
  try {
    // Read request body for params (including dateRange) - must be done before reading cookies
    let requestBodyData: any = {}
    try {
      const bodyText = await request.text()
      if (bodyText) {
        requestBodyData = JSON.parse(bodyText)
      }
    } catch {
      // Body may be empty, that's fine
    }
    
    // STEP 1: Check for admin view-as (highest priority)
    const adminSession = request.cookies.get('admin_session')
    const adminViewClient = request.cookies.get('admin_view_client')
    
    let clientId: string | null = null
    let isAdminSession = false

    // If admin is authenticated and has selected a view client, use that
    if (adminSession?.value === 'true' && adminViewClient?.value) {
      clientId = adminViewClient.value.toLowerCase().trim()
      isAdminSession = true
    } else {
      // STEP 2: Fallback to normal JWT session
      const session = request.cookies.get('session')

      if (!session || !session.value) {
        return NextResponse.json(
          { error: 'Not authenticated', details: 'No session cookie found' },
          { status: 401 }
        )
      }

      // Verify JWT and extract clientId
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
    }

    // Ensure clientId is set (should never be null here, but TypeScript safety)
    if (!clientId) {
      return NextResponse.json(
        { error: 'No clientId available', details: 'Neither admin view nor session clientId found' },
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

    // Normalize clientId to lowercase (Railway expects: melrose, bestregard, fancy)
    const normalizedClientId = clientId.toLowerCase().trim()

    // Server-side logging (no secrets)
    if (isAdminSession) {
      console.log(`[API /run] Admin session: viewing as clientId=${normalizedClientId}`)
    } else {
      console.log(`[API /run] Client session: clientId=${normalizedClientId}`)
    }

    // Validate clientId matches expected values
    const validClientIds = ['melrose', 'bestregard', 'fancy']
    if (!validClientIds.includes(normalizedClientId)) {
      return NextResponse.json(
        { error: 'Invalid clientId', details: `clientId must be one of: ${validClientIds.join(', ')}` },
        { status: 400 }
      )
    }

    // Build request to Railway with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 120000) // 120s timeout

    try {
      // Extract params from request body (including dateRange)
      const params = requestBodyData.params || {}
      
      // Railway expects: { "clientId": "melrose", "params": { ... } }
      const requestBody = { 
        clientId: normalizedClientId,
        params
      }
      
      // Log dateRange if present (server-side only, no secrets)
      if (params.dateRange) {
        console.log(`[API /run] Date range: preset=${params.dateRange.preset}, start=${params.dateRange.start}, end=${params.dateRange.end}`)
      }
      
      const response = await fetch(railwayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
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
