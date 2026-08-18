import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { sendTicketReplyEmail } from '../../../../lib/email';

export async function POST(req) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    // ✅ Updated with your exact admin email
    if (user.email !== 'taiwoabraham640@gmail.com') {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 });
    }

    const { ticketId, message, status } = await req.json();
    if (!ticketId || !message) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    // 1. Get the ticket details to fetch the user's email and business name
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('*, businesses(name, owner_id), auth_users(email)')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

    // 2. Send the Brevo email
    const emailResult = await sendTicketReplyEmail(
      ticket.auth_users.email, // Recipient email
      ticket.businesses.name,  // Business Name
      ticket.subject,          // Ticket Subject
      message                  // The Admin's reply
    );

    if (!emailResult.success) {
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    // 3. Save the message to the `ticket_messages` table
    const { error: msgError } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: ticketId,
        sender_type: 'admin',
        message: message
      });
    if (msgError) console.error('Failed to save admin message:', msgError);

    // 4. Update the ticket status (if provided)
    if (status) {
      await supabase
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
