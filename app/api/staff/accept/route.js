// app/api/staff/accept/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../../../../lib/supabaseClient'

// ✅ Admin client – bypasses RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(req) {
  try {
    const { token } = await req.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Missing token' },
        { status: 400 }
      )
    }

    // ✅ Get the user from the session (using the default supabase client)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: 'Unauthorized – please log in' },
        { status: 401 }
      )
    }

    // ✅ Find the staff record by token (use admin client to bypass RLS)
    const { data: staff, error: findError } = await supabaseAdmin
      .from('staff')
      .select('*')
      .eq('invite_token', token)
      .eq('status', 'pending')
      .single()

    if (findError || !staff) {
      console.error('Staff not found:', findError)
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 404 }
      )
    }

    // Check expiry
    if (staff.expires_at && new Date(staff.expires_at) < new Date()) {
      await supabaseAdmin
        .from('staff')
        .update({ status: 'expired' })
        .eq('id', staff.id)
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      )
    }

    // ✅ Update the staff record (using admin client to bypass RLS)
    const { error: updateError } = await supabaseAdmin
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
