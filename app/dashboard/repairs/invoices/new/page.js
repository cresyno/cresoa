'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../../lib/supabaseClient'

// ─── Self-contained SVG Icons ───
const Svg = ({ name, size = 20, stroke = 'currentColor', style }) => {
  const icons = {
    search: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    check: <polyline points="20 6 9 17 4 12" />,
    x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
    back: <><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></>,
    trash: <><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></>,
    'alert-circle': <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>{icons[name]}</svg>
}

// ─── Helpers ───
const formatMoney = (val) => `₦${Number(val || 0).toLocaleString('en-NG')}`
const inputStyle = {
  width: '100%',
  padding: '0.6rem 0.8rem',
  borderRadius: '8px',
  border: '1px solid var(--cresoa-border)',
  background: 'var(--cresoa-bg)',
  color: 'var(--cresoa-text)',
  fontSize: '0.95rem',
  boxSizing: 'border-box',
}
const labelStyle = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  marginBottom: '0.3rem',
  color: 'var(--cresoa-text)',
}
const primaryBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.3rem',
  padding: '0.6rem 1.5rem',
  borderRadius: '8px',
  border: 'none',
  background: 'var(--cresoa-accent)',
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
  fontSize: '0.9rem',
}
const secondaryBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.3rem',
  padding: '0.6rem 1.2rem',
  borderRadius: '8px',
  border: '1px solid var(--cresoa-border)',
  background: 'var(--cresoa-surface)',
  color: 'var(--cresoa-text)',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: '0.9rem',
}

