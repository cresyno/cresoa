import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req) {
  try {
    // 1. Authenticate the user
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse the request body
    const { business_id, subject, category, description } = await req.json();

    // 3. Validate required fields
    if (!business_id || !subject || !category || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 4. Insert the ticket into the new table
    const { data, error } = await supabase
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

    if (error) {
      console.error('Ticket creation error:', error);
      return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
    }

    // 5. Return the newly created ticket
    return NextResponse.json({ ticket: data });
  } catch (error) {
    console.error('Support Ticket API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
