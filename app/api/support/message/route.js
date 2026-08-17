// app/api/support/message/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseClient';
import { createClient as createAdminClient } from '@/lib/supabaseAdmin';
import { supportEngine } from '@/lib/support/supportEngine';

export async function POST(req) {
  try {
    // 1. Verify Auth
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { message, business_id } = await req.json();
    
    // 2. Verify Membership (Admin client)
    const supabaseAdmin = createAdminClient();
    const { data: membership } = await supabaseAdmin
      .from('business_memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('business_id', business_id)
      .single();
    if (!membership) return NextResponse.json({ error: 'No access to business' }, { status: 403 });

    // 3. Call Tessa
    const result = await supportEngine({ message, userId: user.id, businessId: business_id, supabaseAdmin });

    // 4. Save conversation to DB (you will create the tables for this later)
    return NextResponse.json({ answer: result.answer, source: result.source });
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
