import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { message } = await req.json();

    // Tessa's brain (100% hardcoded, zero database checks)
    let answer = "I'm currently being updated and can only provide basic answers. Please contact support for detailed help!";
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
      answer = "Hello! I'm Tessa. I'm currently offline for upgrades, but I'll be back with superpowers soon!";
    }

    // Force a 200 OK reply so the frontend never crashes
    return NextResponse.json({ answer, source: 'hardcoded' });
  } catch (error) {
    // Absolute fallback, prevents the "Tessa is having trouble connecting" message
    return NextResponse.json({ answer: "Tessa is experiencing a temporary glitch. Please try again in a minute.", source: 'fallback' });
  }
}
