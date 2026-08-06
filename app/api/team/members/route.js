import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient';

export async function GET(req) {
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

    // 2. Get the business_id from query params (or from the user's active business)
    const url = new URL(req.url);
    const businessId = url.searchParams.get('business_id');
    if (!businessId) {
      return NextResponse.json({ error: 'business_id is required' }, { status: 400 });
    }

    // 3. Check if user belongs to this business (as Owner or Manager or Staff – any member)
    const { data: membership, error: membershipError } = await supabase
      .from('business_memberships')
      .select('role')
      .eq('business_id', businessId)
      .eq('user_id', user.id)
      .single();

    if (membershipError && membershipError.code !== 'PGRST116') {
      // PGRST116 = row not found, meaning user is not a member
      return NextResponse.json({ error: 'You are not a member of this business' }, { status: 403 });
    }
    if (!membership) {
      // Also check if user is owner directly
      const { data: business } = await supabase
        .from('businesses')
        .select('owner_id')
        .eq('id', businessId)
        .single();
      if (!business || business.owner_id !== user.id) {
        return NextResponse.json({ error: 'You are not a member of this business' }, { status: 403 });
      }
    }

    // 4. Fetch all members of this business (including owners and staff) with user details
    const { data: members, error: membersError } = await supabase
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
      .order('role', { ascending: false }); // Owner first, then Manager, then Staff

    if (membersError) {
      throw membersError;
    }

    // 5. Also fetch the business owner (if not already in memberships) – but the owner should already be in memberships if we set up correctly.
    // For safety, we can check if owner is missing and add them.
    // But we'll trust that the owner has a membership entry.

    return NextResponse.json({ success: true, members });
  } catch (error) {
    console.error('List members error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
  }
