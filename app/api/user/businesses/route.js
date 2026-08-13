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

    // ─── DEBUG: return user info ───
    const debug = { user: { id: user.id, email: user.email } };

    // ─── Owned businesses ───
    const { data: owned, error: ownedError } = await supabaseAdmin
      .from('businesses')
      .select('id, name, sector')
      .eq('owner_id', user.id);
    if (ownedError) {
      debug.ownedError = ownedError.message;
    } else {
      debug.owned = owned || [];
    }

    // ─── Member businesses ───
    const { data: memberships, error: memberError } = await supabaseAdmin
      .from('business_memberships')
      .select('business_id')
      .eq('user_id', user.id);
    if (memberError) {
      debug.memberError = memberError.message;
    } else {
      debug.memberships = memberships || [];
    }

    let memberBusinesses = [];
    if (memberships && memberships.length > 0) {
      const ids = memberships.map(m => m.business_id);
      const { data: biz, error: bizError } = await supabaseAdmin
        .from('businesses')
        .select('id, name, sector')
        .in('id', ids);
      if (!bizError) memberBusinesses = biz || [];
      debug.memberBusinesses = memberBusinesses;
    }

    const all = [...(owned || []), ...memberBusinesses];
    const unique = all.filter((b, i, self) => self.findIndex(x => x.id === b.id) === i);

    debug.merged = unique;

    // ─── Return both businesses and debug info ───
    return NextResponse.json({
      success: true,
      businesses: unique,
      debug: debug
    });
  } catch (error) {
    console.error('Businesses API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      businesses: []
    }, { status: 500 });
  }
}
