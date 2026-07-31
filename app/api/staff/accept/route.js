// app/api/staff/accept/route.js

import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabaseClient'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Missing token' },
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

    // Find the staff record
    const { data: staff, error } = await supabase
      .from('staff')
      .select('*')
      .eq('id', token)
      .eq('user_id', user.id)
      .single()

    if (error || !staff) {
      return NextResponse.json(
        { error: 'Invalid invitation' },
        { status: 404 }
      )
    }

    // Check if expired (7 days)
    const invitedAt = new Date(staff.invited_at)
    const now = new Date()
    const diffDays = (now - invitedAt) / (1000 * 60 * 60 * 24)
    if (diffDays > 7) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      )
    }

    // Check if already accepted
    if (staff.status === 'active') {
      return NextResponse.json(
        { error: 'Invitation already accepted' },
        { status: 400 }
      )
    }

    // Update status
    const { error: updateError } = await supabase
      .from('staff')
      .update({
        status: 'active',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', staff.id)

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to accept invitation' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation accepted!',
    })

  } catch (error) {
    console.error('Accept error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
  }
