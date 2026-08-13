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

    // ─── Get all businesses where user is owner ───
    const { data: owned, error: ownedError } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', user.id);
    if (ownedError) throw ownedError;

    // ─── Get all businesses where user is a member ───
    const { data: memberships, error: memberError } = await supabase
      .from('business_memberships')
      .select('business_id')
      .eq('user_id', user.id);
    if (memberError) throw memberError;

    let memberBusinesses = [];
    if (memberships && memberships.length > 0) {
      const ids = memberships.map(m => m.business_id);
      const { data: biz, error: bizError } = await supabase
        .from('businesses')
        .select('*')
        .in('id', ids);
      if (!bizError) memberBusinesses = biz || [];
    }

    // ─── Merge and deduplicate ───
    const all = [...(owned || []), ...memberBusinesses];
    const unique = all.filter((b, i, self) => self.findIndex(x => x.id === b.id) === i);

    return NextResponse.json({ success: true, businesses: unique });
  } catch (error) {
    console.error('Businesses API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
