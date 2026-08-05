// app/api/beta/list/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
const ADMIN_EMAIL = 'taiwoabraham640@gmail.com'
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const accessToken = searchParams.get('accessToken')

    if (!accessToken) {
      return NextResponse.json({ error: 'Access token required' }, { status: 401 })
    }

    // Authenticate the user to verify identity
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

    // ✅ Only admin can list
    if (user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ✅ Use admin client to bypass RLS
    const { data: invites, error } = await supabaseAdmin
      .from('beta_invites')
      .select('*')
      .order('invited_at', { ascending: false })

    if (error) {
      console.error('List error:', error)
      return NextResponse.json({ error: 'Failed to fetch beta users' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: invites })
  } catch (error) {
    console.error('Beta list error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
