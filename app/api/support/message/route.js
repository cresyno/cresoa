import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { message } = await req.json();

    // Try strictly Gemini 3.0 Flash, and ONLY that model
    let answer = await callGemini3(message);
    let source = 'gemini-3.0-flash';

    // If it fails for any reason, fallback to hardcoded text
    if (!answer) {
      console.warn('Gemini 3.0 Flash failed, using hardcoded fallback...');
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

// ─── Gemini 3.0 Flash Only (Google's latest free model) ───
async function callGemini3(message) {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) return null;

  try {
    // Hardcoded to the exact latest Gemini 3.0 Flash model you requested
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.0-flash-exp:generateContent?key=${API_KEY}`;
    const systemPrompt = `You are Tessa, a warm, professional, and empathetic AI assistant for Cresoa. Give very concise and practical advice for fashion designers.`;
    
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\nUser Question: ${message}` }] }]
      })
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (e) {
    return null; // Trigger hardcoded fallback
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
