import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { supabase } from '@/lib/supabase-server'

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

// PATCH: Update action status or assignee (only if belongs to client_id)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clientId = await getClientIdFromSession(request)
    if (!clientId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const validClientIds = ['melrose', 'bestregard', 'fancy']
    if (!validClientIds.includes(clientId)) {
      return NextResponse.json({ error: 'Invalid clientId' }, { status: 400 })
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { status, assignee } = body

    // Validate updates
    if (status !== undefined && !['open', 'done', 'snoozed', 'dismissed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    if (assignee !== undefined && !['GM', 'Manager 1', 'Manager 2'].includes(assignee)) {
      return NextResponse.json({ error: 'Invalid assignee' }, { status: 400 })
    }

    // Verify action belongs to client
    const { data: existing, error: fetchError } = await supabase
      .from('action_items')
      .select('*')
      .eq('id', id)
      .eq('client_id', clientId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Action not found or access denied' }, { status: 404 })
    }

    // Build update object
    const updateData: Record<string, string> = {}
    if (status !== undefined) updateData.status = status
    if (assignee !== undefined) updateData.assignee = assignee

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Update action
    const { data: updated, error } = await (supabase as any)
      .from('action_items')
      .update(updateData)
      .eq('id', id)
      .eq('client_id', clientId)
      .select()
      .single()

    if (error) {
      console.error('Update error:', error)
      return NextResponse.json({ error: 'Update failed', details: error.message }, { status: 500 })
    }

    const updatedAction = updated as any
    return NextResponse.json({
      id: updatedAction.id,
      status: updatedAction.status,
      assignee: updatedAction.assignee,
    })
  } catch (error: any) {
    console.error('PATCH /api/actions/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
