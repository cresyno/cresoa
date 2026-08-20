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

// ─── 1. SMART RAG ENGINE ─────────────────────────────────────
function splitIntoChunks(text) {
  if (!text || text.trim() === '') return [];
  return text.split(/\n\s*\n|##\s*/).filter(chunk => chunk.trim().length > 50);
}

function getRelevantChunks(query, chunks) {
  if (chunks.length === 0) return ["No context available."];
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

// ─── 2. THE CONCISE 3-RULE SYSTEM PROMPT ────────────────────
const SYSTEM_PROMPT = `
You are Tessa, a warm, friendly, and highly intelligent support assistant for Cresoa.

RULES:
1. Use the chat history first. "Another 2" means 2 more sentences about the exact previous topic. Never drift.
2. Use the Knowledge Base only for brand-new topics.
3. Never expose AI technology providers. If asked who you are, say "I'm Tessa, your Cresoa support assistant." Do not start every reply with this introduction.
`;

// ─── 3. GET CONVERSATION HISTORY (Using supabaseAdmin) ─────
async function getConversationHistory(userId, businessId) {
  const { data, error } = await supabaseAdmin
    .from('support_messages')
    .select('sender_type, message')
    .eq('business_id', businessId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(8);

  if (error || !data) {
    console.error('❌ Admin Memory Fetch Error:', error);
    return [];
  }

  return data.reverse().map(msg => ({
    role: msg.sender_type === 'user' ? 'user' : 'assistant',
    content: msg.message
  }));
}

// ─── 4. GROQ PRIMARY CALLER ──────────────────────────────────
async function callGroq(message, contextString, historyMessages) {
  const API_KEY = process.env.GROQ_API_KEY;
  if (!API_KEY) return null;

  try {
    const dynamicSystem = `${SYSTEM_PROMPT}\n\nRelevant Platform Knowledge Base Context:\n"""\n${contextString}\n"""`;
    const messages = [
      { role: 'system', content: dynamicSystem },
      ...historyMessages,
      { role: 'user', content: message }
    ];

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages,
        temperature: 0.2
      })
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || null;
  } catch (e) { return null; }
}

// ─── 5. HARDCODED FALLBACK ──────────────────────────────────
function getHardcodedFallback(message) {
  const lower = message.toLowerCase();
  if (lower.includes('staff') || lower.includes('team')) return "To manage staff, go to the Staff page.";
  if (lower.includes('order') || lower.includes('buba')) return "Orders are managed in the Orders page.";
  return "I'm currently connecting to my AI brain. Please contact support via WhatsApp if you need immediate help.";
}

// ─── 6. MAIN ORCHESTRATOR (Admin Client for Memory) ─────────
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

    // 🔥 STEP 1: Save USER message using ADMIN client (bypasses RLS)
    await supabaseAdmin.from('support_messages').insert([
      { business_id, user_id: user.id, sender_type: 'user', message }
    ]);

    // 2. RAG chunks
    const chunks = splitIntoChunks(FULL_PDF_TEXT);
    const relevantContext = getRelevantChunks(message, chunks);
    const contextString = relevantContext.join('\n\n---\n\n');

    // 3. Fetch history (Admin client ensures we always get data)
    const historyMessages = await getConversationHistory(user.id, business_id);

    // 4. Groq
    let answer = await callGroq(message, contextString, historyMessages);
    let source = 'groq';

    if (!answer) {
      answer = getHardcodedFallback(message);
      source = 'fallback';
    }

    const cleanedAnswer = answer.trim();

    // 🔥 STEP 2: Save ASSISTANT message using ADMIN client
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
