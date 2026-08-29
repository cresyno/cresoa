import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabaseClient';
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin';

// Helper to normalize sector (same as other files)
const normalizeSector = (sector) => {
  if (!sector) return '';
  const s = sector.toLowerCase();
  if (s.includes('print')) return 'printing';
  if (s.includes('repair')) return 'repairs';
  if (s.includes('fashion')) return 'fashion';
  return s;
};

export async function POST(req) {
  try {
    const { invite_code } = await req.json();
    if (!invite_code) {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
    }

    // ─── Get user from session ───
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ─── Find the invite ───
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('business_invites')
      .select('*')
      .eq('invite_code', invite_code.toUpperCase())
      .eq('status', 'pending')
      .maybeSingle();

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Invalid or expired invite code' }, { status: 404 });
    }

    // ─── Check expiry ───
    const now = new Date();
    const expires = new Date(invite.expires_at);
    if (expires < now) {
      await supabaseAdmin.from('business_invites').update({ status: 'expired' }).eq('id', invite.id);
      return NextResponse.json({ error: 'Invite code has expired' }, { status: 410 });
    }

    // ─── Check if user is already a member of this business ───
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('business_memberships')
      .select('id')
      .eq('business_id', invite.business_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: 'Unable to verify membership' }, { status: 500 });
    }
    if (existing) {
      return NextResponse.json({ error: 'You are already a member of this business' }, { status: 400 });
    }

    // ─── Get the target business's sector (for validation & redirect) ───
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('sector, id')
      .eq('id', invite.business_id)
      .maybeSingle();

    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const targetSector = normalizeSector(business.sector);

    // ─── Check user's existing memberships for sector consistency ───
    const { data: memberships, error: membershipsError } = await supabaseAdmin
      .from('business_memberships')
      .select('sector')
      .eq('user_id', user.id);

    if (membershipsError) {
      return NextResponse.json({ error: 'Unable to check memberships' }, { status: 500 });
    }

    if (memberships && memberships.length > 0) {
      const existingSector = memberships[0].sector;
      if (existingSector && existingSector !== targetSector) {
        return NextResponse.json(
          { error: `You cannot join a business in the ${targetSector} sector. Your account is tied to the ${existingSector} sector.` },
          { status: 403 }
        );
      }
    }

    // ─── Create membership with sector (the DB trigger will also enforce this) ───
    const { error: insertError } = await supabaseAdmin
      .from('business_memberships')
      .insert({
        business_id: invite.business_id,
        user_id: user.id,
        role: invite.role,
        sector: targetSector,
      });

    if (insertError) {
      // If the trigger rejects due to sector mismatch, surface a clear message
      if (insertError.message.includes('Sector mismatch')) {
        return NextResponse.json({ error: insertError.message }, { status: 403 });
      }
      return NextResponse.json({ error: 'Failed to join business' }, { status: 400 });
    }

    // ─── Mark invite as accepted ───
    await supabaseAdmin
      .from('business_invites')
      .update({ status: 'accepted' })
      .eq('id', invite.id);

    // ─── Log activity ───
    await supabaseAdmin.from('business_activity_logs').insert({
      business_id: invite.business_id,
      performed_by: user.id,
      action: 'invite_accepted',
      details: { email: user.email, role: invite.role },
    });

    // ─── Return redirect to the correct sector dashboard ───
    const redirectUrl = `/dashboard/${targetSector}?business_id=${invite.business_id}&t=${Date.now()}`;
    return NextResponse.json({
      success: true,
      message: 'You have successfully joined the business',
      redirect: redirectUrl,
    }, { status: 200 });
  } catch (error) {
    console.error('Accept invite error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
