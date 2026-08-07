import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// ─── GET: Fetch customers ───
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

    // Verify access
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
      return NextResponse.json({ error: 'You do not have access to this business' }, { status: 403 });
    }

    // Fetch customers
    const { data: customers, error: fetchError } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, customers });
  } catch (err) {
    console.error('GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST: Create customer ───
export async function POST(req) {
  try {
    // 1. Authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error('Parse error:', parseError);
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    console.log('📥 API received body:', body);

    const { business_id, first_name, last_name, phone, email, gender, age_category, address, notes, measurements } = body;

    // 3. Validate required fields
    if (!business_id) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }
    if (!first_name || !last_name) {
      return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 });
    }
    if (!phone || phone.length !== 11) {
      return NextResponse.json({ error: 'Phone must be exactly 11 digits' }, { status: 400 });
    }
    if (!gender) {
      return NextResponse.json({ error: 'Gender is required' }, { status: 400 });
    }
    if (!age_category) {
      return NextResponse.json({ error: 'Age category is required' }, { status: 400 });
    }

    // 4. Verify access
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
      console.error('Access denied for user', user.id, 'to business', business_id);
      return NextResponse.json({ error: 'You do not have access to this business' }, { status: 403 });
    }

    // 5. Insert customer
    const insertData = {
      business_id,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      phone: phone.replace(/\D/g, ''),
      email: email || null,
      gender,
      age_category,
      address: address || null,
      notes: notes || null,
      measurements: measurements || {},
    };

    console.log('📤 Inserting:', insertData);

    const { data: customer, error: insertError } = await supabaseAdmin
      .from('customers')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: insertError.message, details: insertError }, { status: 500 });
    }

    console.log('✅ Customer inserted:', customer);

    // 6. Log activity
    await supabaseAdmin.from('business_activity_logs').insert({
      business_id,
      performed_by: user.id,
      action: 'customer_created',
      details: { first_name, last_name }
    });

    return NextResponse.json({ success: true, customer });
  } catch (err) {
    console.error('POST error:', err);
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
  }
        }
