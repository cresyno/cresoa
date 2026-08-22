import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY missing' }, { status: 500 });
  }

  const modelName = 'gemini-embedding-001'; 
  const url = `https://googleapis.com{modelName}:embedContent?key=${API_KEY}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
