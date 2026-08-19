import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin';
import { sendTicketReplyEmail } from '../../../../../lib/email';

export async function POST(req) {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];

    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.email !== 'taiwoabraham640@gmail.com') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { ticketId, message, status } = await req.json();
    if (!ticketId || !message) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // 1. Fetch ticket details
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('support_tickets')
      .select('email, subject')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // 2. Send the email
    const emailResult = await sendTicketReplyEmail(
      ticket.email,
      'Cresoa Customer',
      ticket.subject,
      message
    );

    if (!emailResult.success) {
      console.error('Email sending failed:', emailResult.error);
      return NextResponse.json({ error: 'Email sending failed' }, { status: 500 });
    }

    // 3. Save the reply message to history
    await supabaseAdmin
      .from('ticket_messages')
      .insert({
        ticket_id: ticketId,
        sender_type: 'admin',
        message: message,
      });

    // 4. Update ticket status if provided
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
