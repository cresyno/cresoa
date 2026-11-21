
export async function generateStaticParams() {
  return [{ slug: "default" }];
}
import { createClient } from '@supabase/supabase-js'
import CartClient from './CartClient'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) }
  }
)

export const dynamic = 'force-dynamic'

export default async function CartPage({ params }) {
  const { slug } = await params
  
  const { data: page, error } = await supabaseAdmin
    .from('business_public_pages')
    .select('slug')
    .eq('slug', String(slug).toLowerCase())
    .eq('is_enabled', true)
    .maybeSingle()

  if (error || !page) {
    return <div style={{ padding: '80px', textAlign: 'center' }}><h2>Store unavailable</h2></div>
  }

  return <CartClient slug={slug} />
    }
