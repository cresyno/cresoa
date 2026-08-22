import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { readFileSync } from 'fs';
import path from 'path';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// ════════════════════════════════════════════════════════════════
// 📄 LOAD KNOWLEDGE BASE
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
1. Be natural and conversational. You may explain, elaborate, and reason freely using the relevant context provided.
2. Use the "Relevant Knowledge Base Context" as your **primary source of truth** for specific facts (pricing, features, limits). Never invent facts not in that context.
3. If the context does not contain a specific fact, you may use your general understanding of business management to give a helpful, logical answer—as long as you don't invent Cresoa-specific features.
4. If you are asked to "explain more" or "be more explicit," expand on the previous answer using the context you already have. Do NOT refuse—just give more detail.
5. If you are completely unsure about a Cresoa-specific detail, say: "I don't have that specific information yet. Please contact support via WhatsApp."
6. Be warm, human, and direct. Use markdown (bold, lists) where helpful.
7. Remember user-provided facts and recall them directly.
8. If asked who you are, say "I'm Tessa, your Cresoa support assistant." Never mention AI providers.
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

async function getEmbedding(text) {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) return null;

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=' + API_KEY;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: { parts: [{ text: text }] } })
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.embedding?.values || null;
  } catch (e) { return null; }
}

// ─── GUARANTEED RETRIEVAL ─────────────────────────────────────
async function getRelevantChunks(query) {
  const lower = query.toLowerCase();

  // 🔥 DIRECT OVERRIDE: If they ask about plans/pricing, pull the pricing section
  if (lower.includes('pricing') || lower.includes('plan') || lower.includes('price') || lower.includes('subscription')) {
    const pricingSection = FULL_PDF_TEXT.split('PLANS AND PRICING')[1]?.split('FEATURE AVAILABILITY')[0];
    if (pricingSection && pricingSection.length > 50) {
      console.log('✅ Pricing chunk manually retrieved.');
      return [pricingSection.trim()];
    }
  }

  // 1. Vector search
  const queryEmbedding = await getEmbedding(query);
  if (queryEmbedding) {
    const vectorString = JSON.stringify(queryEmbedding);
    const { data, error } = await supabaseAdmin.rpc('match_knowledge', {
      query_embedding: vectorString,
      match_threshold: -1, // Always returns something
      match_count: 5
    });

    if (!error && data && data.length > 0) {
      return data.map(item => item.content);
    }
  }

  // 2. Keyword matching fallback
  const chunks = FULL_PDF_TEXT.split(/\n\s*\n|##\s*/).filter(chunk => chunk.trim().length > 50);
  const keywords = lower.split(' ').filter(w => w.length >= 2);
  const scored = chunks.map(chunk => {
    const lowerChunk = chunk.toLowerCase();
    let score = 0;
    for (const word of keywords) if (lowerChunk.includes(word)) score++;
    return { text: chunk, score };
  });
  const topChunks = scored.sort((a, b) => b.score - a.score).slice(0, 3);
  const relevant = topChunks.map(c => c.text).filter(t => t.length > 0);
  if (relevant.length > 0) return relevant;

  // 3. Emergency: pull a small, safe snippet from the KB (pricing or first 2000 chars)
  return [FULL_PDF_TEXT.substring(0, 2000)];
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
    const textResponse = await res.text();
    if (!textResponse) return null;
    const data = JSON.parse(textResponse);
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (e) { return null; }
}

export async function POST(req) {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { message, business_id, new_conversation } = await req.json();
    if (!message || !business_id) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

    // Save user message
    await supabaseAdmin.from('support_messages').insert([
      { business_id, user_id: user.id, sender_type: 'user', message }
    ]);

    // Fetch history (ignore if new conversation)
    const historyMessages = new_conversation ? [] : await getConversationHistory(user.id, business_id);

    // GUARANTEED context retrieval
    const relevantChunks = await getRelevantChunks(message);
    const contextString = relevantChunks.join('\n\n---\n\n');

    // Try Groq
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
