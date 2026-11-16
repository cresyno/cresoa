import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

// ─── GET: Fetch single order details ───
export async function GET(req, { params }) {
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

    // 1. Fetch the order
    const { data: order, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        customers:customer_id (
          id, name, first_name, last_name, phone, email, measurements
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 2. Verify access
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

    // 3. Fetch payment records for this order
    const { data: payments } = await supabaseAdmin
      .from('payment_records')
      .select('*')
      .eq('order_id', id)
      .order('created_at', { ascending: false });

    // 4. Handle Online Orders (Guest Checkout) gracefully
    // If there is no linked customer, create a fallback customer object for the UI
    let customerData = order.customers;
    if (!customerData) {
      customerData = {
        id: null,
        name: order.customer_name || 'Online Guest',
        phone: order.customer_phone || null,
        email: order.customer_email || null,
        measurements: {}
      };
    }

    return NextResponse.json({ 
      success: true, 
      order: { ...order, customers: customerData },
      payments: payments || []
    });

  } catch (err) {
    console.error('GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

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
    const updateData = {};
    
    if (body.customer_id !== undefined) updateData.customer_id = body.customer_id || null;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.price !== undefined) updateData.price = parseFloat(body.price) || 0;
    if (body.amount_paid !== undefined) updateData.amount_paid = parseFloat(body.amount_paid) || 0;
    if (body.due_date !== undefined) updateData.due_date = body.due_date || null;
    if (body.current_status !== undefined) updateData.current_status = body.current_status;
    if (body.notes !== undefined) updateData.notes = body.notes || null;

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
