'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { Icon } from '../../../components/Icon'

export default function TrackingPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const orderId = params.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [order, setOrder] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [business, setBusiness] = useState(null)

  // ─── Load order data ───
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        // 1. Fetch order with customer and business
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select(`
            *,
            customers (id, name, phone, email),
            businesses (id, name, logo_url, tracking_primary_color, tracking_bg_color, tracking_logo_url, tracking_welcome_message, tracking_footer_message)
          `)
          .eq('id', orderId)
          .single()

        if (orderError) throw orderError

        setOrder(orderData)
        setCustomer(orderData.customers)
        setBusiness(orderData.businesses)

      } catch (err) {
        console.error('Error loading order:', err)
        setError('Order not found. Please check the tracking link.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [orderId])

  // ─── Get status info ───
  const getStatusInfo = (status) => {
    const map = {
      'Order placed': { label: 'Placed', color: '#6B6255', bg: '#F0EDE8' },
      'Cutting':      { label: 'Cutting', color: '#B4881E', bg: '#F6E9C8' },
      'Sewing':       { label: 'Sewing', color: '#1E3A5F', bg: '#D6E0EB' },
      'Ready':        { label: 'Ready', color: '#2E7D5E', bg: '#DCEBE2' },
      'Delivered':    { label: 'Delivered', color: '#6B6255', bg: '#E8E0D5' },
    }
    return map[status] || { label: status || 'Placed', color: '#6B6255', bg: '#F0EDE8' }
  }

  // ─── Get custom colours and messages from business ───
  const primaryColor = business?.tracking_primary_color || '#D4A52A'
  const bgColor = business?.tracking_bg_color || '#F8F6F2'
  const welcomeMessage = business?.tracking_welcome_message || 'Track your order status'
  const footerMessage = business?.tracking_footer_message || 'Thank you for choosing us'
  const logoUrl = business?.tracking_logo_url || business?.logo_url || null

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: bgColor,
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '1.5rem'
      }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '3px solid #E5E0D8', 
          borderTop: `3px solid ${primaryColor}`, 
          borderRadius: '50%', 
          animation: 'spin 0.8s linear infinite' 
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: bgColor,
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '1.5rem',
        flexDirection: 'column',
        gap: '1rem',
        textAlign: 'center'
      }}>
        <span style={{ fontSize: '3rem', display: 'block' }}>📋</span>
        <h1 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#1A1A1A' }}>Order not found</h1>
        <p style={{ color: '#8A8A8A' }}>{error}</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: bgColor,
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '1.5rem',
        flexDirection: 'column',
        gap: '1rem',
        textAlign: 'center'
      }}>
        <span style={{ fontSize: '3rem', display: 'block' }}>📋</span>
        <h1 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#1A1A1A' }}>Order not found</h1>
        <p style={{ color: '#8A8A8A' }}>The order you're looking for doesn't exist or has been removed.</p>
      </div>
    )
  }

  const statusInfo = getStatusInfo(order.current_status)
  const balance = (order.price || 0) - (order.amount_paid || 0)
  const isFullyPaid = balance <= 0

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: bgColor,
      padding: '1.5rem',
      fontFamily: "'Inter', -apple-system, sans-serif"
    }}>
      {/* ─── Header ─── */}
      <div style={{ 
        maxWidth: '600px', 
        margin: '0 auto', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.8rem', 
        marginBottom: '1.5rem' 
      }}>
        {logoUrl ? (
          <img 
            src={logoUrl} 
            alt={business?.name || 'Business'} 
            style={{ height: '44px', width: 'auto', objectFit: 'contain' }} 
          />
        ) : (
          <div style={{ 
            width: '44px', 
            height: '44px', 
            borderRadius: '50%', 
            background: primaryColor,
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#fff',
            fontWeight: '700',
            fontSize: '1.2rem'
          }}>
            {(business?.name || 'C')[0].toUpperCase()}
          </div>
        )}
        <span style={{ fontWeight: '600', fontSize: '1rem', color: '#1A1A1A' }}>
          {business?.name || 'Cresoa'}
        </span>
      </div>

      {/* ─── Welcome Message ─── */}
      <div style={{ maxWidth: '600px', margin: '0 auto', marginBottom: '1.5rem' }}>
        <h1 style={{ 
          fontSize: '1.5rem', 
          fontWeight: '700', 
          color: primaryColor,
          margin: '0 0 0.2rem'
        }}>
          {welcomeMessage}
        </h1>
        <p style={{ color: '#8A8A8A', fontSize: '0.95rem', margin: 0 }}>
          {customer?.name ? `Order for ${customer.name}` : 'Order status'}
        </p>
      </div>

      {/* ─── Order Details ─── */}
      <div style={{ 
        maxWidth: '600px', 
        margin: '0 auto', 
        background: '#FFFFFF', 
        borderRadius: '16px', 
        padding: '1.5rem',
        boxShadow: '0 4px 16px rgba(15,43,74,0.06)',
        border: '1px solid #E5E0D8'
      }}>
        {/* ─── Status Badge ─── */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '1rem',
          paddingBottom: '0.8rem',
          borderBottom: '1px solid #E5E0D8'
        }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Current Status</div>
            <div style={{ 
              display: 'inline-block',
              background: statusInfo.bg, 
              color: statusInfo.color, 
              padding: '0.2rem 0.8rem', 
              borderRadius: '20px', 
              fontSize: '0.85rem', 
              fontWeight: '600'
            }}>
              {statusInfo.label}
            </div>
          </div>
          <div style={{ 
            fontSize: '0.7rem', 
            color: isFullyPaid ? '#2E7D5E' : '#D9534F',
            fontWeight: '600'
          }}>
            {isFullyPaid ? 'Paid ✓' : `₦${balance.toLocaleString()} due`}
          </div>
        </div>

        {/* ─── Order Info ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
          <div>
            <div style={{ fontSize: '0.65rem', color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Order</div>
            <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{order.title || 'Untitled'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Total</div>
            <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>₦{order.price?.toLocaleString() || 0}</div>
          </div>
        </div>

        {/* ─── Customer Info ─── */}
        {customer && (
          <div style={{ 
            marginTop: '0.8rem', 
            paddingTop: '0.8rem', 
            borderTop: '1px solid #E5E0D8' 
          }}>
            <div style={{ fontSize: '0.65rem', color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Customer</div>
            <div style={{ fontWeight: '500', fontSize: '0.9rem' }}>{customer.name}</div>
            {customer.phone && (
              <div style={{ fontSize: '0.8rem', color: '#8A8A8A' }}>{customer.phone}</div>
            )}
          </div>
        )}

        {/* ─── Progress Bar ─── */}
        <div style={{ marginTop: '1rem' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            fontSize: '0.65rem', 
            color: '#8A8A8A', 
            marginBottom: '0.2rem' 
          }}>
            <span>Progress</span>
            <span>{order.current_status === 'Delivered' ? '100%' : 'In progress'}</span>
          </div>
          <div style={{ 
            width: '100%', 
            height: '6px', 
            background: '#F0EDE8', 
            borderRadius: '4px', 
            overflow: 'hidden' 
          }}>
            <div style={{ 
              width: order.current_status === 'Delivered' ? '100%' : '60%', 
              height: '100%', 
              background: primaryColor, 
              borderRadius: '4px',
              transition: 'width 0.6s ease'
            }} />
          </div>
        </div>

        {/* ─── Status Steps ─── */}
        <div style={{ 
          marginTop: '1.2rem', 
          display: 'flex', 
          justifyContent: 'space-between',
          position: 'relative',
          padding: '0 0.2rem'
        }}>
          {['Placed', 'Cutting', 'Sewing', 'Ready', 'Delivered'].map((label, idx) => {
            const statuses = ['Order placed', 'Cutting', 'Sewing', 'Ready', 'Delivered']
            const isActive = statuses.indexOf(order.current_status) >= idx
            return (
              <div key={label} style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                flex: 1,
                gap: '0.3rem'
              }}>
                <div style={{ 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  background: isActive ? primaryColor : '#E5E0D8',
                  color: isActive ? '#fff' : '#8A8A8A',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '0.6rem',
                  fontWeight: '700'
                }}>
                  {idx + 1}
                </div>
                <div style={{ 
                  fontSize: '0.5rem', 
                  color: isActive ? primaryColor : '#8A8A8A',
                  fontWeight: isActive ? '600' : '400',
                  textAlign: 'center'
                }}>
                  {label}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── Footer ─── */}
      <div style={{ 
        maxWidth: '600px', 
        margin: '0 auto', 
        marginTop: '1.5rem', 
        textAlign: 'center' 
      }}>
        <p style={{ color: '#8A8A8A', fontSize: '0.75rem', margin: 0 }}>
          {footerMessage}
        </p>
        <p style={{ color: '#C8C0B5', fontSize: '0.6rem', marginTop: '0.3rem' }}>
          Powered by Cresoa
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 480px) {
          .tracking-header { flex-direction: column; align-items: flex-start; }
        }
      `}</style>
    </div>
  )
}
