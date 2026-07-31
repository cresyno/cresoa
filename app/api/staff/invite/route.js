// app/api/staff/invite/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../../../../lib/supabaseClient'
import { isOwner, canAddStaff } from '../../../../lib/staffAuth'
import { getPlanLimits } from '../../../../lib/planLimits'
import { sendStaffInviteEmail } from '../../../../lib/email'

// Admin client (service role) – needed to check auth.users
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

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

    // 1. Authenticate the user via token
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
        { error: 'Unauthorized – invalid token' },
        { status: 401 }
      )
    }

    // 2. ✅ Use supabaseWithToken to get the business (RLS will work)
    const { data: business, error: bizError } = await supabaseWithToken
      .from('businesses')
      .select('id, owner_id, plan, name')
      .eq('owner_id', user.id)
      .single()

    if (bizError || !business) {
      console.error('Business error:', bizError)
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // 3. Verify the user is the owner
    if (business.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Only business owners can invite staff' },
        { status: 403 }
      )
    }

    // 4. Check plan limit for staff accounts
    const planLimits = getPlanLimits(business.plan || 'free')
    const maxStaff = planLimits.staff_accounts || 0

    // ✅ Use supabaseWithToken for counting active staff
    const { count: activeStaffCount } = await supabaseWithToken
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .eq('status', 'active')

    const canAdd = (activeStaffCount || 0) < maxStaff

    if (!canAdd) {
      return NextResponse.json(
        { error: `Your plan allows a maximum of ${maxStaff} staff members. Please upgrade to add more.` },
        { status: 403 }
      )
    }

    // 5. Check if the email exists in auth.users (using admin client – bypasses RLS)
    const { data: userData, error: userLookupError } = await supabaseAdmin
      .from('auth.users')
      .select('id')
      .eq('email', email)
      .single()

    if (userLookupError || !userData) {
      return NextResponse.json(
        { error: 'User not found. They must sign up first.' },
        { status: 404 }
      )
    }

    const userId = userData.id

    // 6. ✅ Use supabaseWithToken to check existing staff
    const { data: existing } = await supabaseWithToken
      .from('staff')
      .select('id, status')
      .eq('business_id', business.id)
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) {
      if (existing.status === 'pending') {
        return NextResponse.json(
          { error: `Invitation already sent to ${email}` },
          { status: 400 }
        )
      }
      if (existing.status === 'active') {
        return NextResponse.json(
          { error: `${email} is already a staff member` },
          { status: 400 }
        )
      }
    }

    // 7. ✅ Use supabaseWithToken to insert staff record
    const { data: newStaff, error: insertError } = await supabaseWithToken
      .from('staff')
      .insert({
        business_id: business.id,
        user_id: userId,
        email: email,
        role: role,
        status: 'pending',
        invited_by: user.id,
        invited_at: new Date().toISOString(),
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

    // 8. Send email notification (non-blocking)
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
      message: `✅ Invitation sent to ${email}! They will receive an email with instructions.`,
    })
  } catch (error) {
    console.error('Invite error:', error)
    return NextResponse.json(
      { error: 'Server error: ' + error.message },
      { status: 500 }
    )
  }
  }
