import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ─── DEBUG: Try to fetch memberships with explicit error handling ───
    let memberships = [];
    let membershipError = null;
    try {
      const { data, error } = await supabaseAdmin
        .from('business_memberships')
        .select('business_id')
        .eq('user_id', user.id);
      if (error) throw error;
      memberships = data || [];
    } catch (err) {
      membershipError = err.message;
    }

    // ─── Owned businesses ───
    const { data: owned, error: ownedError } = await supabaseAdmin
      .from('businesses')
      .select('id, name, sector')
      .eq('owner_id', user.id);

    let memberBusinesses = [];
    if (memberships && memberships.length > 0) {
      const ids = memberships.map(m => m.business_id);
      const { data: biz, error: bizError } = await supabaseAdmin
        .from('businesses')
        .select('id, name, sector')
        .in('id', ids);
      if (!bizError) memberBusinesses = biz || [];
    }

    const all = [...(owned || []), ...memberBusinesses];
    const unique = all.filter((b, i, self) => self.findIndex(x => x.id === b.id) === i);

    return NextResponse.json({
      success: true,
      businesses: unique,
      debug: {
        user_id: user.id,
        memberships: memberships,
        membershipError: membershipError,
        owned: owned || [],
        merged: unique
      }
    });
  } catch (error) {
    console.error('Businesses API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
