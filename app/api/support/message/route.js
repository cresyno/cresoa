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
2. Use the "Relevant Knowledge Base Context" as your **primary source of truth** for specific facts (pricing, features, limits). Never invent Cresoa-specific facts that are not in that context.
3. **UNDERSTAND IMPERFECT INPUT**: Users may type with typos, broken English, slang, or incomplete sentences. Decode their meaning first. Examples:
   - "I wan know say I get 50 orders?" → "How many orders can I create on my plan?"
   - "customerss" → "customers"
   - "invoic" → "invoice"
   - "wetin be my plan?" → "What is my current plan?"
   If you can reasonably infer the intent, answer directly. If you are truly unsure, ask a clarifying question before answering.
4. **CLARIFICATION BEHAVIOR**: If the user's question is ambiguous or could refer to multiple things, ask a short, direct question. Offer 2–3 options if possible.
   Example: "Do you mean your customer limit or your order limit? Please clarify so I can help you exactly."
5. **REASONING MANDATE**: If the user's question is a rephrasing or a new angle, use your general understanding of the platform to give a helpful, logical answer. Do NOT say "I don't know" just because the exact words don't appear in the context.
6. If you are asked to "explain more" or "be more explicit," expand on the previous answer using the context you already have. Do NOT refuse.
7. Only say you don't know when the question is completely unrelated to Cresoa or business management.
8. Be warm, human, and direct. Use markdown (bold, lists, tables) where helpful.
9. Remember user-provided facts and recall them directly.
10. If asked who you are, say "I'm Tessa, your Cresoa support assistant." Never mention AI providers.
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

// Simple Levenshtein distance for fuzzy matching
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 3) return 99; // fast reject
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[m][n];
}

// Expand common synonyms / Nigerian slang
function expandTerms(text) {
  const lower = text.toLowerCase();
  const mapping = {
    'client': 'customer',
    'clients': 'customers',
    'job': 'order',
    'jobs': 'orders',
    'staffs': 'staff',
    'team': 'staff',
    'money': 'price',
    'cash': 'payment',
    'plan': 'plan',
    'subscription': 'plan',
    'limit': 'limit',
    'limits': 'limits',
    'invoice': 'invoice',
    'invoic': 'invoice',
    'invoices': 'invoice',
    'customer': 'customer',
    'customers': 'customer',
    'order': 'order',
    'orders': 'order',
    'inventory': 'inventory',
    'stock': 'inventory',
    'product': 'item',
    'products': 'items',
    'tessa': 'tessa',
  };
  // Replace common misspellings via fuzzy mapping
  const words = lower.split(/\s+/);
  const expanded = [];
  for (const w of words) {
    let found = w;
    // try exact mapping
    if (mapping[w]) found = mapping[w];
    else {
      // fuzzy match if length > 3 and within distance 2
      let best = null, bestDist = 99;
      for (const key of Object.keys(mapping)) {
        if (key.length > 2 && Math.abs(key.length - w.length) <= 2) {
          const dist = levenshtein(w, key);
          if (dist < bestDist && dist <= 2) {
            best = key;
            bestDist = dist;
          }
        }
      }
      if (best) found = mapping[best];
    }
    expanded.push(found);
  }
  return expanded.join(' ');
}

async function getRelevantChunks(query) {
  // Normalize query for better matching
  const normalizedQuery = expandTerms(query);
  const lower = normalizedQuery.toLowerCase();

  // 1. VECTOR SEARCH (lenient) – use normalized query
  const queryEmbedding = await getEmbedding(normalizedQuery);
  if (queryEmbedding) {
    const vectorString = JSON.stringify(queryEmbedding);
    const { data, error } = await supabaseAdmin.rpc('match_knowledge', {
      query_embedding: vectorString,
      match_threshold: -1,
      match_count: 8
    });

    if (!error && data && data.length > 0) {
      return data.map(item => item.content);
    }
  }

  // 2. KEYWORD FALLBACK (broader, with fuzzy matching)
  const chunks = FULL_PDF_TEXT.split(/\n\s*\n|##\s*/).filter(chunk => chunk.trim().length > 50);
  const keywords = lower.split(' ').filter(w => w.length >= 3); // ignore very short words
  const scored = chunks.map(chunk => {
    const lowerChunk = chunk.toLowerCase();
    let score = 0;
    for (const word of keywords) {
      if (lowerChunk.includes(word)) score++;
      else {
        // fuzzy match against chunk words
        const chunkWords = lowerChunk.split(/\s+/).slice(0, 100); // limit
        for (const cw of chunkWords) {
          if (cw.length > 3 && levenshtein(word, cw) <= 2) {
            score += 0.5;
            break;
          }
        }
      }
    }
    return { text: chunk, score };
  });
  const topChunks = scored.sort((a, b) => b.score - a.score).slice(0, 5);
  const relevant = topChunks.map(c => c.text).filter(t => t.length > 0);
  if (relevant.length > 0) return relevant;

  // 3. SAFE GENERAL FALLBACK (never empty)
  return ["Cresoa is a business management platform for Nigerian SMEs. For more specific details, please ask about a particular feature or plan."];
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

function cleanResponse(text) {
  if (!text) return text;
  return text.replace(/[*_`~]/g, '').trim();
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

    await supabaseAdmin.from('support_messages').insert([
      { business_id, user_id: user.id, sender_type: 'user', message }
    ]);

    const historyMessages = new_conversation ? [] : await getConversationHistory(user.id, business_id);
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

    const cleanedAnswer = cleanResponse(answer);

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
