import { NextRequest, NextResponse } from 'next/server'

const VALID_CLIENT_IDS = ['melrose', 'fancy', 'bestregard'] as const

export async function POST(request: NextRequest) {
  try {
    // Verify admin session exists
    const adminSession = request.cookies.get('admin_session')
    if (!adminSession || adminSession.value !== 'true') {
      return NextResponse.json(
        { error: 'Not authenticated as admin' },
        { status: 401 }
      )
    }

    const { clientId } = await request.json()

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId is required' },
        { status: 400 }
      )
    }

    // Validate clientId is in allowed list
    const normalizedClientId = clientId.toLowerCase().trim()
    if (!VALID_CLIENT_IDS.includes(normalizedClientId as typeof VALID_CLIENT_IDS[number])) {
      return NextResponse.json(
        { error: 'Invalid clientId', details: `clientId must be one of: ${VALID_CLIENT_IDS.join(', ')}` },
        { status: 400 }
      )
    }

    // Set httpOnly admin view client cookie
    const response = NextResponse.json({ success: true, clientId: normalizedClientId })
    response.cookies.set('admin_view_client', normalizedClientId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })

    return response
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to set view client' },
      { status: 500 }
    )
  }
}
