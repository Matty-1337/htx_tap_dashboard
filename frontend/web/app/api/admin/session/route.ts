import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/admin/session
 * Check if admin is authenticated and return current view client if set
 */
export async function GET(request: NextRequest) {
  const adminSession = request.cookies.get('admin_session')
  const adminViewClient = request.cookies.get('admin_view_client')

  if (!adminSession || adminSession.value !== 'true') {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  return NextResponse.json({
    authenticated: true,
    viewClient: adminViewClient?.value || null,
  })
}
