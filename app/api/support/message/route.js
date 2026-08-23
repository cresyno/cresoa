import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { readFileSync } from 'fs';
import path from 'path';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

let FULL_PDF_TEXT = '';
try {
  const knowledgeBasePath = path.join(process.cwd(), 'data', 'knowledge-base.md');
  FULL_PDF_TEXT = readFileSync(knowledgeBasePath, 'utf-8');
} catch (error) {
  FULL_PDF_TEXT = 'Knowledge base not loaded.';
}

const SYSTEM_PROMPT = `
You are Tessa, a warm, friendly, and highly professional AI assistant for Cresoa, a business management platform for Nigerian SMEs.

CRITICAL RULES:
1. Be natural and conversational.
2. Use the "Relevant Knowledge Base Context" as your primary source of truth.
3. UNDERSTAND IMPERFECT INPUT (typos, slang, broken English). Decode meaning.
4. If ambiguous, ask a clarifying question.
5. NEVER mention the knowledge base or internal mechanisms.
6. If asked about the founder/CEO/owner, ALWAYS say: "Cresoa was built by Taiwo Abraham Feranmi, a Nigerian entrepreneur."
7. If asked about business data (orders, customers, revenue, owing customers), use the DATA provided in the context to answer accurately.
8. If the user asks to "list", "show", or "who are they" after a data question, use the LIST provided in the context.
`;

async function fetchBusinessData(message, businessId, lastContext) {
  if (!businessId) return null;
  const lower = message.toLowerCase();

  // 1. Handle "List them out" or "Show me" follow-ups
  const isFollowUp = /(list|show|who|names|them|those|they)/.test(lower);
  if (isFollowUp && lastContext) {
    if (lastContext === 'customers_owing') {
      const { data } = await supabaseAdmin
        .from('invoices')
        .select('customer_id, customers ( name, phone )')
        .eq('business_id', businessId)
        .gt('balance_due', 0);
      const unique = new Map();
      data.forEach(inv => {
        if (inv.customers) unique.set(inv.customer_id, inv.customers.name || inv.customers.phone);
      });
      const list = Array.from(unique.values());
      return { type: 'list_customers_owing', list, count: list.length };
    }
    if (lastContext === 'customers') {
      const { data } = await supabaseAdmin
        .from('customers')
        .select('name, phone')
        .eq('business_id', businessId)
        .limit(10);
      return { type: 'list_customers', list: data.map(c => c.name || c.phone), count: data.length };
    }
    if (lastContext === 'orders') {
      const { data } = await supabaseAdmin
        .from('orders')
        .select('title')
        .eq('business_id', businessId)
        .limit(10);
      return { type: 'list_orders', list: data.map(o => o.title), count: data.length };
    }
  }

  // 2. Direct questions about owing customers
  if (/(owe|owes|owing|debt|debts|outstanding|balance|collect|unpaid)/.test(lower)) {
    const { data } = await supabaseAdmin
      .from('invoices')
      .select('customer_id')
      .eq('business_id', businessId)
      .gt('balance_due', 0);
    const unique = new Set(data.map(inv => inv.customer_id)).size;
    return { type: 'customers_owing', count: unique };
  }

  // 3. Direct questions about customers
  if (/(customer|client|buyer|people|patron)/.test(lower)) {
    const { count } = await supabaseAdmin.from('customers').select('id', { count: 'exact', head: true }).eq('business_id', businessId);
    return { type: 'customers', count: count || 0 };
  }

  // 4. Direct questions about orders
  if (/(order|job|delivery|work|task)/.test(lower)) {
    const { count } = await supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).eq('business_id', businessId);
    return { type: 'orders', count: count || 0 };
  }

  return null;
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
    if (!message) return NextResponse.json({ error: 'Missing message' }, { status: 400 });

    let validBusinessId = business_id;
    if (!validBusinessId) {
      const { data: membership } = await supabaseAdmin.from('business_memberships').select('business_id').eq('user_id', user.id).limit(1).maybeSingle();
      if (membership) validBusinessId = membership.business_id;
    }

    if (!validBusinessId) return NextResponse.json({ error: 'No business found' }, { status: 400 });

    // Fetch last context from previous message (unless it's a new chat)
    let lastContext = null;
    if (!new_conversation) {
      const { data: lastMsg } = await supabaseAdmin
        .from('support_messages')
        .select('context_type')
        .eq('business_id', validBusinessId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .not('context_type', 'is', null)
        .limit(1)
        .maybeSingle();
      if (lastMsg) lastContext = lastMsg.context_type;
    }

    // Handle data questions
    const businessData = await fetchBusinessData(message, validBusinessId, lastContext);
    if (businessData) {
      let answer = '';
      let contextToSave = null;

      if (businessData.type === 'customers_owing') {
        answer = `You have ${businessData.count} customers currently owing you.`;
        contextToSave = 'customers_owing';
      } else if (businessData.type === 'list_customers_owing') {
        answer = businessData.list.length > 0
          ? `Here are the customers owing you:\n${businessData.list.map((name, i) => `${i + 1}. ${name}`).join('\n')}`
          : "You have no customers currently owing money.";
        contextToSave = 'customers_owing';
      } else if (businessData.type === 'customers') {
        answer = `You currently have ${businessData.count} customers in your Cresoa account.`;
        contextToSave = 'customers';
      } else if (businessData.type === 'list_customers') {
        answer = businessData.list.length > 0
          ? `Here are your customers:\n${businessData.list.map((name, i) => `${i + 1}. ${name}`).join('\n')}`
          : "You have no customers yet.";
        contextToSave = 'customers';
      } else if (businessData.type === 'orders') {
        answer = `You currently have ${businessData.count} orders in your Cresoa dashboard.`;
        contextToSave = 'orders';
      } else if (businessData.type === 'list_orders') {
        answer = businessData.list.length > 0
          ? `Here are your recent orders:\n${businessData.list.map((title, i) => `${i + 1}. ${title}`).join('\n')}`
          : "You have no orders yet.";
        contextToSave = 'orders';
      }

      await supabaseAdmin.from('support_messages').insert([
        { business_id: validBusinessId, user_id: user.id, sender_type: 'user', message },
        { business_id: validBusinessId, user_id: user.id, sender_type: 'assistant', message: answer, context_type: contextToSave }
      ]);

      return NextResponse.json({ answer, source: 'data' });
    }

    // Fallback to Groq for non-data questions
    const API_KEY = process.env.GROQ_API_KEY;
    if (!API_KEY) return NextResponse.json({ error: 'AI not configured' }, { status: 500 });

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
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
      answer = data?.choices?.[0]?.message?.content || answer;
    } else {
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

    answer = answer.replace(/[*_`~]/g, '').trim();
    
    await supabaseAdmin.from('support_messages').insert([
      { business_id: validBusinessId, user_id: user.id, sender_type: 'user', message },
      { business_id: validBusinessId, user_id: user.id, sender_type: 'assistant', message: answer }
    ]);

    return NextResponse.json({ answer, source: 'groq' });
  } catch (error) {
    console.error('Fatal error:', error);
    return NextResponse.json({ answer: "Tessa is experiencing technical difficulties. Please try again in a moment.", source: 'emergency_fallback' });
  }
  }
