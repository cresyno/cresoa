import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { getUsablePayout } from '../../../../lib/payments'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MIN_KOBO = 10000 // ₦100

function platformFeeKobo(amountKobo) {
  const bps = Number(process.env.PLATFORM_FEE_BPS ?? 50)         // 0.5%
  const cap = Number(process.env.PLATFORM_FEE_CAP_KOBO ?? 50000) // ₦500
  return Math.min(Math.round((amountKobo * bps) / 10000), cap)
}

const fail = (error, status) => NextResponse.json({ error }, { status })

export async function POST(req, { params }) {
  const { token } = params
  if (!token || !UUID.test(token)) return fail('Invalid link', 400)

  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) return fail('Payments unavailable', 500)

  const body = await req.json().catch(() => ({}))

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, business_id, price, amount_paid, customers(email)')
    .eq('tracking_token', token)
    .maybeSingle()
  if (!order) return fail('Order not found', 404)

  const balanceKobo = Math.round(
    ((Number(order.price) || 0) - (Number(order.amount_paid) || 0)) * 100
  )
  if (balanceKobo <= 0) return fail('Nothing left to pay', 409)

  let amountKobo = balanceKobo
  if (body.amount !== undefined) {
    const asked = Math.round(Number(body.amount) * 100)
    const min = Math.min(MIN_KOBO, balanceKobo)
    if (!Number.isFinite(asked) || asked < min || asked > balanceKobo) {
      return fail('Invalid amount', 400)
    }
    amountKobo = asked
  }

  const payout = await getUsablePayout(order.business_id)
  const notReady = () => fail('This business has not enabled online payments yet', 409)
  if (!payout) return notReady()
  if (payout.payout_mode === 'direct' && !payout.paystack_subaccount_code) return notReady()
  if (payout.payout_mode === 'hold' && process.env.HOLD_MODE_ENABLED !== 'true') return notReady()

  const emailOk = (e) => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
  const email = emailOk(body.email)
    ? body.email
    : emailOk(order.customers?.email)
      ? order.customers.email
      : `pay+${order.id.slice(0, 8)}@cresoa.com.ng`

  const fee = platformFeeKobo(amountKobo)
  const reference = `cso_${crypto.randomBytes(12).toString('hex')}`

  const { data: intent, error: insErr } = await supabaseAdmin
    .from('payment_intents')
    .insert({
      business_id: order.business_id,
      order_id: order.id,
      reference,
      amount_kobo: amountKobo,
      platform_fee_kobo: fee,
      payout_mode: payout.payout_mode,
      payer_email: email,
    })
    .select('id')
    .single()
  if (insErr) return fail('Could not start payment', 500)

  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cresoa.com.ng'
  const payload = {
    email,
    amount: amountKobo,
    currency: 'NGN',
    reference,
    callback_url: `${site}/track/${token}?paid=1`,
    metadata: {
      kind: 'order_payment',
      intent_id: intent.id,
      order_id: order.id,
      business_id: order.business_id,
    },
  }
  if (payout.payout_mode === 'direct') {
    payload.subaccount = payout.paystack_subaccount_code
    payload.transaction_charge = fee // flat kobo that goes to Cresoa
    payload.bearer = 'subaccount'    // merchant bears Paystack's fee
  }

  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok || !json?.status) {
    await supabaseAdmin.from('payment_intents').update({ status: 'failed' }).eq('id', intent.id)
    return fail('Could not start payment', 502)
  }

  return NextResponse.json({ url: json.data.authorization_url, reference })
}
