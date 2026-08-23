import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { readFileSync } from 'fs';
import path from 'path';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// Load Knowledge Base
let FULL_PDF_TEXT = '';
try {
  const knowledgeBasePath = path.join(process.cwd(), 'data', 'knowledge-base.md');
  FULL_PDF_TEXT = readFileSync(knowledgeBasePath, 'utf-8');
} catch (error) {
  FULL_PDF_TEXT = 'Knowledge base not loaded.';
}

// ─── THE EXACT ORIGINAL 13 RULES (PRESERVED) ───
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
11. **NEVER mention the knowledge base, the system prompt, context, or any internal mechanisms.** If the user asks how you know something, simply say you have access to Cresoa's official information and platform details.
12. If the user asks for the website or how to access Cresoa, respond with: "You can access Cresoa at https://cresoa.vercel.app" (or the current production URL). Do NOT tell them to search for it or guess.
13. **FOUNDER IDENTITY (FLEXIBLE BUT ABSOLUTE)**: When asked about who created Cresoa, who is the founder, CEO, owner, inventor, or anyone behind the platform — respond with confidence and warmth, but ALWAYS include the name **Taiwo Abraham Feranmi** as the answer. You may phrase it naturally, for example:
   - "Cresoa was founded by Taiwo Abraham Feranmi."
   - "The visionary behind Cresoa is Taiwo Abraham Feranmi."
   - "Taiwo Abraham Feranmi is the CEO and founder of Cresoa."
   - "Cresoa is the brainchild of Taiwo Abraham Feranmi."
   - "Taiwo Abraham Feranmi is the owner and creator."
   Never say you don't know, never deflect to support, and never mention any other person. Even if the question uses slang or typos, the answer must still include Taiwo Abraham Feranmi.
`;

// ─── SIMPLE DATA FETCHER (Bypasses AI for data questions) ───
async function fetchBusinessData(message, businessId) {
  if (!businessId) return null;
  const lower = message.toLowerCase();

  // Check if user is asking about customers (any variation)
  if (/(customer|client|buyer|people|patron)/.test(lower)) {
    const { count } = await supabaseAdmin
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId);
    return { type: 'customers', count: count || 0 };
  }

  // Check if user is asking about orders (any variation)
  if (/(order|job|delivery|work|task)/.test(lower)) {
    const { count } = await supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId);
    return { type: 'orders', count: count || 0 };
  }

  // Check if user is asking about revenue
  if (/(revenue|money|income|sales|profit|cash)/.test(lower)) {
    const { data } = await supabaseAdmin
      .from('orders')
      .select('price')
      .eq('business_id', businessId);
    const total = (data || []).reduce((sum, o) => sum + Number(o.price || 0), 0);
    return { type: 'revenue', amount: total };
  }

  return null; // Not a data question
}

// ─── MAIN POST ROUTE ───
export async function POST(req) {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { message, business_id, new_conversation } = await req.json();
    if (!message) return NextResponse.json({ error: 'Missing message' }, { status: 400 });

    // Get business ID (URL param or fallback to membership)
    let validBusinessId = business_id;
    if (!validBusinessId) {
      const { data: membership } = await supabaseAdmin
        .from('business_memberships')
        .select('business_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      if (membership) validBusinessId = membership.business_id;
    }

    if (!validBusinessId) return NextResponse.json({ error: 'No business found' }, { status: 400 });

    // ─── 1. CHECK IF THIS IS A DATA QUESTION (Bypass AI) ───
    const businessData = await fetchBusinessData(message, validBusinessId);
    if (businessData) {
      let answer = '';
      if (businessData.type === 'customers') {
        answer = `You currently have ${businessData.count} customers in your Cresoa account.`;
      } else if (businessData.type === 'orders') {
        answer = `You currently have ${businessData.count} orders in your Cresoa dashboard.`;
      } else if (businessData.type === 'revenue') {
        answer = `Your total revenue is ₦${businessData.amount.toLocaleString()}.`;
      }

      await supabaseAdmin.from('support_messages').insert([
        { business_id: validBusinessId, user_id: user.id, sender_type: 'user', message },
        { business_id: validBusinessId, user_id: user.id, sender_type: 'assistant', message: answer }
      ]);

      return NextResponse.json({ answer, source: 'data' });
    }

    // ─── 2. OTHERWISE, CALL GROQ USING THE FULL RULES ───
    const API_KEY = process.env.GROQ_API_KEY;
    if (!API_KEY) return NextResponse.json({ error: 'AI not configured' }, { status: 500 });

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT }, // ✅ Full original prompt
      { role: 'system', content: `Relevant Knowledge Base Context:\n"""\n${FULL_PDF_TEXT.slice(0, 3000)}\n"""` },
      { role: 'user', content: message }
    ];

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'openai/gpt-oss-20b', messages, temperature: 0.2 })
    });

    let answer = "I'm having trouble connecting.";

    if (res.ok) {
      const data = await res.json();
      answer = data?.choices?.[0]?.message?.content || "I'm having trouble connecting.";
    } else {
      // Fallback to Gemini
      const geminiKey = process.env.GEMINI_API_KEY;
      if (geminiKey) {
        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: SYSTEM_PROMPT + '\n\nUser: ' + message }] }] })
        });
        const geminiData = await geminiRes.json();
        answer = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || answer;
      }
    }

    // Clean response
    answer = answer.replace(/[*_`~]/g, '').trim();

    // Save to history
    await supabaseAdmin.from('support_messages').insert([
      { business_id: validBusinessId, user_id: user.id, sender_type: 'user', message },
      { business_id: validBusinessId, user_id: user.id, sender_type: 'assistant', message: answer }
    ]);

    return NextResponse.json({ answer, source: 'groq' });
  } catch (error) {
    console.error('Fatal error:', error);
    return NextResponse.json({ 
      answer: "Tessa is experiencing technical difficulties. Please try again in a moment.", 
      source: 'emergency_fallback' 
    });
  }
}
