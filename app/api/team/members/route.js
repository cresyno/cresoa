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

    // 1. Fetch memberships
    const { data: memberships, error: membersError } = await supabaseAdmin
      .from('business_memberships')
      .select('id, user_id, role, joined_at')
      .eq('business_id', businessId)
      .order('role', { ascending: false });

    if (membersError) throw membersError;

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ success: true, members: [] });
    }

    // 2. For each user_id, fetch email using admin auth API
    const membersWithUser = await Promise.all(
      memberships.map(async (m) => {
        try {
          const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(m.user_id);
          if (userError || !userData) {
            return { ...m, user: { id: m.user_id, email: 'unknown', full_name: null } };
          }
          return {
            ...m,
            user: {
              id: m.user_id,
              email: userData.user.email,
              full_name: userData.user.user_metadata?.full_name || null
            }
          };
        } catch (e) {
          return { ...m, user: { id: m.user_id, email: 'unknown', full_name: null } };
        }
      })
    );

    return NextResponse.json({ success: true, members: membersWithUser });
  } catch (error) {
    console.error('List members error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
