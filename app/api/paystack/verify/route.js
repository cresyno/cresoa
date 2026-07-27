// app/api/paystack/verify/route.js

import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabaseClient'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const reference = searchParams.get('reference')

    if (!reference) {
      return NextResponse.json(
        { error: 'Missing transaction reference' },
        { status: 400 }
      )
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY
    if (!secretKey) {
      return NextResponse.json(
        { error: 'Paystack not configured' },
        { status: 500 }
      )
    }

    // Verify with Paystack
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    })

    const data = await response.json()

    if (!data.status) {
      return NextResponse.json(
        { error: data.message || 'Verification failed' },
        { status: 400 }
      )
    }

    const { metadata, status, amount, reference: txRef } = data.data

    if (status !== 'success') {
      return NextResponse.json(
        { error: 'Transaction not successful' },
        { status: 400 }
      )
    }

    // Update business plan
    const { data: business } = await supabase
      .from('businesses')
      .update({
        plan: metadata.plan,
        plan_status: 'active',
        subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        last_payment_date: new Date(),
      })
      .eq('id', metadata.business_id)
      .select()
      .single()

    // Update subscription history
    await supabase
      .from('subscription_history')
      .update({
        status: 'success',
        old_plan: 'free',
        new_plan: metadata.plan,
        amount_paid: amount / 100,
      })
      .eq('paystack_transaction_ref', txRef)

    // Record payment
    await supabase
      .from('payment_records')
      .insert({
        business_id: metadata.business_id,
        amount: amount / 100,
        type: 'subscription',
        note: `Subscription to ${metadata.plan_name} plan`,
        reference: txRef,
      })

    return NextResponse.json({
      status: 'success',
      plan: metadata.plan,
      message: 'Subscription activated successfully',
    })

  } catch (error) {
    console.error('Paystack verification error:', error)
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    )
  }
        }
