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

    // Get business_id from URL
    const url = new URL(req.url);
    const businessId = url.searchParams.get('business_id');

    // If fetching a single business
    if (businessId) {
      // Fetch business using admin client (bypasses RLS)
      const { data: business, error: bizError } = await supabaseAdmin
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .maybeSingle();

      if (bizError || !business) {
        return NextResponse.json({ error: 'Business not found' }, { status: 404 });
      }

      // Check if user is owner or member
      const isOwner = business.owner_id === user.id;
      let isMember = false;

      if (!isOwner) {
        const { data: membership } = await supabaseAdmin
          .from('business_memberships')
          .select('id')
          .eq('business_id', businessId)
          .eq('user_id', user.id)
          .maybeSingle();
        isMember = !!membership;
      }

      if (!isOwner && !isMember) {
        return NextResponse.json({ error: 'You do not have access to this business' }, { status: 403 });
      }

      return NextResponse.json({ success: true, business });
    }

    // Otherwise, return all businesses (owned + member)
    // Fetch businesses where user is owner
    const { data: owned } = await supabaseAdmin
      .from('businesses')
      .select('id, name, sector')
      .eq('owner_id', user.id);

    // Fetch memberships to get businesses where user is a member
    const { data: memberships } = await supabaseAdmin
      .from('business_memberships')
      .select('business_id')
      .eq('user_id', user.id);

    let memberBusinesses = [];
    if (memberships && memberships.length > 0) {
      const ids = memberships.map(m => m.business_id);
      const { data: biz } = await supabaseAdmin
        .from('businesses')
        .select('id, name, sector')
        .in('id', ids);
      if (biz) memberBusinesses = biz;
    }

    // Combine and deduplicate
    const all = [...(owned || []), ...memberBusinesses];
    const unique = all.filter((b, i, self) => self.findIndex(x => x.id === b.id) === i);

    return NextResponse.json({ success: true, businesses: unique });

  } catch (error) {
    console.error('Businesses API error:', error);
    // Always return valid JSON, even on error
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
        }
