import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabaseClient';
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin';

export async function POST(req, { params }) {
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

    const { amount, note } = await req.json();
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
    }

    // ─── Verify order exists and get business_id ───
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('business_id, amount_paid, price')
      .eq('id', id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // ─── Verify user has access ───
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

    // ─── Check if amount exceeds balance ───
    const balance = (order.price || 0) - (order.amount_paid || 0);
    if (amount > balance) {
      return NextResponse.json({ error: `Amount exceeds balance (₦${balance.toLocaleString()})` }, { status: 400 });
    }

    // ─── Insert payment record using admin client ───
    const { data: payment, error: insertError } = await supabaseAdmin
      .from('payment_records')
      .insert({
        order_id: id,
        amount: amount,
        note: note || 'Payment recorded from order detail',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // ─── Update order amount_paid ───
    const newTotal = (order.amount_paid || 0) + amount;
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ amount_paid: newTotal })
      .eq('id', id);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // ─── Log activity ───
    await supabaseAdmin.from('business_activity_logs').insert({
      business_id: order.business_id,
      performed_by: user.id,
      action: 'payment_recorded',
      details: { order_id: id, amount }
    });

    return NextResponse.json({ success: true, payment, new_balance: balance - amount });
  } catch (err) {
    console.error('Payment API error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
                               }
