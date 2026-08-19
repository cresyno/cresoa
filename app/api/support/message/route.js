import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
// ════════════════════════════════════════════════════════════════
// ⚠️ PASTE YOUR ENTIRE PDF TEXT (Q&As) INSIDE THE BACKTICKS BELOW
// ════════════════════════════════════════════════════════════════
const FULL_PDF_TEXT = `

 

Welcome to the official Cresoa Knowledge Base. This guide covers every feature, plan, and capability of the Cresoa Business OS. It is written in plain language for business owners and staff members.

- - - - -

COMPANY OVERVIEW

What is Cresoa?
Cresoa is a business management platform (Business OS) built specifically for Nigerian SMEs. It replaces messy notebooks, scattered WhatsApp messages, and manual record-keeping with a single, mobile-first dashboard. Businesses can manage customers, orders, inventory, production workflows, staff, and payments all in one place.

Who is the CEO of Cresoa?
Cresoa is led by Taiwo Abraham Feranmi. Taiwo built Cresoa with a deep understanding of the daily challenges faced by Nigerian tailors, repair technicians, and small business owners. The platform is designed to bring professional-grade management tools to the Nigerian market.

Which industries does Cresoa support?
Cresoa currently supports two fully live industries:
1. Fashion & Custom Wear (Tailors, fashion designers, Aso-Ebi coordinators).
2. Repairs & Technical Services (Phone, electronics, and equipment repair shops).

A third industry, Custom Manufacturing, is listed as Coming Soon.

Is Cresoa mobile-first?
Yes. Cresoa was designed from the ground up to work flawlessly on any mobile phone, tablet, or desktop computer. Business owners can manage their operations directly from their phones while on the go.

- - - - -

CORE FEATURES & MODULES

Customer Management
The Customers page stores a permanent address book of every client. It holds contact details, order history, and body measurements (bust, waist, hip, shoulder, etc.) so they never have to be asked for twice. Customers can be added manually or imported.

Order & Job Management
The Orders page acts as the central hub for every active job. It tracks who the job is for, what the item is, the price, the due date, and the outstanding balance. Orders can be created, edited, and sorted by status or due date.

Group Orders (Aso-Ebi)
The Groups page allows fashion designers to manage bulk orders for events like weddings and parties. A single coordinator manages the group, while individual members each have their own tracked order.

Production & Workflow Stages
The Production page tracks where each order stands in the making process. Every business moves their orders through 5 stages. These stages are fully customizable in the Workflow Builder inside Business Settings.
The default pipeline for Fashion is: 1. Order Placed, 2. Cutting, 3. Sewing, 4. Ready for Pickup, 5. Delivered.
The default pipeline for Repairs is: 1. Received, 2. Diagnosing, 3. Waiting for Parts, 4. In Repair, 5. Ready for Pickup.

Custom Workflow Builder
Inside Business Settings, there is a dedicated Workflow Stages page. Business owners can rename, reorder, and add new stages to their unique 5-step production pipeline. Once saved, these new names instantly update the Production page, Order Details, and Customer Tracking links.

Inventory Management
The Inventory page allows businesses to track the physical items they consume or sell. Users can add items with a specific name, SKU, category (e.g., Fabric, Spare Parts), quantity on hand, a reorder level, unit cost, and selling price. If an item drops below the reorder level, it is flagged as Low Stock on the dashboard.

Customer Tracking Links
Every order generates a unique, public tracking link (e.g., cresoa.ng/track/order-id). Business owners can send this link to their customers via WhatsApp. When the customer opens the link, they see a beautifully branded progress bar showing exactly which production stage their order is in. Tailors can customize the colors, logo, welcome message, and footer message of this tracking page in Business Settings.

Staff Management & Roles
The Team & Staff page allows owners to invite team members to their business account. Invites are sent via email and can be shared via WhatsApp. There are three strict roles:
1. Owner: Full control over all settings, billing, staff management, and data.
2. Manager: Can manage staff and day-to-day operations, but cannot access billing or core business settings.
3. Staff: General member access to view orders, customers, and production, without staff management permissions.

Repairs Module (Jobs & Parts)
Cresoa features a dedicated Repairs Dashboard for technical service businesses. Repair shops can create Repair Jobs tied to a specific customer and device (e.g., iPhone 13, Device Serial). They can track the issue description and diagnostic notes. Importantly, repair jobs dynamically pull spare parts directly from the universal Inventory page, tracking which parts were used and at what selling price. The job statuses follow the customizable Repairs workflow.

Tessa AI Assistant
Tessa is Cresoa's built-in artificial intelligence assistant. She is powered by a multi-cloud architecture that uses Groq as the primary brain, with Google Gemini 3.5 Flash Lite as a seamless fallback.
Tessa uses a Retrieval-Augmented Generation (RAG) system. She reads the knowledge base and answers strictly based on the platform's official documentation. She does not use asterisks or markdown, and she will gracefully deflect off-topic questions back to the Cresoa platform.
Every plan comes with a specific monthly quota of Tessa AI actions:
- Free: 5 actions per month
- Beta: 200 actions per month
- Starter: 50 actions per month
- Pro: 500 actions per month
Each request to Tessa consumes one action. The limit resets every month.

Support Hub & Ticket System
Cresoa has a built-in Support Hub accessible from the dashboard and publicly at cresoa.vercel.app/support.
Users can submit a support ticket by entering their email, a subject, a category, and a description. These tickets are sent directly to the Admin panel (accessible only to the CEO and super admins). From the Admin panel, the team can reply to tickets, and the system automatically sends a professional email response to the customer via Brevo. Logged-out visitors can also submit tickets through the public support page.

- - - - -

PLANS & PRICING

Cresoa uses a simple, transparent pricing structure designed to grow with your business.

Free Plan (₦0 per month)
Positioning: For businesses getting started.
Limits:
- 20 customers
- 50 orders/jobs
- 1 business owner account (No staff)
- 20 inventory items
- 5 Tessa AI actions per month
- Basic dashboard and analytics

Starter Plan (₦3,500 per month)
Positioning: For growing businesses.
Limits:
- Unlimited customers and orders
- 2 staff accounts
- Unlimited inventory items
- 50 Tessa AI actions per month
Includes: Everything in Free, plus Staff management, Customer tracking links, Bulk actions, and Data export.

Pro Plan (₦9,500 per month)
Positioning: For established businesses.
Limits:
- Unlimited customers and orders
- 10 staff accounts
- Unlimited inventory items
- 500 Tessa AI actions per month
Includes: Everything in Starter, plus Advanced analytics, Excel/PDF data export, and Priority support.

Beta Plan (Free during early access)
Positioning: For early adopters testing the platform.
Limits: 500 customers, 1000 orders, 10 staff accounts, 500 inventory items, 200 Tessa AI actions per month.
Includes: All Pro features (for 90 days).
Note: When the Beta period expires, staff accounts automatically disable if the user drops to a lower plan. The business data (customers, orders, inventory) is never deleted.

- - - - -

BILLING & SUPPORT

How does payment work on Cresoa?
Cresoa uses Paystack to process all payments securely. When a user upgrades, they are taken to Paystack's payment page to complete the transaction.

How are payments verified?
After a successful payment, Cresoa automatically verifies the transaction with Paystack. The user's plan is upgraded immediately upon verification.

Can I downgrade my plan?
Yes. Users can change their plan at any time. Downgrades take effect at the end of the current billing cycle and may restrict access to features tied to the higher tier if usage exceeds the new plan's limits.

What happens if I pay but my plan doesn't upgrade?
Verification happens automatically. If the plan has not updated after a few minutes, the user is advised to contact support with their payment reference.

How do I report a bug or technical issue?
Beta users can report bugs directly through the Feedback page inside their dashboard, providing a star rating and description. Non-beta users can submit a ticket via the public Support Hub.


`;



