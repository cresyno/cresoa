import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabaseClient';

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

    // Fetch business - using maybeSingle to avoid error if not found
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('owner_id, name')
      .eq('id', business_id)
      .maybeSingle();

    if (bizError) {
      console.error('Business fetch error:', bizError);
      return NextResponse.json({ error: 'Database error fetching business' }, { status: 500 });
    }

    if (!business) {
      return NextResponse.json({
        error: 'Business not found',
        debug: { business_id, user_id: user.id }
      }, { status: 404 });
    }

    // Check permission: owner OR manager via membership
    let hasPermission = false;
    if (business.owner_id === user.id) {
      hasPermission = true;
    } else {
      const { data: membership } = await supabase
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
      return NextResponse.json({
        error: 'You do not have permission to invite staff',
        debug: {
          user_id: user.id,
          business_id,
          business_owner_id: business.owner_id,
          is_owner: business.owner_id === user.id,
          membership: await supabase
            .from('business_memberships')
            .select('*')
            .eq('business_id', business_id)
            .eq('user_id', user.id)
            .maybeSingle()
            .then(r => r.data)
        }
      }, { status: 403 });
    }

    // Check for duplicate pending invite
    const { data: existing } = await supabase
      .from('business_invites')
      .select('id')
      .eq('business_id', business_id)
      .eq('email', email)
      .eq('status', 'pending')
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'An invite for this email is already pending' }, { status: 400 });
    }

    // Generate 6-character code
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + 3);

    // Insert invite
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

    // Log activity
    await supabase.from('business_activity_logs').insert({
      business_id,
      performed_by: user.id,
      action: 'invite_created',
      details: { email, role, invite_code: code }
    });

    return NextResponse.json({
      success: true,
      invite: { code, email, role, expires_at: expires_at.toISOString() }
    }, { status: 200 });

  } catch (error) {
    console.error('Generate invite error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
