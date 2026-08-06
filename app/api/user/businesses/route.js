import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

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

      // Check if user is owner OR member (using admin client to bypass RLS)
      const isOwner = business.owner_id === user.id;
      
      // Check membership
      const { data: membership } = await supabaseAdmin
        .from('business_memberships')
        .select('id, role')
        .eq('business_id', businessId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      const isMember = !!membership;

      if (!isOwner && !isMember) {
        return NextResponse.json({ 
          error: 'You do not have access to this business',
          debug: { userId: user.id, businessId, isOwner, isMember, membership }
        }, { status: 403 });
      }

      return NextResponse.json({ success: true, business });
    }

    // Otherwise, return all businesses (owned + member)
    const { data: owned } = await supabaseAdmin
      .from('businesses')
      .select('id, name, sector')
      .eq('owner_id', user.id);

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

    const all = [...(owned || []), ...memberBusinesses];
    const unique = all.filter((b, i, self) => self.findIndex(x => x.id === b.id) === i);

    return NextResponse.json({ success: true, businesses: unique });

  } catch (error) {
    console.error('Businesses API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
