import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient';

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

    if (businessId) {
      // Fetch single business – RLS will allow if user is owner or member
      const { data: business, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .maybeSingle();

      if (error || !business) {
        return NextResponse.json({ error: 'Business not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, business });
    }

    // ─── Return all businesses (owned + member) ───
    // Use regular client – RLS will enforce visibility
    const { data: owned } = await supabase
      .from('businesses')
      .select('id, name, sector')
      .eq('owner_id', user.id);

    // Fetch memberships to get business_ids where user is a member
    const { data: memberships } = await supabase
      .from('business_memberships')
      .select('business_id')
      .eq('user_id', user.id);

    let memberBusinesses = [];
    if (memberships && memberships.length > 0) {
      const ids = memberships.map(m => m.business_id);
      const { data: biz } = await supabase
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
