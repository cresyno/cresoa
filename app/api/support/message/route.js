import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { message } = await req.json();

    let answer = await callGemini(message);
    let source = 'gemini-2.5-flash';

    if (!answer) {
      console.warn('Gemini 2.5 Flash failed, using hardcoded fallback...');
      answer = getHardcodedFallback(message);
      source = 'fallback';
    }

    return NextResponse.json({ answer, source });
  } catch (error) {
    return NextResponse.json({ 
      answer: "I'm having a technical glitch. Please try again in a minute.", 
      source: 'error' 
    });
  }
}

// ─── Stable Gemini 2.5 Flash (Universally available on free tier) ───
async function callGemini(message) {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) return null;

  try {
    // Using the official, stable 2.5 Flash model
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
    const systemPrompt = `You are Tessa, a warm, professional, and empathetic AI assistant for Cresoa. Give concise and practical advice for fashion designers.`;
    
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\nUser Question: ${message}` }] }]
      })
    });

    if (!res.ok) {
      // If we get an error, log it to the terminal and return null to trigger fallback
      const errorBody = await res.text();
      console.error(`Gemini API Error: ${res.status} - ${errorBody}`);
      return null; 
    }

    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (e) {
    console.error('Gemini network error:', e.message);
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