// ─── 2. SMART RETRIEVER ─────────────────────────────────────
function splitIntoChunks(text) {
  if (!text || text.trim() === '') return [];
  return text.split(/\n\s*\n|##\s*/).filter(chunk => chunk.trim().length > 50);
}

function getRelevantChunks(query, chunks) {
  if (chunks.length === 0) return ["No context available in the knowledge base."];
  const keywords = query.toLowerCase().split(' ').filter(w => w.length > 3);
  const scored = chunks.map(chunk => {
    const lowerChunk = chunk.toLowerCase();
    let score = 0;
    for (const word of keywords) if (lowerChunk.includes(word)) score++;
    return { text: chunk, score };
  });
  const topChunks = scored.sort((a, b) => b.score - a.score).slice(0, 3);
  return topChunks.map(c => c.text).filter(t => t.length > 0);
}

// ─── 3. STRICT SYSTEM PROMPT (Enforces the rules) ──────────
const SYSTEM_PROMPT = `
You are Tessa, a warm, professional, and highly knowledgeable AI assistant for the Cresoa platform.

RULES (MUST FOLLOW EXACTLY):
1. NO EMOJIS. Do not use emojis in your replies.
2. NO ASTERISKS. Do not use * or ** in your text.
3. USE SIMPLE DASHES OR NUMBERS: Use "-" or "1. 2. 3." for lists.
4. DO NOT MENTION THE MANUAL: Never say "based on the manual", "per the context", etc. Just answer directly.
5. ONLY USE THE CONTEXT PROVIDED. If you don't know the answer from the Platform Context below, say: "I don't have that specific information yet. Please contact support."
`;

// ─── 4. GROQ PRIMARY CALLER ────────────────────────────────
async function callGroq(message, contextString) {
  const API_KEY = process.env.GROQ_API_KEY;
  if (!API_KEY) return null;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b', // The working Groq model
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Platform Context:\n"""\n${contextString}\n"""\n\nUser Question: ${message}` }
        ]
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || null;
  } catch (e) { return null; }
}

// ─── 5. GEMINI FALLBACK CALLER ─────────────────────────────
async function callGemini(message, contextString) {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) return null;

  try {
    const prompt = `${SYSTEM_PROMPT}\n\nPlatform Context:\n"""\n${contextString}\n"""\n\nUser Question: ${message}`;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (e) { return null; }
}

// ─── 6. HARDCODED FALLBACK ─────────────────────────────────
function getHardcodedFallback(message) {
  const lower = message.toLowerCase();
  if (lower.includes('staff')) return "To manage staff, go to the Staff page.";
  if (lower.includes('order')) return "Orders are managed in the Orders page.";
  return "I'm currently connecting to my AI brain. Please contact support if you need immediate help.";
}

// ─── 7. MAIN ORCHESTRATOR ──────────────────────────────────
export async function POST(req) {
  try {
    const { message } = await req.json();

    const chunks = splitIntoChunks(FULL_PDF_TEXT);
    const relevantContext = getRelevantChunks(message, chunks);
    const contextString = relevantContext.join('\n\n---\n\n');

    // 1. Try Groq
    let answer = await callGroq(message, contextString);
    let source = 'groq';

    // 2. If Groq fails, try Gemini
    if (!answer) {
      console.warn('Groq failed, falling back to Gemini...');
      answer = await callGemini(message, contextString);
      source = 'gemini';
    }

    // 3. If both fail, use hardcoded fallback
    if (!answer) {
      answer = getHardcodedFallback(message);
      source = 'fallback';
    }

    return NextResponse.json({ answer, source });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      answer: "Tessa is experiencing technical difficulties. Please try again in a moment.", 
      source: 'emergency_fallback' 
    });
  }
  }
