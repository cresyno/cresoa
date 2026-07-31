import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../../../../lib/supabaseClient'

// Admin client – needs SUPABASE_SERVICE_ROLE_KEY
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
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: 'No access token provided. Please log in again.' },
        { status: 401 }
      )
    }

    // Create a client with the user's token
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
        { error: 'Unauthorized – invalid token' },
        { status: 401 }
      )
    }

    // ✅ Use the token client to get the business (so RLS works)
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

    if (business.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Only business owners can invite staff' },
        { status: 403 }
      )
    }

    // Check if the email exists in auth.users (admin client bypasses RLS)
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

    // ✅ Use token client to check existing staff
    const { data: existing } = await supabaseWithToken
      .from('staff')
      .select('id')
      .eq('business_id', business.id)
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'User is already a staff member' },
        { status: 400 }
      )
    }

    // ✅ Use token client to insert staff
    const { error: insertError } = await supabaseWithToken
      .from('staff')
      .insert({
        business_id: business.id,
        user_id: userId,
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

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${email}`,
    })
  } catch (error) {
    console.error('Invite error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
      }
