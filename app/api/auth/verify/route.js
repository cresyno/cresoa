// app/api/auth/verify/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyVerificationToken } from '../../../../lib/jwt'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(req) {
  try {
    const { token } = await req.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    // 1. Verify the token
    const decoded = verifyVerificationToken(token)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 400 }
      )
    }

    const { userId } = decoded

    // 2. Update the user to confirm email
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { email_confirm: true }
    )

    if (error) {
      console.error('Verification update error:', error)
      return NextResponse.json(
        { error: 'Failed to verify user' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Email verified! You can now log in.',
    })
  } catch (error) {
    console.error('Verify API error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}
