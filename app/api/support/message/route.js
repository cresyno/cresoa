import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { readFileSync } from 'fs';
import path from 'path';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// ════════════════════════════════════════════════════════════════
// 📄 LOAD KNOWLEDGE BASE (Source of truth)
// ════════════════════════════════════════════════════════════════
let FULL_PDF_TEXT = '';
try {
  const knowledgeBasePath = path.join(process.cwd(), 'data', 'knowledge-base.md');
  FULL_PDF_TEXT = readFileSync(knowledgeBasePath, 'utf-8');
} catch (error) {
  console.error('⚠️ Failed to load knowledge-base.md. Please ensure the file exists in /data/');
  FULL_PDF_TEXT = 'Knowledge base not loaded. Please contact support.';
}

const SYSTEM_PROMPT = `
You are Tessa, a warm, friendly, and highly professional AI assistant for Cresoa, a business management platform for Nigerian SMEs.

CRITICAL RULES:
1. You MUST ONLY answer using the "Relevant Knowledge Base Context" below. NEVER invent pricing, features, URLs, phone numbers, plans, or any product detail.
2. If the Context does not contain the answer, say: "I don't have that specific information yet. Please contact support via WhatsApp or submit a ticket."
3. Be warm, human, and direct. Use markdown (bold, lists) where helpful.
4. Remember user-provided facts and recall them directly.
5. If asked who you are, say "I'm Tessa, your Cresoa support assistant." Never mention AI providers.
6. Never repeat yourself unnecessarily.
`;

async function getConversationHistory(userId, businessId) {
  const { data, error } = await supabaseAdmin
    .from('support_messages')
    .select('sender_type, message')
    .eq('business_id', businessId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(8);

  if (error || !data) return [];
  return data.reverse().map(msg => ({
    role: msg.sender_type === 'user' ? 'user' : 'assistant',
    content: msg.message
  }));
}

// ─── Gemini Embedding (works for both chunks and query) ─────────
async function getEmbedding(text) {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) return null;

  // ✅ FIXED MODEL NAME: text-embedding-004
  const model = 'models/text-embedding-004';
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

// ─── VECTOR SEARCH (with fallback to keyword matching) ─────────
async function getRelevantChunks(query) {
  // 1. Try vector search first
  const queryEmbedding = await getEmbedding(query);
  if (queryEmbedding) {
    // Postgres vector requires a stringified array like '[0.1,0.2,...]'
    const vectorString = JSON.stringify(queryEmbedding);

    const { data, error } = await supabaseAdmin.rpc('match_knowledge', {
      query_embedding: vectorString,
      match_threshold: 0,
      match_count: 5
    });

    if (!error && data && data.length > 0) {
      console.log(`✅ Vector search returned ${data.length} chunks.`);
      return data.map(item => item.content);
    } else {
      console.error('❌ Vector search error or empty:', error?.message || 'No data');
    }
  }

  // 2. Fallback: old keyword matching (guaranteed to return something)
  console.warn('⚠️ Falling back to keyword matching...');
  const chunks = FULL_PDF_TEXT.split(/\n\s*\n|##\s*/).filter(chunk => chunk.trim().length > 50);
  const keywords = query.toLowerCase().split(' ').filter(w => w.length >= 2);
  const scored = chunks.map(chunk => {
    const lowerChunk = chunk.toLowerCase();
    let score = 0;
    for (const word of keywords) if (lowerChunk.includes(word)) score++;
    return { text: chunk, score };
  });
  const topChunks = scored.sort((a, b) => b.score - a.score).slice(0, 3);
  return topChunks.map(c => c.text).filter(t => t.length > 0);
}

async function callGroq(message, contextString, historyMessages) {
  const API_KEY = process.env.GROQ_API_KEY;
  if (!API_KEY) return null;

  try {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: `Relevant Knowledge Base Context:\n"""\n${contextString}\n"""` },
      ...historyMessages,
      { role: 'user', content: message }
    ];

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages,
        temperature: 0.2
      })
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || null;
  } catch (e) { return null; }
}

async function callGemini(message, contextString, historyMessages) {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) return null;

  try {
    const historyString = historyMessages.map(m => 
      `${m.role === 'user' ? 'User' : 'Tessa'}: ${m.content}`
    ).join('\n');
    const fullPrompt = `${SYSTEM_PROMPT}\n\nRelevant Knowledge Base Context:\n"""\n${contextString}\n"""\n\nConversation History:\n${historyString}\n\nUser Question: ${message}`;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${API_KEY}`;
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] }) });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (e) { return null; }
}

export async function POST(req) {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, business_id } = await req.json();
    if (!message || !business_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await supabaseAdmin.from('support_messages').insert([
      { business_id, user_id: user.id, sender_type: 'user', message }
    ]);

    const historyMessages = await getConversationHistory(user.id, business_id);

    // Get relevant chunks (vector, or keyword fallback)
    const relevantChunks = await getRelevantChunks(message);
    const contextString = relevantChunks.join('\n\n---\n\n');

    let answer = await callGroq(message, contextString, historyMessages);
    let source = 'groq';

    if (!answer) {
      console.warn('Groq failed, falling back to Gemini...');
      answer = await callGemini(message, contextString, historyMessages);
      source = 'gemini';
    }

    if (!answer) {
      answer = "I'm currently connecting to my AI brain. Please contact support via WhatsApp if you need immediate help.";
      source = 'fallback';
    }

    const cleanedAnswer = answer.trim();

    await supabaseAdmin.from('support_messages').insert([
      { business_id, user_id: user.id, sender_type: 'assistant', message: cleanedAnswer }
    ]);

    return NextResponse.json({ answer: cleanedAnswer, source });
  } catch (error) {
    console.error('Fatal error:', error);
    return NextResponse.json({ 
      answer: "Tessa is experiencing technical difficulties. Please try again in a moment.", 
      source: 'emergency_fallback' 
    });
  }
}
