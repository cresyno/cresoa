// app/api/beta/invite/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendBetaInviteEmail } from '../../../../lib/email'

const ADMIN_EMAIL = 'taiwoabraham640@gmail.com'

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

    // ✅ Only the admin can invite
    if (user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden – only admin can invite' }, { status: 403 })
    }

    // No business check – global beta invites

    // Check if already invited
    const { data: existing } = await supabaseWithToken
      .from('beta_invites')
      .select('status')
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

    // Create the beta invite (business_id is optional now, we'll set it to null)
    const { data: invite, error: insertError } = await supabaseWithToken
      .from('beta_invites')
      .insert({
        email: email,
        invited_by: user.id,
        invited_at: new Date().toISOString(),
        status: 'pending',
        // business_id is not required – we'll allow null
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
        user.email || 'The Cresoa admin',
        'Cresoa Beta Program',
        acceptLink
      )
    } catch (emailErr) {
      console.error('Email error (non‑fatal):', emailErr)
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