export default function RepairsNewInvoicePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderIdParam = searchParams.get('order_id')

  const [businessId, setBusinessId] = useState(null)
  const [business, setBusiness] = useState(null)
  const [customers, setCustomers] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [orders, setOrders] = useState([])
  const [selectedOrders, setSelectedOrders] = useState([])
  const [showNewOrderModal, setShowNewOrderModal] = useState(false)
  const [thankYouNote, setThankYouNote] = useState('')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().split('T')[0]
  })
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [cacNumber, setCacNumber] = useState('')
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Validation errors for review step
  const [formErrors, setFormErrors] = useState({})

  // New Order Modal State
  const [newOrder, setNewOrder] = useState({
    title: '',
    description: '',
    quantity: '',
    price_per_unit: '',
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
  })

  // Resolve business & fetch initial data (sector-scoped)
  useEffect(() => {
    const init = async () => {
      const bizId = searchParams.get('business_id')
      if (!bizId) {
        router.push('/dashboard')
        return
      }
      setBusinessId(bizId)

      try {
        const { data: biz } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', bizId)
          .eq('sector', 'repairs')
          .single()
        setBusiness(biz)
        if (biz) {
          setBankName(biz.bank_name || '')
          setAccountNumber(biz.account_number || '')
          setAccountName(biz.account_name || '')
          setCacNumber(biz.cac_number || '')
        }

        const { data: custs } = await supabase
          .from('customers')
          .select('*')
          .eq('business_id', bizId)
          .eq('sector', 'repairs')
          .order('name', { ascending: true })
        setCustomers(custs || [])

        if (orderIdParam) {
          const { data: order } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderIdParam)
            .eq('business_id', bizId)
            .eq('sector', 'repairs')
            .single()
          if (order) {
            setSelectedCustomer({ id: order.customer_id, name: order.customers?.name || 'Customer' })
            setSelectedOrders([order])
            setThankYouNote(order.notes || '')
            setIssueDate(order.created_at ? order.created_at.split('T')[0] : issueDate)
            setDueDate(order.due_date || dueDate)
            setStep(4)
          }
        }
      } catch (err) {
        console.error(err)
        setError('Failed to load data.')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [businessId, orderIdParam, router, searchParams])

  // Compute totals
  const subtotal = useMemo(() => {
    return selectedOrders.reduce((sum, order) => {
      const price = Number(order.price_per_unit || order.price || 0)
      const qty = Number(order.quantity || 1)
      return sum + (price * qty)
    }, 0)
  }, [selectedOrders])
  const total = subtotal

  const filteredCustomers = customers.filter(c =>
    (c.name || c.first_name || '').toLowerCase().includes(customerSearch.toLowerCase())
  )

  const handleCustomerSelect = async (customer) => {
    setSelectedCustomer(customer)
    setStep(2)
    const { data: orderData } = await supabase
      .from('orders')
      .select('*')
      .eq('business_id', businessId)
      .eq('customer_id', customer.id)
      .eq('sector', 'repairs')
      .order('created_at', { ascending: false })
    setOrders(orderData || [])
    setSelectedOrders([])
  }

  const toggleOrder = (order) => {
    setSelectedOrders(prev => {
      if (prev.some(o => o.id === order.id)) return prev.filter(o => o.id !== order.id)
      return [...prev, order]
    })
  }

  // Create temporary order (not saved to DB)
  const handleCreateOrder = () => {
    if (!newOrder.title.trim()) { alert('Order title is required.'); return }
    if (newOrder.quantity === '' || Number(newOrder.quantity) < 1) { alert('Quantity must be at least 1.'); return }
    if (newOrder.price_per_unit === '' || Number(newOrder.price_per_unit) < 0) { alert('Price per unit must be 0 or more.'); return }

    const tempOrder = {
      id: `temp-${Date.now()}`,
      customer_id: selectedCustomer.id,
      business_id: businessId,
      title: newOrder.title,
      description: newOrder.description || '',
      quantity: Number(newOrder.quantity),
      price_per_unit: Number(newOrder.price_per_unit),
      price: Number(newOrder.price_per_unit), // legacy
      due_date: newOrder.due_date,
      current_status: 'Order placed',
      is_temp: true,
    }

    setSelectedOrders(prev => [...prev, tempOrder])
    setShowNewOrderModal(false)
    setNewOrder({
      title: '',
      description: '',
      quantity: '',
      price_per_unit: '',
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    })
  }

  const handleRemoveTempOrder = (orderId) => {
    setSelectedOrders(prev => prev.filter(o => o.id !== orderId))
  }

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel this invoice? All unsaved changes will be lost.')) {
      router.push(`/dashboard/repairs/invoices?business_id=${businessId}`)
    }
  }

  // Validate review step
  const validateReview = () => {
    const errors = {}
    if (!bankName.trim()) errors.bankName = 'Bank name is required.'
    if (!/^\d{10}$/.test(accountNumber)) errors.accountNumber = 'Account number must be exactly 10 digits.'
    if (!accountName.trim()) errors.accountName = 'Account name is required.'
    if (cacNumber && !/^[A-Z]{2,3}-\d{5,7}$/.test(cacNumber)) errors.cacNumber = 'Format: RC-12345 (5-7 digits)'
    return errors
  }

  const handleSave = async () => {
    const errors = validateReview()
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    if (!selectedCustomer || selectedOrders.length === 0) { alert('Please select at least one order.'); return }

    setSaving(true)
    try {
      const prefix = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`
      const { count } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .like('invoice_number', `${prefix}-%`)
      const nextNum = String((count || 0) + 1).padStart(3, '0')
      const invoiceNumber = `${prefix}-${nextNum}`

      const { data: invoice, error: invError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          business_id: businessId,
          sector: 'repairs',
          customer_id: selectedCustomer.id,
          status: 'draft',
          issue_date: issueDate,
          due_date: dueDate,
          subtotal: total,
          total,
          amount_paid: 0,
          custom_note: thankYouNote,
          bank_name: bankName,
          account_number: accountNumber,
          account_name: accountName,
          cac_number: cacNumber || null,
        })
        .select()
        .single()
      if (invError) throw invError

      for (const order of selectedOrders) {
        const { error: itemError } = await supabase
          .from('invoice_items')
          .insert({
            invoice_id: invoice.id,
            order_id: order.is_temp ? null : order.id,
            item_name: order.title || 'Order',
            description: order.description || '',
            quantity: order.quantity || 1,
            price: Number(order.price_per_unit || order.price),
          })
        if (itemError) throw itemError
      }

      router.push(`/dashboard/repairs/invoices/${invoice.id}?business_id=${businessId}`)
    } catch (err) {
      console.error(err)
      alert('Failed to create invoice. ' + (err.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--cresoa-bg)' }}><div className="cresoa-loading-spinner" /></div>
  if (error) return <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}><p>{error}</p><button onClick={() => router.push('/dashboard')} className="cresoa-primary-button">Go back</button></div>

  return (
    <div style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '100px', background: 'var(--cresoa-bg)', minHeight: '100vh' }}>
      {/* Cancel button */}
      <button onClick={handleCancel} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)', marginBottom: '1rem' }}>
        <Svg name="back" size={16} stroke="currentColor" /> Cancel
      </button>

      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 1.5rem', color: 'var(--cresoa-text)' }}>
        {step === 4 ? 'Review Invoice' : 'Create New Invoice'}
      </h1>

      {/* Step indicators */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
        {[1, 2, 3, 4].map(s => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, background: step >= s ? 'var(--cresoa-accent)' : 'var(--cresoa-border)', color: step >= s ? '#fff' : 'var(--cresoa-text-muted)' }}>
              {step > s ? <Svg name="check" size={14} stroke="#fff" /> : s}
            </div>
            {s < 4 && <div style={{ width: '20px', height: '2px', background: step > s ? 'var(--cresoa-accent)' : 'var(--cresoa-border)' }} />}
          </div>
        ))}
      </div>

      {/* STEP 1: Customer */}
      {step === 1 && (
        <div className="cresoa-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem' }}>Select Customer</h3>
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--cresoa-border)', borderRadius: '8px', padding: '0.4rem 0.8rem', marginBottom: '1rem' }}>
            <Svg name="search" size={16} stroke="var(--cresoa-text-muted)" style={{ marginRight: '0.5rem' }} />
            <input type="text" placeholder="Search registered customers..." value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', color: 'var(--cresoa-text)' }} />
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {filteredCustomers.length === 0 ? <p style={{ textAlign: 'center', color: 'var(--cresoa-text-muted)' }}>No customers found.</p> : (
              filteredCustomers.map(customer => (
                <button key={customer.id} onClick={() => handleCustomerSelect(customer)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.8rem', border: '1px solid var(--cresoa-border)', borderRadius: '8px', background: 'var(--cresoa-bg)', marginBottom: '0.5rem', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--cresoa-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{(customer.name || customer.first_name || '?').charAt(0)}</span>
                  <div>
                    <strong>{customer.name || customer.first_name}</strong>
                    {customer.phone && <div style={{ fontSize: '0.75rem', color: 'var(--cresoa-text-muted)' }}>{customer.phone}</div>}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* STEP 2: Orders */}
      {step === 2 && selectedCustomer && (
        <div className="cresoa-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Select Jobs for {selectedCustomer.name || selectedCustomer.first_name}</h3>
            <button onClick={() => setShowNewOrderModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'var(--cresoa-accent)', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
              <Svg name="plus" size={14} stroke="#fff" /> New Order
            </button>
          </div>

          {orders.length === 0 && selectedOrders.length === 0 ? (
            <p style={{ color: 'var(--cresoa-text-muted)' }}>No jobs found. Click "New Order" to add one.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {/* Real orders */}
              {orders.map(order => {
                const isSelected = selectedOrders.some(o => o.id === order.id)
                return (
                  <div key={order.id} onClick={() => toggleOrder(order)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.8rem', border: `1px solid ${isSelected ? 'var(--cresoa-accent)' : 'var(--cresoa-border)'}`, borderRadius: '8px', background: isSelected ? 'var(--cresoa-accent-soft)' : 'var(--cresoa-bg)', cursor: 'pointer' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '4px', border: '2px solid var(--cresoa-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? 'var(--cresoa-accent)' : 'transparent' }}>
                      {isSelected && <Svg name="check" size={12} stroke="#fff" />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <strong>{order.title || 'Job'}</strong>
                      <div style={{ fontSize: '0.8rem', color: 'var(--cresoa-text-muted)' }}>Qty: {order.quantity || 1} × ₦{Number(order.price_per_unit || order.price).toLocaleString()}</div>
                    </div>
                    <div style={{ fontWeight: 600 }}>₦{((Number(order.price_per_unit || order.price) || 0) * (Number(order.quantity) || 1)).toLocaleString()}</div>
                  </div>
                )
              })}
              {/* Temp orders */}
              {selectedOrders.filter(o => o.is_temp).map(order => (
                <div key={order.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.8rem', border: '1px solid var(--cresoa-accent)', borderRadius: '8px', background: 'var(--cresoa-accent-soft)' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '4px', border: '2px solid var(--cresoa-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cresoa-accent)' }}>
                    <Svg name="check" size={12} stroke="#fff" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <strong>{order.title}</strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--cresoa-text-muted)' }}>Qty: {order.quantity} × ₦{Number(order.price_per_unit).toLocaleString()} (Temporary)</div>
                  </div>
                  <div style={{ fontWeight: 600 }}>₦{(Number(order.quantity) * Number(order.price_per_unit)).toLocaleString()}</div>
                  <button onClick={(e) => { e.stopPropagation(); handleRemoveTempOrder(order.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-danger)' }}>
                    <Svg name="trash" size={16} stroke="currentColor" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button onClick={() => setStep(3)} disabled={selectedOrders.length === 0} className="cresoa-primary-button" style={{ opacity: selectedOrders.length === 0 ? 0.5 : 1 }}>
              Continue ({selectedOrders.length} selected)
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Details */}
      {step === 3 && (
        <div className="cresoa-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem' }}>Invoice Details</h3>

          <label style={labelStyle}>Thank You Note</label>
          <textarea value={thankYouNote} onChange={e => setThankYouNote(e.target.value)} rows={3} placeholder="Add your business tagline (e.g., Quality you can trust)" style={{ ...inputStyle, resize: 'vertical', marginBottom: '1rem' }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label style={labelStyle}>Issue Date</label>
              <input type="date" value={issueDate} onCh
