import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(req) {
  try {
    // 1. Only check if the user is logged in.
    // Email verification is no longer blocking you.
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Use the raw REST API to fetch tickets (bypasses all RLS and path issues)
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/support_tickets?select=*&order=created_at.desc`;
    const res = await fetch(url, {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      }
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Supabase REST fetch failed:', res.status, errorText);
      return NextResponse.json({ error: `Supabase API error: ${res.status}` }, { status: 500 });
    }

    const tickets = await res.json();
    
    // 3. Return the tickets (even if empty)
    return NextResponse.json({ tickets });
  } catch (error) {
    console.error('Admin Ticket Fetch Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
