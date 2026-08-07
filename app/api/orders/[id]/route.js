import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

// ─── PATCH: Update order ───
export async function PATCH(req, { params }) {
  try {
    const { id } = params;
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { customer_id, title, price, amount_paid, due_date, current_status, notes } = body;

    if (!title || price === undefined) {
      return NextResponse.json({ error: 'Title and price are required' }, { status: 400 });
    }

    // ─── Fetch order to get business_id ───
    const { data: order, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('business_id')
      .eq('id', id)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // ─── Verify access ───
    const { data: membership } = await supabaseAdmin
      .from('business_memberships')
      .select('id')
      .eq('business_id', order.business_id)
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('owner_id')
      .eq('id', order.business_id)
      .single();

    if (!membership && business?.owner_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // ─── Update order ───
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        customer_id: customer_id || null,
        title,
        price: parseFloat(price) || 0,
        amount_paid: parseFloat(amount_paid) || 0,
        due_date: due_date || null,
        current_status: current_status || 'Order placed',
        notes: notes || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // ─── Log activity ───
    await supabaseAdmin.from('business_activity_logs').insert({
      business_id: order.business_id,
      performed_by: user.id,
      action: 'order_updated',
      details: { id, title }
    });

    return NextResponse.json({ success: true, order: updated });
  } catch (err) {
    console.error('PATCH error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── DELETE: Remove order ───
export async function DELETE(req, { params }) {
  try {
    const { id } = params;
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ─── Fetch order to get business_id ───
    const { data: order, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('business_id')
      .eq('id', id)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // ─── Verify access ───
    const { data: membership } = await supabaseAdmin
      .from('business_memberships')
      .select('id')
      .eq('business_id', order.business_id)
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('owner_id')
      .eq('id', order.business_id)
      .single();

    if (!membership && business?.owner_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // ─── Delete order ───
    const { error: deleteError } = await supabaseAdmin
      .from('orders')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    // ─── Log activity ───
    await supabaseAdmin.from('business_activity_logs').insert({
      business_id: order.business_id,
      performed_by: user.id,
      action: 'order_deleted',
      details: { id }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
