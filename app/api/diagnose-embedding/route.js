import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY missing' }, { status: 500 });
  }

  // 1. Correct model name
  const modelName = 'gemini-embedding-001'; 
  
  // 2. Removed 'models/' from the string since it is already hardcoded in Google's URL structure
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:embedContent?key=${API_KEY}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // 3. Updated body structure to match Google's API contract (wrapped in a contents array)
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
  } catch (error: any) {
    return NextResponse.json({ status: 'fetch-failed', error: error.message }, { status: 500 });
  }
}
