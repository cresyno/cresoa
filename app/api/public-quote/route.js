import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(req) {
  try {
    const { business_id, customer_name, customer_phone, customer_email, message, product_name, quantity, specifications, deadline } = await req.json()

    if (!business_id || !customer_name || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('business_quotes')
      .insert({
        business_id,
        customer_name,
        customer_phone: customer_phone || null,
        customer_email: customer_email || null,
        message,
        product_name: product_name || null,
        quantity: quantity || null,
        specifications: specifications || null,
        deadline: deadline || null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, quote: data }, { status: 201 })
  } catch (error) {
    console.error('Quote create error:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
