import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req) {
  try {
    // 1. Check user is actually logged in and get their user ID
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { business_id, item_name, sku, category, quantity_on_hand, reorder_level, unit_cost, selling_price } = await req.json();

    if (!business_id || !item_name || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 2. 🔒 STRICT VERIFICATION: Ensure the logged-in user actually belongs to this business
    const { data: membership, error: memberError } = await supabase
      .from('business_memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('business_id', business_id)
      .maybeSingle();

    if (memberError || !membership) {
      return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 });
    }

    // 3. Insert using the standard client (automatically honors RLS)
    const { data, error } = await supabase
      .from('inventory_items')
      .insert({
        business_id,
        item_name,
        sku,
        category,
        quantity_on_hand,
        reorder_level,
        unit_cost,
        selling_price
      })
      .select()
      .single();

    if (error) {
      console.error('Inventory insert error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ item: data });
  } catch (error) {
    console.error('Inventory API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
