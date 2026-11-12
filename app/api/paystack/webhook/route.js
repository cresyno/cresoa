import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

const PLAN_PRICES_NAIRA = { starter: 3500, pro: 9500 }

const ok = (extra = {}) => NextResponse.json({ received: true, ...extra })

function validSignature(body, signature, secret) {
  if (!signature) return false
  const expected = crypto.createHmac('sha512', secret).update(body).digest('hex')
  const a = Buffer.from(signature, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

async function verifyWithPaystack(reference, secret) {
  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secret}` }, cache: 'no-store' }
  )
  if (!res.ok) throw new Error(`verify http ${res.status}`)
  const json = await res.json()
  return json?.status ? json.data : null
}

async function handleOrderPayment(data, secret) {
  const verified = await verifyWithPaystack(data.reference, secret)
  if (!verified || verified.status !== 'success' || verified.currency !== 'NGN') {
    return { status: 'needs_review', note: 'verification did not confirm success' }
  }
  
  const { data: result, error } = await db.rpc('apply_order_payment', {
    p_reference: verified.reference,
    p_amount_kobo: verified.amount,
    p_paystack_fee_kobo: verified.fees ?? 0,
  })
  
  if (error) throw new Error(error.message)
  console.log(`[WEBHOOK] RPC result:`, result)

  // ✅ FORCE STOCK DEDUCTION FOR STOREFRONT ORDERS
  const kind = data.metadata?.kind
  const orderId = data.metadata?.order_id

  if (kind === 'storefront_checkout' && orderId) {
    console.log(`[WEBHOOK] Storefront checkout detected. Updating stock for order: ${orderId}`)
    
    const { data: order, error: orderErr } = await db
      .from('orders')
      .select('custom_fields')
      .eq('id', orderId)
      .maybeSingle()

    if (orderErr) console.error(`[WEBHOOK] Fetch order error:`, orderErr.message)
    
    const cart = order?.custom_fields?.cart
    if (Array.isArray(cart)) {
      for (const item of cart) {
        const productId = item.id || item.product_id
        const qty = Number(item.quantity) || 1
        
        if (productId) {
          console.log(`[WEBHOOK] Fetching stock for product: ${productId}`)
          const { data: prod, error: prodErr } = await db
            .from('business_products')
            .select('stock')
            .eq('id', productId)
            .maybeSingle()
            
          if (prodErr) console.error(`[WEBHOOK] Fetch product error:`, prodErr.message)
            
          if (prod) {
            const newStock = Math.max(0, Number(prod.stock) - qty)
            console.log(`[WEBHOOK] Reducing stock for ${productId} from ${prod.stock} to ${newStock}`)
            
            const { error: updateErr } = await db
              .from('business_products')
              .update({ stock: newStock })
              .eq('id', productId)
              
            if (updateErr) console.error(`[WEBHOOK] Update stock error:`, updateErr.message)
          } else {
            console.log(`[WEBHOOK] Product not found: ${productId}`)
          }
        }
      }
    } else {
      console.log(`[WEBHOOK] No cart array found in order.`)
    }
  }

  if (result === 'already_processed') return { status: 'processed' }
  return { status: 'processed' } // We always return processed so it doesn't get stuck
}

async function handleSubscription(data) {
  const { plan, business_id: businessId } = data.metadata || {}
  if (!plan || !businessId) return { status: 'ignored', note: 'no subscription metadata' }

  const expected = PLAN_PRICES_NAIRA[plan]
  if (expected === undefined || data.currency !== 'NGN' || data.amount !== expected * 100) {
    return { status: 'needs_review', note: `plan/amount mismatch: ${plan} ${data.amount}` }
  }

  const { data: biz, error: bizErr } = await db
    .from('businesses').select('plan').eq('id', businessId).maybeSingle()
  if (bizErr) throw new Error(bizErr.message)
  if (!biz) return { status: 'needs_review', note: 'business not found' }

  const { error: upErr } = await db.from('businesses').update({
    plan,
    plan_status: 'active',
    subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    last_payment_date: new Date().toISOString(),
  }).eq('id', businessId)
  if (upErr) throw new Error(upErr.message)

  const row = {
    status: 'success',
    old_plan: biz.plan || 'free',
    new_plan: plan,
    amount_paid: data.amount / 100,
  }
  const { data: updated, error: histErr } = await db
    .from('subscription_history').update(row)
    .eq('paystack_transaction_ref', data.reference).select('id')
  if (histErr) throw new Error(histErr.message)
  if (!updated || updated.length === 0) {
    const { error: insErr } = await db.from('subscription_history').insert({
      business_id: businessId,
      paystack_transaction_ref: data.reference,
      ...row,
    })
    if (insErr) throw new Error(insErr.message)
  }
  return { status: 'processed' }
}

export async function POST(request) {
  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  const body = await request.text()
  if (!validSignature(body, request.headers.get('x-paystack-signature'), secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event
  try { event = JSON.parse(body) } catch { return NextResponse.json({ error: 'Bad body' }, { status: 400 }) }

  if (event.event !== 'charge.success') return ok()
  const data = event.data || {}
  const reference = data.reference
  if (!reference || data.status !== 'success') return ok()

  const dedupeKey = `charge.success:${reference}`
  const { error: insErr } = await db.from('payment_events').insert({
    dedupe_key: dedupeKey,
    event_type: event.event,
    reference,
    payload: {
      amount: data.amount, currency: data.currency, channel: data.channel,
      fees: data.fees, paid_at: data.paid_at, metadata: data.metadata,
    },
  })
  if (insErr) {
    if (insErr.code !== '23505') {
      console.error('payment_events insert failed:', insErr.message)
      return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
    const { data: prev } = await db.from('payment_events')
      .select('status').eq('dedupe_key', dedupeKey).maybeSingle()
    if (prev && prev.status !== 'received') return ok({ duplicate: true })
  }

  try {
    const kind = data.metadata && data.metadata.kind
    const isOrderPayment = kind === 'order_payment' || kind === 'storefront_checkout'
    
    const outcome = isOrderPayment
      ? await handleOrderPayment(data, secret)
      : await handleSubscription(data)

    await db.from('payment_events').update({
      status: outcome.status,
      note: outcome.note || null,
      processed_at: new Date().toISOString(),
    }).eq('dedupe_key', dedupeKey)

    return ok()
  } catch (err) {
    console.error('Webhook processing failed:', reference, err && err.message)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
  }
