// app/api/staff/remove/route.js

import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabaseClient'
import { isOwner } from '../../../../lib/staffAuth'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { staffId, businessId } = await request.json()

    if (!staffId || !businessId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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
        { error: 'Only the business owner can remove staff' },
        { status: 403 }
      )
    }

    // Update staff status to inactive
    const { error } = await supabase
      .from('staff')
      .update({ status: 'inactive' })
      .eq('id', staffId)
      .eq('business_id', businessId)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to remove staff' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Staff member removed successfully',
    })

  } catch (error) {
    console.error('Remove error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
