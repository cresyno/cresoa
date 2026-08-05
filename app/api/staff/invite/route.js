// app/api/staff/invite/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../../../../lib/supabaseClient'
import { getPlanLimits } from '../../../../lib/planLimits'
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

    // Check plan limit
    const planLimits = getPlanLimits(business.plan || 'free')
    const maxStaff = planLimits.staff_accounts || 0

    const { count: activeStaffCount } = await supabaseWithToken
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .eq('status', 'active')

    if ((activeStaffCount || 0) >= maxStaff) {
      return NextResponse.json(
        { error: `Your plan allows a maximum of ${maxStaff} staff members. Please upgrade to add more.` },
        { status: 403 }
      )
    }

    // Check if user exists
    const { data: userId, error: rpcError } = await supabaseWithToken
      .rpc('check_user_exists', { user_email: email })

    if (rpcError) {
      return NextResponse.json(
        { error: 'Database error while checking user: ' + rpcError.message },
        { status: 500 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User not found. They must sign up first.' },
        { status: 404 }
      )
    }

    // Check if already staff
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

    // ✅ Generate token
    const inviteToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    // ✅ Insert with detailed error logging
    const insertData = {
      business_id: business.id,
      user_id: userId,
      email: email,
      role: role,
      status: 'pending',
      invited_by: user.id,
      invited_at: new Date().toISOString(),
      invite_token: inviteToken,
      expires_at: expiresAt,
    }

    console.log('📝 Inserting staff record:', insertData)

    const { data: newStaff, error: insertError } = await supabaseWithToken
      .from('staff')
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      console.error('❌ Insert error DETAILS:', insertError)
      return NextResponse.json(
        { 
          error: 'Failed to invite staff', 
          details: insertError.message,
          code: insertError.code,
          hint: insertError.hint
        },
        { status: 500 }
      )
    }

    console.log('✅ Staff record created:', newStaff)

    // Send email
    try {
      const acceptLink = `https://cresoa.vercel.app/accept-invite?token=${inviteToken}`
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
      message: `✅ Invitation sent to ${email}!`,
    })
  } catch (error) {
    console.error('Invite error:', error)
    return NextResponse.json(
      { error: 'Server error: ' + error.message },
      { status: 500 }
    )
  }
}
