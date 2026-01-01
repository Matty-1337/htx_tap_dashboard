/**
 * Supabase server-side client (service role)
 * Only use this in API routes, never expose to client
 */

import { createClient } from '@supabase/supabase-js'

let supabaseClient: ReturnType<typeof createClient> | null = null

function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  }

  supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return supabaseClient
}

// Export lazy-initialized client
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    return getSupabaseClient()[prop as keyof ReturnType<typeof createClient>]
  },
})
