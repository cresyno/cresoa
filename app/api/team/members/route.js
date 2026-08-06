import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabaseClient';
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin';

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

    // Use admin client to bypass RLS and get all members
    const { data: members, error: membersError } = await supabaseAdmin
      .from('business_memberships')
      .select(`
        id,
        role,
        joined_at,
        user:user_id (
          id,
          email,
          raw_user_meta_data->full_name as full_name
        )
      `)
      .eq('business_id', businessId)
      .order('role', { ascending: false });

    if (membersError) {
      throw membersError;
    }

    return NextResponse.json({ success: true, members });
  } catch (error) {
    console.error('List members error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
                              }
