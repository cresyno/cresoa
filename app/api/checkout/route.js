import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function POST(req) {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY
    if (!secret) throw new Error('PAYSTACK_SECRET_KEY is missing')

    const body = await req.json().catch(() => ({}))
    const { slug, form, cart, totalAmount } = body

    if (!slug || !form?.name || !form?.phone || !form?.address || !totalAmount) {
      throw new Error('Missing required checkout details')
    }

    const { data: page } = await supabaseAdmin
      .from('business_public_pages')
      .select('business_id')
      .eq('slug', String(slug).toLowerCase())
      .maybeSingle()

    if (!page) throw new Error('Store not found')
    const businessId = page.business_id

    const email = form.email || `pay+${crypto.randomBytes(4).toString('hex')}@cresoa.com.ng`
    const amountKobo = Math.round(totalAmount * 100)
    const modePrefix = secret.startsWith('sk_test') ? 'test_' : ''
    const reference = `cso_${modePrefix}${crypto.randomBytes(12).toString('hex')}`

    const origin = req.headers.get('origin') || new URL(req.url).origin
    
    // ✅ FIX: Removed '?reference=...' from the URL. Paystack will append it automatically.
    const callbackUrl = `${origin}/${slug}/success`

    const payload = {
      email,
      amount: amountKobo,
      currency: 'NGN',
      reference,
      callback_url: callbackUrl, 
      metadata: {
        business_id: businessId,
        cart: cart,
        form: form,
        totalAmount: totalAmount,
        kind: 'storefront_checkout'
      },
    }

    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    
    const json = await res.json().catch(() => null)
    if (!res.ok || !json?.status) {
      throw new Error(`Paystack Error: ${json?.message || 'Failed to initialize'}`)
    }

    return NextResponse.json({ url: json.data.authorization_url })

  } catch (error) {
    console.error("Checkout API Error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
