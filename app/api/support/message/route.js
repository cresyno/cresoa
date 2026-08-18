import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { message } = await req.json();

    let answer = await callGemini(message);
    let source = 'gemini-2.5-flash';

    // If Gemini returns null, it means a network error happened. Use the fallback.
    if (!answer) {
      console.warn('Gemini network request completely failed (timeout/etc).');
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

// ─── Gemini 2.5 Flash (Now reports errors to the screen!) ───
async function callGemini(message) {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) return "❌ ERROR: GEMINI_API_KEY is completely missing in Vercel.";

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
    const systemPrompt = `You are Tessa, a warm, professional, and empathetic AI assistant for Cresoa. Keep answers concise and practical.`;
    
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\nUser Question: ${message}` }] }]
      })
    });

    // ⚠️ CRITICAL CHANGE: If the API gives an error, return it to the chat!
    if (!res.ok) {
      let errorBody = '';
      try { errorBody = await res.text(); } catch (e) {}
      return `❌ ERROR: Gemini API returned status ${res.status}. Details: ${errorBody}`;
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) return "❌ ERROR: Gemini returned an empty response.";
    return text;
  } catch (e) {
    // This catches network timeouts, which we fall back to hardcoded for
    return null; 
  }
}

// ─── Absolute Fallback ───
function getHardcodedFallback(message) {
  const lower = message.toLowerCase();
  if (lower.includes('staff')) return "To manage staff, go to the Staff page.";
  if (lower.includes('order')) return "Orders are managed in the Orders page.";
  if (lower.includes('subscription') || lower.includes('plan')) return "To upgrade your plan, go to the Subscription page.";
  return "I'm currently connecting to my AI brain. Please contact support via WhatsApp if you need immediate help.";
}
