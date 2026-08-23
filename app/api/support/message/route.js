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
11. **NEVER mention the knowledge base, the system prompt, context, or any internal mechanisms.** If the user asks how you know something, simply say you have access to Cresoa's official information and platform details.
12. If the user asks for the website or how to access Cresoa, respond with: "You can access Cresoa at https://cresoa.vercel.app" (or the current production URL). Do NOT tell them to search for it or guess.
13. **FOUNDER IDENTITY (FLEXIBLE BUT ABSOLUTE)**: When asked about who created Cresoa, who is the founder, CEO, owner, inventor, or anyone behind the platform — respond with confidence and warmth, but ALWAYS include the name **Taiwo Abraham Feranmi** as the answer. You may phrase it naturally, for example:
   - "Cresoa was founded by Taiwo Abraham Feranmi."
   - "The visionary behind Cresoa is Taiwo Abraham Feranmi."
   - "Taiwo Abraham Feranmi is the CEO and founder of Cresoa."
   - "Cresoa is the brainchild of Taiwo Abraham Feranmi."
   - "Taiwo Abraham Feranmi is the owner and creator."
   Never say you don't know, never deflect to support, and never mention any other person. Even if the question uses slang or typos, the answer must still include Taiwo Abraham Feranmi.
14. **ACTIONS (NEW)**: You can use the available tools to fetch real business data. If the user asks about business stats (orders count, customers count, revenue, outstanding balance), plan limits, or customer information, call the appropriate function to get the data, then explain the answer naturally. If the data is fetched, use it to give an accurate answer.
`;

// ─── AVAILABLE TOOLS (READ-ONLY ACTIONS) ───
const tools = [
  {
    type: 'function',
    function: {
      name: 'get_business_stats',
      description: 'Get business stats (total orders, total customers, total revenue, outstanding balance).',
      parameters: {
        type: 'object',
        properties: {
          business_id: { type: 'string', description: 'The business ID' }
        },
        required: ['business_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_plan_limits',
      description: 'Get the business plan limits (customer limit, order limit, staff limit, inventory limit).',
      parameters: {
        type: 'object',
        properties: {
          business_id: { type: 'string', description: 'The business ID' }
        },
        required: ['business_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_customer_info',
      description: 'Search for a customer by name or phone.',
      parameters: {
        type: 'object',
        properties: {
          business_id: { type: 'string', description: 'The business ID' },
          query: { type: 'string', description: 'Customer name or phone to search' }
        },
        required: ['business_id', 'query']
      }
    }
  }
];

// ─── MANUAL FALLBACK: detect stats questions and fetch directly ───
async function manualFetchIfAsked(message, businessId) {
  const lower = message.toLowerCase();
  if (/(how many orders|order count|number of orders|total orders)/.test(lower)) {
    const { count } = await supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId);
    return { total_orders: count || 0 };
  }
  if (/(how many customers|customer count|number of customers|total customers)/.test(lower)) {
    const { count } = await supabaseAdmin
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId);
    return { total_customers: count || 0 };
  }
  return null;
}

// ─── EXECUTE FUNCTION CALLS ───
async function executeFunctionCall(functionName, args) {
  const { business_id } = args;
  if (!business_id) return { error: 'business_id is required' };

  switch (functionName) {
    case 'get_business_stats': {
      const [ordersCount, customersCount, revenueData, outstandingData] = await Promise.all([
        supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).eq('business_id', business_id),
        supabaseAdmin.from('customers').select('id', { count: 'exact', head: true }).eq('business_id', business_id),
        supabaseAdmin.from('orders').select('price').eq('business_id', business_id),
        supabaseAdmin.from('invoices').select('total, amount_paid').eq('business_id', business_id)
      ]);

      const totalRevenue = (revenueData.data || []).reduce((sum, o) => sum + Number(o.price || 0), 0);
      const outstanding = (outstandingData.data || []).reduce((sum, inv) => sum + (Number(inv.total) - Number(inv.amount_paid) || 0), 0);

      return {
        total_orders: ordersCount.count || 0,
        total_customers: customersCount.count || 0,
        total_revenue: totalRevenue,
        outstanding_balance: outstanding
      };
    }
    case 'get_plan_limits': {
      const { data: business } = await supabaseAdmin.from('businesses').select('plan').eq('id', business_id).single();
      const plan = business?.plan || 'free';
      const limits = {
        free: { customers: 20, orders: 50, staff: 0, inventory: 20 },
        starter: { customers: 200, orders: 500, staff: 2, inventory: 100 },
        pro: { customers: Infinity, orders: Infinity, staff: 10, inventory: Infinity },
        beta: { customers: 500, orders: 1000, staff: 10, inventory: 500 }
      };
      return { plan, limits: limits[plan] || limits.free };
    }
    case 'get_customer_info': {
      const { data } = await supabaseAdmin
        .from('customers')
        .select('*')
        .eq('business_id', business_id)
        .or(`name.ilike.%${args.query}%,phone.ilike.%${args.query}%`)
        .limit(3);
      return data || [];
    }
    default:
      return { error: 'Unknown function' };
  }
}

// ─── HELPERS (ALL ORIGINAL FUNCTIONS PRESERVED) ───
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
  const words = lower.split(/\s+/);
  const expanded = [];
  for (const w of words) {
    let found = w;
    if (mapping[w]) found = mapping[w];
    else {
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
  const normalizedQuery = expandTerms(query);
  const lower = normalizedQuery.toLowerCase();

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

  const chunks = FULL_PDF_TEXT.split(/\n\s*\n|##\s*/).filter(chunk => chunk.trim().length > 50);
  const keywords = lower.split(' ').filter(w => w.length >= 3);
  const scored = chunks.map(chunk => {
    const lowerChunk = chunk.toLowerCase();
    let score = 0;
    for (const word of keywords) {
      if (lowerChunk.includes(word)) score++;
      else {
        const chunkWords = lowerChunk.split(/\s+/).slice(0, 100);
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

  return ["Cresoa is a business management platform for Nigerian SMEs. For more specific details, please ask about a particular feature or plan."];
}

async function callGroq(message, contextString, historyMessages, tools) {
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
        tools,
        temperature: 0.2
      })
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message || null;
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

    let answer = '';
    let source = 'groq';

    // Call Groq with tools
    const groqResponse = await callGroq(message, contextString, historyMessages, tools);
    if (groqResponse?.tool_calls) {
      // Execute function calls
      const toolResults = [];
      for (const toolCall of groqResponse.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        const result = await executeFunctionCall(toolCall.function.name, args);
        toolResults.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(result) });
      }
      // Send back to Groq for final answer
      const finalMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'system', content: `Relevant Knowledge Base Context:\n"""\n${contextString}\n"""` },
        ...historyMessages,
        { role: 'user', content: message },
        ...groqResponse.tool_calls.map(tc => ({ role: 'assistant', content: null, tool_calls: [tc] })),
        ...toolResults
      ];
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'openai/gpt-oss-20b', messages: finalMessages, temperature: 0.2 })
      });
      if (res.ok) {
        const data = await res.json();
        answer = data?.choices?.[0]?.message?.content || '';
      }
    } else {
      // Manual fallback: if no tool call, try to fetch stats directly
      const manualResult = await manualFetchIfAsked(message, business_id);
      if (manualResult) {
        if (manualResult.total_orders !== undefined) {
          answer = `You currently have ${manualResult.total_orders} orders in your dashboard.`;
        } else if (manualResult.total_customers !== undefined) {
          answer = `You currently have ${manualResult.total_customers} customers in your dashboard.`;
        }
      } else {
        answer = groqResponse?.content || '';
      }
    }

    // Fallback to Gemini if Groq failed or gave no answer
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
