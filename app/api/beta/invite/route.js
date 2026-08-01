// app/api/beta/invite/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../../../../lib/supabaseClient'
import { sendBetaInviteEmail } from '../../../../lib/email'

export async function POST(req) {
  try {
    const { email, accessToken } = await req.json()

    if (!email || !accessToken) {
      return NextResponse.json(
        { error: 'Email and access token are required' },
        { status: 400 }
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the business (owner only)
    const { data: business, error: bizError } = await supabaseWithToken
      .from('businesses')
      .select('id, name, owner_id')
      .eq('owner_id', user.id)
      .single()

    if (bizError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Check if already invited
    const { data: existing } = await supabaseWithToken
      .from('beta_invites')
      .select('status')
      .eq('business_id', business.id)
      .eq('email', email)
      .maybeSingle()

    if (existing) {
      if (existing.status === 'pending') {
        return NextResponse.json(
          { error: `Beta invitation already sent to ${email}` },
          { status: 400 }
        )
      }
      if (existing.status === 'accepted') {
        return NextResponse.json(
          { error: `${email} has already accepted the beta invitation` },
          { status: 400 }
        )
      }
    }

    // Create the beta invite
    const { data: invite, error: insertError } = await supabaseWithToken
      .from('beta_invites')
      .insert({
        business_id: business.id,
        email: email,
        invited_by: user.id,
        invited_at: new Date().toISOString(),
        status: 'pending',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create beta invitation' },
        { status: 500 }
      )
    }

    // Send email
    try {
      const acceptLink = `https://cresoa.vercel.app/accept-beta?token=${invite.id}`
      await sendBetaInviteEmail(
        email,
        user.email || 'The business owner',
        business.name || 'your business',
        acceptLink
      )
    } catch (emailErr) {
      console.error('Email error (non‑fatal):', emailErr)
      // We don't fail the request – the invite is already created.
    }

    return NextResponse.json({
      success: true,
      message: `✅ Beta invitation sent to ${email}`,
    })
  } catch (error) {
    console.error('Beta invite error:', error)
    return NextResponse.json(
      { error: 'Server error: ' + error.message },
      { status: 500 }
    )
  }
      }
