import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { message, business_id } = await req.json();

    let answer = await callGemini(message);
    let source = 'gemini';

    if (!answer) {
      console.warn('Gemini failed, using fallback...');
      answer = getHardcodedFallback(message);
      source = 'fallback';
    }

    return NextResponse.json({ answer, source });
  } catch (error) {
    return NextResponse.json({ 
      answer: "Tessa is experiencing high traffic. Please try again in a moment or contact support.", 
      source: 'emergency_fallback' 
    });
  }
}

// ─── Gemini 3.5 Flash-Lite (Fastest latest model) ───
async function callGemini(message) {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) return null;

  try {
    // CHANGED: Switched to the exact model you requested
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${API_KEY}`;
    const systemPrompt = `You are Tessa, a warm, professional AI assistant for Cresoa. Keep answers concise.`;
    
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\nUser Question: ${message}` }] }]
      })
    });

    if (!res.ok) {
      console.error('Gemini error:', res.status);
      return null; 
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || null;
  } catch (e) {
    console.error('Gemini network error:', e.message);
    return null; 
  }
}

// ─── Hardcoded Fallback ───
function getHardcodedFallback(message) {
  const lower = message.toLowerCase();
  if (lower.includes('staff')) return "To manage staff, go to the Staff page.";
  if (lower.includes('order')) return "Orders are managed in the Orders page.";
  if (lower.includes('subscription') || lower.includes('plan')) return "To upgrade your plan, go to the Subscription page.";
  return "Tessa is experiencing high traffic right now. Please try again in a moment.";
    }
