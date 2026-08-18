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

    // 🛑 ABSOLUTE ID GUARD (Handles "", "null", "undefined", and whitespace)
    if (!business_id || typeof business_id !== 'string' || business_id.trim() === '') {
      return NextResponse.json({ error: 'Invalid Business ID provided' }, { status: 400 });
    }

    if (!subject || !category || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if the user is the owner
    const { data: businessData, error: bizError } = await supabase
      .from('businesses')
      .select('owner_id')
      .eq('id', business_id)
      .single();

    if (bizError || !businessData) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    let hasAccess = false;
    if (businessData.owner_id === user.id) {
      hasAccess = true;
    } else {
      // If not the owner, check memberships
      const { data: membership } = await supabase
        .from('business_memberships')
        .select('role')
        .eq('user_id', user.id)
        .eq('business_id', business_id)
        .maybeSingle();
      
      if (membership) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 });
    }

    const { data, error: insertError } = await supabase
      .from('support_tickets')
      .insert({
        user_id: user.id,
        business_id: business_id,
        subject: subject,
        category: category,
        description: description,
        status: 'open'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Ticket creation error:', insertError);
      return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
    }

    return NextResponse.json({ ticket: data });
  } catch (error) {
    console.error('Support Ticket API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
