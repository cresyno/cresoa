import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function PUT(req) {
  try {
    // 1. Get the token from the Authorization header
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];

    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check admin email
    if (user.email !== 'taiwoabraham640@gmail.com') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { ticketId, status } = await req.json();
    if (!ticketId || !status) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // 3. Update the status in Supabase (using admin client to bypass RLS)
    const { error: updateError } = await supabase
      .from('support_tickets')
      .update({ status })
      .eq('id', ticketId);

    if (updateError) {
      console.error('Status update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Status API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
