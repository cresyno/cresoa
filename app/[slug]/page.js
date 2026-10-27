import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import PublicPageWrapper from '../../components/public-page/PublicPageWrapper'

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

    const { data: reviews } = await supabaseAdmin
      .from('public_reviews')
      .select('*')
      .eq('business_id', page.business_id)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })

    // ✅ 1. Fetch inventory items that are listed on the website
    const { data: inventoryItems } = await supabaseAdmin
      .from('inventory_items')
      .select('*')
      .eq('business_id', page.business_id)
      .eq('is_listed_on_website', true)

    // ✅ 2. Map inventory OR fallback to old JSON if inventory is empty
    let shop = []
    if (inventoryItems && inventoryItems.length > 0) {
      shop = inventoryItems.map(item => ({
        id: item.id,
        name: item.item_name,
        price: String(item.selling_price), // Ensure it's a string
        description: item.web_description || item.description || '',
        image_url: item.image_url || '',
        // If your template filters by featured, ensure this is true if they marked it
        featured: item.featured_on_website ?? false 
      }))
    } else {
      // FALLBACK: If no new inventory items are toggled, show the old JSON data 
      // so the website doesn't look blank while you migrate.
      try { 
        shop = page.shop_products || []; 
        if (!Array.isArray(shop)) shop = []; 
      } catch { shop = [] }
    }

    // Robust portfolio parsing
    let portfolio = []
    try {
      const raw = page.portfolio_images || []
      portfolio = Array.isArray(raw) ? raw : (typeof raw === 'string' ? JSON.parse(raw) : [])
      if (!Array.isArray(portfolio)) portfolio = []
      portfolio = portfolio.map(item => {
        if (typeof item === 'string') return { url: item, description: '' }
        if (item && typeof item === 'object' && !item.url) {
          const keys = Object.keys(item).filter(k => /^\d+$/.test(k))
          if (keys.length) {
            const url = keys.sort((a, b) => parseInt(a) - parseInt(b)).map(k => item[k]).join('')
            return { url, description: item.description || '' }
          }
        }
        return { url: item.url || '', description: item.description || '' }
      }).filter(item => item.url && item.url.includes('http'))
    } catch { portfolio = [] }

    let services = []
    try { 
      services = page.services || []; 
      if (!Array.isArray(services)) {
         services = typeof services === 'string' ? JSON.parse(services) : []
      } 
    } catch { services = [] }

    const about = page.about_text || page.about || business?.description || ''

    return (
      <PublicPageWrapper
        business={{
          name: business?.name || 'Business',
          logo_url: business?.logo_url || '',
          phone: business?.phone || '',
          whatsapp: business?.whatsapp || business?.phone || '',
          email: business?.email || '',
          location: business?.location || '',
          business_type: business?.business_type || business?.sector || '', 
          facebook: business?.facebook || '',
          instagram: business?.instagram || '',
          tiktok: business?.tiktok || '',
          youtube: business?.youtube || '',
          linkedin: business?.linkedin || '',
          google_business: business?.google_business || '',
        }}
        page={{
          ...page,
          about,
          description: page.description || business?.description || '',
          business_id: page.business_id,
          slug: page.slug,
          has_shop: true, // Force true so the shop renders
          has_services: page.has_services,
          show_quote_button: page.show_quote_button,
          show_whatsapp_button: page.show_whatsapp_button,
          hero_font: page.hero_font || 'Inter',
          hero_layout: page.hero_layout || 'center',
          header_order: page.header_order || ['Home', 'About', 'Services', 'Shop', 'Work', 'Contact'],
          header_sidebar: page.header_sidebar || false,
          footer_text: page.footer_text || '',
          sector_sections: page.sector_sections || [],
          color_primary: page.color_primary || '#0F2B4A',
          color_secondary: page.color_secondary || '#D4A52A',
          color_accent: page.color_accent || '#D4A52A',
          font_heading: page.font_heading || 'Inter',
          font_body: page.font_body || 'Inter',
          cta_label: page.cta_label || '',
          cta_type: page.cta_type || '',
        }}
        services={services}
        shop={shop} // ✅ Passes either new inventory items OR old fallback
        portfolio={portfolio}
        reviews={reviews || []}
        templateId={page.template_id || 'elegant'}
      />
    )
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
