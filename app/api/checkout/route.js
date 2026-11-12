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
    if (!secret) throw new Error('PAYSTACK_SECRET_KEY is missing')

    const body = await req.json().catch(() => ({}))
    const { slug, form, cart, totalAmount } = body

    if (!slug || !form?.name || !form?.phone || !form?.address || !totalAmount) {
      throw new Error('Missing required checkout details')
    }

    const { data: page, error: pageErr } = await supabaseAdmin
      .from('business_public_pages')
      .select('business_id')
      .eq('slug', String(slug).toLowerCase())
      .maybeSingle()

    if (pageErr) throw new Error(`Database (pages): ${pageErr.message}`)
    if (!page) throw new Error('Store not found')
    
    const businessId = page.business_id
    const payout = await getUsablePayout(businessId)
    if (!payout) throw new Error('This business has not enabled online payments yet')
    if (payout.payout_mode === 'direct' && !payout.paystack_subaccount_code) {
      throw new Error('This business has no subaccount code')
    }

    const email = form.email || `pay+${crypto.randomBytes(4).toString('hex')}@cresoa.com.ng`
    
    let { data: existingCustomer } = await supabaseAdmin
      .from('customers').select('id').eq('business_id', businessId).eq('phone', form.phone).maybeSingle()

    let customerId = existingCustomer?.id

    if (!customerId) {
      const nameParts = form.name.trim().split(' ')
      const { data: newCustomer, error: custErr } = await supabaseAdmin
        .from('customers')
        .insert({
          business_id: businessId,
          name: form.name,
          first_name: nameParts[0] || form.name,
          last_name: nameParts.length > 1 ? nameParts.slice(1).join(' ') : '',
          phone: form.phone,
          email: email,
          address: form.address,
        }).select('id').single()

      if (custErr) throw new Error(`Database (customer): ${custErr.message}`)
      customerId = newCustomer.id
    }

    const trackingToken = crypto.randomUUID()
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .insert({
        business_id: businessId,
        customer_id: customerId,
        title: `Storefront Order (${cart.length} items)`,
        price: totalAmount, 
        amount_paid: 0,
        current_status: 'pending',
        tracking_token: trackingToken,
        project_address: form.address,
        customer_notes: `State: ${form.state}`,
        custom_fields: { cart: cart }
      }).select('id').single()

    if (orderErr) throw new Error(`Database (order): ${orderErr.message}`)

    const amountKobo = Math.round(totalAmount * 100)
    const fee = platformFeeKobo(amountKobo)
    const reference = `cso_${secret.startsWith('sk_test') ? 'test_' : ''}${crypto.randomBytes(12).toString('hex')}`

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
      }).select('id').single()

    if (intentErr) throw new Error(`Database (intent): ${intentErr.message}`)

    const site = new URL(req.url).origin
    const payload = {
      email,
      amount: amountKobo,
      currency: 'NGN',
      reference,
      callback_url: `${site}/${slug}/success`,
      metadata: { intent_id: intent.id, order_id: order.id, business_id: businessId },
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
    if (!res.ok || !json?.status) throw new Error(`Paystack: ${json?.message || 'Failed'}`)

    return NextResponse.json({ url: json.data.authorization_url, trackingToken })

  } catch (error) {
    // This guarantees we always send JSON back, never an HTML page
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
