import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

// ─── GET: Fetch group with members ───
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

    // ─── Fetch group to get business_id ───
    const { data: group, error: fetchError } = await supabaseAdmin
      .from('group_orders')
      .select('*, coordinator:coordinator_customer_id(name, phone)')
      .eq('id', id)
      .single();

    if (fetchError || !group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // ─── Verify access ───
    const { data: membership } = await supabaseAdmin
      .from('business_memberships')
      .select('id')
      .eq('business_id', group.business_id)
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('owner_id')
      .eq('id', group.business_id)
      .single();

    if (!membership && business?.owner_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // ─── Fetch members (orders in this group) ───
    const { data: members, error: membersError } = await supabaseAdmin
      .from('orders')
      .select('*, customer:customer_id(name, phone)')
      .eq('group_order_id', id)
      .eq('business_id', group.business_id)
      .order('created_at', { ascending: false });

    if (membersError) {
      console.error('Members fetch error:', membersError);
    }

    return NextResponse.json({
      success: true,
      group,
      members: members || []
    });
  } catch (err) {
    console.error('GET group error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── PATCH: Update group (already exists) ───
// ─── DELETE: Remove group (already exists) ───
