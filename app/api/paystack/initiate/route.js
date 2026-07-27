// app/api/paystack/initiate/route.js

import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabaseClient'
import { PLANS } from '../../../../lib/planLimits'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { businessId, planId, email } = await request.json()

    if (!businessId || !planId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: businessId, planId, email' },
        { status: 400 }
      )
    }

    const plan = PLANS[planId]
    if (!plan) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      )
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY
    if (!secretKey) {
      return NextResponse.json(
        { error: 'Payment initiation failed – server configuration error' },
        { status: 500 }
      )
    }

    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('id, owner_id, plan')
      .eq('id', businessId)
      .single()

    if (bizError || !business) {
      console.error('❌ Business not found for ID:', businessId)
      return NextResponse.json(
        { error: 'Business account not found. Please complete onboarding.' },
        { status: 400 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!appUrl) {
      return NextResponse.json(
        { error: 'App URL not configured' },
        { status: 500 }
      )
    }

    // Create pending record
    const { data: historyRecord, error: insertError } = await supabase
      .from('subscription_history')
      .insert({
        business_id: businessId,
        old_plan: business.plan || 'free',
        new_plan: planId,
        status: 'pending',
        amount_paid: plan.price,
        notes: `Payment initiated for ${plan.name} plan`,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to create subscription history:', insertError)
      return NextResponse.json(
        { error: 'Failed to initialize payment record' },
        { status: 500 }
      )
    }

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
          history_id: historyRecord.id,
        },
        callback_url: `${appUrl}/dashboard/subscription`,
      }),
    })

    const data = await response.json()

    if (!data.status) {
      console.error('Paystack error:', data.message)
      await supabase.from('subscription_history').delete().eq('id', historyRecord.id)
      return NextResponse.json(
        { error: data.message || 'Payment initiation failed' },
        { status: 400 }
      )
    }

    await supabase
      .from('subscription_history')
      .update({
        paystack_transaction_ref: data.data.reference,
      })
      .eq('id', historyRecord.id)

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
