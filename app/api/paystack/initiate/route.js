// app/api/paystack/initiate/route.js

import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabaseClient'
import { PLANS } from '../../../../lib/planLimits'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    // 1. Parse request body
    const { businessId, planId, email } = await request.json()

    // 2. Validate required fields
    if (!businessId || !planId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: businessId, planId, email' },
        { status: 400 }
      )
    }

    // 3. Validate plan exists
    const plan = PLANS[planId]
    if (!plan) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      )
    }

    // 4. Check Paystack secret key
    const secretKey = process.env.PAYSTACK_SECRET_KEY
    if (!secretKey) {
      console.error('PAYSTACK_SECRET_KEY is not set')
      return NextResponse.json(
        { error: 'Payment initiation failed – server configuration error' },
        { status: 500 }
      )
    }

    // 5. Verify the business exists
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('id, owner_id, plan')
      .eq('id', businessId)
      .single()

    if (bizError || !business) {
      console.error('Business not found:', businessId)
      return NextResponse.json(
        { error: 'Invalid business account' },
        { status: 400 }
      )
    }

    // 6. Get the app URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!appUrl) {
      console.error('NEXT_PUBLIC_APP_URL is not set')
      return NextResponse.json(
        { error: 'App URL not configured' },
        { status: 500 }
      )
    }

    // 7. Call Paystack to initialize transaction
    const payload = {
      email,
      amount: plan.price * 100, // Paystack uses kobo
      currency: 'NGN',
      metadata: {
        business_id: businessId,
        plan: planId,
        plan_name: plan.name,
        platform: 'cresoa',
      },
      callback_url: `${appUrl}/dashboard/subscription`,
    }

    console.log('🔵 Initiating Paystack payment:', {
      businessId,
      planId,
      email,
      amount: plan.price,
    })

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (!data.status) {
      console.error('Paystack initiation error:', data.message)
      return NextResponse.json(
        { error: data.message || 'Payment initiation failed' },
        { status: 400 }
      )
    }

    // 8. Store pending transaction in subscription_history
    const { error: insertError } = await supabase
      .from('subscription_history')
      .insert({
        business_id: businessId,
        old_plan: business.plan || 'free',
        new_plan: planId,
        status: 'pending',
        amount_paid: plan.price,
        paystack_transaction_ref: data.data.reference,
        notes: `Payment initiated for ${plan.name} plan`,
      })

    if (insertError) {
      console.error('Failed to record transaction:', insertError)
      // We still return the Paystack URL, but log the error
    }

    // 9. Return success with authorization URL
    return NextResponse.json({
      status: 'success',
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
    })

  } catch (error) {
    console.error('Paystack initiate error:', error)
    return NextResponse.json(
      { error: 'Payment initiation failed: ' + error.message },
      { status: 500 }
    )
  }
}
