// app/api/staff/list/route.js

import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabaseClient'
import { isOwner } from '../../../../lib/staffAuth'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json(
        { error: 'Missing businessId' },
        { status: 400 }
      )
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify owner
    const owner = await isOwner(user.id, businessId)
    if (!owner) {
      return NextResponse.json(
        { error: 'Only the business owner can view staff' },
        { status: 403 }
      )
    }

    const { data: staff, error } = await supabase
      .from('staff')
      .select('*, users:user_id(email, id)')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch staff' },
        { status: 500 }
      )
    }

    // Get plan limit info
    const { data: business } = await supabase
      .from('businesses')
      .select('plan')
      .eq('id', businessId)
      .single()

    const plan = business?.plan || 'free'
    const { getStaffLimit } = await import('../../../lib/planLimits')
    const limit = getStaffLimit(plan)

    return NextResponse.json({
      staff: staff || [],
      limit: limit,
      plan: plan,
    })

  } catch (error) {
    console.error('List staff error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
