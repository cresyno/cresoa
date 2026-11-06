import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { getTemplate } from '../../lib/templateRegistry'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const revalidate = 0 

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
      description: page.description || business?.description || '',
      openGraph: {
        title: business?.name || 'Business',
        description: page.description || business?.description || '',
        images: business?.logo_url ? [business.logo_url] : [],
      },
    }
  } catch { return {} }
}

export default async function PublicPage({ params }) {
  try {
    const slug = params.slug
    
    // 1. Fetch Page Config
    const { data: page } = await supabaseAdmin
      .from('business_public_pages')
      .select('*')
      .eq('slug', slug)
      .eq('is_enabled', true)
      .maybeSingle()
      
    if (!page) notFound()

    // 2. Fetch Business
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('id', page.business_id)
      .single()

    // 3. Fetch Products
    const { data: inventoryItems } = await supabaseAdmin
      .from('inventory_items')
      .select('*')
      .eq('business_id', page.business_id)
      .eq('is_listed_on_website', true)

    // 4. Map Inventory to expected format
    let shop = []
    if (inventoryItems && inventoryItems.length > 0) {
      shop = inventoryItems.map(item => ({
        id: item.id,
        item_name: item.item_name,
        selling_price: String(item.selling_price), 
        description: item.web_description || item.description || '',
        image_url: item.image_url || '',
        is_featured: item.is_featured ?? false, // CRITICAL: This tells the template what to show
        quantity_on_hand: item.quantity_on_hand
      }))
    }

    // 5. Filter Featured Products (Max 6)
    let featuredProducts = shop.filter(item => item.is_featured === true)
    if (featuredProducts.length === 0 && shop.length > 0) {
      featuredProducts = shop.slice(0, 6)
    } else {
      featuredProducts = featuredProducts.slice(0, 6)
    }

    // 6. Parse Portfolio (Safely)
    let portfolio = []
    try {
      const raw = page.portfolio_images || page.sector_data?.portfolio || []
      portfolio = Array.isArray(raw) ? raw : (typeof raw === 'string' ? JSON.parse(raw) : [])
      if (!Array.isArray(portfolio)) portfolio = []
      portfolio = portfolio.map(item => {
        if (typeof item === 'string') return { url: item, description: '', title: '' }
        return { url: item.url || '', description: item.description || '', title: item.title || '' }
      }).filter(item => item.url && item.url.includes('http'))
    } catch { portfolio = [] }

    // 7. Parse Services (Safely)
    let services = []
    try { 
      services = page.services || page.sector_data?.services || []; 
      if (!Array.isArray(services)) services = typeof services === 'string' ? JSON.parse(services) : []
    } catch { services = [] }

    // 8. Determine Template (Fallback to classic-gold)
    const activeTemplateId = page.template_id || 'classic-gold'
    const TemplateComponent = getTemplate(activeTemplateId)

    // 9. Construct Props for Template
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
        ...page,
        about_text: page.about_text || page.about || business?.description || '',
        cover_image_url: page.cover_image_url || '',
        sector_data: { 
          ...(page.sector_data || {}),
          portfolio: portfolio,
          services: services,
          testimonials: page.sector_data?.testimonials || [],
          faqs: page.sector_data?.faqs || [],
          business_hours: page.sector_data?.business_hours || '',
          delivery_rates: page.sector_data?.delivery_rates || {},
          free_delivery: page.sector_data?.free_delivery || false
        } 
      },
      products: featuredProducts, 
      slug: slug
    }

    // 10. Render the Dynamic Template
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
