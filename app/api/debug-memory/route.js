import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('business_id');
    if (!businessId) {
      return NextResponse.json({ error: 'Missing business_id' }, { status: 400 });
    }

    // Fetch the last 8 messages
    const { data, error } = await supabase
      .from('support_messages')
      .select('sender_type, message, created_at')
      .eq('business_id', businessId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(8);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return the raw data to the browser
    return NextResponse.json({ 
      userId: user.id,
      businessId: businessId,
      messageCount: data?.length || 0,
      messages: data || [] 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
