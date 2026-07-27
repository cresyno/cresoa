// app/api/paystack/initiate/route.js

import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabaseClient'
import { PLANS } from '../../../../lib/planLimits'

export async function POST(request) {
  try {
    const { businessId, planId, email } = await request.json()

    if (!businessId || !planId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const plan = PLANS[planId]
    if (!plan) {
      return NextResponse.json(
        { error: 'Invalid plan' },
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

    // Initiate Paystack transaction
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: plan.price * 100,
        currency: 'NGN',
        metadata: {
          business_id: businessId,
          plan: planId,
          plan_name: plan.name,
          platform: 'cresoa',
        },
        // ✅ Remove ?status=success
        callback_url: `${NEXT_PUBLIC_APP_URL}/dashboard/subscription`,
      }),
    })

    const data = await response.json()

    if (!data.status) {
      console.error('Paystack initiation error:', data)
      return NextResponse.json(
        { error: data.message || 'Payment initiation failed' },
        { status: 400 }
      )
    }

    // Store transaction reference
    await supabase
      .from('subscription_history')
      .insert({
        business_id: businessId,
        old_plan: 'free',
        new_plan: planId,
        status: 'pending',
        amount_paid: plan.price,
        paystack_transaction_ref: data.data.reference,
        notes: `Payment initiated for ${plan.name} plan`,
      })

    return NextResponse.json({
      status: 'success',
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
    })

  } catch (error) {
    console.error('Paystack initiation error:', error)
    return NextResponse.json(
      { error: 'Payment initiation failed' },
      { status: 500 }
    )
  }
}
