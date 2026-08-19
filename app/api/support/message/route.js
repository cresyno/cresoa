import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// ════════════════════════════════════════════════════════════════
// 📄 PASTE YOUR COMPLETE KNOWLEDGE BASE TEXT HERE
// ════════════════════════════════════════════════════════════════
const FULL_PDF_TEXT = `

Welcome to the Cresoa Knowledge Base.

This guide is written in plain language for fashion designers, repair technicians, and small business owners. It covers every feature and common task you will encounter on the Cresoa platform.

- - - - -

COMPANY OVERVIEW

What is Cresoa?
Cresoa is a business management platform built specifically for Nigerian SMEs. It helps you keep track of your customers, orders, inventory, production stages, staff, payments, and more – all in one mobile‑first dashboard.

Who is the CEO of Cresoa?
Cresoa was built by Taiwo Abraham Feranmi, a Nigerian entrepreneur who understands the daily challenges of running a tailoring, repair, or manufacturing business in Nigeria.

Which industries does Cresoa support?
Cresoa currently works for two industries:
1. Fashion & Custom Wear – for tailors, fashion designers, and Aso‑Ebi coordinators.
2. Repairs & Technical Services – for phone, electronics, and equipment repair shops.
A third industry, Custom Manufacturing, is coming soon.

Is Cresoa mobile‑first?
Yes. Cresoa is designed to work perfectly on any mobile phone, tablet, or desktop computer. You can manage your entire business from your phone while on the go.

- - - - -

GETTING STARTED

How do I create my Cresoa account?
Go to cresoa.vercel.app and click "Start Beta". Enter your email, create a password, and choose your business type (Fashion or Repairs). You will get 90 days of free access to all Pro features.

How do I log in?
Go to cresoa.vercel.app/login. Enter your email and password. If you have forgotten your password, click "Forgot Password" on the login page and follow the instructions sent to your email.

How do I switch between multiple businesses?
If you manage more than one business on Cresoa, you can switch between them using the Business Switcher – a dropdown menu at the top of your dashboard. Select the business you want to view, and the dashboard will refresh with that business's data.

What should I do if the dashboard shows the wrong business?
Refresh the page. If it still shows the wrong business, log out and log back in. This usually fixes display issues.

- - - - -

CUSTOMER MANAGEMENT

How do I add a new customer?
1. Go to the Customers page from the main menu.
2. Click the "Add Customer" button.
3. Enter the customer's name, phone number, and any other details you have (like email or address).
4. If you have their measurements, you can enter them in the measurement form.
5. Click Save. The customer is now stored in your address book.

How do I find an existing customer?
On the Customers page, you can search by name or phone number. The list will filter as you type.

How do I update a customer's measurements?
Open the customer's profile and click "Edit". Use the measurement form to update details like bust, waist, hip, shoulder, and other measurements relevant to your work. Save the changes.

What happens if I reach my customer limit on the Free plan?
The Free plan allows 20 customers. When you try to add a 21st customer, you will see a message prompting you to upgrade to Starter or Pro to continue adding customers. Your existing customers remain safe and accessible.

- - - - -

ORDERS & JOBS

How do I create a new order?
1. Go to the Orders page from the main menu.
2. Click the "New Order" button.
3. Select an existing customer from the list, or add a new customer right from the order screen.
4. Enter the item description (e.g., "Buba and trousers"), the price, and the due date.
5. Optionally, you can add notes or priority tags.
6. Click Save. The new order will appear in your Orders list with the status "Order Placed".

How do I edit an existing order?
Open the order from the Orders list, then click "Edit". You can update the item details, adjust the price, change the due date, or modify the status. Click Save to apply the changes.

How do I move an order to the next production stage?
Go to the Production page. Find the order you want to update and click on it. From the order detail view, you can change the status to the next stage (e.g., from "Cutting" to "Sewing"). The change will be reflected immediately on the order's tracking page.

How do I filter orders by status or date?
On the Orders page, you will find sorting and filtering options at the top. You can filter by status (e.g., "Order Placed", "Cutting", "Ready for Pickup") or sort by due date. This helps you stay organized.

What if I can't find an order that I know exists?
Make sure you are viewing the correct business in the Business Switcher. Orders are only visible under the business they belong to. If you are on the right business and still can't find it, the order may have been deleted or you may not have permission to view it. Contact your business owner for help.

- - - - -

GROUP ORDERS (ASO-EBI)

What is a group order?
A group order is a single order that contains multiple members, often used for Aso‑Ebi outfits for weddings or parties. One person acts as the coordinator, and each member has their own item and payment record.

How do I create a group order?
1. Go to the Groups page from the main menu.
2. Click "New Group".
3. Give the group a name and assign a coordinator (choose an existing customer or add a new one).
4. Click Save. The group is created.
5. To add members, open the group and click "Add Member". Enter the member's details and their item description, then save.

What are the member limits for group orders?
On the Free plan, group orders are not available. On the Starter plan, you can have up to 20 members per group. On the Pro and Beta plans, you can have up to 50 members per group.

Can I edit a group order after creating it?
Yes. Open the group, and you can edit the coordinator, add or remove members, and update member details.

- - - - -

INVENTORY MANAGEMENT

How do I add a new inventory item?
1. Go to the Inventory page.
2. Click "Add Item".
3. Enter the item name, SKU (optional), category (e.g., "Fabric" or "Spare Parts"), quantity on hand, reorder level, unit cost, and selling price.
4. Click Save. The item will appear in your inventory list.

How do I update stock quantities?
Open the item from the inventory list and click "Edit". Update the quantity on hand and reorder level as needed, then save.

What does the "Low Stock" alert mean?
When the quantity on hand drops to or below the reorder level, the item appears with a "Low Stock" label on your dashboard. This helps you reorder supplies before you run out.

What happens if I reach my inventory item limit on the Free plan?
The Free plan allows 20 inventory items. When you try to add a 21st item, you will see a message prompting you to upgrade to Starter or Pro to continue. Your existing items remain safe.

- - - - -

PRODUCTION WORKFLOW (CUSTOM STAGES)

What are production stages?
Production stages are the steps your orders move through, from start to finish. By default, the stages are:
Fashion: Order Placed, Cutting, Sewing, Ready for Pickup, Delivered.
Repairs: Received, Diagnosing, Waiting for Parts, In Repair, Ready for Pickup.

Can I rename or reorder the stages?
Yes. Go to Settings, then Workflow Stages. There you can rename each stage, reorder them using the up/down arrows, and add new stages. Once saved, the new names will appear on the Production page, Order Details, and customer tracking links.

How many stages can I have?
The system allows up to 5 stages by default. However, you can delete or add as many as you need, but we recommend keeping it to 5 for clarity.

Will my existing orders be affected if I rename stages?
No. Your existing orders retain their current status. The new names will only apply to orders that are moved to that stage after the change.

- - - - -

CUSTOMER TRACKING LINKS

What is a tracking link?
Every order generates a unique link that you can share with your customer. When the customer opens the link, they see a branded page showing the current status of their order, along with your welcome message and footer.

How do I send a tracking link to a customer?
On the Order Detail page, you will find a "Share Tracking Link" button. Click it to copy the link. You can then paste it into WhatsApp, SMS, or email and send it to your customer.

Can I customise the tracking page?
Yes. Go to Settings, then Business Settings. Under the Tracking Page section, you can change the primary colour, background colour, welcome message, and footer message. You can also upload your business logo. The preview will update in real time so you can see exactly how it will look.

What if the customer reports that the tracking link doesn't work?
First, check that the order is still active and has not been deleted. If the link still doesn't work, generate a new tracking link from the Order Detail page and send it to the customer again. If the issue persists, contact support.

- - - - -

STAFF & TEAM MANAGEMENT

How do I invite a new staff member?
1. Go to the Team & Staff page.
2. Click "Invite Staff".
3. Enter the person's email and choose their role (Manager or Staff).
4. Click Send. The person will receive an email with an invite link and a unique invite code.
5. You can also copy the invite code and send it directly via WhatsApp from the same screen.

What are the roles and permissions?
Owner: Full control over the business, including staff management and billing.
Manager: Can manage staff and day‑to‑day operations, but cannot access billing or core business settings.
Staff: General member access to view orders, customers, and production, without staff management permissions.

How many staff members can I have?
Free plan: 0 staff accounts (you are the only user).
Starter plan: up to 2 staff accounts.
Pro and Beta plans: up to 10 staff accounts.

What do I do if I can't add another staff member?
You have likely reached your plan's staff limit. Remove an inactive staff member, or upgrade your plan from the Subscription page to increase your limit.

What if a staff invite isn't working?
Check that the invite hasn't expired or already been used. You can resend a pending invite from the Team & Staff page, or cancel it and create a new one.

- - - - -

REPAIRS MODULE (FOR REPAIR BUSINESSES)

How do I create a new repair job?
1. Go to the Repairs Dashboard.
2. Click "New Repair Job".
3. Select the customer, enter the device name (e.g., "iPhone 13") and device serial number (optional).
4. Describe the issue in the "Issue Description" field.
5. If you have diagnostic notes, add them.
6. Click Save. The job will appear in the jobs list with the default status "Received".

How do I add spare parts to a repair job?
Open the repair job from the list. In the job detail view, you will find a section to add parts. You can select parts from your inventory and specify the quantity used and the selling price. These parts will be deducted from your inventory automatically.

What are the repair stages?
By default, the stages for repairs are: Received, Diagnosing, Waiting for Parts, In Repair, Ready for Pickup. These can be customised in the Workflow Stages settings.

Can I add labour costs to a repair job?
Yes. In the job detail view, there is a "Labour Cost" field. Enter the amount you charge for labour, and the total cost will be calculated automatically, including parts.

- - - - -

TESSA AI ASSISTANT

What is Tessa?
Tessa is an AI assistant built into Cresoa. She can answer questions about using the platform, such as how to perform tasks, understand features, or navigate settings.

How do I use Tessa?
On any dashboard page, you will see a floating "Ask Tessa" button at the bottom right. Tap it to open the chat. Type your question, and Tessa will reply based on the official Cresoa knowledge base.

What can Tessa help with?
Tessa can guide you through step‑by‑step instructions for tasks like adding customers, creating orders, managing inventory, renaming production stages, and inviting staff. She can also explain plan limits and what happens when you reach them.

Are there limits on how many questions I can ask?
Yes. Tessa usage is counted per request. Each question you ask consumes one "Tessa action". The monthly limits are:
Free: 5 actions per month
Starter: 50 actions per month
Pro: 500 actions per month
Beta: 200 actions per month
The limit resets at the start of each month. You can track your remaining actions on your dashboard.

What happens if I exceed my Tessa action limit?
You will see a notice on your dashboard. You will still be able to use the rest of Cresoa's features, but Tessa will not answer further questions until the next month or until you upgrade your plan.

What if Tessa gives me an answer that sounds wrong?
Tessa answers based on this official knowledge base. If you believe the answer is incorrect, please contact support via WhatsApp or submit a ticket. We will review and update the knowledge base if needed.

- - - - -

PLANS, BILLING & SUBSCRIPTION

What plans does Cresoa offer?
Cresoa offers four plans:
Free: ₦0 per month – 20 customers, 50 orders, 0 staff, 20 inventory items, 5 Tessa actions.
Starter: ₦3,500 per month – Unlimited customers, orders, inventory, 2 staff, 50 Tessa actions.
Pro: ₦9,500 per month – Unlimited customers, orders, inventory, 10 staff, 500 Tessa actions.
Beta: Free for 90 days – 500 customers, 1000 orders, 10 staff, 500 inventory items, 200 Tessa actions.

What is the Beta plan?
The Beta plan is an early‑access program for the first users of Cresoa. It gives you all Pro features for 90 days at no cost. After 90 days, the Beta period ends, and you will be asked to choose a paid plan that fits your business. Your data is never deleted.

How do I upgrade my plan?
Go to the Subscription page, choose the plan you want (Starter or Pro), and proceed to payment. Cresoa uses Paystack to process payments securely. Once payment is confirmed, your plan will be upgraded immediately.

How do I know my payment went through?
After paying, Cresoa automatically verifies the payment with Paystack. You will see a success message and your plan will reflect the upgrade right away.

What do I do if I paid but my plan hasn't upgraded?
Verification usually happens instantly. If your plan still hasn't changed after a few minutes, contact support with your payment reference so we can check on it.

Can I downgrade my plan?
Yes, you can change your plan from the Subscription page at any time. Keep in mind that downgrading may restrict access to features tied to your previous plan, such as group orders or staff accounts, if you are using more than the lower plan allows. For example, if you downgrade from Pro to Starter and have 5 staff members, you will need to remove extra staff before the downgrade takes effect. Your data is never deleted; you simply lose access to features.

What happens when my Beta period ends?
Your business data (customers, orders, inventory, etc.) is completely safe and will never be deleted. Staff accounts will be automatically disabled if your new plan does not include staff seats. You will be prompted to choose a paid plan (Starter or Pro) to continue using advanced features. You can also choose to downgrade to the Free plan, but you must ensure you are within the Free plan limits before doing so.

Can I cancel my subscription at any time?
Yes, you can cancel at any time from the Subscription page. Your access will continue until the end of your current billing cycle, after which your account will revert to the Free plan.

- - - - -

SUPPORT & TROUBLESHOOTING

How do I contact support?
You can reach support via WhatsApp at the number shown in your dashboard footer. Alternatively, you can submit a support ticket from the Support Hub page (accessible from the dashboard). Both methods will reach the same team.

What happens when I submit a support ticket?
Your ticket is sent to the Cresoa support team. They will review it and reply to you via email within 24 hours. You can also track your open tickets from the Support Hub.

How do I reset my password?
On the login screen, click "Forgot Password". Enter your registered email address, and you will receive instructions to reset your password.

What do I do if I find a bug?
If you are a Beta user, you can report the bug through the Feedback page in your dashboard. Include a description of the issue and a star rating. If you are not a Beta user, please contact support via WhatsApp or submit a ticket.

What should I do if I can't log in?
Double‑check that your email and password are correct. If you have forgotten your password, use the reset option. If the issue continues, contact support.

How do I update my business details?
Go to Settings, then Business Settings. There you can update your business name, phone number, WhatsApp number, location, and logo. You can also customise your tracking page colours and messages.

Is there a way to test my tracking page before sending it to customers?
Yes. While editing your tracking page settings, there is a live preview that shows exactly how the page will look with your chosen colours, logo, and messages. You can also generate a test tracking link from an order and open it to see the full experience.

What happens if I delete a customer or order?
Deleted customers and orders are permanently removed from the system and cannot be recovered. Be careful when deleting, and only remove data that you are sure you no longer need.

- - - - -

ADDITIONAL TIPS

Regularly check your dashboard for alerts about low stock, overdue orders, and remaining Tessa actions.
Keep your customer profiles updated with accurate measurements to save time on future orders.
Review your staff list periodically to remove inactive users and free up staff seats.
Customise your tracking page to match your brand – it helps build trust with your customers.
If you are unsure about a feature, ask Tessa first before contacting support; she can often help faster.

`;

