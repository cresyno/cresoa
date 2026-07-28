// app/api/create-business/route.js

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../../../lib/supabaseClient'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    // 1. Get the logged-in user from the normal client (uses cookie session)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Create an admin client with the service role key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // 3. Check if business already exists
    const { data: existing } = await supabaseAdmin
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

    // 4. Insert new business record
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

    const { data: inserted, error } = await supabaseAdmin
      .from('businesses')
      .insert(newBusiness)
      .select()
      .single()

    if (error) {
      console.error('Insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Business created successfully',
      business: inserted,
    })

  } catch (error) {
    console.error('Create business error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  }
