// app/api/settings/tracking/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../../../../lib/supabaseClient'

export async function PUT(req) {
  try {
    const { accessToken, settings } = await req.json()

    if (!accessToken) {
      return NextResponse.json({ error: 'No access token provided' }, { status: 401 })
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

    // Verify the user is the owner of the business
    const { data: business, error: bizError } = await supabaseWithToken
      .from('businesses')
      .select('id, plan')
      .eq('owner_id', user.id)
      .single()

    if (bizError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Check if user is Pro or Beta
    if (business.plan !== 'pro' && business.plan !== 'beta') {
      return NextResponse.json({ error: 'This feature is only available for Pro and Beta users' }, { status: 403 })
    }

    // Update tracking settings
    const { error: updateError } = await supabaseWithToken
      .from('businesses')
      .update({
        tracking_primary_color: settings.primaryColor || '#D4A52A',
        tracking_bg_color: settings.bgColor || '#F8F6F2',
        tracking_logo_url: settings.logoUrl || null,
        tracking_welcome_message: settings.welcomeMessage || null,
        tracking_footer_message: settings.footerMessage || null,
      })
      .eq('id', business.id)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Tracking settings updated' })
  } catch (error) {
    console.error('Settings error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
                    }
