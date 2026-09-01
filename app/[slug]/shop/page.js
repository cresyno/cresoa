import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import ShopPageClient from '../../../components/public-page/ShopPageClient'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const revalidate = 60

export async function generateMetadata({ params }) {
  const slug = params.slug
  const { data: page } = await supabaseAdmin
    .from('business_public_pages')
    .select('*')
    .eq('slug', slug)
    .eq('is_enabled', true)
    .maybeSingle()
  if (!page) return {}
  const { data: business } = await supabaseAdmin
    .from('businesses')
    .select('name')
    .eq('id', page.business_id)
    .single()
  return {
    title: `${business?.name || 'Business'} - Shop`,
    description: page.description || '',
  }
}

export default async function ShopPage({ params }) {
  const slug = params.slug
  const { data: page } = await supabaseAdmin
    .from('business_public_pages')
    .select('*')
    .eq('slug', slug)
    .eq('is_enabled', true)
    .maybeSingle()

  if (!page) notFound()

  const { data: business } = await supabaseAdmin
    .from('businesses')
    .select('*')
    .eq('id', page.business_id)
    .single()

  let shop = []
  try {
    shop = page.shop_products || []
    if (!Array.isArray(shop)) shop = []
  } catch {
    shop = []
  }

  return (
    <ShopPageClient
      business={{
        name: business.name,
        logo_url: business.logo_url,
        phone: business.phone,
        email: business.email,
        location: business.location,
      }}
      page={page}
      shop={shop}
    />
  )
        }
