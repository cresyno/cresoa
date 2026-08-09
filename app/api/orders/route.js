import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export async function GET(req) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const businessId = url.searchParams.get('business_id');
    if (!businessId) {
      return NextResponse.json({ error: 'business_id is required' }, { status: 400 });
    }

    // ─── Verify access ───
    const { data: membership } = await supabaseAdmin
      .from('business_memberships')
      .select('id')
      .eq('business_id', businessId)
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('owner_id')
      .eq('id', businessId)
      .single();

    if (!membership && business?.owner_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // ─── Fetch orders with customer details ───
    const { data: orders, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        customers (id, name, phone)
      `)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, orders: orders || [] });
  } catch (err) {
    console.error('Orders API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST: Create order ───
export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      business_id,
      customer_id,
      title,
      price,
      amount_paid,
      due_date,
      current_status,
      notes,
    } = await req.json();

    if (!business_id || !title || price === undefined) {
      return NextResponse.json({ error: 'Business ID, title, and price are required' }, { status: 400 });
    }

    // Verify access
    const { data: membership } = await supabaseAdmin
      .from('business_memberships')
      .select('id')
      .eq('business_id', business_id)
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('owner_id')
      .eq('id', business_id)
      .single();

    if (!membership && business?.owner_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Insert order
    const { data: order, error: insertError } = await supabaseAdmin
      .from('orders')
      .insert({
        business_id,
        customer_id: customer_id || null,
        title,
        price: parseFloat(price) || 0,
        amount_paid: parseFloat(amount_paid) || 0,
        due_date: due_date || null,
        current_status: current_status || 'Order placed',
        notes: notes || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Log activity
    await supabaseAdmin.from('business_activity_logs').insert({
      business_id,
      performed_by: user.id,
      action: 'order_created',
      details: { title }
    });

    return NextResponse.json({ success: true, order });
  } catch (err) {
    console.error('POST order error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
