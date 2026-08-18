import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function PUT(req) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    // ✅ Updated with your exact admin email
    if (user.email !== 'taiwoabraham640@gmail.com') {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 });
    }

    const { ticketId, status } = await req.json();
    if (!ticketId || !status) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const { error } = await supabase
      .from('support_tickets')
      .update({ status })
      .eq('id', ticketId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
