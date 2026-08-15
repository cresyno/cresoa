'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../../lib/getBusinessId'
import { Icon } from '../../../../components/Icon'
import { Card } from '../../../../components/Card'
import { SectionHeader } from '../../../../components/SectionHeader'
import { Navigation } from '../../../../components/Navigation'
import WhatsAppReminderModal from '../../../../components/WhatsAppReminderModal'
import '../../../../globals.css'

export default function NewReminderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = getCurrentBusinessId() || searchParams.get('business_id')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [customers, setCustomers] = useState([])
  const [orders, setOrders] = useState([])

  const [formData, setFormData] = useState({
    title: '',
    due_date: '',
    customer_id: '',
    order_id: '',
  })

  // ─── WhatsApp modal ────────────────────────────────────────
  const [createdReminder, setCreatedReminder] = useState(null)
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false)

  // ─── Navigation helper ────────────────────────────────────
  const navigateWithBusiness = (path) => {
    const separator = path.includes('?') ? '&' : '?'
    router.push(`${path}${separator}business_id=${businessId}`)
  }

  // ─── Load data ─────────────────────────────────────────────
  useEffect(() => {
    const loadData = async () => {
      if (!businessId) {
        router.push('/dashboard')
        return
      }

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }

        // Fetch customers
        const { data: customersData } = await supabase
          .from('customers')
          .select('id, name')
          .eq('business_id', businessId)
          .order('name')
        setCustomers(customersData || [])

        // Fetch orders with customer names
        const { data: ordersData } = await supabase
          .from('orders')
          .select('id, title, price, customers(name)')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false })
        setOrders(ordersData || [])
      } catch (err) {
        console.error('Load data error:', err)
        setError('Failed to load data.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [businessId])

  // ─── Handlers ──────────────────────────────────────────────
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data, error: insertError } = await supabase
        .from('reminders')
        .insert({
          business_id: businessId,
          title: formData.title,
          due_date: formData.due_date || null,
          customer_id: formData.customer_id || null,
          order_id: formData.order_id || null,
          status: 'pending',
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Log activity
      await supabase.from('business_activity_logs').insert({
        business_id: businessId,
        performed_by: user.id,
        action: 'reminder_created',
        details: { title: formData.title }
      })

      setCreatedReminder(data)
      setShowWhatsAppModal(true)
    } catch (err) {
      console.error('Create reminder error:', err)
      setError('Failed to create reminder.')
    } finally {
      setSaving(false)
    }
  }

  const getOrderDisplay = (order) => {
    if (!order) return ''
    const customerName = order.customers?.name || 'No customer'
    return `${order.title || 'Untitled'} (₦${order.price || 0}) — ${customerName}`
  }

  // ─── Loading skeleton ────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ width: '140px', height: '24px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
          <div style={{ width: '100px', height: '32px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ background: 'var(--cresoa-surface)', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', animation: 'pulse 1.5s infinite' }}>
              <div style={{ width: '60%', height: '16px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
              <div style={{ width: '40%', height: '12px', background: 'var(--cresoa-border)', borderRadius: '6px', marginTop: '0.3rem' }} />
            </div>
          ))}
        </div>
        <style>{`@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }`}</style>
        <Navigation businessId={businessId} />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '80px' }}>
        <Card style={{ padding: '2rem', textAlign: 'center' }}>
          <Icon name="alert-circle" size={32} stroke="var(--cresoa-danger)" />
          <h2 style={{ margin: '0.5rem 0' }}>Couldn't load data</h2>
          <p style={{ color: 'var(--cresoa-text-muted)' }}>{error}</p>
          <button onClick={() => window.location.reload()} className="cresoa-primary-button" style={{ marginTop: '1rem' }}>Retry</button>
        </Card>
        <Navigation businessId={businessId} />
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '80px' }}>
      <Navigation businessId={businessId} />

      {/* Back navigation */}
      <button
        onClick={() => navigateWithBusiness('/dashboard/reminders')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}
      >
        <Icon name="arrow-left" size={16} stroke="currentColor" /> All Reminders
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0', color: 'var(--cresoa-text)' }}>New Reminder</h1>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', margin: 0 }}>Create a reminder for yourself or a customer.</p>
        </div>
      </div>

      <Card style={{ padding: '1.5rem' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {/* Title */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--cresoa-text)' }}>
              Title <span style={{ color: 'var(--cresoa-danger)' }}>*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="e.g. Payment reminder for Aso Ebi"
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                borderRadius: '8px',
                border: '1px solid var(--cresoa-border)',
                background: 'var(--cresoa-bg)',
                color: 'var(--cresoa-text)',
                fontSize: '0.95rem',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--cresoa-accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--cresoa-border)'}
            />
          </div>

          {/* Due Date */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--cresoa-text)' }}>
              Due Date
            </label>
            <input
              type="date"
              name="due_date"
              value={formData.due_date}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                borderRadius: '8px',
                border: '1px solid var(--cresoa-border)',
                background: 'var(--cresoa-bg)',
                color: 'var(--cresoa-text)',
                fontSize: '0.95rem',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--cresoa-accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--cresoa-border)'}
            />
          </div>

          {/* Customer */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--cresoa-text)' }}>
              Customer (optional)
            </label>
            <select
              name="customer_id"
              value={formData.customer_id}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                borderRadius: '8px',
                border: '1px solid var(--cresoa-border)',
                background: 'var(--cresoa-bg)',
                color: 'var(--cresoa-text)',
                fontSize: '0.95rem',
                boxSizing: 'border-box',
                cursor: 'pointer'
              }}
            >
              <option value="">No customer</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Order */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--cresoa-text)' }}>
              Order (optional)
            </label>
            <select
              name="order_id"
              value={formData.order_id}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                borderRadius: '8px',
                border: '1px solid var(--cresoa-border)',
                background: 'var(--cresoa-bg)',
                color: 'var(--cresoa-text)',
                fontSize: '0.95rem',
                boxSizing: 'border-box',
                cursor: 'pointer'
              }}
            >
              <option value="">No order</option>
              {orders.map(o => <option key={o.id} value={o.id}>{getOrderDisplay(o)}</option>)}
            </select>
          </div>

          {/* Error message */}
          {error && (
            <div style={{ padding: '0.5rem 0.8rem', borderRadius: '6px', background: 'var(--cresoa-danger-soft)', color: 'var(--cresoa-danger)', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            <button
              type="submit"
              disabled={saving}
              className="cresoa-primary-button"
              style={{ padding: '0.6rem 1.5rem' }}
            >
              {saving ? 'Creating...' : 'Create Reminder'}
            </button>
            <button
              type="button"
              onClick={() => navigateWithBusiness('/dashboard/reminders')}
              style={{
                padding: '0.6rem 1.5rem',
                borderRadius: '8px',
                border: '1px solid var(--cresoa-border)',
                background: 'transparent',
                color: 'var(--cresoa-text)',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 500
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </Card>

      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={businessId} />
      </div>

      {/* ─── WhatsApp Modal ──────────────────────────────────── */}
      {showWhatsAppModal && createdReminder && (
        <WhatsAppReminderModal
          reminder={createdReminder}
          onClose={() => {
            setShowWhatsAppModal(false)
            navigateWithBusiness('/dashboard/reminders')
          }}
          businessId={businessId}
        />
      )}
    </div>
  )
  }
