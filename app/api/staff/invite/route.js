import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendStaffInviteEmail } from '../../../../lib/email'

export async function POST(req) {
  try {
    const body = await req.json()
    const { email, role, accessToken } = body

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    if (!accessToken) {
      return NextResponse.json(
        { error: 'No access token. Please log in again.' },
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
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: business, error: bizError } = await supabaseWithToken
      .from('businesses')
      .select('id, owner_id, name')
      .eq('owner_id', user.id)
      .single()

    if (bizError || !business) {
      console.error('Business error:', bizError)
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }
    if (business.owner_id !== user.id) {
      return NextResponse.json({ error: 'Only owners can invite' }, { status: 403 })
    }

    // Check for existing invitation
    const { data: existing } = await supabaseWithToken
      .from('staff')
      .select('id, status')
      .eq('business_id', business.id)
      .eq('email', email)
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

    // Insert staff record
    const { error: insertError } = await supabaseWithToken
      .from('staff')
      .insert({
        business_id: business.id,
        email: email,
        role: role,
        status: 'pending',
        invited_by: user.id,
        invited_at: new Date().toISOString(),
      })

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to invite staff' },
        { status: 500 }
      )
    }

    // ✅ Send email (non‑blocking)
    try {
      const acceptLink = `https://cresoa.vercel.app/accept-invite?email=${encodeURIComponent(email)}&business=${business.id}`
      await sendStaffInviteEmail(
        email,
        user.email || 'The business owner',
        business.name || 'your business',
        acceptLink
      )
    } catch (emailErr) {
      console.error('Email error (non‑fatal):', emailErr)
      // We don't return an error because the invitation is already saved.
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
