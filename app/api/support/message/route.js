import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabaseClient';
import { createClient as createAdminClient } from '../../../lib/supabaseAdmin';
import { supportEngine } from '../../../lib/support/supportEngine';

export async function POST(req) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { message, business_id } = await req.json();
    
    const supabaseAdmin = createAdminClient();
    const { data: membership } = await supabaseAdmin
      .from('business_memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('business_id', business_id)
      .single();
    if (!membership) return NextResponse.json({ error: 'No access to business' }, { status: 403 });

    const result = await supportEngine({ message, userId: user.id, businessId: business_id, supabaseAdmin });

    return NextResponse.json({ answer: result.answer, source: result.source });
  } catch (error) {
    console.error('Support API Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
