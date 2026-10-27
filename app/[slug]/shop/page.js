import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import ShopPageClient from '../../../components/public-page/ShopPageClient'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const revalidate = 0 // Set to 0 for immediate updates during dev

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

// Maps an inventory_items row to the shape ShopPageClient expects
function toShopItem(item) {
  return {
    id: item.id,
    name: item.item_name,
    price: item.selling_price,
    description: item.web_description || item.description || '',
    image_url: item.image_url || '',
    featured: !!item.featured_on_website,
    stock: item.quantity_on_hand ?? 0,
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

  // ✅ Live source of truth: inventory_items
  let shop = []
  
  const { data: inventoryItems, error: inventoryError } = await supabaseAdmin
    .from('inventory_items')
    .select('*')
    .eq('business_id', page.business_id)
    .eq('is_listed_on_website', true) // Only fetch items toggled for the website
    .order('created_at', { ascending: false })

  if (!inventoryError && inventoryItems && inventoryItems.length > 0) {
    // We have items from the new inventory system
    shop = inventoryItems.map(toShopItem)
  } else if (!inventoryError) {
    // Safety net: If they have zero items in inventory marked for website,
    // fallback to the legacy JSON so the shop doesn't completely break.
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
