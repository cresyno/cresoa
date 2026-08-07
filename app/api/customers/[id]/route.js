import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

// ─── PATCH: Update customer ───
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
    const { first_name, last_name, phone, email, gender, age_category, address, notes, measurements } = body;

    // Validate required fields
    if (!first_name || !last_name || !phone || !gender || !age_category) {
      return NextResponse.json({ error: 'All required fields must be filled' }, { status: 400 });
    }
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length !== 11) {
      return NextResponse.json({ error: 'Phone must be exactly 11 digits' }, { status: 400 });
    }

    // ─── Fetch the customer to get business_id ───
    const { data: customer, error: fetchError } = await supabaseAdmin
      .from('customers')
      .select('business_id')
      .eq('id', id)
      .single();

    if (fetchError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // ─── Verify access: user must be owner or member of the business ───
    // Check if user is the owner
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('owner_id')
      .eq('id', customer.business_id)
      .single();

    const isOwner = business?.owner_id === user.id;

    // Check if user is a member
    const { data: membership } = await supabaseAdmin
      .from('business_memberships')
      .select('id')
      .eq('business_id', customer.business_id)
      .eq('user_id', user.id)
      .maybeSingle();

    const isMember = !!membership;

    if (!isOwner && !isMember) {
      console.error('Access denied for user', user.id, 'to business', customer.business_id);
      return NextResponse.json({ error: 'You do not have access to this business' }, { status: 403 });
    }

    // ─── Update customer ───
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('customers')
      .update({
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        phone: phoneDigits,
        email: email || null,
        gender,
        age_category,
        address: address || null,
        notes: notes || null,
        measurements: measurements || {},
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // ─── Log activity ───
    await supabaseAdmin.from('business_activity_logs').insert({
      business_id: customer.business_id,
      performed_by: user.id,
      action: 'customer_updated',
      details: { first_name, last_name }
    });

    return NextResponse.json({ success: true, customer: updated });
  } catch (err) {
    console.error('PATCH error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

// ─── DELETE: Remove customer ───
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

    // ─── Fetch the customer to get business_id ───
    const { data: customer, error: fetchError } = await supabaseAdmin
      .from('customers')
      .select('business_id')
      .eq('id', id)
      .single();

    if (fetchError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // ─── Verify access: user must be owner or member of the business ───
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('owner_id')
      .eq('id', customer.business_id)
      .single();

    const isOwner = business?.owner_id === user.id;

    const { data: membership } = await supabaseAdmin
      .from('business_memberships')
      .select('id')
      .eq('business_id', customer.business_id)
      .eq('user_id', user.id)
      .maybeSingle();

    const isMember = !!membership;

    if (!isOwner && !isMember) {
      return NextResponse.json({ error: 'You do not have access to this business' }, { status: 403 });
    }

    // ─── Delete customer ───
    const { error: deleteError } = await supabaseAdmin
      .from('customers')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // ─── Log activity ───
    await supabaseAdmin.from('business_activity_logs').insert({
      business_id: customer.business_id,
      performed_by: user.id,
      action: 'customer_deleted',
      details: { id }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
