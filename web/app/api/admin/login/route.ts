import { NextRequest, NextResponse } from 'next/server'

const ADMIN_ACCESS_CODE = process.env.ADMIN_ACCESS_CODE || ''

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json(
        { error: 'Access code is required' },
        { status: 400 }
      )
    }

    // Validate against server-side env var (never log the code)
    if (!ADMIN_ACCESS_CODE || code !== ADMIN_ACCESS_CODE) {
      return NextResponse.json(
        { error: 'Invalid access code' },
        { status: 401 }
      )
    }

    // Set httpOnly admin session cookie
    const response = NextResponse.json({ success: true })
    response.cookies.set('admin_session', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })

    return response
  } catch (error) {
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}
