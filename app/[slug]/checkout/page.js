import { createClient } from '@supabase/supabase-js'
import CheckoutClient from './CheckoutClient'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    global: {
      fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' })
    }
  }
)

export const dynamic = 'force-dynamic'

export default async function CheckoutPage({ params }) {
  const { slug } = await params
  
  const { data: page, error } = await supabaseAdmin
    .from('business_public_pages')
    .select('*')
    .eq('slug', String(slug).toLowerCase())
    .eq('is_enabled', true)
    .maybeSingle()

  if (error || !page) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center', fontFamily: "'Inter', sans-serif" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: '#111827' }}>This store is currently unavailable</h2>
      </div>
    )
  }

  return <CheckoutClient page={page} slug={slug} />
    }
