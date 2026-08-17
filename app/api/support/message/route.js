import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { message } = await req.json();

    // --- 1. Try Gemini ---
    let answer = await callGemini(message);
    let source = 'gemini';

    // --- 2. If Gemini fails, fallback to Groq ---
    if (!answer) {
      console.warn('Gemini failed, falling back to Groq...');
      answer = await callGroq(message);
      source = 'groq';
    }

    // --- 3. If both fail, use hardcoded fallback ---
    if (!answer) {
      console.warn('Both LLMs failed, using hardcoded fallback...');
      answer = getHardcodedFallback(message);
      source = 'fallback';
    }

    return NextResponse.json({ answer, source });
  } catch (error) {
    console.error('Support API Error:', error);
    return NextResponse.json({ 
      answer: "I'm experiencing a temporary technical glitch. Please try asking again in a moment.", 
      source: 'error' 
    });
  }
}

// ─── Gemini Caller ───
async function callGemini(message) {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) return null;

  try {
    const systemPrompt = `
You are Tessa, a warm, professional, and empathetic AI assistant for Cresoa, a business management platform built for fashion designers and tailors in Nigeria. 
You answer business questions concisely and helpfully. If you don't know the specific answer, use your general knowledge to guide them, but offer to connect them to human support if they need it.
    `;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ 
            text: `${systemPrompt}\n\nUser Question: ${message}` 
          }] 
        }]
      })
    });

    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (e) {
    return null;
  }
}

// ─── Groq Caller ───
async function callGroq(message) {
  const API_KEY = process.env.GROQ_API_KEY;
  if (!API_KEY) return null;

  try {
    const systemPrompt = `
You are Tessa, a warm, professional, and empathetic AI assistant for Cresoa, a business management platform built for fashion designers and tailors in Nigeria.
    `;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mixtral-8x7b-32768',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ]
      })
    });

    const data = await res.json();
    return data?.choices?.[0]?.message?.content || null;
  } catch (e) {
    return null;
  }
}

// ─── Absolute Fallback (If both AIs go offline) ───
function getHardcodedFallback(message) {
  const lower = message.toLowerCase();
  if (lower.includes('staff') || lower.includes('team')) return "To manage staff, go to the Staff page. You can invite, remove, or change roles there.";
  if (lower.includes('order') || lower.includes('buba')) return "Orders are managed in the Orders page. Use the 'New Order' button to create one.";
  if (lower.includes('subscription') || lower.includes('plan') || lower.includes('pay')) return "To upgrade your plan, go to the Subscription page.";
  if (lower.includes('production') || lower.includes('sewing')) return "To move an order through production, open the Production page and update the status.";
  return "I'm currently connecting to my AI brain. Please contact support via WhatsApp if you need immediate help.";
                              }
