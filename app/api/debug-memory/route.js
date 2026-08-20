import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('business_id');
    const userId = searchParams.get('user_id');

    if (!businessId || !userId) {
      return NextResponse.json({ error: 'Missing business_id or user_id' }, { status: 400 });
    }

    // 🔥 FETCH DIRECTLY USING THE ADMIN CLIENT (Bypasses RLS and Auth entirely)
    const { data, error } = await supabaseAdmin
      .from('support_messages')
      .select('sender_type, message, created_at')
      .eq('business_id', businessId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      messageCount: data?.length || 0,
      messages: data || [] 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
