import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(req) {
  try {
    const { business_id, customer_name, customer_phone, customer_address, items, total_amount } = await req.json()

    if (!business_id || !customer_name || !customer_phone || !items || items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate each item has name, price, quantity
    for (const item of items) {
      if (!item.name || !item.price || !item.quantity) {
        return NextResponse.json({ error: 'Invalid item in order' }, { status: 400 })
      }
    }

    const { data, error } = await supabase
      .from('business_orders')
      .insert({
        business_id,
        customer_name,
        customer_phone,
        customer_address: customer_address || null,
        items,
        total_amount: total_amount || '',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, order: data }, { status: 201 })
  } catch (error) {
    console.error('Order create error:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
