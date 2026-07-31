import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../../../lib/supabaseClient'

// Admin client (service role) – use for auth.users lookup
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(req) {
  try {
    // 1. Parse request body
    const body = await req.json()
    const { email, role } = body

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 2. Get the session from the request cookies
    // We'll use the regular supabase client, but we need to pass the cookie header.
    // However, the supabase client imported from lib might not have the cookie.
    // So we create a new client with the request's cookie.
    const cookieHeader = req.headers.get('cookie') || ''
    const supabaseWithCookie = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Cookie: cookieHeader,
          },
        },
      }
    )

    // Get the authenticated user using the client with the cookie
    const { data: { user }, error: authError } = await supabaseWithCookie.auth.getUser()

    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: 'Unauthorized – please log in' },
        { status: 401 }
      )
    }

    // 3. Get the business owned by this user
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('id, owner_id')
      .eq('owner_id', user.id)
      .single()

    if (bizError || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // 4. Verify the user is the owner (additional check)
    if (business.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Only business owners can invite staff' },
        { status: 403 }
      )
    }

    // 5. Check if the email exists in auth.users (use admin client)
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

    // 6. Check if already a staff member
    const { data: existing } = await supabase
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

    // 7. Insert staff record
    const { error: insertError } = await supabase
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
