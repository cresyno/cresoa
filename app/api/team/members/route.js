import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export async function GET(req) {
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

    const url = new URL(req.url);
    const businessId = url.searchParams.get('business_id');
    if (!businessId) {
      return NextResponse.json({ error: 'business_id is required' }, { status: 400 });
    }

    // 1. Fetch memberships (using admin client to bypass RLS)
    const { data: memberships, error: membersError } = await supabaseAdmin
      .from('business_memberships')
      .select('id, user_id, role, joined_at')
      .eq('business_id', businessId)
      .order('role', { ascending: false });

    if (membersError) {
      throw membersError;
    }

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ success: true, members: [] });
    }

    // 2. Fetch user details (email, full_name) for each user_id
    const userIds = memberships.map(m => m.user_id);
    const { data: users, error: usersError } = await supabaseAdmin
      .from('auth.users')
      .select('id, email, raw_user_meta_data')
      .in('id', userIds);

    if (usersError) {
      console.error('Users fetch error:', usersError);
      // Fallback: return memberships without user details
      return NextResponse.json({
        success: true,
        members: memberships.map(m => ({
          ...m,
          user: { id: m.user_id, email: 'unknown', full_name: null }
        }))
      });
    }

    // 3. Combine memberships with user data
    const userMap = {};
    users?.forEach(u => {
      userMap[u.id] = {
        id: u.id,
        email: u.email,
        full_name: u.raw_user_meta_data?.full_name || null
      };
    });

    const members = memberships.map(m => ({
      ...m,
      user: userMap[m.user_id] || { id: m.user_id, email: 'unknown', full_name: null }
    }));

    return NextResponse.json({ success: true, members });
  } catch (error) {
    console.error('List members error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
