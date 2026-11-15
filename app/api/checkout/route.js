import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(req) {
  try {
    const body = await req.json()
    const { slug, form, cart, totalAmount, businessId } = body

    if (!businessId || !cart || cart.length === 0) {
      return NextResponse.json({ error: 'Missing checkout data' }, { status: 400 })
    }

    // 1. Format the items
    const orderItems = cart.map(item => {
      const p = item.product || item;
      return {
        product_id: p.id,
        name: p.item_name || p.name,
        price: p.selling_price,
        quantity: item.quantity,
        image_url: p.image_url || ''
      }
    })

    // 2. Save to public_orders via Admin (Bypasses RLS)
    const { data: newOrder, error: insertError } = await supabaseAdmin
      .from('public_orders')
      .insert({
        business_id: businessId,
        customer_name: form.name,
        customer_phone: form.phone,
        customer_address: form.address,
        items: orderItems,
        total_amount: totalAmount,
        status: 'pending' // Order is created as pending
      })
      .select()
      .single()

    if (insertError) {
      console.error("API Insert Error:", insertError)
      return NextResponse.json({ error: "Failed to save order: " + insertError.message }, { status: 500 })
    }

    // 3. Initialize Paystack
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY
    if (!paystackSecretKey) {
      console.error("Missing PAYSTACK_SECRET_KEY in .env")
      return NextResponse.json({ error: "Payment configuration error" }, { status: 500 })
    }

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: form.email || 'guest@cresoa.com', // Paystack requires an email
        amount: Math.round(totalAmount * 100), // Paystack expects kobo (multiply by 100)
        reference: `ORD-${newOrder.id.slice(0, 8)}-${Date.now()}`,
        callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/${slug}/checkout/success`,
        metadata: {
          order_id: newOrder.id,
          business_id: businessId,
          customer_name: form.name
        }
      })
    })

    const paystackData = await paystackRes.json()

    if (!paystackData.status) {
      console.error("Paystack Error:", paystackData)
      return NextResponse.json({ error: paystackData.message || "Failed to initialize payment" }, { status: 400 })
    }

    // 4. Return the Paystack URL to the client
    return NextResponse.json({ 
      success: true, 
      url: paystackData.data.authorization_url,
      orderId: newOrder.id
    })

  } catch (error) {
    console.error('Checkout API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
