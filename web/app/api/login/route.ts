import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'

const COOKIE_SECRET = process.env.COOKIE_SECRET || 'default-secret-change-in-production'
const LOGIN_CODES: Record<string, string> = {
  melrose: process.env.LOGIN_CODE_MELROSE || '',
  bestregard: process.env.LOGIN_CODE_BESTREGARD || '',
  fancy: process.env.LOGIN_CODE_FANCY || '',
}

export async function POST(request: NextRequest) {
  try {
    const { clientId, code } = await request.json()

    if (!clientId || !code) {
      return NextResponse.json(
        { error: 'clientId and code are required' },
        { status: 400 }
      )
    }

    const expectedCode = LOGIN_CODES[clientId.toLowerCase()]
    if (!expectedCode || code !== expectedCode) {
      return NextResponse.json(
        { error: 'Invalid access code' },
        { status: 401 }
      )
    }

    // Create signed JWT token
    const secret = new TextEncoder().encode(COOKIE_SECRET)
    const token = await new SignJWT({ clientId, timestamp: Date.now() })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('30d')
      .sign(secret)

    // Set httpOnly cookie
    const response = NextResponse.json({ success: true })
    response.cookies.set('session', token, {
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
