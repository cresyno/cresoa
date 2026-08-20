import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const message = searchParams.get('message') || 'Hello, Tessa! Tell me a fun fact.';

    const API_KEY = process.env.GROQ_API_KEY;
    if (!API_KEY) {
      return NextResponse.json({ error: 'GROQ_API_KEY is missing in Vercel environment' }, { status: 500 });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-4-maverick-17b-128e-instruct', // 🟢 Switch to Maverick
        messages: [
          { role: 'system', content: `You are Tessa, a warm, professional AI assistant for Cresoa. Keep answers concise and practical.` },
          { role: 'user', content: message }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq Test Error:', response.status, errorText);
      return NextResponse.json({ 
        error: `Groq API returned status ${response.status}`, 
        details: errorText 
      }, { status: 500 });
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content || "Groq returned an empty response.";

    return NextResponse.json({ 
      success: true, 
      message: reply,
      source: 'groq_qwen_test' 
    });

  } catch (error) {
    console.error('Groq Test Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
