// app/api/staff/invite/route.js

import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabaseClient'
import { isOwner, canAddStaff, getActiveStaffCount } from '../../../lib/staffAuth'
import { getStaffLimit } from '../../../lib/planLimits'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { email, role, businessId } = await request.json()

    if (!email || !role || !businessId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get current user
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
        { error: 'Only the business owner can invite staff' },
        { status: 403 }
      )
    }

    // Check plan limit
    const canAdd = await canAddStaff(user.id, businessId)
    if (!canAdd) {
      const limit = getStaffLimit(businessId)
      return NextResponse.json(
        { error: `You've reached the limit of ${limit} staff members on your current plan. Upgrade to add more.` },
        { status: 403 }
      )
    }

    // Check if user exists in auth
    const { data: existingUser } = await supabase
      .from('auth.users')
      .select('id, email')
      .eq('email', email)
      .single()

    let targetUserId = existingUser?.id

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'User not found. Please ensure they have signed up for Cresoa first.' },
        { status: 400 }
      )
    }

    // Check if already a staff member
    const { data: existingStaff } = await supabase
      .from('staff')
      .select('id, status')
      .eq('business_id', businessId)
      .eq('user_id', targetUserId)
      .single()

    if (existingStaff) {
      if (existingStaff.status === 'active') {
        return NextResponse.json(
          { error: 'This user is already an active team member.' },
          { status: 400 }
        )
      }
      if (existingStaff.status === 'pending') {
        return NextResponse.json(
          { error: 'This user already has a pending invitation.' },
          { status: 400 }
        )
      }
      // If inactive, reactivate
      const { error: updateError } = await supabase
        .from('staff')
        .update({
          role: role,
          status: 'pending',
          invited_by: user.id,
          invited_at: new Date().toISOString(),
        })
        .eq('id', existingStaff.id)

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to update invitation.' },
          { status: 500 }
        )
      }
    } else {
      // Create new staff record
      const { error: insertError } = await supabase
        .from('staff')
        .insert({
          business_id: businessId,
          user_id: targetUserId,
          role: role,
          status: 'pending',
          invited_by: user.id,
          invited_at: new Date().toISOString(),
        })

      if (insertError) {
        return NextResponse.json(
          { error: 'Failed to create invitation.' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation sent successfully!',
    })

  } catch (error) {
    console.error('Invite error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
            }
