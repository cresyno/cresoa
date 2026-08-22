import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import path from 'path';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

const EMBED_SECRET = 'cresoa123'; // Same secret as your embed route

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');
    if (secret !== EMBED_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. Check Knowledge Base file
    let kbLength = 0;
    let kbFirst200 = '';
    try {
      const kbPath = path.join(process.cwd(), 'data', 'knowledge-base.md');
      const kbText = readFileSync(kbPath, 'utf-8');
      kbLength = kbText.length;
      kbFirst200 = kbText.substring(0, 200);
    } catch (e) {
      kbLength = -1;
      kbFirst200 = 'File not found: ' + e.message;
    }

    // 2. Check knowledge_chunks count
    const { count, error: countError } = await supabaseAdmin
      .from('knowledge_chunks')
      .select('*', { count: 'exact', head: true });

    // 3. Test embedding generation
    let embeddingStatus = 'NOT TESTED';
    let embeddingSample = null;
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-001:embedContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'models/text-embedding-001', content: { parts: [{ text: 'test' }] } })
        }
      );
      if (response.ok) {
        const data = await response.json();
        embeddingStatus = '✅ SUCCESS';
        embeddingSample = data.embedding?.values?.length;
      } else {
        embeddingStatus = '❌ FAILED: ' + response.status;
      }
    } catch (e) {
      embeddingStatus = '❌ FAILED: ' + e.message;
    }

    // 4. Test vector search with a sample query
    let vectorSearchStatus = 'NOT TESTED';
    let vectorResults = [];
    let vectorError = null;
    try {
      const testEmbedding = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-001:embedContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'models/text-embedding-001', content: { parts: [{ text: 'cresoa pricing' }] } })
        }
      );
      const testData = await testEmbedding.json();
      const testVec = testData.embedding?.values;
      if (testVec) {
        const { data: vectorData, error: vecErr } = await supabaseAdmin.rpc('match_knowledge', {
          query_embedding: JSON.stringify(testVec),
          match_threshold: 0,
          match_count: 5
        });
        if (vecErr) {
          vectorError = vecErr.message;
          vectorSearchStatus = '❌ RPC ERROR: ' + vecErr.message;
        } else {
          vectorResults = vectorData || [];
          vectorSearchStatus = `✅ RETURNED ${vectorResults.length} results`;
        }
      }
    } catch (e) {
      vectorError = e.message;
      vectorSearchStatus = '❌ FAILED: ' + e.message;
    }

    return NextResponse.json({
      kbLength,
      kbFirst200,
      chunkCount: count,
      countError: countError?.message || null,
      embeddingStatus,
      embeddingSample,
      vectorSearchStatus,
      vectorResultsCount: vectorResults.length,
      vectorResults: vectorResults.slice(0, 2), // Show first 2 chunks
      vectorError
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
          }
