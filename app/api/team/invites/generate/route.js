import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabaseClient';
import { sendStaffInviteEmail } from '../../../../../lib/email';

export async function POST(req) {
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

    const { business_id, email, role } = await req.json();
    if (!business_id || !email || !role) {
      return NextResponse.json({ error: 'Business ID, email, and role are required' }, { status: 400 });
    }
    if (!['Staff', 'Manager'].includes(role)) {
      return NextResponse.json({ error: 'Role must be either "Staff" or "Manager"' }, { status: 400 });
    }

    let hasPermission = false;
    let businessName = '';

    // 1. Check if user is the owner
    const { data: business } = await supabase
      .from('businesses')
      .select('owner_id, name')
      .eq('id', business_id)
      .single();

    if (business?.owner_id === user.id) {
      hasPermission = true;
      businessName = business.name || 'Your business';
    } else {
      // 2. Check if user is Manager/Owner via memberships
      const { data: membership } = await supabase
        .from('business_memberships')
        .select('role')
        .eq('business_id', business_id)
        .eq('user_id', user.id)
        .single();

      if (membership && (membership.role === 'Owner' || membership.role === 'Manager')) {
        hasPermission = true;
        if (!businessName) {
          const { data: biz } = await supabase
            .from('businesses')
            .select('name')
            .eq('id', business_id)
            .single();
          businessName = biz?.name || 'Your business';
        }
      }
    }

    if (!hasPermission) {
      console.log('Permission denied for user:', user.id, 'business:', business_id);
      return NextResponse.json({ error: 'You do not have permission to invite staff' }, { status: 403 });
    }

    // Check for duplicate pending invite
    const { data: existingInvite } = await supabase
      .from('business_invites')
      .select('id')
      .eq('business_id', business_id)
      .eq('email', email)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingInvite) {
      return NextResponse.json({ error: 'An invite for this email is already pending' }, { status: 400 });
    }

    // Generate code and insert
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + 3);

    const { data: invite, error: insertError } = await supabase
      .from('business_invites')
      .insert({
        business_id,
        email,
        role,
        invite_code: code,
        expires_at: expires_at.toISOString(),
        created_by: user.id,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'An invite for this email already exists for this business' }, { status: 400 });
      }
      throw insertError;
    }

    await supabase.from('business_activity_logs').insert({
      business_id,
      performed_by: user.id,
      action: 'invite_created',
      details: { email, role, invite_code: code }
    });

    const acceptLink = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invite?code=${code}`;
    try {
      await sendStaffInviteEmail(email, user.email, businessName, acceptLink);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    return NextResponse.json({ success: true, invite }, { status: 200 });
  } catch (error) {
    console.error('Generate invite error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
