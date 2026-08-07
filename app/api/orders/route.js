import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { getPlanLimits } from '../../../lib/planLimits';

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
      customer_name,
      customer_phone,
      customer_email,
    } = await req.json();

    if (!business_id || !title || price === undefined) {
      return NextResponse.json({ error: 'Business ID, title, and price are required' }, { status: 400 });
    }

    // ─── Verify user has access to this business ───
    const { data: membership } = await supabaseAdmin
      .from('business_memberships')
      .select('id')
      .eq('business_id', business_id)
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('owner_id, plan')
      .eq('id', business_id)
      .single();

    if (!membership && business?.owner_id !== user.id) {
      return NextResponse.json({ error: 'You do not have access to this business' }, { status: 403 });
    }

    // ─── Plan limit check ───
    const limits = getPlanLimits(business?.plan || 'free');
    const { count: currentOrders } = await supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business_id);

    if (currentOrders >= limits.orders) {
      return NextResponse.json({
        error: `You have reached the limit of ${limits.orders} orders on your current plan. Please upgrade to add more.`
      }, { status: 403 });
    }

    // ─── Handle customer ───
    let finalCustomerId = customer_id;

    // If a new customer is being created (customer_name provided but no customer_id)
    if (!customer_id && customer_name) {
      const { data: existingCustomer } = await supabaseAdmin
        .from('customers')
        .select('id')
        .eq('business_id', business_id)
        .eq('name', customer_name)
        .maybeSingle();

      if (existingCustomer) {
        finalCustomerId = existingCustomer.id;
      } else {
        const { data: newCustomer, error: customerError } = await supabaseAdmin
          .from('customers')
          .insert({
            business_id,
            name: customer_name,
            phone: customer_phone || null,
            email: customer_email || null,
          })
          .select()
          .single();

        if (customerError) throw customerError;
        finalCustomerId = newCustomer.id;
      }
    }

    // ─── Insert order ───
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
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // ─── Log activity ───
    await supabaseAdmin.from('business_activity_logs').insert({
      business_id,
      performed_by: user.id,
      action: 'order_created',
      details: { title, customer: customer_name || 'Unknown' }
    });

    return NextResponse.json({ success: true, order });
  } catch (err) {
    console.error('POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
                               }
