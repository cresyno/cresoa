import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import path from 'path';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

const EMBED_SECRET = 'cresoa123';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');
    if (secret !== EMBED_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. Read the Knowledge Base
    const kbPath = path.join(process.cwd(), 'data', 'knowledge-base.md');
    const kbText = readFileSync(kbPath, 'utf-8');
    const chunks = kbText.split(/\n\s*\n|##\s*/).filter(chunk => chunk.trim().length > 50);

    // 2. Clear old chunks (prevent duplicates)
    await supabaseAdmin.from('knowledge_chunks').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 3. Embed using the WORKING model
    let successCount = 0;
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await getEmbedding(chunk);
      if (embedding) {
        await supabaseAdmin.from('knowledge_chunks').insert({
          content: chunk,
          embedding,
          metadata: { source: 'knowledge-base.md' }
        });
        successCount++;
      }
    }

    return NextResponse.json({ success: true, message: `✅ Embedded ${successCount} chunks successfully` });
  } catch (error) {
    console.error('Embed error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function getEmbedding(text) {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) return null;

  // Use the exact static URL string structure that successfully responded with status 200
  const url = 'https://googleapis.com' + API_KEY;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { 
          parts: [{ text: text }] 
        }
      })
    });

    if (!response.ok) {
      console.error(`Gemini API responded with status ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.embedding?.values || null;
  } catch (e) {
    console.error("Fetch or parsing failed for text chunk:", e);
    return null;
  }
}
