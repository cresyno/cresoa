import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabaseClient';

export async function POST(req) {
  try {
    // 1. Authenticate user (the person accepting)
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request
    const { invite_code } = await req.json();
    if (!invite_code) {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
    }

    // 3. Look up the invite
    const { data: invite, error: inviteError } = await supabase
      .from('business_invites')
      .select('*, businesses!inner(owner_id)')
      .eq('invite_code', invite_code.toUpperCase())
      .eq('status', 'pending')
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Invalid or expired invite code' }, { status: 404 });
    }

    // 4. Check expiry
    const now = new Date();
    const expires = new Date(invite.expires_at);
    if (expires < now) {
      // Mark as expired
      await supabase.from('business_invites').update({ status: 'expired' }).eq('id', invite.id);
      return NextResponse.json({ error: 'Invite code has expired' }, { status: 410 });
    }

    // 5. Check if the user is already a member of this business
    const { data: existingMembership } = await supabase
      .from('business_memberships')
      .select('id')
      .eq('business_id', invite.business_id)
      .eq('user_id', user.id)
      .single();

    if (existingMembership) {
      return NextResponse.json({ error: 'You are already a member of this business' }, { status: 400 });
    }

    // 6. Create membership
    const { error: insertError } = await supabase
      .from('business_memberships')
      .insert({
        business_id: invite.business_id,
        user_id: user.id,
        role: invite.role
      });

    if (insertError) {
      throw insertError;
    }

    // 7. Update invite status to accepted
    await supabase
      .from('business_invites')
      .update({ status: 'accepted' })
      .eq('id', invite.id);

    // 8. Log activity
    await supabase.from('business_activity_logs').insert({
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
