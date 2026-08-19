import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export async function GET(req) {
  try {
    // 1. Verify admin user
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== 'taiwoabraham640@gmail.com') {
      console.warn('Unauthorized admin access attempt by:', user?.email);
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 });
    }

    // 2. Fetch ALL tickets (no filtering by business_id or user_id)
    const { data: tickets, error } = await supabaseAdmin
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase Admin fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 3. Return whatever we got (even an empty array)
    return NextResponse.json({ tickets });
  } catch (error) {
    console.error('Admin Ticket Fetch Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
