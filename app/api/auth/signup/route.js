// app/api/auth/signup/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { signVerificationToken } from '../../../../lib/jwt'
import { sendVerificationEmail } from '../../../../lib/email'

// Admin client (bypasses RLS, needs service role key)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(req) {
  try {
    const { email, password, businessName } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // 1. Create the user in Supabase Auth (with email confirmation disabled)
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // we'll confirm via our own flow
      user_metadata: { businessName },
    })

    if (error) {
      console.error('Signup error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to create user' },
        { status: 400 }
      )
    }

    const userId = data.user.id

    // 2. Generate verification token
    const token = signVerificationToken(userId)

    // 3. Build the verification link
    const verificationLink = `https://cresoa.vercel.app/verify-email?token=${token}`

    // 4. Send verification email (using Gmail SMTP)
    await sendVerificationEmail(email, verificationLink)

    return NextResponse.json({
      success: true,
      message: 'User created. Verification email sent.',
      userId,
    })
  } catch (error) {
    console.error('Signup API error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}
