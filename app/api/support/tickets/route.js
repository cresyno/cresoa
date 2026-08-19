import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(req) {
  try {
    // 1. Get the token from the Authorization header (instead of relying on cookies)
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];

    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. 🔒 Strict email check: only you can access this
    if (user.email !== 'taiwoabraham640@gmail.com') {
      console.warn(`Blocked admin access attempt by: ${user.email}`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Fetch tickets using the raw REST API (guaranteed to work)
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
    return NextResponse.json({ tickets });
  } catch (error) {
    console.error('Admin Ticket Fetch Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
