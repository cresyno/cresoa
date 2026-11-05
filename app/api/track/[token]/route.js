import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req, { params }) {
  const { token } = params;

  if (!token || !UUID.test(token)) {
    return NextResponse.json({ error: 'Invalid tracking token' }, { status: 400 });
  }

  try {
    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, business_id, title, current_status, due_date, price, amount_paid, updated_at, customers(name)')
      .eq('tracking_token', token)
      .single();

    if (orderError || !orderData) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const { business_id, ...order } = orderData;

    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('name, phone, whatsapp, location, sector, tracking_primary_color, tracking_bg_color, tracking_logo_url, tracking_welcome_message, tracking_footer_message')
      .eq('id', business_id)
      .single();

    const { data: workflow } = await supabaseAdmin
      .from('business_workflows')
      .select('stage_name')
      .eq('business_id', business_id)
      .order('stage_order', { ascending: true });

    const databaseStages = (workflow || []).map((w) => w.stage_name);
    const fallbackStages = ['Order Placed', 'Cutting', 'Sewing', 'Ready for Pickup', 'Delivered'];
    const stages = databaseStages.length > 0 ? databaseStages : fallbackStages;

    return NextResponse.json(
      { order, business, stages },
      { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } }
    );
  } catch (err) {
    console.error('Track API error');
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
