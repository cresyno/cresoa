import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { message } = await req.json();

    // 1. Try Gemini
    let answer = await callGemini(message);
    let source = 'gemini';

    // 2. If Gemini fails, try Groq
    if (!answer || answer.startsWith('❌')) {
      console.warn('Gemini failed, falling back to Groq...');
      answer = await callGroq(message);
      source = 'groq';
    }

    // 3. If both fail, show the specific error to the user
    if (!answer || answer.startsWith('❌')) {
      console.warn('Both LLMs failed...');
      // Instead of hiding the error, we pass the specific failure reason to the user
      if (answer && answer.startsWith('❌')) {
        // We keep the error so they know what to fix
      } else {
        answer = "❌ Error: Both AI engines failed silently. Please check that your GEMINI_API_KEY and GROQ_API_KEY are correctly added in your Vercel Environment Variables.";
      }
      source = 'error';
    }

    return NextResponse.json({ answer, source });
  } catch (error) {
    console.error('Support API Error:', error);
    return NextResponse.json({ 
      answer: "❌ Critical Server Error: " + error.message, 
      source: 'fatal_error' 
    });
  }
}

// ─── Gemini Caller ───
async function callGemini(message) {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) return "❌ Error: GEMINI_API_KEY is missing from Vercel environment.";

  try {
    const systemPrompt = `You are Tessa, a warm, professional, and empathetic AI assistant for Cresoa.`;
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
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

// ─── Groq Caller ───
async function callGroq(message) {
  const API_KEY = process.env.GROQ_API_KEY;
  if (!API_KEY) return "❌ Error: GROQ_API_KEY is missing from Vercel environment.";

  try {
    const systemPrompt = `You are Tessa, a warm, professional, and empathetic AI assistant for Cresoa.`;
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mixtral-8x7b-32768',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }]
      })
    });

    if (!res.ok) {
      return `❌ Error: Groq API returned status ${res.status}`;
    }

    const data = await res.json();
    return data?.choices?.[0]?.message?.content || "❌ Error: Groq returned an empty response.";
  } catch (e) {
    return `❌ Error: Groq network request failed - ${e.message}`;
  }
}
