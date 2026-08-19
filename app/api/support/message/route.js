import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
// ════════════════════════════════════════════════════════════════
// ⚠️ PASTE YOUR ENTIRE PDF TEXT (Q&As) INSIDE THE BACKTICKS BELOW
// ════════════════════════════════════════════════════════════════
const FULL_PDF_TEXT = `

# Cresoa Knowledge Base

Welcome! This guide answers the most common questions fashion designers and tailors have about using Cresoa. It's written in plain language — no tech jargon, just straight answers.

---

## Getting Started & Switching Businesses

**What is Cresoa?**
Cresoa is a business management tool built for fashion designers and tailors. It helps you keep track of your customers, orders, production stages, group orders (like Aso-Ebi), staff, and payments — all in one place.

**Can I run more than one business on Cresoa?**
Yes. If you belong to more than one business on Cresoa (as an owner or as staff), you can switch between them from the business switcher. Once you pick a business, everything you see on your dashboard — orders, customers, staff — updates to show only that business's information.

**How do I switch to a different business?**
Open the business switcher and select the business you want to view. Cresoa will reload your dashboard with that business's data.

**I switched businesses but I'm still seeing the old business's data. What do I do?**
Try refreshing the page. If it still looks wrong, log out and log back in. Each business's information is kept completely separate, so this is usually just a display refresh issue.

**Why can't I see a business I know I'm part of?**
You may no longer be an active member of that business, or your invite may still be pending. Check with the business owner to confirm your membership status.

---

## Dashboard

**What is the Dashboard page?**
The Dashboard is your home screen. It gives you a quick snapshot of how your business is doing — things like your recent orders, customers, and group activity — as soon as you log in.

**How do I get to the Dashboard from anywhere else in the app?**
Use the main navigation menu and select Dashboard. It's the first thing you see when you log in.

**Are there limits on what I can see on my Dashboard based on my plan?**
The Dashboard itself is available on every plan, including Free. However, some deeper insights — like advanced analytics and reports — are only available on the Pro plan. Free and Starter plans get the essentials; Pro unlocks the full picture.

**What do I do if my Dashboard looks empty or isn't loading?**
Make sure you've selected the correct business if you manage more than one. If it's still empty, check your internet connection and refresh. If the problem continues, reach out through the Feedback page (beta users) or contact support.

---

## Orders

**What is the Orders page?**
This is where you keep track of every order you're working on — who it's for, what it is, how much is owed, and where it stands in production.

**How do I create a new order?**
Go to Orders and select the option to create a new order. Fill in the customer details, item description, price, and due date, then save it.

**How do I update or edit an existing order?**
Open the order from your Orders list and select edit. You can update the details, adjust the price, or change the due date.

**What are the limits for Orders based on my plan?**
- **Free plan:** up to 50 orders total.
- **Starter, Pro, and Beta plans:** unlimited orders.

If you're on the Free plan and getting close to your limit, Cresoa will let you know. Once you hit 50 orders, you'll need to upgrade to Starter or Pro to keep creating new ones.

**What do I do if I can't find an order I know exists?**
Double-check you're on the correct business (if you manage more than one). Orders are only visible within the business they belong to — an order created under one business will never show up under another, even if you're a member of both. If it's still missing, it may have been deleted, or you may not have permission to view it — check with your business owner.

---

## Customers

**What is the Customers page?**
This is your customer address book. It stores each customer's contact details and their measurements, so you don't have to ask for the same information twice.

**How do I add a new customer?**
Go to Customers and select the option to add a new customer. Enter their name, phone number, and other details, including measurements if you have them.

**How do I record or update a customer's measurements?**
Open the customer's profile and use the measurement form to enter or update details like bust, waist, hip, shoulder, and other measurements relevant to fashion and tailoring work.

**What are the limits for Customers based on my plan?**
- **Free plan:** up to 20 customers.
- **Starter, Pro, and Beta plans:** unlimited customers.

**What do I do if I've hit my customer limit and can't add more?**
You'll see a message letting you know you've reached your plan's limit. To keep adding customers, upgrade to the Starter or Pro plan from the Subscription page.

---

## Groups (Aso-Ebi)

**What is the Groups page?**
Groups is where you manage Aso-Ebi orders — the coordinated outfits many people order together for events like weddings and parties. One person (the coordinator) manages the group, and each participant's order is tracked as part of it.

**How do I create a new Aso-Ebi group?**
Go to Groups and select the option to start a new group. Give it a name, assign a coordinator, and start adding members as they place their orders.

**How do I add a member to an existing group?**
Open the group, then add a new member with their item details (for example, "Aso Ebi blouse and wrapper") and payment information.

**What are the limits for Groups based on my plan?**
- **Free plan:** Group orders are not available at all.
- **Starter plan:** Group orders are available, with up to 20 members per group.
- **Pro and Beta plans:** Group orders are available, with up to 50 members per group.

**What do I do if I can't access the Groups feature at all?**
This means you're on the Free plan, where Aso-Ebi group orders aren't included. Upgrade to Starter or Pro from the Subscription page to unlock it.

**What do I do if I've reached my group's member limit?**
You'll need to upgrade your plan to add more members — Starter allows 20 per group, and Pro allows 50.

---

## Production

**What is the Production page?**
Production is where you track where each order stands in the making process — from the moment it's placed to the moment it's delivered.

**What are the production stages an order moves through?**
Every order moves through five stages, in this order:
1. **Order Placed** — the order has been created but work hasn't started.
2. **Cutting** — fabric is being cut.
3. **Sewing** — the item is being sewn together.
4. **Ready for Pickup** — the item is finished and waiting for the customer.
5. **Delivered** — the order has been handed over to the customer.

**How do I move an order to the next production stage?**
Open the Production page, find the order, and update its status to the next stage in the process.

**What are the limits for Production based on my plan?**
Production tracking is available on every plan, including Free — there's no separate limit for this feature. It follows the same order limits as your Orders page (50 orders on Free, unlimited on Starter, Pro, and Beta).

**What do I do if an order shows as overdue in Production?**
An order is marked overdue if its due date has passed and it hasn't been marked as Delivered yet. Update the order's status as you make progress, or adjust the due date if needed.

---

## Staff & Team

**What is the Staff (Team) page?**
This is where business owners and managers manage who has access to their business account — inviting new staff, assigning roles, and keeping track of who's active.

**How do I invite a new staff member?**
Go to Team & Staff and generate an invite. Enter the person's email and choose their role, then share the invite code with them (you can send it directly via WhatsApp from the same screen).

**What are the different staff roles and what can each one do?**
- **Owner:** full control over the business, including staff management and billing.
- **Manager:** can manage staff and day-to-day operations, but has fewer account-level permissions than the Owner.
- **Staff:** general team member access, without staff-management permissions.

Only Owners and Managers can invite, manage, or remove other staff members.

**What are the limits for Staff based on my plan?**
- **Free plan:** no staff accounts — it's just you.
- **Starter plan:** up to 2 staff accounts.
- **Pro and Beta plans:** up to 10 staff accounts.

**What do I do if I can't add another staff member?**
You've likely reached your plan's staff limit. Remove an inactive staff member, or upgrade your plan from the Subscription page to raise your limit.

**What do I do if a staff invite isn't working?**
Check that the invite hasn't expired or already been used. You can resend or cancel a pending invite from the Team & Staff page.

---

## Subscription & Plan Limits (Overview)

**What plans does Cresoa offer?**
- **Free** — ₦0. Good for getting started: 20 customers, 50 orders, no group orders, no staff accounts.
- **Starter** — ₦3,000. Unlimited customers and orders, group orders (up to 20 members), WhatsApp reminders, basic analytics, 2 staff accounts.
- **Pro** — ₦8,000. Everything in Starter, plus advanced analytics, bulk actions, 10 staff accounts, custom branding, data export, and priority support.
- **Beta** — a free trial tier with all Pro features, available to invited beta testers for a limited time.

**Does Cresoa offer a free trial?**
Yes, new businesses get a trial period after signup before needing to choose a paid plan.

---

## Account & Billing

**How do I upgrade my plan?**
Go to the Subscription page, choose the plan you want (Starter or Pro), and proceed to payment.

**How does payment work on Cresoa?**
Cresoa uses Paystack to process payments securely. When you choose to upgrade, you'll be taken to Paystack's payment page to complete the transaction.

**How do I know my payment went through?**
After paying, Cresoa automatically verifies your payment with Paystack. Once confirmed, you'll see a success message and your plan will be upgraded right away.

**What do I do if I paid but my plan hasn't upgraded yet?**
Give it a moment — verification happens automatically after payment. If your plan still hasn't updated after a few minutes, contact support with your payment reference so the team can check on it.

**Can I downgrade my plan?**
Yes, you can change your plan from the Subscription page at any time. Keep in mind that downgrading may restrict access to features tied to your previous plan, such as group orders or staff accounts, if you're using more than the lower plan allows.

---

## Troubleshooting & Support

**What do I do if I forgot my password?**
Use the "forgot password" option on the login screen to reset it. You'll receive instructions by email.

**What do I do if I found a bug or something isn't working right?**
If you're a beta tester, use the Feedback page to report it directly to the Cresoa team, along with a star rating of your experience. If you're not on the beta plan, reach out through Cresoa's support contact channel.

**What is the Feedback page, and who can use it?**
The Feedback page is a direct line to the Cresoa team for sharing bugs, suggestions, and ratings. It's currently available only to businesses on the Beta plan.

**What do I do if I can't log in at all?**
Double check your email and password are correct. If you've forgotten your password, use the reset option. If the issue continues, contact support.

**What do I do if I need help with something not covered here?**
Reach out to Cresoa Support directly, and a member of the team will help you sort it out.


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
