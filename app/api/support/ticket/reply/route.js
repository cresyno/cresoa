import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { sendTicketReplyEmail } from '../../../../lib/email';

export async function POST(req) {
  try {
    // Secured so only YOU can run this
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== 'taiwoabraham640@gmail.com') {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 });
    }

    const { ticketId, message, status } = await req.json();
    if (!ticketId || !message) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    // 1. Fetch the ticket's email and subject using admin client
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('support_tickets')
      .select('email, subject')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // 2. Send the Brevo Email
    const emailResult = await sendTicketReplyEmail(
      ticket.email,       // Recipient email
      'Cresoa Customer',  // Business name (defaults to Customer since we don't have their biz name)
      ticket.subject,     // Ticket Subject
      message             // Admin reply
    );

    if (!emailResult.success) {
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    // 3. Save the message to history
    await supabaseAdmin
      .from('ticket_messages')
      .insert({ ticket_id: ticketId, sender_type: 'admin', message });

    // 4. Update the ticket status
    if (status) {
      await supabaseAdmin
        .from('support_tickets')
        .update({ status })
        .eq('id', ticketId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reply API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
