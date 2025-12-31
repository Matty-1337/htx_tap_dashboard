import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { supabase } from '@/lib/supabase-server'
import { generateActions, ActionItem } from '@/lib/action-engine'

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

// GET: Fetch actions for client (open + done, last 90 days)
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

    // Fetch actions from last 90 days
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const { data, error } = await supabase
      .from('action_items')
      .select('*')
      .eq('client_id', clientId)
      .in('status', ['open', 'done'])
      .gte('created_at', ninetyDaysAgo.toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Database error', details: error.message }, { status: 500 })
    }

    // Transform to ActionItem format
    const actions: ActionItem[] = (data || []).map((row: any) => ({
      id: row.id,
      priority: row.priority as 'high' | 'medium' | 'low',
      title: row.title,
      rationale: row.rationale,
      steps: row.steps,
      estimatedImpactUsd: row.estimated_impact_usd ? Number(row.estimated_impact_usd) : undefined,
      assignee: row.assignee as 'GM' | 'Manager 1' | 'Manager 2',
      source: row.source,
    }))

    return NextResponse.json({ actions })
  } catch (error: any) {
    console.error('GET /api/actions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Generate actions and upsert (dedupe)
export async function POST(request: NextRequest) {
  try {
    const clientId = await getClientIdFromSession(request)
    if (!clientId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const validClientIds = ['melrose', 'bestregard', 'fancy']
    if (!validClientIds.includes(clientId)) {
      return NextResponse.json({ error: 'Invalid clientId' }, { status: 400 })
    }

    // Get analysis payload from request body
    const body = await request.json().catch(() => ({}))
    const payload = body.payload || {}
    const filters = body.filters || {}

    // Generate actions
    const generatedActions = generateActions(payload, filters)

    // Upsert each action with deduplication
    const upsertedActions: ActionItem[] = []

    for (const action of generatedActions) {
      const { report, dedupe_key } = action.source

      if (!report || !dedupe_key) {
        console.warn('Action missing report or dedupe_key, skipping:', action)
        continue
      }

      // Check if action already exists
      const { data: existing } = await (supabase as any)
        .from('action_items')
        .select('*')
        .eq('client_id', clientId)
        .eq('source->>report', report)
        .eq('source->>dedupe_key', dedupe_key)
        .single()

      if (existing) {
        const existingAction = existing as any
        // Update existing action, but preserve user-set status and assignee
        const updateData: any = {
          title: action.title,
          rationale: action.rationale,
          steps: action.steps,
          estimated_impact_usd: action.estimatedImpactUsd || null,
          updated_at: new Date().toISOString(),
        }

        // Only update status if it's still 'open' (user hasn't changed it)
        if (existingAction.status === 'open') {
          updateData.status = 'open'
        }

        // Only update assignee if it's still the default 'GM' (user hasn't changed it)
        if (existingAction.assignee === 'GM' && action.assignee === 'GM') {
          updateData.assignee = 'GM'
        }

        const { data: updated } = await (supabase as any)
          .from('action_items')
          .update(updateData)
          .eq('id', existingAction.id)
          .select()
          .single()

        if (updated) {
          const updatedAction = updated as any
          upsertedActions.push({
            id: updatedAction.id,
            priority: updatedAction.priority,
            title: updatedAction.title,
            rationale: updatedAction.rationale,
            steps: updatedAction.steps,
            estimatedImpactUsd: updatedAction.estimated_impact_usd ? Number(updatedAction.estimated_impact_usd) : undefined,
            assignee: updatedAction.assignee,
            source: updatedAction.source,
          })
        }
      } else {
        // Insert new action
        const { data: inserted, error } = await (supabase as any)
          .from('action_items')
          .insert({
            client_id: clientId,
            status: 'open',
            priority: action.priority,
            assignee: action.assignee,
            title: action.title,
            rationale: action.rationale,
            steps: action.steps,
            estimated_impact_usd: action.estimatedImpactUsd || null,
            source: action.source,
          })
          .select()
          .single()

        if (error) {
          // If unique constraint violation, try to fetch existing
          if (error.code === '23505') {
            const { data: existing2 } = await (supabase as any)
              .from('action_items')
              .select('*')
              .eq('client_id', clientId)
              .eq('source->>report', report)
              .eq('source->>dedupe_key', dedupe_key)
              .single()

            if (existing2) {
              const existing2Action = existing2 as any
              upsertedActions.push({
                id: existing2Action.id,
                priority: existing2Action.priority,
                title: existing2Action.title,
                rationale: existing2Action.rationale,
                steps: existing2Action.steps,
                estimatedImpactUsd: existing2Action.estimated_impact_usd ? Number(existing2Action.estimated_impact_usd) : undefined,
                assignee: existing2Action.assignee,
                source: existing2Action.source,
              })
            }
          } else {
            console.error('Insert error:', error)
          }
        } else if (inserted) {
          const insertedAction = inserted as any
          upsertedActions.push({
            id: insertedAction.id,
            priority: insertedAction.priority,
            title: insertedAction.title,
            rationale: insertedAction.rationale,
            steps: insertedAction.steps,
            estimatedImpactUsd: insertedAction.estimated_impact_usd ? Number(insertedAction.estimated_impact_usd) : undefined,
            assignee: insertedAction.assignee,
            source: insertedAction.source,
          })
        }
      }
    }

    return NextResponse.json({ actions: upsertedActions })
  } catch (error: any) {
    console.error('POST /api/actions error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
