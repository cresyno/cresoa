import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

// ─── PATCH: Update order (Supports Partial Updates) ───
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

    // ─── Build dynamic update object ───
    // Only update fields that are actually sent in the request body.
    const updateData = {};
    
    if (body.customer_id !== undefined) updateData.customer_id = body.customer_id || null;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.price !== undefined) updateData.price = parseFloat(body.price) || 0;
    if (body.amount_paid !== undefined) updateData.amount_paid = parseFloat(body.amount_paid) || 0;
    if (body.due_date !== undefined) updateData.due_date = body.due_date || null;
    if (body.current_status !== undefined) updateData.current_status = body.current_status;
    if (body.notes !== undefined) updateData.notes = body.notes || null;

    // If no fields were provided to update, return early
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided for update' }, { status: 400 });
    }

    // ─── Update order ───
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // ─── Log activity ───
    // Using updateData.title if it was updated, otherwise fetch from the updated object
    await supabaseAdmin.from('business_activity_logs').insert({
      business_id: order.business_id,
      performed_by: user.id,
      action: 'order_updated',
      details: { id, title: updated.title }
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
