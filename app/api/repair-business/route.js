// app/api/repair-business/route.js

import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabaseClient'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check if business already exists
    const { data: existing } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'Business already exists',
        business: existing,
      })
    }

    // Create business record with defaults
    const newBusiness = {
      owner_id: user.id,
      name: user.user_metadata?.business_name || 'My Business',
      phone: '',
      location: '',
      sector: 'Fashion & Custom Wear',
      business_type: 'Fashion Designer',
      onboarding_completed: true,
      plan: 'free',
      plan_status: 'active',
      trial_starts_at: new Date().toISOString(),
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      is_active: true,
    }

    const { data: inserted, error: insertError } = await supabase
      .from('businesses')
      .insert(newBusiness)
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Business created successfully',
      business: inserted,
    })

  } catch (error) {
    console.error('Repair error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
  }
