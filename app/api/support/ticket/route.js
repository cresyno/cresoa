import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req) {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];
    
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { business_id, subject, category, description } = await req.json();

    if (!subject || !category || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 🧠 FINAL BUSINESS RESOLVER (IGNORES URL ID COMPLETELY)
    let resolvedBusinessId = null;

    // 1. Try to find any business the user owns
    const { data: owned } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1)
      .maybeSingle();
    if (owned) resolvedBusinessId = owned.id;

    // 2. If not owner, try to find a membership (Manager/Staff)
    if (!resolvedBusinessId) {
      const { data: membership } = await supabase
        .from('business_memberships')
        .select('business_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      if (membership) resolvedBusinessId = membership.business_id;
    }

    // 3. If still no business, return a clear error
    if (!resolvedBusinessId) {
      return NextResponse.json({ 
        error: 'You do not have any business associated with your account. Please contact support.' 
      }, { status: 404 });
    }

    // ✅ Insert the ticket using the resolved ID
    const { data, error: insertError } = await supabase
      .from('support_tickets')
      .insert({
        user_id: user.id,
        business_id: resolvedBusinessId,
        subject: subject,
        category: category,
        description: description,
        status: 'open'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Ticket creation error:', insertError);
      return NextResponse.json({ 
        error: `Database error: ${insertError.message || insertError.details || 'Unknown error'}` 
      }, { status: 500 });
    }

    return NextResponse.json({ ticket: data });
  } catch (error) {
    console.error('Support Ticket API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
