// app/api/staff/accept/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../../../../lib/supabaseClient'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { token, accessToken } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Missing token' },
        { status: 400 }
      )
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: 'No access token provided' },
        { status: 401 }
      )
    }

    // ✅ Authenticate using the provided access token
    const supabaseWithToken = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabaseWithToken.auth.getUser()

    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Find the staff record by token and email (matching logged-in user's email)
    const { data: staff, error } = await supabaseWithToken
      .from('staff')
      .select('*')
      .eq('id', token)
      .eq('email', user.email)
      .single()

    if (error || !staff) {
      console.error('Staff not found:', error)
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

    // Update: set status to active, accepted_at, and link user_id
    const { error: updateError } = await supabaseWithToken
      .from('staff')
      .update({
        status: 'active',
        accepted_at: new Date().toISOString(),
        user_id: user.id,
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
