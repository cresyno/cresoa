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

    if (businessId) {
      // Fetch by ID using admin client
      const { data: business, error: bizError } = await supabaseAdmin
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .maybeSingle();

      if (bizError || !business) {
        return NextResponse.json({ error: 'Business not found' }, { status: 404 });
      }

      // Check access: owner or member
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
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      return NextResponse.json({ success: true, business });
    }

    // ... (list all businesses logic – already provided earlier)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
