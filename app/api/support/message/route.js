import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { message } = await req.json();

    // 1. Try Gemini (Google AI Studio - 100% free, no billing needed)
    let answer = await callGemini(message);
    let source = 'gemini';

    // 2. If Gemini fails, fallback to hardcoded text
    if (!answer || answer.startsWith('❌')) {
      console.warn('Gemini failed, using hardcoded fallback...');
      answer = getHardcodedFallback(message);
      source = 'fallback';
    }

    return NextResponse.json({ answer, source });
  } catch (error) {
    return NextResponse.json({ 
      answer: "Critical server error. Please try again in a minute.", 
      source: 'error' 
    });
  }
}

// ─── Gemini Free Tier Caller (Google AI Studio) ───
async function callGemini(message) {
  const API_KEY = process.env.GEMINI_API_KEY;
  
  // 1. Immediately let you know if the key isn't in Vercel
  if (!API_KEY) return "❌ Error: GEMINI_API_KEY is completely missing in Vercel Environment Variables.";

  try {
    // Using the exact URL for the standard free-tier model on AI Studio
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
    
    const systemPrompt = `You are Tessa, a warm, professional, and empathetic AI assistant for Cresoa. You help fashion designers and tailors run their business. Keep answers very concise and practical.`;
    
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\nUser Question: ${message}` }] }]
      })
    });

    // 2. If the API gives a 400, 403, 404, or 500 error, we read it and show it to you
    if (!res.ok) {
      let errorBody = '';
      try { errorBody = await res.text(); } catch (e) {}
      return `❌ Error: Gemini API returned status ${res.status}. Error details: ${errorBody || 'Unknown API error'}`;
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) return "❌ Error: Gemini returned an empty response.";
    return text;
  } catch (e) {
    return `❌ Error: Gemini network request completely failed - ${e.message}`;
  }
}

// ─── Absolute Fallback (If Gemini is offline) ───
function getHardcodedFallback(message) {
  const lower = message.toLowerCase();
  if (lower.includes('staff') || lower.includes('team')) return "To manage staff, go to the Staff page.";
  if (lower.includes('order') || lower.includes('buba')) return "Orders are managed in the Orders page.";
  if (lower.includes('subscription') || lower.includes('plan') || lower.includes('pay')) return "To upgrade your plan, go to the Subscription page.";
  if (lower.includes('production') || lower.includes('sewing')) return "To move an order through production, open the Production page.";
  return "I'm currently connecting to my AI brain. Please contact support via WhatsApp if you need immediate help.";
}
