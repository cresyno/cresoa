import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(req) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('business_id');
    const isAdmin = searchParams.get('admin') === 'true';

    let query = supabase.from('support_tickets').select('*').order('created_at', { ascending: false });

    if (!isAdmin) {
      if (!businessId) return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
      query = query.eq('business_id', businessId);
      
      const { data: membership } = await supabase
        .from('business_memberships')
        .select('role')
        .eq('user_id', user.id)
        .eq('business_id', businessId)
        .maybeSingle();
      if (!membership) return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 });
    } else {
      if (user.email !== 'taiwoabraham640@gmail.com') {
        return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 });
      }
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ tickets: data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
