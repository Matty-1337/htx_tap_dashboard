import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { getClientLoginCode, getDevPasswordHint } from '@/lib/auth-codes'

const COOKIE_SECRET = process.env.COOKIE_SECRET || 'default-secret-change-in-production'
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'

export async function POST(request: NextRequest) {
  try {
    const { clientId, code } = await request.json()

    if (!clientId || !code) {
      const errorResponse: { error: string; devHint?: string } = {
        error: 'clientId and code are required',
      }
      const devHint = getDevPasswordHint()
      if (devHint) {
        errorResponse.devHint = devHint
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    // Get expected code (with dev default or production error)
    let expectedCode: string
    let codeSource: 'env' | 'dev-default'
    try {
      const codeResult = getClientLoginCode(clientId)
      expectedCode = codeResult.code
      codeSource = codeResult.source
    } catch (error: any) {
      // Production error - missing env var
      return NextResponse.json(
        { error: error.message || 'Configuration error' },
        { status: 500 }
      )
    }

    // Dev-only logging (never log actual codes)
    if (!isProduction) {
      console.log(`[LOGIN API] Login attempt for client: ${clientId}`)
      console.log(`[LOGIN API] Code source: ${codeSource}`)
    }
    
    if (code !== expectedCode) {
      const errorResponse: { error: string; devHint?: string } = {
        error: 'Invalid access code',
      }
      const devHint = getDevPasswordHint()
      if (devHint) {
        errorResponse.devHint = devHint
      }
      return NextResponse.json(errorResponse, { status: 401 })
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
