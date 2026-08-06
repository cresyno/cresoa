import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabaseClient';
import { sendStaffInviteEmail } from '../../../../../lib/email';

// Note: For admin operations on auth.users, you may need a service role client.
// If you don't have one, skip the email existence check – we'll still prevent duplicate invites.
// I'm using the regular client, but we can try to fetch user by email via auth.admin if available.

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
    let businessName = '';

    // Check if they are the owner
    const { data: business } = await supabase
      .from('businesses')
      .select('owner_id, name')
      .eq('id', business_id)
      .single();

    if (business?.owner_id === user.id) {
      hasPermission = true;
      businessName = business.name || 'Your business';
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
        // get business name if not already
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
    // We need to find the user id for this email (if they have an account)
    let targetUserId = null;
    try {
      // Attempt to get user by email using admin client – you need to set up supabaseAdmin
      // If you don't have admin client, skip this part and rely on business_memberships lookup
      // by joining with auth.users – which we can't do with anon key.
      // For now, we'll try a simple approach: check if there's a membership with that email
      // by first fetching the user id from auth.users using admin client if available.
      // Since we may not have admin client, we'll just check if there's a pending invite or membership.
      // We'll rely on the UNIQUE constraint on (business_id, email) in business_invites.
      // And we'll check membership by trying to get user id via auth.admin (if we have service role).
      // If not, we'll just let the user accept the invite and then membership creation will fail if already exists.
      // We'll implement a fallback: if we can't check, we'll just proceed – the accept route will catch duplicates.
    } catch (e) {
      // Ignore
    }

    // 5. Check if there's a pending invite for this email/business
    const { data: existingInvite } = await supabase
      .from('business_invites')
      .select('id, status')
      .eq('business_id', business_id)
      .eq('email', email)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingInvite) {
      return NextResponse.json({ error: 'An invite for this email is already pending' }, { status: 400 });
    }

    // 6. (Optional) Plan limits – we'll skip for now, you can add later

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
    }

    return NextResponse.json({ success: true, invite }, { status: 200 });
  } catch (error) {
    console.error('Generate invite error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
            }
