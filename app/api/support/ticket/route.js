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

    // We now expect email instead of business_id
    const { email, subject, category, description } = await req.json();

    if (!email || !subject || !category || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. RESOLVE USER UUID USING THE EMAIL
    const { data: targetUser, error: userError } = await supabase
      .from('auth.users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (userError || !targetUser) {
      return NextResponse.json({ 
        error: `User with email "${email}" does not exist in the system.` 
      }, { status: 404 });
    }

    // 2. RESOLVE BUSINESS ID USING THE FOUND USER ID
    let resolvedBusinessId = null;

    // Try to find the business they own
    const { data: owned } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', targetUser.id)
      .limit(1)
      .maybeSingle();
    if (owned) resolvedBusinessId = owned.id;

    // If they don't own one, try to find a membership
    if (!resolvedBusinessId) {
      const { data: membership } = await supabase
        .from('business_memberships')
        .select('business_id')
        .eq('user_id', targetUser.id)
        .limit(1)
        .maybeSingle();
      if (membership) resolvedBusinessId = membership.business_id;
    }

    // If no business is found, the user is not linked to any business
    if (!resolvedBusinessId) {
      return NextResponse.json({ 
        error: `User with email "${email}" is not associated with any valid business account.` 
      }, { status: 404 });
    }

    // 3. INSERT THE TICKET
    const { data, error: insertError } = await supabase
      .from('support_tickets')
      .insert({
        user_id: targetUser.id,
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
