import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const COOKIE_SECRET = process.env.COOKIE_SECRET || 'default-secret-change-in-production'

export async function GET(request: NextRequest) {
  const session = request.cookies.get('session')

  if (!session) {
    return NextResponse.json({ error: 'No session' }, { status: 401 })
  }

  try {
    const secret = new TextEncoder().encode(COOKIE_SECRET)
    const { payload } = await jwtVerify(session.value, secret)
    return NextResponse.json({ clientId: payload.clientId })
  } catch (error) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }
}
