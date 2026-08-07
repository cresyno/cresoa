import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export async function POST(req) {
  try {
    // 1. Authenticate user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request
    const { business_id, name, phone, notes } = await req.json();
    if (!business_id || !name) {
      return NextResponse.json({ error: 'Business ID and name are required' }, { status: 400 });
    }

    // 3. Verify user has access to this business (member or owner)
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
      return NextResponse.json({ error: 'You do not have access to this business' }, { status: 403 });
    }

    // 4. Insert customer using admin client (bypasses RLS)
    const { data: customer, error: insertError } = await supabaseAdmin
      .from('customers')
      .insert({
        business_id,
        name,
        phone: phone || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // 5. Log activity
    await supabaseAdmin.from('business_activity_logs').insert({
      business_id,
      performed_by: user.id,
      action: 'customer_created',
      details: { name }
    });

    return NextResponse.json({ success: true, customer });
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
        }
