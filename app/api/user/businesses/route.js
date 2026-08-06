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

    if (businessId) {
      const { data: business, error } = await supabaseAdmin
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .maybeSingle();

      if (error || !business) {
        return NextResponse.json({ error: 'Business not found' }, { status: 404 });
      }
      // Optional: verify access manually (but admin client already bypasses RLS)
      return NextResponse.json({ success: true, business });
    }

    // ─── Return all businesses (owned + member) ───
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
    }
