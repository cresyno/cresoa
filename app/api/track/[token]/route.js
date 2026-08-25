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

    // ✅ CRITICAL: Fetch the workflow stages
    const { data: workflowData } = await supabaseAdmin
      .from('business_workflows')
      .select('stage_name')
      .eq('business_id', orderData.business_id)
      .order('stage_order', { ascending: true });

    console.log('API WORKFLOW RAW DATA:', JSON.stringify(workflowData));

    const stages = workflowData?.map(w => w.stage_name) || [];

    // ✅ Return the correct stages (no cache headers as a test!)
    return NextResponse.json({ order: orderData, business: businessData, stages });
  } catch (err) {
    console.error('Track API error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
