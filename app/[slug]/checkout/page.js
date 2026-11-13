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
  
  // 1. Securely fetch store data on the server
  const { data: page, error } = await supabaseAdmin
    .from('business_public_pages')
    .select('*')
    .eq('slug', String(slug).toLowerCase())
    .eq('is_enabled', true)
    .maybeSingle()

  // 2. Handle if the store doesn't exist or is disabled
  if (error || !page) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center', fontFamily: "'Inter', sans-serif" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: '#111827' }}>This store is currently unavailable</h2>
        <p style={{ color: '#6B7280' }}>The store owner may have paused operations or removed the page.</p>
      </div>
    )
  }

  // 3. Pass the secure data to the Client Component
  return <CheckoutClient page={page} slug={slug} />
      }
