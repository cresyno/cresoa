'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function WhatsAppReminderModal({ reminder, onClose, businessId }) {
  const [customer, setCustomer] = useState(null)
  const [order, setOrder] = useState(null)
  const [message, setMessage] = useState('')
  const [defaultMessage, setDefaultMessage] = useState('')

  useEffect(() => {
    const loadDetails = async () => {
      let cust = null
      let ord = null

      if (reminder.customer_id) {
        const { data } = await supabase
          .from('customers')
          .select('name, phone')
          .eq('id', reminder.customer_id)
          .single()
        cust = data
        setCustomer(cust)
      }

      if (reminder.order_id) {
        const { data } = await supabase
          .from('orders')
          .select('title, price, amount_paid')
          .eq('id', reminder.order_id)
          .single()
        ord = data
        setOrder(ord)
      }

      // Build default message
      let msg = `🔔 Reminder: ${reminder.title}\n`
      if (cust) msg += `Customer: ${cust.name}\n`
      if (ord) {
        msg += `Order: ${ord.title || 'Untitled'} (₦${ord.price || 0})\n`
        const balance = (ord.price || 0) - (ord.amount_paid || 0)
        if (balance > 0) msg += `Balance: ₦${balance.toLocaleString()}\n`
      }
      if (reminder.due_date) {
        const due = new Date(reminder.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        msg += `Due: ${due}\n`
      }
      msg += `Please settle as soon as possible.`

      setDefaultMessage(msg)
      setMessage(msg)
    }

    loadDetails()
  }, [reminder])

  const resetToDefault = () => setMessage(defaultMessage)

  const sendWhatsApp = () => {
    const phone = customer?.phone || ''
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(4px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      animation: 'fadeIn 0.2s'
    }} onClick={onClose}>
      <div style={{
        background: 'var(--color-bg)',
        borderRadius: '16px',
        padding: '1.5rem',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto'
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0 }}>📱 Send WhatsApp Reminder</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.3rem', color: 'var(--color-text-muted)', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ marginBottom: '0.8rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Title</div>
          <div style={{ fontWeight: '500' }}>{reminder.title}</div>
        </div>

        <div style={{ marginBottom: '0.8rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', marginBottom: '0.2rem' }}>Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            style={{
              width: '100%',
              padding: '0.6rem',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-card)',
              color: 'var(--color-text)',
              fontSize: '0.9rem',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
          <button
            onClick={resetToDefault}
            style={{
              padding: '0.4rem 1rem',
              background: 'var(--color-card)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            Reset to Default
          </button>
          <button
            onClick={sendWhatsApp}
            style={{
              padding: '0.4rem 1.5rem',
              background: '#25D366',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            <span>💬</span> Send via WhatsApp
          </button>
        </div>

        <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        `}</style>
      </div>
    </div>
  )
}
