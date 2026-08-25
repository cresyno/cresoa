import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    // 🔍 DEBUG: Fetch the RAW workflow data directly
    const { data: rawWorkflowData, error: wfError } = await supabaseAdmin
      .from('business_workflows')
      .select('*')
      .eq('business_id', orderData.business_id)
      .order('stage_order', { ascending: true });

    console.log('RAW WORKFLOW DATA:', JSON.stringify(rawWorkflowData));
    console.log('WORKFLOW ERROR:', wfError ? JSON.stringify(wfError) : 'none');

    // Convert to array of stage names
    const databaseStages = rawWorkflowData?.map(w => w.stage_name) || [];

    // Default fallback (only used if databaseStages is empty)
    const fallbackStages = ['Order Placed', 'Cutting', 'Sewing', 'Ready for Pickup', 'Delivered'];

    // Final stages = databaseStages if not empty, else fallback
    const stages = databaseStages.length > 0 ? databaseStages : fallbackStages;

    // ⚠️ NEW DEBUG FIELD
    return NextResponse.json({
      debugVersion: 'v3',
      order: orderData,
      business: businessData,
      databaseStages,   // What the database actually returned
      stages,           // What the tracking page will display
    });
  } catch (err) {
    console.error('Track API error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
