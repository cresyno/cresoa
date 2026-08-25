import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  const { token } = params;

  if (!token) {
    return NextResponse.json({ error: 'Invalid tracking token' }, { status: 400 });
  }

  try {
    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*, customers(name, phone, email)')
      .eq('tracking_token', token)
      .single();

    if (orderError || !orderData) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const { data: businessData } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('id', orderData.business_id)
      .single();

    const { data: workflowData } = await supabaseAdmin
      .from('business_workflows')
      .select('stage_name')
      .eq('business_id', orderData.business_id)
      .order('stage_order', { ascending: true });

    const stages = workflowData?.map(w => w.stage_name) || [];

    return NextResponse.json({ order: orderData, business: businessData, stages }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    });
  } catch (err) {
    console.error('Track API error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
