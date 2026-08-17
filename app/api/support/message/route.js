import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { message } = await req.json();

    // 1. Try Gemini (Stable model: gemini-1.5-flash)
    let answer = await callGemini(message);
    let source = 'gemini';

    // 2. If Gemini fails, fallback to hardcoded text (NO GROQ, to avoid 404 errors)
    if (!answer || answer.startsWith('❌')) {
      console.warn('Gemini failed, falling back to hardcoded response...');
      answer = getHardcodedFallback(message);
      source = 'fallback';
    }

    return NextResponse.json({ answer, source });
  } catch (error) {
    console.error('Support API Error:', error);
    return NextResponse.json({ 
      answer: "I'm having a temporary technical glitch. Please try again in a minute.", 
      source: 'fatal_error' 
    });
  }
}

// ─── Gemini Caller (Only AI used) ───
async function callGemini(message) {
  const API_KEY = process.env.GEMINI_API_KEY;
  
  // If the key isn't set in Vercel, immediately return fallback
  if (!API_KEY) return "❌ Error: GEMINI_API_KEY is missing from Vercel environment.";

  try {
    // Using the proven stable Gemini 1.5 Flash model
    const systemPrompt = `You are Tessa, a warm, professional, and empathetic AI assistant for Cresoa, a platform for fashion designers and tailors. You provide helpful, concise answers.`;
    
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\nUser Question: ${message}` }] }]
      })
    });

    if (!res.ok) {
      return `❌ Error: Gemini API returned status ${res.status}`;
    }

    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "❌ Error: Gemini returned an empty response.";
  } catch (e) {
    return `❌ Error: Gemini network request failed - ${e.message}`;
  }
}

// ─── Absolute Fallback (If Gemini is offline) ───
function getHardcodedFallback(message) {
  const lower = message.toLowerCase();
  if (lower.includes('staff') || lower.includes('team')) return "To manage staff, go to the Staff page. You can invite, remove, or change roles there.";
  if (lower.includes('order') || lower.includes('buba')) return "Orders are managed in the Orders page. Use the 'New Order' button to create one.";
  if (lower.includes('subscription') || lower.includes('plan') || lower.includes('pay')) return "To upgrade your plan, go to the Subscription page.";
  if (lower.includes('production') || lower.includes('sewing')) return "To move an order through production, open the Production page and update the status.";
  return "I'm currently connecting to my AI brain. Please contact support via WhatsApp if you need immediate help.";
}
