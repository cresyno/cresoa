// app/api/staff/accept/route.js
import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabaseClient'

export async function POST(req) {
  try {
    const { token } = await req.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Missing token' },
        { status: 400 }
      )
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized – please log in' },
        { status: 401 }
      )
    }

    // Find the staff record by token (and ensure it's pending)
    const { data: staff, error: findError } = await supabase
      .from('staff')
      .select('*')
      .eq('invite_token', token)
      .eq('status', 'pending')
      .single()

    if (findError || !staff) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 404 }
      )
    }

    // Check expiry
    if (staff.expires_at && new Date(staff.expires_at) < new Date()) {
      // Mark as expired
      await supabase
        .from('staff')
        .update({ status: 'expired' })
        .eq('id', staff.id)
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      )
    }

    // Update staff record: link user, activate, set accepted_at
    const { error: updateError } = await supabase
      .from('staff')
      .update({
        user_id: user.id,
        status: 'active',
        accepted_at: new Date().toISOString(),
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
