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

    let { business_id, subject, category, description } = await req.json();

    // Validate required fields
    if (!subject || !category || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // ─── MAGIC BUSINESS ID RESOLVER (Works even if URL has ?business_id=) ───
    let resolvedBusinessId = null;

    // Level 1: Check if the provided ID is a valid UUID and exists in the businesses table
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (business_id && uuidRegex.test(business_id)) {
      const { data: check } = await supabase
        .from('businesses')
        .select('id')
        .eq('id', business_id)
        .maybeSingle();
      if (check) resolvedBusinessId = business_id;
    }

    // Level 2: If Level 1 fails, find the user's first valid membership (Manager or Staff)
    if (!resolvedBusinessId) {
      const { data: membership } = await supabase
        .from('business_memberships')
        .select('business_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      if (membership) resolvedBusinessId = membership.business_id;
    }

    // Level 3: If Level 2 fails, find the first business they own (Owner)
    if (!resolvedBusinessId) {
      const { data: owned } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1)
        .maybeSingle();
      if (owned) resolvedBusinessId = owned.id;
    }

    // If we still have no ID, the user is truly disconnected from any business
    if (!resolvedBusinessId) {
      return NextResponse.json({ 
        error: 'We could not find any business associated with your account. Please ensure you are logged into the correct profile.' 
      }, { status: 404 });
    }

    // ✅ INSERT THE TICKET using the resolved business ID
    const { data, error: insertError } = await supabase
      .from('support_tickets')
      .insert({
        user_id: user.id,
        business_id: resolvedBusinessId, // We use the resolved ID here
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
