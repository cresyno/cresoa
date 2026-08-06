import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabaseClient';
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin';

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

    const { invite_code } = await req.json();
    if (!invite_code) {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
    }

    // Use admin client to find the invite (bypass RLS)
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('business_invites')
      .select('*')
      .eq('invite_code', invite_code.toUpperCase())
      .eq('status', 'pending')
      .maybeSingle();

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Invalid or expired invite code' }, { status: 404 });
    }

    // Check expiry
    const now = new Date();
    const expires = new Date(invite.expires_at);
    if (expires < now) {
      await supabaseAdmin.from('business_invites').update({ status: 'expired' }).eq('id', invite.id);
      return NextResponse.json({ error: 'Invite code has expired' }, { status: 410 });
    }

    // Check if user is already a member (using admin client)
    const { data: existing } = await supabaseAdmin
      .from('business_memberships')
      .select('id')
      .eq('business_id', invite.business_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'You are already a member of this business' }, { status: 400 });
    }

    // Create membership
    const { error: insertError } = await supabaseAdmin
      .from('business_memberships')
      .insert({
        business_id: invite.business_id,
        user_id: user.id,
        role: invite.role
      });

    if (insertError) throw insertError;

    // Mark invite as accepted
    await supabaseAdmin
      .from('business_invites')
      .update({ status: 'accepted' })
      .eq('id', invite.id);

    // Log activity
    await supabaseAdmin.from('business_activity_logs').insert({
      business_id: invite.business_id,
      performed_by: user.id,
      action: 'invite_accepted',
      details: { email: user.email, role: invite.role }
    });

    return NextResponse.json({ success: true, message: 'You have successfully joined the business' }, { status: 200 });
  } catch (error) {
    console.error('Accept invite error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
