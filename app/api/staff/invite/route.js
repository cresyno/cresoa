import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req) {
  try {
    const body = await req.json()
    const { email, role, accessToken } = body

    // Validate inputs
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

    // Create client with the user's token
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

    // Get the user from the token
    const { data: { user }, error: authError } = await supabaseWithToken.auth.getUser()

    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: 'Unauthorized – invalid session' },
        { status: 401 }
      )
    }

    // Get the business owned by this user
    const { data: business, error: bizError } = await supabaseWithToken
      .from('businesses')
      .select('id, owner_id')
      .eq('owner_id', user.id)
      .single()

    if (bizError || !business) {
      console.error('Business error:', bizError)
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // Verify the user is the owner
    if (business.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Only business owners can invite staff' },
        { status: 403 }
      )
    }

    // Check if this email already has a pending or active invitation
    const { data: existing, error: existingError } = await supabaseWithToken
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
      } else if (existing.status === 'active') {
        return NextResponse.json(
          { error: `${email} is already a staff member` },
          { status: 400 }
        )
      }
    }

    // Create the staff record with email (no user_id yet)
    const { error: insertError } = await supabaseWithToken
      .from('staff')
      .insert({
        business_id: business.id,
        email: email,           // ✅ Store the email directly
        role: role,
        status: 'pending',
        invited_by: user.id,
        invited_at: new Date().toISOString(),
        // user_id is NULL until they accept the invitation
      })

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to invite staff: ' + insertError.message },
        { status: 500 }
      )
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
