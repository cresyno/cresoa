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

// Maps a business_products row to the shape ShopPageClient already expects
function toShopItem(p) {
  return {
    id: p.id,
    name: p.name,
    price: p.price,
    description: p.description || '',
    image_url: p.image_url || '',
    featured: !!p.featured,
    stock: p.stock ?? 0,
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

  // Live source of truth: products explicitly checked "List on website"
  // and currently active. This replaces the old shop_products JSON blob.
  let shop = []
  const { data: allProducts, error: productsError } = await supabaseAdmin
    .from('business_products')
    .select('*')
    .eq('business_id', page.business_id)
    .order('created_at', { ascending: false })

  if (!productsError && allProducts && allProducts.length > 0) {
    // This business has migrated to the new Products system — trust it
    // completely, even if the result is an empty storefront right now.
    shop = allProducts
      .filter((p) => p.on_website && p.active)
      .map(toShopItem)
  } else if (!productsError) {
    // Safety net: only for a business with ZERO rows in business_products —
    // i.e. one that has never opened the new Products dashboard at all.
    const legacyShop = Array.isArray(page.shop_products) ? page.shop_products : []
    shop = legacyShop
  }

  return (
    <ShopPageClient
      business={{
        name: business?.name || 'Business',
        logo_url: business?.logo_url || '',
        phone: business?.phone || '',
        email: business?.email || '',
        location: business?.location || '',
      }}
      page={{
        ...page,
        business_id: page.business_id,
        slug: page.slug,
        has_shop: page.has_shop,
      }}
      shop={shop}
    />
  )
        }
