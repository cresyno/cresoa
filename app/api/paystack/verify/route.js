// app/api/paystack/verify/route.js

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const reference = searchParams.get('reference')

    if (!reference) {
      return NextResponse.json({ error: 'Missing transaction reference' }, { status: 400 })
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY
    if (!secretKey) {
      return NextResponse.json({ error: 'Paystack not configured' }, { status: 500 })
    }

    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
    })

    const data = await response.json()

    if (!data.status) {
      return NextResponse.json({ error: data.message || 'Verification failed' }, { status: 400 })
    }

    const { metadata, status, amount, reference: txRef } = data.data

    if (status !== 'success') {
      return NextResponse.json({ error: 'Transaction not successful' }, { status: 400 })
    }

    const { data: history, error: historyError } = await supabaseAdmin
      .from('subscription_history')
      .select('business_id, new_plan')
      .eq('paystack_transaction_ref', txRef)
      .eq('status', 'pending')
      .single()

    if (historyError || !history) {
      console.error('History lookup failed:', historyError)
      return NextResponse.json({ error: 'No pending transaction found' }, { status: 404 })
    }

    const businessId = history.business_id
    const planId = history.new_plan

    const { error: updateError } = await supabaseAdmin
      .from('businesses')
      .update({
        plan: planId,
        plan_status: 'active',
        subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        last_payment_date: new Date(),
      })
      .eq('id', businessId)

    if (updateError) {
      console.error('Business update failed:', updateError)
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
    }

    await supabaseAdmin
      .from('subscription_history')
      .update({
        status: 'success',
        old_plan: 'free',
        new_plan: planId,
        amount_paid: amount / 100,
      })
      .eq('paystack_transaction_ref', txRef)

    await supabaseAdmin
      .from('payment_records')
      .insert({
        business_id: businessId,
        amount: amount / 100,
        note: `Subscription to ${metadata.plan_name || planId} plan`,
      })

    return NextResponse.json({ status: 'success', plan: planId, message: 'Subscription activated successfully' })

  } catch (error) {
    console.error('Paystack verification error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
