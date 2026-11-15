import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUsablePayout } from '@/lib/payments'

export const dynamic = 'force-dynamic'

function platformFeeKobo(amountKobo) {
  const bps = Number(process.env.PLATFORM_FEE_BPS ?? 50)
  const cap = Number(process.env.PLATFORM_FEE_CAP_KOBO ?? 50000)
  return Math.min(Math.round((amountKobo * bps) / 10000), cap)
}

export async function POST(req) {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY
    if (!secret) throw new Error('PAYSTACK_SECRET_KEY is missing in Vercel')

    const body = await req.json().catch(() => ({}))
    const { slug, form, cart, totalAmount } = body

    if (!slug || !form?.name || !form?.phone || !form?.address || !totalAmount) {
      throw new Error('Missing required checkout details from frontend')
    }

    // 1. Find Business
    const { data: page, error: pageErr } = await supabaseAdmin
      .from('business_public_pages')
      .select('business_id')
      .eq('slug', String(slug).toLowerCase())
      .maybeSingle()

    if (pageErr) throw new Error(`Database error (pages): ${pageErr.message}`)
    if (!page) throw new Error('Store not found')
    
    const businessId = page.business_id

    // 2. Check Payout setup
    const payout = await getUsablePayout(businessId)
    if (!payout) throw new Error('This business has not enabled online payments yet')
    if (payout.payout_mode === 'direct' && !payout.paystack_subaccount_code) {
      throw new Error('This business has no subaccount code')
    }

    const email = form.email || `pay+${crypto.randomBytes(4).toString('hex')}@cresoa.com.ng`
    
    // 3. Format items for public_orders
    const orderItems = cart.map(item => {
      const p = item.product || item;
      return {
        product_id: p.id,
        name: p.item_name || p.name,
        price: p.selling_price,
        quantity: item.quantity,
        image_url: p.image_url || ''
      }
    })

    // 4. Create the Website Order securely in public_orders
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('public_orders')
      .insert({
        business_id: businessId,
        customer_name: form.name,
        customer_phone: form.phone,
        customer_address: form.address,
        items: orderItems,
        total_amount: totalAmount,
        status: 'pending'
      })
      .select('id')
      .single()

    if (orderErr) throw new Error(`Database error (create order): ${orderErr.message}`)

    // 5. Paystack Init
    const amountKobo = Math.round(totalAmount * 100)
    const fee = platformFeeKobo(amountKobo)
    const modePrefix = secret.startsWith('sk_test') ? 'test_' : ''
    const reference = `cso_${modePrefix}${crypto.randomBytes(12).toString('hex')}`

    const { data: intent, error: intentErr } = await supabaseAdmin
      .from('payment_intents')
      .insert({
        business_id: businessId,
        order_id: order.id,
        reference,
        amount_kobo: amountKobo,
        platform_fee_kobo: fee,
        payout_mode: payout.payout_mode,
        payer_email: email,
      })
      .select('id')
      .single()

    if (intentErr) throw new Error(`Database error (create intent): ${intentErr.message}`)

    // ✅ Force the callback to the clean Success page
    const origin = req.headers.get('origin') || new URL(req.url).origin
    const callbackUrl = `${origin}/${slug}/success`

    const payload = {
      email,
      amount: amountKobo,
      currency: 'NGN',
      reference,
      callback_url: callbackUrl, 
      metadata: {
        kind: 'storefront_checkout',
        intent_id: intent.id,
        order_id: order.id,
        business_id: businessId,
      },
    }

    if (payout.payout_mode === 'direct') {
      payload.subaccount = payout.paystack_subaccount_code
      payload.transaction_charge = fee
      payload.bearer = 'subaccount'
    }

    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    
    const json = await res.json().catch(() => null)
    if (!res.ok || !json?.status) {
      throw new Error(`Paystack Error: ${json?.message || 'Failed to initialize'}`)
    }

    return NextResponse.json({ url: json.data.authorization_url, trackingToken: reference })

  } catch (error) {
    console.error("Checkout API Error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
        }
