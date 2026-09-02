import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await req.json()
    const {
      business_id,
      slug,
      is_enabled,
      template_id,
      cover_image_url,
      description,
      about,
      why_us,
      services,
      shop_products,
      portfolio_images,
      show_quote_button,
      show_whatsapp_button,
      has_services,
      has_shop,
      hero_font,
      hero_layout,
      header_order,
      header_sidebar,
      footer_text,
    } = data

    if (!business_id || !slug) {
      return NextResponse.json({ error: 'Business ID and slug required' }, { status: 400 })
    }

    // Upsert page with all new fields
    const { error: dbError } = await supabaseAdmin
      .from('business_public_pages')
      .upsert({
        business_id,
        slug,
        is_enabled,
        template_id,
        cover_image_url: cover_image_url || null,
        description: description || null,
        about: about || null,
        why_us: why_us || [],
        services: services || [],
        shop_products: shop_products || [],
        portfolio_images: portfolio_images || [],
        show_quote_button,
        show_whatsapp_button,
        has_services,
        has_shop,
        hero_font: hero_font || 'Inter',
        hero_layout: hero_layout || 'center',
        header_order: header_order || ['Home', 'About', 'Services', 'Shop', 'Work', 'Contact'],
        header_sidebar: header_sidebar || false,
        footer_text: footer_text || '',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'business_id' })

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
