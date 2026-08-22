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

    // ─── STEP 1: TEST THE CORRECT EMBEDDING MODEL FIRST ───
    const testModel = 'models/embedding-001';
    const testResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${testModel}:embedContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: testModel, content: { parts: [{ text: 'test' }] } })
      }
    );
    
    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      return NextResponse.json({ 
        error: `Embedding model test FAILED with ${testResponse.status}: ${errorText}` 
      }, { status: 500 });
    }

    // ─── STEP 2: SAFELY EMBED (Create new chunk, then delete old) ───
    const kbPath = path.join(process.cwd(), 'data', 'knowledge-base.md');
    const kbText = readFileSync(kbPath, 'utf-8');
    const chunks = kbText.split(/\n\s*\n|##\s*/).filter(chunk => chunk.trim().length > 50);

    // Delete old chunks ONLY AFTER we confirm the new ones can be created
    await supabaseAdmin.from('knowledge_chunks').delete().neq('id', '00000000-0000-0000-0000-000000000000');

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

    return NextResponse.json({ 
      success: true, 
      message: `✅ Embedded ${successCount} chunks successfully using ${testModel}` 
    });

  } catch (error) {
    console.error('Embed error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function getEmbedding(text) {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) return null;

  const model = 'models/embedding-001'; // ✅ Correct model name
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, content: { parts: [{ text: text }] } })
    }
  );
  const data = await response.json();
  return data.embedding?.values || null;
}
