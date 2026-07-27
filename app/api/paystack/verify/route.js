// app/api/paystack/verify/route.js

import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabaseClient'

export const dynamic = 'force-dynamic'

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

    // 1. Verify with Paystack
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
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

    // 2. 🔥 Look up business_id from subscription_history
    const { data: history, error: historyError } = await supabase
      .from('subscription_history')
      .select('business_id, new_plan, amount_paid')
      .eq('paystack_transaction_ref', txRef)
      .eq('status', 'pending')
      .single()

    if (historyError || !history) {
      console.error('❌ No pending transaction found for reference:', txRef)
      return NextResponse.json(
        { error: 'No pending transaction found for this reference' },
        { status: 404 }
      )
    }

    const businessId = history.business_id
    const planId = history.new_plan

    console.log('✅ Found business ID from history:', businessId)

    // 3. Check if business exists
    const { data: existingBusiness, error: checkError } = await supabase
      .from('businesses')
      .select('id, plan')
      .eq('id', businessId)
      .single()

    if (checkError || !existingBusiness) {
      console.error('❌ Business not found:', businessId)
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // 4. Update business plan
    const { data: updatedBusiness, error: updateError } = await supabase
      .from('businesses')
      .update({
        plan: planId,
        plan_status: 'active',
        subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        last_payment_date: new Date(),
      })
      .eq('id', businessId)
      .select()

    if (updateError) {
      console.error('❌ Update error:', updateError)
      return NextResponse.json(
        { error: 'Database update failed: ' + updateError.message },
        { status: 500 }
      )
    }

    // 5. Update subscription history status
    await supabase
      .from('subscription_history')
      .update({
        status: 'success',
        old_plan: 'free',
        new_plan: planId,
        amount_paid: amount / 100,
      })
      .eq('paystack_transaction_ref', txRef)

    // 6. Record payment
    await supabase
      .from('payment_records')
      .insert({
        business_id: businessId,
        amount: amount / 100,
        type: 'subscription',
        note: `Subscription to ${metadata.plan_name || planId} plan`,
        reference: txRef,
      })

    console.log('✅ Plan upgraded successfully for business:', businessId)

    return NextResponse.json({
      status: 'success',
      plan: planId,
      message: 'Subscription activated successfully',
      business: updatedBusiness,
    })

  } catch (error) {
    console.error('❌ Paystack verification error:', error)
    return NextResponse.json(
      { error: 'Verification failed: ' + error.message },
      { status: 500 }
    )
  }
}
