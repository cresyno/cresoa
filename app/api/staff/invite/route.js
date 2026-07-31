import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../../../../../lib/supabaseClient'

// Admin client for checking auth.users
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

    // 2. Create Supabase client using cookies from the request
    const supabaseWithAuth = createRouteHandlerClient({ cookies })
    
    // 3. Get the authenticated user
    const { data: { user }, error: authError } = await supabaseWithAuth.auth.getUser()

    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: 'Unauthorized – please log in' },
        { status: 401 }
      )
    }

    // 4. Get the business owned by this user
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

    // 5. Verify the user is the owner
    if (business.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Only business owners can invite staff' },
        { status: 403 }
      )
    }

    // 6. Check if the email exists in auth.users (use admin client)
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

    // 7. Check if already a staff member
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

    // 8. Insert staff record
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
