import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabaseClient';
import { sendStaffInviteEmail } from '../../../../../lib/email'; // adjust path if needed

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

    // 2. Parse request body
    const { business_id, email, role } = await req.json();
    if (!business_id || !email || !role) {
      return NextResponse.json({ error: 'Business ID, email, and role are required' }, { status: 400 });
    }
    if (!['Staff', 'Manager'].includes(role)) {
      return NextResponse.json({ error: 'Role must be either "Staff" or "Manager"' }, { status: 400 });
    }

    // 3. Verify user has permission (Owner or Manager of this business)
    let hasPermission = false;
    // Check if they are the owner
    const { data: business } = await supabase
      .from('businesses')
      .select('owner_id, name')
      .eq('id', business_id)
      .single();

    if (business?.owner_id === user.id) {
      hasPermission = true;
      var businessName = business.name;
    } else {
      // Check membership as Manager or Owner
      const { data: membership } = await supabase
        .from('business_memberships')
        .select('role')
        .eq('business_id', business_id)
        .eq('user_id', user.id)
        .single();
      if (membership && (membership.role === 'Owner' || membership.role === 'Manager')) {
        hasPermission = true;
        // fetch business name if not already
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
      return NextResponse.json({ error: 'You do not have permission to invite staff' }, { status: 403 });
    }

    // 4. Check if email is already a member of this business
    const { data: existingMember } = await supabase
      .from('business_memberships')
      .select('user_id')
      .eq('business_id', business_id)
      .eq('user_id', user.id); // This checks if the current user is a member? Actually we need to check if the invitee's email is already linked. We don't have user_id from email directly unless we query users. Let's check via auth.users.
    // Better: find user by email in auth.users
    const { data: existingUser } = await supabase
      .from('auth.users')
      .select('id')
      .eq('email', email)
      .single();
    if (existingUser) {
      const { data: member } = await supabase
        .from('business_memberships')
        .select('id')
        .eq('business_id', business_id)
        .eq('user_id', existingUser.id)
        .single();
      if (member) {
        return NextResponse.json({ error: 'This email is already a member of your business' }, { status: 400 });
      }
    }

    // 5. Check if there's a pending invite for this email/business
    const { data: existingInvite } = await supabase
      .from('business_invites')
      .select('id, status')
      .eq('business_id', business_id)
      .eq('email', email)
      .eq('status', 'pending')
      .single();
    if (existingInvite) {
      return NextResponse.json({ error: 'An invite for this email is already pending' }, { status: 400 });
    }

    // 6. (Optional) Plan limits – placeholder, we'll skip for now
    // You can later count members and compare to plan limit

    // 7. Generate 6-character uppercase alphanumeric code
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    // 8. Set expiry (3 days from now)
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + 3);

    // 9. Insert invite
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
      // Catch unique violation
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'An invite for this email already exists for this business' }, { status: 400 });
      }
      throw insertError;
    }

    // 10. Log activity
    await supabase.from('business_activity_logs').insert({
      business_id,
      performed_by: user.id,
      action: 'invite_created',
      details: { email, role, invite_code: code }
    });

    // 11. Send email invitation
    const acceptLink = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invite?code=${code}`;
    try {
      await sendStaffInviteEmail(email, user.email, businessName, acceptLink);
    } catch (emailError) {
      // Log but don't fail the request – the invite is already created
      console.error('Email sending failed:', emailError);
      // Optionally log to activity as warning
    }

    return NextResponse.json({ success: true, invite }, { status: 200 });
  } catch (error) {
    console.error('Generate invite error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
                       }
