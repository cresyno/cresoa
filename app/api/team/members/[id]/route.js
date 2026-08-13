import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabaseClient';
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin';

export async function PATCH(req, { params }) {
  const { id } = params;
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { role, permissions } = body;

    // ─── Get the target membership to know which business it belongs to ───
    const { data: target, error: targetError } = await supabaseAdmin
      .from('business_memberships')
      .select('business_id, role, user_id')
      .eq('id', id)
      .single();

    if (targetError || !target) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // ─── Get current user's membership in the same business ───
    const { data: myMembership, error: myError } = await supabaseAdmin
      .from('business_memberships')
      .select('role')
      .eq('business_id', target.business_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (myError || !myMembership) {
      return NextResponse.json({ error: 'You are not a member of this business' }, { status: 403 });
    }

    // ─── Permission checks ───
    const canManage = myMembership.role === 'Owner' || myMembership.role === 'Manager';
    if (!canManage) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Cannot change Owner unless you are Owner
    if (target.role === 'Owner' && myMembership.role !== 'Owner') {
      return NextResponse.json({ error: 'Only the Owner can change the Owner role' }, { status: 403 });
    }

    // ─── Build update data ───
    const updateData = {};
    if (role !== undefined) updateData.role = role;
    if (permissions !== undefined) updateData.permissions = permissions;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // ─── Update membership ───
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('business_memberships')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // ─── Log activity ───
    await supabaseAdmin.from('business_activity_logs').insert({
      business_id: target.business_id,
      performed_by: user.id,
      action: 'role_changed',
      details: { member_id: id, new_role: role, new_permissions: permissions }
    });

    return NextResponse.json({ success: true, member: updated });
  } catch (err) {
    console.error('Error updating member:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const { id } = params;
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // ─── Get target membership to get business_id ───
    const { data: target, error: targetError } = await supabaseAdmin
      .from('business_memberships')
      .select('business_id, role')
      .eq('id', id)
      .single();

    if (targetError || !target) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // ─── Get current user's membership in the same business ───
    const { data: myMembership, error: myError } = await supabaseAdmin
      .from('business_memberships')
      .select('role')
      .eq('business_id', target.business_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (myError || !myMembership) {
      return NextResponse.json({ error: 'You are not a member of this business' }, { status: 403 });
    }

    const canManage = myMembership.role === 'Owner' || myMembership.role === 'Manager';
    if (!canManage) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Cannot remove Owner unless you are Owner
    if (target.role === 'Owner' && myMembership.role !== 'Owner') {
      return NextResponse.json({ error: 'Only the Owner can remove the Owner' }, { status: 403 });
    }

    // ─── Delete membership ───
    const { error: deleteError } = await supabaseAdmin
      .from('business_memberships')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    // ─── Log activity ───
    await supabaseAdmin.from('business_activity_logs').insert({
      business_id: target.business_id,
      performed_by: user.id,
      action: 'member_removed',
      details: { member_id: id }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error removing member:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
      }
