// app/api/paystack/webhook/route.js

import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-paystack-signature')
    const secretKey = process.env.PAYSTACK_SECRET_KEY

    if (!secretKey) {
      console.error('PAYSTACK_SECRET_KEY not set')
      return NextResponse.json({ error: 'Paystack not configured' }, { status: 500 })
    }

    const expectedSignature = crypto
      .createHmac('sha512', secretKey)
      .update(body)
      .digest('hex')

    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = JSON.parse(body)

    if (event.event !== 'charge.success') {
      return NextResponse.json({ received: true })
    }

    const { metadata, amount, reference, status } = event.data

    if (status !== 'success') {
      return NextResponse.json({ received: true })
    }

    const { data: existing } = await supabaseAdmin
      .from('subscription_history')
      .select('id')
      .eq('paystack_transaction_ref', reference)
      .eq('status', 'success')
      .single()

    if (existing) {
      return NextResponse.json({ received: true, message: 'Already processed' })
    }

    await supabaseAdmin
      .from('businesses')
      .update({
        plan: metadata.plan,
        plan_status: 'active',
        subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        last_payment_date: new Date(),
      })
      .eq('id', metadata.business_id)

    await supabaseAdmin
      .from('subscription_history')
      .update({
        status: 'success',
        old_plan: 'free',
        new_plan: metadata.plan,
        amount_paid: amount / 100,
      })
      .eq('paystack_transaction_ref', reference)

    await supabaseAdmin
      .from('payment_records')
      .insert({
        business_id: metadata.business_id,
        amount: amount / 100,
        note: `Subscription to ${metadata.plan_name} plan`,
      })

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Paystack webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
