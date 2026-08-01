// app/api/beta/accept/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(req) {
  try {
    const { token, accessToken } = await req.json()

    if (!token || !accessToken) {
      return NextResponse.json(
        { error: 'Missing token or access token' },
        { status: 400 }
      )
    }

    // Authenticate the user
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

    // Use admin client to bypass RLS (we need to read the invite even if the user is not staff)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Find the invite by token
    const { data: invite, error: findError } = await supabaseAdmin
      .from('beta_invites')
      .select('*')
      .eq('id', token)
      .single()

    if (findError || !invite) {
      return NextResponse.json({ error: 'Invalid invite' }, { status: 404 })
    }

    // Check if already accepted
    if (invite.status === 'accepted') {
      return NextResponse.json({ error: 'This invitation has already been used.' }, { status: 400 })
    }

    // Check expiry (7 days)
    const invitedAt = new Date(invite.invited_at)
    const now = new Date()
    const diffDays = (now - invitedAt) / (1000 * 60 * 60 * 24)
    if (diffDays > 7) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 })
    }

    // Check email matches the logged‑in user
    if (invite.email !== user.email) {
      return NextResponse.json(
        { error: `This invite was sent to ${invite.email}, but you are logged in as ${user.email}` },
        { status: 403 }
      )
    }

    // Mark the invite as accepted (single‑use)
    const { error: updateError } = await supabaseAdmin
      .from('beta_invites')
      .update({
        status: 'accepted',
        accepted_at: now.toISOString(),
      })
      .eq('id', token)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Failed to accept' }, { status: 500 })
    }

    // Now check if the user already has a business
    const { data: userBusiness } = await supabaseWithToken
      .from('businesses')
      .select('id, plan')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (userBusiness) {
      // They have a business – update its plan to beta
      const betaExpiry = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
      const { error: updateBusinessError } = await supabaseWithToken
        .from('businesses')
        .update({
          plan: 'beta',
          beta_expires_at: betaExpiry.toISOString(),
        })
        .eq('id', userBusiness.id)

      if (updateBusinessError) {
        console.error('Business update error:', updateBusinessError)
        // We don't fail the request – the invite is already accepted.
      }

      return NextResponse.json({
        success: true,
        message: 'Beta invitation accepted! Your business has been upgraded to Beta plan.',
        redirectTo: '/dashboard',
      })
    } else {
      // No business – redirect to onboarding with a flag
      return NextResponse.json({
        success: true,
        message: 'Beta invitation accepted! Please complete onboarding to activate your beta access.',
        redirectTo: '/onboarding?beta=true',
      })
    }
  } catch (error) {
    console.error('Beta accept error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
           }
