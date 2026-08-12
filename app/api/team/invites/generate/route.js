import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabaseClient';
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin';
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

    const { business_id, email, role, send_email = true } = await req.json();
    if (!business_id || !email || !role) {
      return NextResponse.json({ error: 'Business ID, email, and role are required' }, { status: 400 });
    }
    if (!['Staff', 'Manager'].includes(role)) {
      return NextResponse.json({ error: 'Role must be either "Staff" or "Manager"' }, { status: 400 });
    }

    // ─── Verify user has permission (Owner or Manager) ───
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('owner_id, name')
      .eq('id', business_id)
      .single();

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    let hasPermission = false;
    let businessName = business.name || 'Your business';

    if (business.owner_id === user.id) {
      hasPermission = true;
    } else {
      const { data: membership } = await supabaseAdmin
        .from('business_memberships')
        .select('role')
        .eq('business_id', business_id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (membership && (membership.role === 'Owner' || membership.role === 'Manager')) {
        hasPermission = true;
      }
    }

    if (!hasPermission) {
      return NextResponse.json({ error: 'You do not have permission to invite staff' }, { status: 403 });
    }

    // ─── Check if email is already a member of this business ───
    const { data: existingUser } = await supabaseAdmin
      .from('auth.users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      const { data: existingMember } = await supabaseAdmin
        .from('business_memberships')
        .select('id')
        .eq('business_id', business_id)
        .eq('user_id', existingUser.id)
        .maybeSingle();
      if (existingMember) {
        return NextResponse.json({ error: 'This email is already a member of your business' }, { status: 400 });
      }
    }

    // ─── Check if there's already a pending invite ───
    const { data: existingInvite } = await supabaseAdmin
      .from('business_invites')
      .select('id')
      .eq('business_id', business_id)
      .eq('email', email)
      .eq('status', 'pending')
      .maybeSingle();

    // Generate a new code
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + 3);

    let invite;

    if (existingInvite) {
      // ─── UPDATE existing invite with new code ───
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('business_invites')
        .update({
          invite_code: code,
          expires_at: expires_at.toISOString(),
          role: role, // update role in case it changed
          updated_at: new Date().toISOString()
        })
        .eq('id', existingInvite.id)
        .select()
        .single();

      if (updateError) throw updateError;
      invite = updated;
    } else {
      // ─── INSERT new invite ───
      const { data: inserted, error: insertError } = await supabaseAdmin
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

      if (insertError) throw insertError;
      invite = inserted;
    }

    // ─── Log activity ───
    await supabaseAdmin.from('business_activity_logs').insert({
      business_id,
      performed_by: user.id,
      action: 'invite_created',
      details: { email, role, invite_code: code }
    });

    // ─── Send email (optional) ───
if (send_email !== false) {
  const acceptLink = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invite?code=${code}`;
  try {
    await sendStaffInviteEmail(email, user.email, businessName, acceptLink);
  } catch (emailError) {
    console.error('Email sending failed:', emailError);
  }
}
    return NextResponse.json({ success: true, invite }, { status: 200 });
  } catch (error) {
    console.error('Generate invite error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
      }
