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

    // 2. LOG EVERYTHING
    console.log('🔵 ===== PAYSTACK VERIFICATION =====')
    console.log('🔵 Reference:', txRef)
    console.log('🔵 Metadata:', JSON.stringify(metadata, null, 2))
    console.log('🔵 Business ID from metadata:', metadata.business_id)
    console.log('🔵 Plan:', metadata.plan)

    // 3. Check if business exists
    const businessId = metadata.business_id

    if (!businessId) {
      console.error('❌ No business_id in metadata')
      return NextResponse.json(
        { error: 'No business ID in payment metadata' },
        { status: 400 }
      )
    }

    const { data: existingBusiness, error: checkError } = await supabase
      .from('businesses')
      .select('id, plan, owner_id')
      .eq('id', businessId)
      .single()

    if (checkError || !existingBusiness) {
      console.error('❌ Business not found for ID:', businessId)
      console.error('❌ Supabase error:', checkError)
      
      // Try to find by owner_id (as fallback) – but we don't have owner_id in metadata
      // Instead, return a clear error
      return NextResponse.json(
        { 
          error: `Business not found for ID: ${businessId}`,
          debug: { businessId, metadata }
        },
        { status: 404 }
      )
    }

    console.log('✅ Found business:', existingBusiness)

    // 4. Update business plan
    const { data: updatedBusiness, error: updateError } = await supabase
      .from('businesses')
      .update({
        plan: metadata.plan,
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

    console.log('✅ Business updated:', updatedBusiness)

    // 5. Update subscription history
    await supabase
      .from('subscription_history')
      .update({
        status: 'success',
        old_plan: 'free',
        new_plan: metadata.plan,
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
        note: `Subscription to ${metadata.plan_name} plan`,
        reference: txRef,
      })

    console.log('✅ All done – plan upgraded')
    console.log('🔵 ===== END =====')

    return NextResponse.json({
      status: 'success',
      plan: metadata.plan,
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