// ─── 1. SMART RAG ENGINE ─────────────────────────────────────
function splitIntoChunks(text) {
  if (!text || text.trim() === '') return [];
  return text.split(/\n\s*\n|##\s*/).filter(chunk => chunk.trim().length > 50);
}

function getRelevantChunks(query, chunks) {
  if (chunks.length === 0) return ["No context available."];
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

// ─── 2. STRICT SYSTEM PROMPT (Force reasoning and follow-ups) ───
const SYSTEM_PROMPT = `
You are Tessa, a warm, professional, and helpful assistant for the Cresoa business management platform.

ABSOLUTE RULES YOU MUST FOLLOW:
1. NEVER use asterisks (*), hashtags (#), backticks (`), or underscores (_) in your replies.
2. NEVER use emojis or emoticons.
3. NEVER say "I am powered by AI", "As an AI model", or mention any technology provider.
4. NEVER say "according to the manual". Just answer naturally.

HOW TO ANSWER FOLLOW-UP QUESTIONS (CRITICAL):
- If the user asks a specific follow-up question (e.g., "Where will I click?", "What's the first step?"), look at the "Conversation History" provided below.
- Do NOT repeat the entire guide or list of steps. Answer ONLY the specific sub-question they are asking.
- If they ask "Where do I click?", simply tell them the exact button name and location (e.g., "Go to the Orders page and click the 'New Order' button at the top right").

HOW TO HANDLE MISSING INFORMATION:
- Use the "Platform Context" provided below as your main source of truth.
- If the exact answer is not in the Platform Context, use your general understanding of the Cresoa platform to deduce the most logical answer based on common UI patterns (e.g., buttons are often at the top right, settings are often in the sidebar).
- If you genuinely cannot deduce an answer, say: "I don't have that specific information yet. Please contact support via WhatsApp or submit a ticket."

BEHAVIOR:
- Always be concise. Do not write long paragraphs. Use bullet points with single dashes (-) when listing steps.
`;

// ─── 3. GET CONVERSATION HISTORY (Memory System) ────────────
async function getConversationHistory(userId, businessId) {
  // Get the last 5 messages for memory
  const { data, error } = await supabaseAdmin
    .from('support_messages')
    .select('sender_type, message')
    .eq('business_id', businessId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error || !data) return "";
  // Reverse to put them in chronological order
  return data.reverse().map(msg => 
    `${msg.sender_type === 'user' ? 'User' : 'Tessa'}: ${msg.message}`
  ).join('\n');
}

// ─── 4. GROQ PRIMARY CALLER ──────────────────────────────────
async function callGroq(message, contextString, historyString) {
  const API_KEY = process.env.GROQ_API_KEY;
  if (!API_KEY) return null;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Conversation History:\n${historyString}\n\nPlatform Context:\n"""\n${contextString}\n"""\n\nUser Question: ${message}` }
        ]
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || null;
  } catch (e) { return null; }
}

