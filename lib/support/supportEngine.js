// lib/support/supportEngine.js
import { createClient as createAdminClient } from '@/lib/supabaseAdmin';

const AI_NAME = "Tessa";

// 1. Static Knowledge Base Fallback (If both AI fail)
const KNOWLEDGE_BASE_FALLBACK = {
  account: "You can manage your account settings, password, and business name in the /dashboard/settings page.",
  staff: "To manage staff, go to the Staff page. You can invite, remove, or change roles there.",
  orders: "Orders are managed in the Orders page. Use the 'New Order' button to create one.",
  groups: "Groups (Aso-Ebi) are managed in the Groups page. You can create groups and add members there.",
  production: "To move an order through production, open the Production page and update the status step by step.",
  subscription: "To upgrade or manage your plan, go to the Subscription page in your dashboard.",
  general: "For any other questions, please contact human support via WhatsApp using the number in your dashboard footer."
};

// 2. Tessa's System Prompt
const SYSTEM_PROMPT = `
You are ${AI_NAME}, a warm, professional, and empathetic AI assistant built exclusively for fashion designers and tailors.
Your tone is conversational, elegant, and encouraging. Never use tech jargon.
Always address the user respectfully. If they ask about their data, look at the context provided.
If you genuinely don't know an answer, politely tell them to contact human support via WhatsApp.
`;

// 3. Orchestrator
export async function supportEngine({ message, userId, businessId, supabaseAdmin }) {
  // A. Fetch 3 relevant chunks from Supabase (RAG)
  const relevantChunks = await getRelevantChunks(message);

  // B. Fetch dynamic business data
  const businessContext = await getBusinessContext(businessId, supabaseAdmin);

  // C. Build the final prompt
  const finalPrompt = `
${SYSTEM_PROMPT}

Relevant guides from the platform:
${relevantChunks.join('\n\n')}

User's business data:
${JSON.stringify(businessContext, null, 2)}

User Question: ${message}
  `;

  // D. Run the EXACT fallback chain you asked for
  // 1. Try Gemini
  let answer = await callLLM(finalPrompt, 'gemini');
  let source = 'gemini';

  // 2. If Gemini fails, fallback to Groq
  if (!answer) {
    console.warn('Gemini failed, falling back to Groq...');
    answer = await callLLM(finalPrompt, 'groq');
    source = 'groq';
  }

  // 3. If both fail, fallback to Static Knowledge Base
  if (!answer) {
    console.warn('Both LLMs failed, falling back to static KB...');
    // Determine intent roughly to pick the right fallback
    const intent = classifyIntent(message);
    answer = KNOWLEDGE_BASE_FALLBACK[intent] || KNOWLEDGE_BASE_FALLBACK.general;
    source = 'knowledge_base';
  }

  return { answer, source };
}

// --- HELPER FUNCTIONS (Now fully wired) ---

async function getRelevantChunks(query) {
  // Vector similarity search against your Supabase table
  const supabase = createAdminClient();
  const { data } = await supabase.rpc('match_knowledge', {
    query_embedding: await generateEmbedding(query), // You'll write this helper below
    match_threshold: 0.7,
    match_count: 3
  });
  return data?.map(item => item.content) || [];
}

async function generateEmbedding(text) {
  // We use OpenAI's embedding model here (cheap, fast)
  const openai = new OpenAI({ apiKey: process.env.OPENAI_EMBEDDING_KEY });
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

async function getBusinessContext(bizId, supabaseAdmin) {
  const { data: biz } = await supabaseAdmin.from('businesses').select('plan, name').eq('id', bizId).single();
  const { count: staffCount } = await supabaseAdmin.from('business_memberships').select('*', { count: 'exact', head: true }).eq('business_id', bizId);
  return { business_name: biz?.name, plan: biz?.plan, staff_count: staffCount || 0 };
}

function classifyIntent(message) {
  const msg = message.toLowerCase();
  if (msg.includes('staff') || msg.includes('team')) return 'staff';
  if (msg.includes('order') || msg.includes('buba')) return 'orders';
  if (msg.includes('aso') || msg.includes('group')) return 'groups';
  if (msg.includes('production') || msg.includes('sewing')) return 'production';
  if (msg.includes('subscription') || msg.includes('plan') || msg.includes('pay')) return 'subscription';
  if (msg.includes('account') || msg.includes('password')) return 'account';
  return 'general';
}

// --- THE EXACT LLM CALLER WITH FALLBACK CHAIN ---

async function callLLM(prompt, provider) {
  if (provider === 'gemini') {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await res.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch (e) { return null; } // Fail silently to trigger fallback
  }

  if (provider === 'groq') {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'mixtral-8x7b-32768', messages: [{ role: 'user', content: prompt }] })
      });
      const data = await res.json();
      return data?.choices?.[0]?.message?.content || null;
    } catch (e) { return null; }
  }
  return null;
}
