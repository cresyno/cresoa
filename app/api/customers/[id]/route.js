import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

// ─── PATCH: Update customer ───
export async function PATCH(req, { params }) {
  try {
    const { id } = params
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { first_name, last_name, phone, email, gender, age_category, address, notes, measurements } = body

    // Validate required fields
    if (!first_name || !last_name || !phone || !gender || !age_category) {
      return NextResponse.json({ error: 'All required fields must be filled' }, { status: 400 })
    }
    if (phone.length !== 11) {
      return NextResponse.json({ error: 'Phone must be exactly 11 digits' }, { status: 400 })
    }

    // Verify access
    const { data: membership } = await supabaseAdmin
      .from('business_memberships')
      .select('business_id')
      .eq('user_id', user.id)
      .maybeSingle()
    
    const { data: customer } = await supabaseAdmin
      .from('customers')
      .select('business_id')
      .eq('id', id)
      .single()

    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    if (!membership && customer.business_id !== membership?.business_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Update customer
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('customers')
      .update({
        first_name,
        last_name,
        phone,
        email: email || null,
        gender,
        age_category,
        address: address || null,
        notes: notes || null,
        measurements: measurements || {},
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    // Log activity
    await supabaseAdmin.from('business_activity_logs').insert({
      business_id: customer.business_id,
      performed_by: user.id,
      action: 'customer_updated',
      details: { first_name, last_name }
    })

    return NextResponse.json({ success: true, customer: updated })
  } catch (err) {
    console.error('PATCH error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─── DELETE: Remove customer ───
export async function DELETE(req, { params }) {
  try {
    const { id } = params
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify access
    const { data: membership } = await supabaseAdmin
      .from('business_memberships')
      .select('business_id')
      .eq('user_id', user.id)
      .maybeSingle()
    
    const { data: customer } = await supabaseAdmin
      .from('customers')
      .select('business_id')
      .eq('id', id)
      .single()

    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    if (!membership && customer.business_id !== membership?.business_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Delete customer
    const { error: deleteError } = await supabaseAdmin
      .from('customers')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    // Log activity
    await supabaseAdmin.from('business_activity_logs').insert({
      business_id: customer.business_id,
      performed_by: user.id,
      action: 'customer_deleted',
      details: { id }
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
      }
