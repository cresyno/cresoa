import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const businessId = body.business_id;
    if (!businessId) return NextResponse.json({ error: 'Missing business ID' }, { status: 400 });

    // 1. Get outstanding balances
    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('price, amount_paid, title, customer_id, due_date')
      .eq('business_id', businessId)
      .neq('current_status', 'draft');

    const today = new Date().toISOString().split('T')[0];
    let totalOutstanding = 0;
    let dueToday = 0;

    (orders || []).forEach(o => {
      const balance = (Number(o.price) || 0) - (Number(o.amount_paid) || 0);
      if (balance > 0) totalOutstanding += balance;
      if (o.due_date === today) dueToday++;
    });

    // 2. Build the greeting
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    
    let text = `${greeting}! I'm Tessa. `;
    
    if (dueToday > 0 && totalOutstanding > 0) {
      text += `You have **${dueToday} order(s)** due today, and a total outstanding balance of **₦${totalOutstanding.toLocaleString()}**. Would you like me to draft a payment reminder for your debtors?`;
    } else if (totalOutstanding > 0) {
      text += `Your business is looking active. You currently have an outstanding balance of **₦${totalOutstanding.toLocaleString()}** from unpaid orders. Want to see who owes you?`;
    } else if (dueToday > 0) {
      text += `You have **${dueToday} order(s)** scheduled for delivery today. Want me to pull up the list?`;
    } else {
      text += `You have no urgent orders due today, and all balances are clear. What are we working on today?`;
    }

    return NextResponse.json({ text });
  } catch (error) {
    return NextResponse.json({ text: 'Welcome back! How can I help you today?' }); // Graceful fallback
  }
}
