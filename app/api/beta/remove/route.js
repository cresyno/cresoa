// app/api/beta/remove/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'taiwoabraham640@gmail.com'
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function DELETE(req) {
  try {
    const { inviteId, accessToken } = await req.json()

    if (!inviteId || !accessToken) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ✅ Use admin client to bypass RLS
    const { error: deleteError } = await supabaseAdmin
      .from('beta_invites')
      .delete()
      .eq('id', inviteId)

    if (deleteError) {
      console.error('Delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to remove' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Beta user removed successfully' })
  } catch (error) {
    console.error('Beta remove error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
