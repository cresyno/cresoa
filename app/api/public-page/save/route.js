import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Missing auth' }, { status: 401 });
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await req.json();
    const { business_id, slug, is_enabled, template_id, cover_image_url, description, services, portfolio_images, show_quote_button, show_whatsapp_button } = data;

    if (!business_id || !slug) return NextResponse.json({ error: 'Business ID and slug required' }, { status: 400 });

    // Upsert page
    const { error: dbError } = await supabaseAdmin
      .from('business_public_pages')
      .upsert({
        business_id,
        slug,
        is_enabled,
        template_id,
        cover_image_url: cover_image_url || null,
        description: description || null,
        services: services || [],
        portfolio_images: portfolio_images || [],
        show_quote_button,
        show_whatsapp_button,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'business_id' });

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 400 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
