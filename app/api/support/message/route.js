import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// ─── 1. INDIVIDUAL AI CALLS ───

async function callDeepSeek(message) {
  const API_KEY = process.env.TOKEN_HARBOR_API_KEY;
  if (!API_KEY) throw new Error('Missing TOKEN_HARBOR_API_KEY');

  const res = await fetch('https://tokenharbor.ai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-v4.1-flash:free',
      messages: [
        { role: 'system', content: 'You are Tessa, a helpful AI assistant for Cresoa. Keep answers brief and friendly.' },
        { role: 'user', content: message }
      ],
      temperature: 0.2,
    }),
  });

  if (!res.ok) throw new Error(`Token Harbor HTTP ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callGroq(message) {
  const API_KEY = process.env.GROQ_API_KEY;
  if (!API_KEY) throw new Error('Missing GROQ_API_KEY');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openai/gpt-oss-20b',
      messages: [
        { role: 'system', content: 'You are Tessa, a helpful AI assistant for Cresoa. Keep answers brief and friendly.' },
        { role: 'user', content: message }
      ],
      temperature: 0.2,
    }),
  });

  if (!res.ok) throw new Error(`Groq HTTP ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callGemini(message) {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) throw new Error('Missing GEMINI_API_KEY');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `You are Tessa, a helpful AI assistant for Cresoa. Keep answers brief and friendly.\n\nUser: ${message}` }] }]
    }),
  });

  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ─── 2. MINIMALIST ROUTE (With Rotation) ───

export async function POST(req) {
  try {
    // Basic Auth check just so the frontend doesn't throw a 401 Unauthorized
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get Message
    const body = await req.json().catch(() => ({}));
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message) return NextResponse.json({ error: 'Missing message' }, { status: 400 });

    // ─── ROTATION SYSTEM ───
    let answer = null;
    let source = '';

    try {
      console.log('Attempting DeepSeek...');
      answer = await callDeepSeek(message);
      source = 'deepseek';
    } catch (e) {
      console.warn('DeepSeek failed:', e.message);
      
      try {
        console.log('Attempting Groq...');
        answer = await callGroq(message);
        source = 'groq';
      } catch (e2) {
        console.warn('Groq failed:', e2.message);

        try {
          console.log('Attempting Gemini...');
          answer = await callGemini(message);
          source = 'gemini';
        } catch (e3) {
          console.warn('Gemini failed:', e3.message);
        }
      }
    }

    if (!answer) {
      return NextResponse.json({ answer: "All AI models are currently offline. Check your API keys.", source: 'fallback' });
    }

    // Return the exact format TessaBottomSheet.jsx expects
    return NextResponse.json({ answer, source });

  } catch (error) {
    console.error('Fatal error:', error);
    return NextResponse.json({ answer: 'Tessa is experiencing technical difficulties.', source: 'emergency_fallback' });
  }
        }
