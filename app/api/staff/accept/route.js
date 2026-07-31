// app/api/staff/accept/route.js
import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabaseClient'

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

    // ✅ Find the staff record by ID (token) AND email (match logged-in user's email)
    const { data: staff, error } = await supabase
      .from('staff')
      .select('*')
      .eq('id', token)
      .eq('email', user.email)  // 👈 match by email instead of user_id
      .single()

    if (error || !staff) {
      return NextResponse.json(
        { error: 'Invalid invitation' },
        { status: 404 }
      )
    }

    // Check expiry (7 days)
    const invitedAt = new Date(staff.invited_at)
    const now = new Date()
    const diffDays = (now - invitedAt) / (1000 * 60 * 60 * 24)
    if (diffDays > 7) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      )
    }

    if (staff.status === 'active') {
      return NextResponse.json(
        { error: 'Invitation already accepted' },
        { status: 400 }
      )
    }

    // ✅ Update: set status to active, accepted_at, and link user_id
    const { error: updateError } = await supabase
      .from('staff')
      .update({
        status: 'active',
        accepted_at: new Date().toISOString(),
        user_id: user.id, // link the user ID now
      })
      .eq('id', staff.id)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to accept invitation' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation accepted successfully',
    })
  } catch (error) {
    console.error('Accept error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}
