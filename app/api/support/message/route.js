import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { message } = await req.json();

    let answer = await callGemini(message);
    let source = 'gemini';

    if (!answer) {
      console.warn('Gemini failed, falling back to hardcoded text...');
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

// ─── Gemini 3 Flash / 2.0 Flash (Free, fastest model) ───
async function callGemini(message) {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) return null;

  // The models to try (2.0 Flash is the stable fast one, 3.0 is the newest preview)
  const models = ['gemini-2.0-flash-exp', 'gemini-3.0-flash-exp'];

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
      const systemPrompt = `You are Tessa, a warm, professional, and empathetic AI assistant for Cresoa. Give very concise and practical advice for fashion designers.`;
      
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\nUser Question: ${message}` }] }]
        })
      });

      if (!res.ok) continue; // If this model fails, try the next one in the list

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch (e) {
      continue; // If network fails, try the next model
    }
  }
  return null; // Both models failed, trigger hardcoded fallback
}

// ─── Absolute Fallback (If both Gemini models fail) ───
function getHardcodedFallback(message) {
  const lower = message.toLowerCase();
  if (lower.includes('staff')) return "To manage staff, go to the Staff page.";
  if (lower.includes('order')) return "Orders are managed in the Orders page.";
  if (lower.includes('subscription') || lower.includes('plan')) return "To upgrade your plan, go to the Subscription page.";
  return "I'm currently connecting to my AI brain. Please contact support via WhatsApp if you need immediate help.";
}
