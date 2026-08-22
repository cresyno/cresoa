import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import path from 'path';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// 🔐 Replace this with any secret word you choose (e.g., "cresoa123")
const EMBED_SECRET = 'cresoa123';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');

    // 1. Check if the secret matches
    if (secret !== EMBED_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Read the Knowledge Base
    const kbPath = path.join(process.cwd(), 'data', 'knowledge-base.md');
    const kbText = readFileSync(kbPath, 'utf-8');

    // 3. Split into chunks
    const chunks = kbText.split(/\n\s*\n|##\s*/).filter(chunk => chunk.trim().length > 50);

    // 4. Delete old chunks (prevent duplicates)
    await supabaseAdmin.from('knowledge_chunks').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 5. Generate embeddings using Gemini (free)
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await getEmbedding(chunk);
      if (embedding) {
        await supabaseAdmin.from('knowledge_chunks').insert({
          content: chunk,
          embedding,
          metadata: { source: 'knowledge-base.md' }
        });
      }
    }

    return NextResponse.json({ success: true, message: `Embedded ${chunks.length} chunks.` });

  } catch (error) {
    console.error('Embed error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function getEmbedding(text) {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) return null;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-001:embedContent?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/text-embedding-001',
        content: { parts: [{ text: text }] }
      })
    }
  );
  const data = await response.json();
  return data.embedding?.values || null;
}
