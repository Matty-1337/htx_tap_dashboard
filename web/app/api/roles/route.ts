import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const COOKIE_SECRET = process.env.COOKIE_SECRET || 'default-secret-change-in-production'

// Helper to get clientId from session
async function getClientIdFromSession(request: NextRequest): Promise<string | null> {
  const session = request.cookies.get('session')
  if (!session?.value) return null

  try {
    const secret = new TextEncoder().encode(COOKIE_SECRET)
    const { payload } = await jwtVerify(session.value, secret)
    return (payload.clientId as string)?.toLowerCase() || null
  } catch {
    return null
  }
}

// GET: Return role names for the authenticated client
export async function GET(request: NextRequest) {
  try {
    const clientId = await getClientIdFromSession(request)
    if (!clientId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const validClientIds = ['melrose', 'bestregard', 'fancy']
    if (!validClientIds.includes(clientId)) {
      return NextResponse.json({ error: 'Invalid clientId' }, { status: 400 })
    }

    // Get role names from environment variables
    const clientUpper = clientId.toUpperCase()
    const gmName = process.env[`${clientUpper}_GM_NAME`] || null
    const manager1Name = process.env[`${clientUpper}_MANAGER_1_NAME`] || null
    const manager2Name = process.env[`${clientUpper}_MANAGER_2_NAME`] || null

    return NextResponse.json({
      clientId,
      gmName,
      manager1Name,
      manager2Name,
    })
  } catch (error: any) {
    console.error('GET /api/roles error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
