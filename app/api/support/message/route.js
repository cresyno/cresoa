import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { message } = await req.json();

    let answer = await callGemini(message);
    let source = 'gemini';

    if (!answer) {
      console.warn('Gemini completely failed (returned null/empty), falling back...');
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

// ─── Gemini Free Tier Caller (Now using gemini-1.5-pro, which is 100% free on AI Studio) ───
async function callGemini(message) {
  const API_KEY = process.env.GEMINI_API_KEY;
  
  if (!API_KEY) return "❌ Error: GEMINI_API_KEY is missing in Vercel Environment Variables.";

  try {
    // CHANGED: Using 'gemini-1.5-pro' instead of 'flash' to fix the 404 error
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${API_KEY}`;
    
    const systemPrompt = `You are Tessa, a warm, professional, and empathetic AI assistant for Cresoa. You help fashion designers and tailors run their business. Keep answers concise and practical.`;
    
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\nUser Question: ${message}` }] }]
      })
    });

    if (!res.ok) {
      let errorBody = '';
      try { errorBody = await res.text(); } catch (e) {}
      return `❌ Error: Gemini API returned status ${res.status}. Details: ${errorBody || 'Unknown API error'}`;
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) return "❌ Error: Gemini returned an empty response.";
    return text;
  } catch (e) {
    return `❌ Error: Gemini network request completely failed - ${e.message}`;
  }
}

// ─── Final Fallback ───
function getHardcodedFallback(message) {
  const lower = message.toLowerCase();
  if (lower.includes('staff')) return "To manage staff, go to the Staff page.";
  if (lower.includes('order')) return "Orders are managed in the Orders page.";
  return "I'm currently connecting to my AI brain. Please contact support via WhatsApp if you need immediate help.";
}
