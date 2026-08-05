import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabaseClient';

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

    const { code } = await req.json();

    if (!code) {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
    }

    // 2. Find and validate invite
    const cleanCode = code.trim().toUpperCase();
    const { data: invite, error: fetchError } = await supabase
      .from('invites')
      .select('*')
      .eq('code', cleanCode)
      .single();

    if (fetchError || !invite) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
    }

    if (invite.is_used) {
      return NextResponse.json({ error: 'This invite code has already been used' }, { status: 400 });
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This invite code has expired' }, { status: 400 });
    }

    // 3. Check if user is already a member or the business owner
    const { data: business } = await supabase
      .from('businesses')
      .select('owner_id')
      .eq('id', invite.business_id)
      .single();

    if (business?.owner_id === user.id) {
      return NextResponse.json({ error: 'You are the owner of this business' }, { status: 400 });
    }

    const { data: existingMember } = await supabase
      .from('memberships')
      .select('id')
      .eq('business_id', invite.business_id)
      .eq('user_id', user.id)
      .single();

    if (existingMember) {
      return NextResponse.json({ error: 'You are already a member of this business' }, { status: 400 });
    }

    // 4. Add to memberships
    const { error: membershipError } = await supabase
      .from('memberships')
      .insert([{
        business_id: invite.business_id,
        user_id: user.id,
        role: invite.role
      }]);

    if (membershipError) throw membershipError;

    // 5. Mark invite as used
    await supabase
      .from('invites')
      .update({ is_used: true })
      .eq('id', invite.id);

    // 6. Log activity
    await supabase.from('activity_logs').insert([{
      business_id: invite.business_id,
      user_id: user.id,
      action: 'joined_business',
      details: { role: invite.role }
    }]);

    return NextResponse.json({ success: true, business_id: invite.business_id }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
          }
