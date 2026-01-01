import { NextRequest, NextResponse } from 'next/server'
import { getAdminAccessCode, getDevPasswordHint } from '@/lib/auth-codes'

const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code) {
      const errorResponse: { error: string; devHint?: string } = {
        error: 'Access code is required',
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
      const codeResult = getAdminAccessCode()
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
      console.log('[ADMIN LOGIN API] Admin login attempt')
      console.log(`[ADMIN LOGIN API] Code source: ${codeSource}`)
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
