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

    const { business_id, role, expiresInDays } = await req.json();

    if (!business_id || !role) {
      return NextResponse.json({ error: 'Business ID and Role are required' }, { status: 400 });
    }

    // 2. Verify user has permission (Must be Owner or Manager of the business)
    // First, check if they are the direct owner in the businesses table
    let hasPermission = false;
    const { data: business } = await supabase
      .from('businesses')
      .select('owner_id')
      .eq('id', business_id)
      .single();

    if (business?.owner_id === user.id) {
      hasPermission = true;
    } else {
      // Check if they are a Manager in the memberships table
      const { data: membership } = await supabase
        .from('memberships')
        .select('role')
        .eq('business_id', business_id)
        .eq('user_id', user.id)
        .single();
      
      if (membership && (membership.role === 'Owner' || membership.role === 'Manager')) {
        hasPermission = true;
      }
    }

    if (!hasPermission) {
      return NextResponse.json({ error: 'You do not have permission to generate invites' }, { status: 403 });
    }

    // 3. Generate random 8-character uppercase alphanumeric code
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    let expires_at = null;
    if (expiresInDays) {
      const date = new Date();
      date.setDate(date.getDate() + expiresInDays);
      expires_at = date.toISOString();
    }

    // 4. Insert invite
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .insert([{
        business_id,
        code,
        role,
        expires_at,
        created_by: user.id
      }])
      .select()
      .single();

    if (inviteError) throw inviteError;

    // 5. Log activity
    await supabase.from('activity_logs').insert([{
      business_id,
      user_id: user.id,
      action: 'generate_invite',
      details: { role, code }
    }]);

    return NextResponse.json({ success: true, invite }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
            }
