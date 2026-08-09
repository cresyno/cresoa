// app/api/orders/route.js
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
      customer_name,
      customer_phone,
      customer_email,
      title,
      price,
      amount_paid,
      due_date,
      current_status,
      notes,
      // ─── NEW FIELDS ───
      category,
      quantity,
      fabric,
      fitting_date,
      event_date,
      measurements,
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

    // ─── Handle customer creation if new customer is being added ───
    let finalCustomerId = customer_id || null;
    
    if (!customer_id && customer_name) {
      // Create new customer inline
      const { data: newCustomer, error: custError } = await supabaseAdmin
        .from('customers')
        .insert({
          business_id,
          name: customer_name,
          phone: customer_phone || null,
          email: customer_email || null,
        })
        .select()
        .single();

      if (custError) {
        console.error('Customer creation error:', custError);
        return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
      }
      
      finalCustomerId = newCustomer.id;
    }

    // ─── Insert order (with new fields) ───
    const { data: order, error: insertError } = await supabaseAdmin
      .from('orders')
      .insert({
        business_id,
        customer_id: finalCustomerId,
        title,
        price: parseFloat(price) || 0,
        amount_paid: parseFloat(amount_paid) || 0,
        due_date: due_date || null,
        current_status: current_status || 'Order placed',
        notes: notes || null,
        // ─── NEW FIELDS ───
        category: category || null,
        quantity: parseInt(quantity) || 1,
        fabric: fabric || null,
        fitting_date: fitting_date || null,
        event_date: event_date || null,
        measurements: measurements || null,
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
      details: { title, order_id: order.id }
    });

    return NextResponse.json({ success: true, order });
  } catch (err) {
    console.error('POST order error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
      }
