import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(req) {
  try {
    const { business_id, customer_name, rating, review_text } = await req.json()

    if (!business_id || !customer_name || !review_text || !rating) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('public_reviews')
      .insert({
        business_id,
        customer_name,
        rating,
        review_text,
        is_approved: false, // or true
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, review: data }, { status: 201 })
  } catch (error) {
    console.error('Review create error:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
