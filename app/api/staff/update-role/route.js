// app/api/staff/update-role/route.js

import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabaseClient'
import { isOwner } from '../../../../lib/staffAuth'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { staffId, businessId, role } = await request.json()

    if (!staffId || !businessId || !role) {
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
        { error: 'Only the business owner can update staff roles' },
        { status: 403 }
      )
    }

    const { error } = await supabase
      .from('staff')
      .update({ role })
      .eq('id', staffId)
      .eq('business_id', businessId)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update role' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Role updated successfully',
    })

  } catch (error) {
    console.error('Update role error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
