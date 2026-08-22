import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) return NextResponse.json({ error: 'GEMINI_API_KEY missing' }, { status: 500 });

  // 📦 FIX 1: Provide ONLY the specific model name token string
  const modelName = 'text-embedding-004'; 

  // 🔗 FIX 2: Swapped out v1beta to standard production v1, eliminating duplicate segments
  const url = `https://googleapis.com{modelName}:embedContent?key=${API_KEY}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // 🧬 FIX 3: Aligned payload format to Google's REST 'contents' block layout structural syntax
      body: JSON.stringify({
        content: { 
          parts: [{ text: 'test' }] 
        }
      })
    });

    const rawText = await res.text();
    return NextResponse.json({
      status: res.status,
      ok: res.ok,
      rawResponse: rawText.substring(0, 800)
    });
  } catch (error) {
    return NextResponse.json({ status: 'fetch-failed', error: error.message }, { status: 500 });
  }
}
