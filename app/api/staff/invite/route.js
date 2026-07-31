// app/api/staff/invite/route.js (fallback – no auth.users check)
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../../../../lib/supabaseClient'
import { sendStaffInviteEmail } from '../../../../lib/email'

export async function POST(req) {
  try {
    const body = await req.json()
    const { email, role, accessToken } = body

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      )
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: 'No access token provided. Please log in again.' },
        { status: 401 }
      )
    }

    // Authenticate the user via token
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
      return NextResponse.json(
        { error: 'Unauthorized – invalid token' },
        { status: 401 }
      )
    }

    // Get the user's business (owner)
    const { data: business, error: bizError } = await supabaseWithToken
      .from('businesses')
      .select('id, owner_id, plan, name')
      .eq('owner_id', user.id)
      .single()

    if (bizError || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    if (business.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Only business owners can invite staff' },
        { status: 403 }
      )
    }

    // ✅ Skip auth.users check – accept any email
    // Create staff record with user_id = null (will be linked on acceptance)
    const { data: newStaff, error: insertError } = await supabaseWithToken
      .from('staff')
      .insert({
        business_id: business.id,
        email: email,
        role: role,
        status: 'pending',
        invited_by: user.id,
        invited_at: new Date().toISOString(),
        // user_id is left NULL – will be set when they accept
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to invite staff' },
        { status: 500 }
      )
    }

    // Send email notification
    try {
      const staffId = newStaff.id
      const acceptLink = `https://cresoa.vercel.app/accept-invite?token=${staffId}`
      await sendStaffInviteEmail(
        email,
        user.email || 'The business owner',
        business.name || 'your business',
        acceptLink
      )
    } catch (emailErr) {
      console.error('Email error (non‑fatal):', emailErr)
    }

    return NextResponse.json({
      success: true,
      message: `✅ Invitation sent to ${email}! They will need to sign up if they haven't already.`,
    })
  } catch (error) {
    console.error('Invite error:', error)
    return NextResponse.json(
      { error: 'Server error: ' + error.message },
      { status: 500 }
    )
  }
}
