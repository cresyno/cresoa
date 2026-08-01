// app/api/staff/accept/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { token, accessToken } = await request.json()

    console.log('📥 Accept request:', { token, hasAccessToken: !!accessToken })

    if (!token) {
      return NextResponse.json(
        { error: 'Missing token' },
        { status: 400 }
      )
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: 'No access token provided' },
        { status: 401 }
      )
    }

    // Authenticate
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
      console.error('❌ Auth error:', authError)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('👤 User authenticated:', { userId: user.id, email: user.email })

    // Create admin client to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Find the staff record by token
    const { data: staff, error: findError } = await supabaseAdmin
      .from('staff')
      .select('*')
      .eq('id', token)
      .single()

    if (findError || !staff) {
      console.error('❌ Staff not found:', findError)
      return NextResponse.json(
        { error: 'Invalid invitation – record not found' },
        { status: 404 }
      )
    }

    console.log('📋 Staff found:', { id: staff.id, email: staff.email, status: staff.status })

    // Check expiry
    const invitedAt = new Date(staff.invited_at)
    const now = new Date()
    const diffDays = (now - invitedAt) / (1000 * 60 * 60 * 24)
    if (diffDays > 7) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      )
    }

    if (staff.status === 'active') {
      return NextResponse.json(
        { error: 'Invitation already accepted' },
        { status: 400 }
      )
    }

    // Update the record
    const { error: updateError } = await supabaseAdmin
      .from('staff')
      .update({
        status: 'active',
        accepted_at: new Date().toISOString(),
        user_id: user.id,
      })
      .eq('id', staff.id)

    if (updateError) {
      console.error('❌ Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to accept invitation' },
        { status: 500 }
      )
    }

    console.log('✅ Staff record updated successfully')

    return NextResponse.json({
      success: true,
      message: 'Invitation accepted successfully',
    })
  } catch (error) {
    console.error('❌ Accept error:', error)
    return NextResponse.json(
      { error: 'Server error: ' + error.message },
      { status: 500 }
    )
  }
         }
