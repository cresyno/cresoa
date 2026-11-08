import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { getUsablePayout } from '../../../../lib/payments'

export const dynamic = 'force-dynamic'

function platformFeeKobo(amountKobo) {
  const bps = Number(process.env.PLATFORM_FEE_BPS ?? 50)
  const cap = Number(process.env.PLATFORM_FEE_CAP_KOBO ?? 50000)
  return Math.min(Math.round((amountKobo * bps) / 10000), cap)
}

export async function POST(req) {
  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) return NextResponse.json({ error: 'Payments unavailable' }, { status: 500 })

  const body = await req.json().catch(() => ({}))
  const { slug, form, cart, totalAmount } = body

  if (!slug || !form?.name || !form?.phone || !form?.address || !totalAmount) {
    return NextResponse.json({ error: 'Missing required checkout details' }, { status: 400 })
  }

  // 1. Find the Business
  const { data: page } = await supabaseAdmin
    .from('business_public_pages')
    .select('business_id')
    .eq('slug', String(slug).toLowerCase())
    .maybeSingle()

  if (!page) return NextResponse.json({ error: 'Store not found' }, { status: 404 })
  const businessId = page.business_id

  // 2. Check Payout Status (Subaccount)
  const payout = await getUsablePayout(businessId)
  if (!payout) return NextResponse.json({ error: 'This business has not enabled online payments yet' }, { status: 409 })
  if (payout.payout_mode === 'direct' && !payout.paystack_subaccount_code) {
    return NextResponse.json({ error: 'This business has not enabled online payments yet' }, { status: 409 })
  }
  if (payout.payout_mode === 'hold' && process.env.HOLD_MODE_ENABLED !== 'true') {
    return NextResponse.json({ error: 'This business has not enabled online payments yet' }, { status: 409 })
  }

  // 3. Create or Find Customer (Using exact schema)
  const email = form.email || `pay+${crypto.randomBytes(4).toString('hex')}@cresoa.com.ng`
  
  // Check if customer exists by phone
  let { data: existingCustomer } = await supabaseAdmin
    .from('customers')
    .select('id')
    .eq('business_id', businessId)
    .eq('phone', form.phone)
    .maybeSingle()

  let customerId = existingCustomer?.id

  if (!customerId) {
    const nameParts = form.name.trim().split(' ')
    const firstName = nameParts[0] || form.name
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ''

    const { data: newCustomer, error: custErr } = await supabaseAdmin
      .from('customers')
      .insert({
        business_id: businessId,
        name: form.name,
        first_name: firstName,
        last_name: lastName,
        phone: form.phone,
        email: email,
        address: form.address,
      })
      .select('id')
      .single()

    if (custErr) {
      console.error("Customer insert failed:", custErr)
      return NextResponse.json({ error: 'Could not create customer profile' }, { status: 500 })
    }
    customerId = newCustomer.id
  }

  // 4. Create the Order (Using exact schema)
  const trackingToken = crypto.randomUUID()
  
  const { data: order, error: orderErr } = await supabaseAdmin
    .from('orders')
    .insert({
      business_id: businessId,
      customer_id: customerId,
      title: `Storefront Order (${cart.length} item${cart.length > 1 ? 's' : ''})`,
      price: totalAmount, 
      amount_paid: 0,
      current_status: 'pending',
      tracking_token: trackingToken,
      project_address: form.address,
      customer_notes: `State: ${form.state}`,
      custom_fields: { cart: cart } // Saving the cart items here as JSON
    })
    .select('id')
    .single()

  if (orderErr) {
    console.error("Order insert failed:", orderErr)
    return NextResponse.json({ error: 'Could not create order' }, { status: 500 })
  }

  // 5. Initialize Paystack
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

  if (intentErr) {
    console.error("Intent insert failed:", intentErr)
    return NextResponse.json({ error: 'Could not start payment' }, { status: 500 })
  }

  const site = new URL(req.url).origin
  const payload = {
    email,
    amount: amountKobo,
    currency: 'NGN',
    reference,
    callback_url: `${site}/${slug}/success?order=${trackingToken}`,
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
    await supabaseAdmin.from('payment_intents').update({ status: 'failed' }).eq('id', intent.id)
    return NextResponse.json({ error: 'Could not start payment with Paystack' }, { status: 502 })
  }

  return NextResponse.json({ url: json.data.authorization_url })
      }
