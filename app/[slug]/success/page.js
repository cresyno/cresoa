'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

function SuccessContent() {
  const { slug } = useParams()
  const searchParams = useSearchParams()
  const orderToken = searchParams.get('order')

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orderToken) {
      setLoading(false)
      return
    }

    const fetchOrder = async () => {
      const { data } = await supabase
        .from('orders')
        .select('price, amount_paid, created_at')
        .eq('tracking_token', orderToken)
        .maybeSingle()
      
      setOrder(data || null)
      setLoading(false)
    }
    fetchOrder()
  }, [orderToken])

  if (loading) {
    return <div style={{ padding: '100px', textAlign: 'center', color: '#0F2B4A', fontWeight: 600 }}>Verifying your order...</div>
  }

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px' }}>
      
      {/* Success Icon */}
      <div style={{ width: '80px', height: '80px', background: '#E8F5E9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>

      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: '#0F2B4A', margin: '0 0 10px 0', textAlign: 'center' }}>Payment Successful!</h1>
      <p style={{ color: '#666', fontSize: '1rem', textAlign: 'center', maxWidth: '400px', marginBottom: '40px' }}>
        Thank you for your order. The business owner has received your payment and will contact you shortly regarding your delivery.
      </p>

      {/* Receipt Box */}
      {order && (
        <div style={{ width: '100%', maxWidth: '400px', background: '#F9F9F9', padding: '24px', borderRadius: '12px', marginBottom: '40px', border: '1px solid #EAEAEA' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F2B4A', marginBottom: '16px', borderBottom: '1px solid #EAEAEA', paddingBottom: '10px' }}>Order Summary</h2>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.95rem', color: '#666' }}>
            <span>Order Date</span>
            <span>{new Date(order.created_at).toLocaleDateString()}</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.95rem', color: '#666' }}>
            <span>Reference</span>
            <span style={{ fontFamily: 'monospace' }}>{orderToken.slice(0, 8).toUpperCase()}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #EAEAEA', paddingTop: '16px', marginTop: '16px' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F2B4A' }}>Total Paid</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#2E7D32' }}>
              ₦{Number(order.price).toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '400px' }}>
        <Link 
          href={`/${slug}/shop`} 
          style={{ 
            display: 'block', width: '100%', padding: '16px', textAlign: 'center', 
            background: '#0F2B4A', color: '#FFF', borderRadius: '8px', 
            textDecoration: 'none', fontWeight: 700, fontSize: '0.95rem',
            textTransform: 'uppercase', letterSpacing: '0.5px'
          }}
        >
          Continue Shopping
        </Link>
        
        <Link 
          href={`/${slug}`} 
          style={{ 
            display: 'block', width: '100%', padding: '16px', textAlign: 'center', 
            background: '#FFFFFF', color: '#0F2B4A', border: '1px solid #EAEAEA', 
            borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem' 
          }}
        >
          Return to Home
        </Link>
      </div>

    </div>
  )
}

// Next.js requires useSearchParams to be wrapped in a Suspense boundary for static rendering
export default function SuccessPage() {
  return (
    <Suspense fallback={<div style={{ padding: '100px', textAlign: 'center', color: '#0F2B4A', fontWeight: 600 }}>Loading...</div>}>
      <SuccessContent />
    </Suspense>
  )
        }
