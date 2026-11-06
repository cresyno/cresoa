import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { getTemplate } from '../../lib/templateRegistry'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// 🚨 KILL CACHING: This forces Next.js to fetch fresh data from Supabase on every visit
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function generateMetadata({ params }) {
  try {
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
      .select('name, sector, description, logo_url, location')
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
  } catch { return {} }
}

export default async function PublicPage({ params }) {
  try {
    const slug = params.slug
    
    // 1. Fetch Page Config (Fresh from DB)
    const { data: page, error: pageError } = await supabaseAdmin
      .from('business_public_pages')
      .select('*')
      .eq('slug', slug)
      .eq('is_enabled', true)
      .maybeSingle()
      
    if (pageError || !page) notFound()

    // 2. Fetch Business
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('id', page.business_id)
      .single()

    // 3. Fetch Products (Inventory)
    const { data: inventoryItems } = await supabaseAdmin
      .from('inventory_items')
      .select('*')
      .eq('business_id', page.business_id)
      .eq('is_listed_on_website', true)

    // 4. Format Products for the Template
    let shop = []
    if (inventoryItems && inventoryItems.length > 0) {
      shop = inventoryItems.map(item => ({
        id: item.id,
        item_name: item.item_name,
        selling_price: String(item.selling_price), 
        description: item.web_description || item.description || '',
        image_url: item.image_url || '',
        is_featured: item.is_featured ?? false, 
        quantity_on_hand: item.quantity_on_hand
      }))
    }

    // 5. Filter for exactly 6 Featured Products
    let featuredProducts = shop.filter(item => item.is_featured === true)
    if (featuredProducts.length === 0 && shop.length > 0) {
      // Fallback: If none are marked featured, just show the first 6
      featuredProducts = shop.slice(0, 6)
    } else {
      featuredProducts = featuredProducts.slice(0, 6)
    }

    // 6. Parse Sector Data (The JSON saved by the Editor)
    let sectorData = {}
    try {
      if (typeof page.sector_data === 'string') {
        sectorData = JSON.parse(page.sector_data)
      } else if (page.sector_data && typeof page.sector_data === 'object') {
        sectorData = page.sector_data
      }
    } catch (e) { sectorData = {} }

    // 7. Extract Arrays safely
    const portfolio = Array.isArray(sectorData.portfolio) ? sectorData.portfolio : []
    const services = Array.isArray(sectorData.services) ? sectorData.services : []
    const testimonials = Array.isArray(sectorData.testimonials) ? sectorData.testimonials : []
    const faqs = Array.isArray(sectorData.faqs) ? sectorData.faqs : []
    const businessHours = sectorData.business_hours || ''
    const freeDelivery = sectorData.free_delivery || false
    const deliveryRates = sectorData.delivery_rates || {}

    // 8. Determine Template (Force Classic Gold for testing if needed)
    // If your DB has 'elegant', change this line to force it: const activeTemplateId = 'classic-gold'
    const activeTemplateId = page.template_id || 'classic-gold'
    const TemplateComponent = getTemplate(activeTemplateId)

    // 9. Construct Props
    const templateProps = {
      business: { 
        name: business?.name || 'Business', 
        logo_url: business?.logo_url || '', 
        phone: business?.phone || '', 
        whatsapp: business?.whatsapp || business?.phone || '', 
        email: business?.email || '', 
        location: business?.location || '' 
      },
      page: { 
        about_text: page.about_text || business?.description || '',
        cover_image_url: page.cover_image_url || '',
        sector_data: { 
          portfolio,
          services,
          testimonials,
          faqs,
          business_hours: businessHours,
          free_delivery: freeDelivery,
          delivery_rates: deliveryRates
        } 
      },
      products: featuredProducts, 
      slug: slug
    }

    // 10. Render
    return <TemplateComponent {...templateProps} />
    
  } catch (error) {
    console.error('Public page error:', error)
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAF9', textAlign: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>This page is unavailable</h1>
          <p style={{ color: '#6B7280' }}>The business page may be temporarily unavailable. Please try again later.</p>
        </div>
      </div>
    )
  }
}
