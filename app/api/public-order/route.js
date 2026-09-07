import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // ⚠️ Use service role (server only)
)

export async function POST(req) {
  try {
    const { business_id, customer_name, customer_phone, customer_address, items, total_amount } = await req.json()

    if (!business_id || !customer_name || !customer_phone || !items || items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Insert using admin client (bypasses RLS)
    const { data, error } = await supabaseAdmin
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
