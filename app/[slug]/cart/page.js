import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import CartClient from './CartClient'

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

export default async function CartPage({ params }) {
  const { slug } = await params
  
  // 1. Get the business page securely
  const { data: page, error: pageError } = await supabaseAdmin
    .from('business_public_pages')
    .select('business_id, is_enabled')
    .eq('slug', slug)
    .maybeSingle()

  if (pageError || !page || !page.is_enabled) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#FAFAF9' }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", color: '#0F2B4A', fontSize: '2rem' }}>Store Unavailable</h1>
        <p style={{ color: '#666' }}>This store is currently not accepting orders.</p>
      </div>
    )
  }

  // 2. Fetch business details for WhatsApp checkout
  const { data: business } = await supabaseAdmin
    .from('businesses')
    .select('id, name, whatsapp, phone')
    .eq('id', page.business_id)
    .single()

  return <CartClient business={business} slug={slug} />
    }
