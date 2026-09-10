import { createClient } from '@supabase/supabase-js'

export function getSupabaseStorageAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const key = serviceRole || anonKey

  if (!url || !key) {
    throw new Error('Supabase storage is not configured')
  }

  return {
    client: createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    usingServiceRole: Boolean(serviceRole),
  }
}
