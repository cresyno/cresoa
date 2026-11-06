// lib/serverSupabase.js
import { createClient } from '@supabase/supabase-js'
import { normalizePage } from './publicPageData'

export function createServerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )
}

export async function getPublicPage(slug) {
  if (!slug) return null
  const sb = createServerSupabase()
  const { data } = await sb
    .from('business_public_pages')
    .select('*')
    .eq('slug', String(slug).trim().toLowerCase())
    .maybeSingle()
  if (!data || !data.is_enabled) return null
  return normalizePage(data)
}
