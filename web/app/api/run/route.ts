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
    // In production, require env var. In dev, default to local backend.
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL
    
    if (!base) {
      if (isProduction) {
        return NextResponse.json(
          { error: 'Backend configuration missing', details: 'NEXT_PUBLIC_API_BASE_URL or API_BASE_URL must be set in production' },
          { status: 500 }
        )
      }
      // Dev default
      console.log('[API /run] Backend URL env var not set, using dev default: http://127.0.0.1:8000')
    }
    
    const apiBase = (base || 'http://127.0.0.1:8000').replace(/\/$/, '')
    const railwayUrl = `${apiBase}/run`
    
      // Normalize clientId to lowercase (Railway expects: melrose, bestregard, fancy)
      const normalizedClientId = clientId.toLowerCase().trim()

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
        
        // Backend expects: { "clientId": "melrose", "params": { ... } }
        const requestBody = { 
          clientId: normalizedClientId,
          params
        }
        
        // Dev-only logging (no secrets)
        if (!isProduction) {
          console.log(`[API /run] Calling backend: ${railwayUrl}`)
          console.log(`[API /run] Client: ${normalizedClientId}, params keys: ${Object.keys(params).join(', ')}`)
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

        // Dev-only logging of status
        if (!isProduction) {
          console.log(`[API /run] Backend response status: ${response.status}`)
        }

        // Parse response body (both success and error)
        let responseData: any
        const contentType = response.headers.get('content-type')
        if (contentType?.includes('application/json')) {
          responseData = await response.json()
        } else {
          const text = await response.text()
          try {
            responseData = JSON.parse(text)
          } catch {
            responseData = { detail: text, message: text }
          }
        }

        // Return backend response with preserved status code
        return NextResponse.json(responseData, { status: response.status })

    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      
      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timeout: analysis took too long' },
          { status: 504 }
        )
      }

      // Dev-only: include backend URL in error details
      const errorDetails: { error: string; details: string; backendUrl?: string; tip?: string } = {
        error: 'Failed to reach backend',
        details: fetchError.message || 'Network error',
      }
      
      if (!isProduction) {
        errorDetails.backendUrl = railwayUrl
        errorDetails.tip = `Set NEXT_PUBLIC_API_BASE_URL in .env.local or start backend at ${apiBase}`
        console.error(`[API /run] Failed to reach backend at ${railwayUrl}:`, fetchError.message)
      }

      return NextResponse.json(errorDetails, { status: 502 })
    }

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
