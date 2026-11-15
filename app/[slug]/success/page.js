import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const dynamic = 'force-dynamic'

export default async function CheckoutSuccessPage({ params, searchParams }) {
  const { slug } = await params
  const searchParamsRes = await searchParams
  
  // ✅ FIX: Safely extract the reference even if Next.js makes it an array
  let reference = searchParamsRes.reference || searchParamsRes.trxref
  if (Array.isArray(reference)) reference = reference[0]

  if (!reference) {
    return <ErrorState message="No payment reference found in URL." />
  }

  try {
    // 1. Verify the payment with Paystack
    const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      cache: 'no-store' // ✅ Ensure we don't cache a failed attempt
    })
    
    const data = await res.json()

    // If Paystack verification fails, show the exact error message
    if (!data.status || data.data.status !== 'success') {
      return <ErrorState message={`Paystack Error: ${data.message || 'Verification failed'}. Status: ${data.data?.status || 'unknown'}`} />
    }

    const { metadata, amount } = data.data
    const amountPaid = amount / 100

    // 2. Check if order already exists (prevents duplicate inserts on page refresh)
    const { data: existingOrder } = await supabaseAdmin
      .from('public_orders')
      .select('id')
      .eq('payment_reference', reference)
      .maybeSingle()

    if (!existingOrder && metadata.cart) {
      // 3. Save the PAID order to public_orders
      const orderItems = metadata.cart.map(item => {
        const p = item.product || item;
        return {
          product_id: p.id,
          name: p.item_name || p.name,
          price: p.selling_price,
          quantity: item.quantity,
          image_url: p.image_url || ''
        }
      })

      const { data: newOrder, error: insertErr } = await supabaseAdmin
        .from('public_orders')
        .insert({
          business_id: metadata.business_id,
          customer_name: metadata.form.name,
          customer_phone: metadata.form.phone,
          customer_address: metadata.form.address,
          items: orderItems,
          total_amount: amountPaid,
          amount_paid: amountPaid, 
          status: 'paid',          
          payment_reference: reference
        })
        .select('id')
        .single()

      if (insertErr) {
        return <ErrorState message={`Payment verified, but failed to save order: ${insertErr.message}`} />
      }

      // 4. Save to payment_intents
      if (newOrder) {
        await supabaseAdmin.from('payment_intents').insert({
          business_id: metadata.business_id,
          order_id: newOrder.id,
          reference: reference,
          amount_kobo: amount,
          payer_email: metadata.form.email || 'guest@cresoa.com.ng',
        })
      }
    }

    return (
      <div style={{ background: '#FAFAF9', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ background: '#FFFFFF', padding: '40px 30px', borderRadius: '20px', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', maxWidth: '440px', width: '100%', textAlign: 'center' }}>
          
          <div style={{ width: '80px', height: '80px', background: '#ECFDF5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>

          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', color: '#111827', margin: '0 0 12px 0' }}>Payment Successful!</h1>
          
          <p style={{ color: '#6B7280', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '30px' }}>
            Thank you for your purchase. Your order has been confirmed and is being processed.
          </p>

          <Link href={`/${slug}/shop`} style={{ display: 'block', width: '100%', padding: '16px', background: '#111827', color: '#FFF', textDecoration: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '1rem' }}>
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  } catch (err) {
    return <ErrorState message={`Internal Error: ${err.message}`} />
  }
}

function ErrorState({ message }) {
  return (
    <div style={{ background: '#FAFAF9', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ background: '#FFFFFF', padding: '40px 30px', borderRadius: '20px', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', maxWidth: '440px', width: '100%', textAlign: 'center' }}>
        <div style={{ width: '80px', height: '80px', background: '#FEF2F2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', color: '#111827', margin: '0 0 12px 0' }}>Payment Issue</h1>
        <p style={{ color: '#B91C1C', fontSize: '0.9rem', fontWeight: 600, padding: '10px', background: '#FEF2F2', borderRadius: '8px', marginBottom: '30px' }}>{message}</p>
      </div>
    </div>
  )
      }
