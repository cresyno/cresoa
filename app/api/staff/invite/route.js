import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabaseClient'
import { isOwner } from '../../../lib/staffAuth'

// Use admin client to check auth.users
const supabaseAdmin = supabase.auth.admin // or create a separate client with service role

export async function POST(req) {
  try {
    const body = await req.json()
    const { email, role } = body

    if (!email || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get current user
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the business of the current user (assuming they are owner)
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('id, owner_id')
      .eq('owner_id', currentUser.id)
      .single()

    if (bizError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Check if the current user is the owner
    const owner = await isOwner(currentUser.id, business.id)
    if (!owner) {
      return NextResponse.json({ error: 'Only owners can invite staff' }, { status: 403 })
    }

    // Check if the email is already a user in auth
    const { data: userData, error: userError } = await supabaseAdmin.getUserByEmail(email)
    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found. They must sign up first.' }, { status: 404 })
    }

    const userId = userData.user.id

    // Check if already staff
    const { data: existing } = await supabase
      .from('staff')
      .select('id')
      .eq('business_id', business.id)
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'User is already a staff member' }, { status: 400 })
    }

    // Create staff record
    const { error: insertError } = await supabase
      .from('staff')
      .insert({
        business_id: business.id,
        user_id: userId,
        role: role,
        status: 'pending',
        invited_by: currentUser.id,
        invited_at: new Date().toISOString(),
      })

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to invite staff' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Invitation sent' })
  } catch (error) {
    console.error('Invite error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
