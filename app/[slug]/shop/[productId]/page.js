
export async function generateStaticParams() {
  return [{ slug: "default", id: "default" }];
}
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import ProductClient from './ProductClient'

// ✅ Server-side admin client bypasses RLS and cache
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

export default async function ProductPage({ params }) {
  const { slug, productId } = await params
  
  // 1. Get the business page
  const { data: page } = await supabaseAdmin
    .from('business_public_pages')
    .select('*')
    .eq('slug', slug)
    .eq('is_enabled', true)
    .maybeSingle()

  if (!page) notFound()

  // 2. Fetch the exact product
  const { data: product, error } = await supabaseAdmin
    .from('inventory_items')
    .select('*')
    .eq('id', productId)
    .eq('business_id', page.business_id)
    .eq('is_listed_on_website', true)
    .maybeSingle()

  if (error || !product) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#FAFAF9' }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", color: '#0F2B4A', fontSize: '2rem' }}>Piece Unavailable</h1>
        <p style={{ color: '#666', marginBottom: '20px' }}>This item may have been sold out or removed.</p>
        <a href={`/${slug}/shop`} style={{ color: '#D4AF37', textDecoration: 'underline', fontWeight: 600 }}>Return to Collection</a>
      </div>
    )
  }

  // 3. Get business info
  const { data: business } = await supabaseAdmin
    .from('businesses')
    .select('name, whatsapp, phone')
    .eq('id', page.business_id)
    .single()

  return <ProductClient product={product} business={business} slug={slug} />
    }
