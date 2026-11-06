// app/[slug]/page.js
import { notFound } from 'next/navigation'
import { getPublicPage, createServerSupabase } from '@/lib/serverSupabase'
import { getTemplate } from '../../lib/templateRegistry'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function generateMetadata({ params }) {
  const { slug } = await params
  const page = await getPublicPage(slug)
  if (!page) return {}
  const sb = createServerSupabase()
  const { data: business } = await sb
    .from('businesses')
    .select('name, sector, description, logo_url')
    .eq('id', page.business_id)
    .single()
  return {
    title: `${business?.name || 'Business'} - ${business?.sector || 'Services'}`,
    description: page.about_text || business?.description || '',
    openGraph: {
      title: business?.name || 'Business',
      description: page.about_text || business?.description || '',
      images: business?.logo_url ? [business.logo_url] : [],
    },
  }
}

export default async function PublicPage({ params }) {
  const { slug } = await params
  const page = await getPublicPage(slug)
  if (!page) notFound()

  const sb = createServerSupabase()
  const [{ data: business }, { data: inventoryItems }] = await Promise.all([
    sb.from('businesses').select('*').eq('id', page.business_id).single(),
    sb.from('inventory_items').select('*')
      .eq('business_id', page.business_id)
      .eq('is_listed_on_website', true),
  ])

  const shop = (inventoryItems || []).map((item) => ({
    id: item.id,
    item_name: item.item_name,
    selling_price: String(item.selling_price),
    description: item.web_description || item.description || '',
    image_url: item.image_url || '',
    is_featured: item.is_featured ?? false,
    quantity_on_hand: item.quantity_on_hand,
  }))

  let featured = shop.filter((p) => p.is_featured)
  if (featured.length === 0) featured = shop
  featured = featured.slice(0, 6)

  const TemplateComponent = getTemplate(page.template_id || 'classic-gold')

  return (
    <TemplateComponent
      business={{
        name: business?.name || 'Business',
        logo_url: business?.logo_url || '',
        phone: business?.phone || '',
        whatsapp: business?.whatsapp || business?.phone || '',
        email: business?.email || '',
        location: business?.location || '',
      }}
      page={{
        about_text: page.about_text || business?.description || '',
        cover_image_url: page.cover_image_url || '',
        sector_data: page.sector_data, // already normalized
      }}
      products={featured}
      slug={slug}
    />
  )
        }
