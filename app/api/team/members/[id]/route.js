import { NextResponse } from 'next/server'
import { supabase } from '../../../../../lib/supabaseClient'
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin'

export async function PATCH(req, { params }) {
  const { id } = params
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { role } = await req.json()
    if (!role || !['Owner', 'Manager', 'Staff'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Check if the user is Owner/Manager of this business
    const { data: membership } = await supabaseAdmin
      .from('business_memberships')
      .select('business_id, role')
      .eq('user_id', user.id)
      .single()

    if (!membership || (membership.role !== 'Owner' && membership.role !== 'Manager')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Cannot change role of Owner (if you're not the Owner)
    if (role === 'Owner' && membership.role !== 'Owner') {
      return NextResponse.json({ error: 'Only Owner can assign Owner role' }, { status: 403 })
    }

    // Update the target member's role
    const { data: target, error: updateError } = await supabaseAdmin
      .from('business_memberships')
      .update({ role })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    // Log activity
    await supabaseAdmin.from('business_activity_logs').insert({
      business_id: membership.business_id,
      performed_by: user.id,
      action: 'role_changed',
      details: { member_id: id, new_role: role }
    })

    return NextResponse.json({ success: true, member: target })
  } catch (err) {
    console.error('Error updating role:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req, { params }) {
  const { id } = params
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check if user is Owner/Manager
    const { data: membership } = await supabaseAdmin
      .from('business_memberships')
      .select('business_id, role')
      .eq('user_id', user.id)
      .single()

    if (!membership || (membership.role !== 'Owner' && membership.role !== 'Manager')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Cannot remove Owner (if you're not Owner)
    const { data: target } = await supabaseAdmin
      .from('business_memberships')
      .select('role')
      .eq('id', id)
      .single()

    if (target?.role === 'Owner' && membership.role !== 'Owner') {
      return NextResponse.json({ error: 'Only Owner can remove Owner' }, { status: 403 })
    }

    // Delete membership
    const { error: deleteError } = await supabaseAdmin
      .from('business_memberships')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    // Log activity
    await supabaseAdmin.from('business_activity_logs').insert({
      business_id: membership.business_id,
      performed_by: user.id,
      action: 'member_removed',
      details: { member_id: id }
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error removing member:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
      }
