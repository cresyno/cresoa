'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useCart } from '@/lib/CartContext'
import Link from 'next/link'

export default function SuccessPage() {
  const { slug } = useParams()
  const { clearCart } = useCart()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // ✅ Clear the cart ONLY when they reach the success page
    if (typeof clearCart === 'function') {
      clearCart()
    }

    const orderToken = sessionStorage.getItem('last_order_token')

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
      sessionStorage.removeItem('last_order_token')
    }
    fetchOrder()
  }, [clearCart])

  if (loading) return <div style={{ padding: '100px', textAlign: 'center', color: '#111827', fontWeight: 600 }}>Verifying your order...</div>

  return (
    <div style={{ background: '#F3F4F6', minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px' }}>
      
      <div style={{ width: '80px', height: '80px', background: '#D1FAE5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
      </div>

      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: '#111827', margin: '0 0 10px 0', textAlign: 'center', fontWeight: 800 }}>Payment Successful!</h1>
      <p style={{ color: '#4B5563', fontSize: '1rem', textAlign: 'center', maxWidth: '400px', marginBottom: '40px', lineHeight: 1.6 }}>
        Thank you for your order. The business owner has received your payment and will contact you shortly regarding your delivery.
      </p>

      {order && (
        <div style={{ width: '100%', maxWidth: '400px', background: '#FFFFFF', padding: '24px', borderRadius: '16px', marginBottom: '40px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: '16px', borderBottom: '1px solid #E5E7EB', paddingBottom: '12px' }}>Receipt</h2>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.95rem', color: '#4B5563' }}>
            <span>Order Date</span>
            <span style={{ fontWeight: 500, color: '#111827' }}>{new Date(order.created_at).toLocaleDateString()}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E5E7EB', paddingTop: '16px', marginTop: '16px' }}>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>Total Paid</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#059669' }}>
              ₦{Number(order.price).toLocaleString()}
            </span>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '400px' }}>
        <Link href={`/${slug}/shop`} style={{ display: 'block', width: '100%', padding: '16px', textAlign: 'center', background: '#111827', color: '#FFF', borderRadius: '12px', textDecoration: 'none', fontWeight: 600, fontSize: '1rem' }}>
          Continue Shopping
        </Link>
        <Link href={`/${slug}`} style={{ display: 'block', width: '100%', padding: '16px', textAlign: 'center', background: '#FFFFFF', color: '#111827', border: '1px solid #D1D5DB', borderRadius: '12px', textDecoration: 'none', fontWeight: 600, fontSize: '1rem' }}>
          Return to Home
        </Link>
      </div>
    </div>
  )
        }
