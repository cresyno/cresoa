import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { readFileSync } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// ════════════════════════════════════════════════════════════════
// 📄 LOAD KNOWLEDGE BASE FROM EXTERNAL .MD FILE
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
3. Never invent features or expose any AI technology provider. Just say "I'm Tessa, your Cresoa support assistant."
`;

// ─── 3. GET CONVERSATION HISTORY (8 messages memory) ────────
async function getConversationHistory(userId, businessId) {
  const supabase = createRouteHandlerClient({ cookies });
  
  const { data, error } = await supabase
    .from('support_messages')
    .select('sender_type, message')
    .eq('business_id', businessId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(8); 
  
  if (error || !data) {
    console.error('❌ Supabase Memory Fetch Error:', error);
    return [];
  }

  // Map into exact structural format Groq expects
  const formattedHistory = data.reverse().map(msg => ({
    role: msg.sender_type === 'user' ? 'user' : 'assistant',
    content: msg.message
  }));

  console.log(`🧠 Loaded ${formattedHistory.length} structural messages from database history.`);
  return formattedHistory;
}

// ─── 4. GROQ CALLER (WITH STRUCTURED HISTORY & LOW TEMP) ────
async function callGroq(message, contextString, historyMessages) {
  const API_KEY = process.env.GROQ_API_KEY;
  if (!API_KEY) {
    console.error("❌ Missing GROQ_API_KEY environment variable.");
    return null;
  }
  
  try {
    // Isolate document context clearly within the System instructions
    const structuredSystemPrompt = `
${SYSTEM_PROMPT}

CRITICAL OPERATIONAL INSTRUCTIONS:
- You are checking a live chat log array.
- Prioritize explicit facts stated by the user directly in the chat history transcript (like their name, preferences, or selections) over the static platform documentation.
- If the user asks about an explicit detail they provided in previous messages (e.g., their name, business name, or previous prompt details), extract it right from the chat transcript context below. Do not use generic platform text to answer personal details.

PLATFORM KNOWLEDGE BASE RECORDS (Use ONLY for brand new feature queries or company FAQs):
"""
${contextString}
"""
`;

    // Filter out potential null or empty records safely
    const cleanHistory = (historyMessages || []).filter(m => m && m.content);

    // Build the clear message payload array for Groq
    const finalizedMessages = [
      { role: 'system', content: structuredSystemPrompt },
      ...cleanHistory,
      { role: 'user', content: message }
    ];

    // Debug tracking printout for terminal observation
    console.log("🔥 LOGGING DATA CURRENTLY TRANSMITTED TO GROQ:\n", JSON.stringify(finalizedMessages, null, 2));

    const res = await fetch('https://groq.com', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${API_KEY}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b', 
        messages: finalizedMessages,
        temperature: 0.1 // Force strict context compliance over creativity
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`❌ Groq API Error Status ${res.status}:`, errText);
      return null;
    }

    const data = await res.json();
    // 🎯 FIX: Corrected syntax typo from double optional chaining down to single clean object extraction
    return data?.choices?.[0]?.message?.content || null;
  } catch (e) { 
    console.error('❌ callGroq Exception:', e);
    return null; 
  }
}

// ─── 5. HARDCODED FALLBACK ──────────────────────────────────
function getHardcodedFallback(message) {
  const lower = message.toLowerCase();
  if (lower.includes('staff') || lower.includes('team')) return "To manage staff, go to the Staff page.";
  if (lower.includes('order') || lower.includes('buba')) return "Orders are managed in the Orders page.";
  return "I'm currently connecting to my AI brain. Please contact support via WhatsApp if you need immediate help.";
}

// ─── 6. MAIN ORCHESTRATOR ──────────────────────────────────
export async function POST(req) {
  try {
    const authHeader = req.headers.get('Authorization');
    // 🎯 FIX: Added index [1] array slice to safely grab the actual string token parameter
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

    // Save the incoming message IMMEDIATELY to prevent asynchronous data truncation.
    await supabase.from('support_messages').insert([
      { business_id, user_id: user.id, sender_type: 'user', message }
    ]);

    // Parse knowledge documentation text
    const chunks = splitIntoChunks(FULL_PDF_TEXT);
    const relevantContext = getRelevantChunks(message, chunks);
    const contextString = relevantContext.join('\n\n---\n\n');

    // Fetch history now. This ensures the current message is already registered in the array block.
    const historyMessages = await getConversationHistory(user.id, business_id);

    // Call Groq (Primary integration engine)
    let answer = await callGroq(message, contextString, historyMessages);
    let source = 'groq';

    // ULTIMATE FALLBACK
    if (!answer) {
      answer = getHardcodedFallback(message);
      source = 'fallback';
    }

    const cleanedAnswer = answer.trim();

    // Write ONLY the assistant response back down into the database logs.
    try {
      const { error: insertError } = await supabase.from('support_messages').insert([
        { business_id, user_id: user.id, sender_type: 'assistant', message: cleanedAnswer }
      ]);
      if (insertError) console.error('❌ Database insertion failed for assistant log:', insertError);
    } catch (memoryError) {
      console.warn('Memory saving error (ignored):', memoryError);
    }

    return NextResponse.json({ answer: cleanedAnswer, source });
  } catch (error) {
    console.error('Fatal error:', error);
    return NextResponse.json({ 
      answer: "Tessa is experiencing technical difficulties. Please try again in a moment.", 
      source: 'emergency_fallback' 
    });
  }
           }
