import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient';

export async function POST(req) {
  try {
    // 1. Get user using the exact pattern from your dashboard layout
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { message, business_id } = await req.json();

    // 2. Check membership
    const { data: membership } = await supabase
      .from('business_memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('business_id', business_id)
      .maybeSingle();

    if (!membership) return NextResponse.json({ error: 'No access to business' }, { status: 403 });

    // 3. Tessa's brain (Hardcoded inside so it can't crash)
    let answer = "I couldn't find a specific answer to that, but please contact support via WhatsApp!";
    const lowerMsg = message.toLowerCase();

    if (lowerMsg.includes('staff') || lowerMsg.includes('team')) {
      answer = "To manage staff, go to the Staff page. You can invite, remove, or change roles there.";
    } else if (lowerMsg.includes('order') || lowerMsg.includes('buba')) {
      answer = "Orders are managed in the Orders page. Use the 'New Order' button to create one.";
    } else if (lowerMsg.includes('group') || lowerMsg.includes('aso')) {
      answer = "Groups (Aso-Ebi) are managed in the Groups page.";
    } else if (lowerMsg.includes('subscription') || lowerMsg.includes('plan') || lowerMsg.includes('pay')) {
      answer = "To upgrade or manage your plan, go to the Subscription page.";
    } else if (lowerMsg.includes('production') || lowerMsg.includes('sewing')) {
      answer = "To move an order through production, open the Production page and update the status step by step.";
    } else if (lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
      answer = "Hello! I'm Tessa. Ask me anything about your business.";
    }

    return NextResponse.json({ answer, source: 'fallback' });
  } catch (error) {
    console.error('Support API Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
