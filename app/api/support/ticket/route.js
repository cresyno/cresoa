import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '../../../../lib/supabaseAdmin';

export async function POST(req) {
  try {
    const { email, subject, category, description } = await req.json();

    if (!email || !subject || !category || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // ✅ Just insert the raw ticket. No auth checks, no user ID validations.
    const supabaseAdmin = createAdminClient();
    const { data, error: insertError } = await supabaseAdmin
      .from('support_tickets')
      .insert({
        email: email,      // We add an 'email' column to your table
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