// ─── 5. GEMINI FALLBACK CALLER ──────────────────────────────
async function callGemini(message, contextString, historyString) {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) return null;

  try {
    const prompt = `${SYSTEM_PROMPT}\n\nConversation History:\n${historyString}\n\nPlatform Context:\n"""\n${contextString}\n"""\n\nUser Question: ${message}`;
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

// ─── 6. HARDCODED FALLBACK ──────────────────────────────────
function getHardcodedFallback(message) {
  const lower = message.toLowerCase();
  if (lower.includes('staff') || lower.includes('team')) return "To manage staff, go to the Staff page. You can invite, remove, or change roles there.";
  if (lower.includes('order') || lower.includes('buba')) return "Orders are managed in the Orders page. Use the 'New Order' button to create one.";
  if (lower.includes('subscription') || lower.includes('plan') || lower.includes('pay')) return "To upgrade your plan, go to the Subscription page.";
  if (lower.includes('production') || lower.includes('sewing')) return "To move an order through production, open the Production page and update the status.";
  return "I'm currently connecting to my AI brain. Please contact support via WhatsApp if you need immediate help.";
}

// ─── 7. POST-PROCESSING FILTER (Removes markdown/asterisks) ───
function cleanResponse(text) {
  if (!text) return text;
  // Kill all markdown characters: *, _, #, `, ~
  return text.replace(/[*_#`~]/g, '').trim();
}

// ─── 8. MAIN ORCHESTRATOR ──────────────────────────────────
export async function POST(req) {
  try {
    // 1. Authenticate user
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, business_id } = await req.json();
    if (!message || !business_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 2. Fetch RAG chunks
    const chunks = splitIntoChunks(FULL_PDF_TEXT);
    const relevantContext = getRelevantChunks(message, chunks);
    const contextString = relevantContext.join('\n\n---\n\n');

    // 3. Fetch Memory (Last 5 messages)
    const historyString = await getConversationHistory(user.id, business_id);

    // 4. Try Groq
    let answer = await callGroq(message, contextString, historyString);
    let source = 'groq';

    // 5. If Groq fails, try Gemini
    if (!answer) {
      console.warn('Groq failed, falling back to Gemini...');
      answer = await callGemini(message, contextString, historyString);
      source = 'gemini';
    }

    // 6. If both fail, use hardcoded fallback
    if (!answer) {
      answer = getHardcodedFallback(message);
      source = 'fallback';
    }

    // 7. Clean the response (remove asterisks/markdown)
    const cleanedAnswer = cleanResponse(answer);

    // 8. Save the conversation to the database (New and Reply)
    await supabaseAdmin.from('support_messages').insert([
      { business_id, user_id: user.id, sender_type: 'user', message },
      { business_id, user_id: user.id, sender_type: 'assistant', message: cleanedAnswer }
    ]);

    return NextResponse.json({ answer: cleanedAnswer, source });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      answer: "Tessa is experiencing technical difficulties. Please try again in a moment.", 
      source: 'emergency_fallback' 
    });
  }
  }
