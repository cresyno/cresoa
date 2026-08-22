'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../lib/getBusinessId'
import { Navigation } from '../../../components/Navigation'
import '../../globals.css'

const Svg = ({ name, size = 20, stroke = 'currentColor', style }) => {
  const icons = {
    search: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    check: <polyline points="20 6 9 17 4 12" />,
    x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
    back: <><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></>,
    arrowRight: <><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>{icons[name]}</svg>
}

export default function NewInvoicePage() {
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
  const [cacNumber, setCacNumber] = useState('') // Simple string, e.g., "RC-12345"

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [newOrder, setNewOrder] = useState({
    title: '',
    description: '',
    quantity: 1,
    price_per_unit: 0,
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
  })

  useEffect(() => {
    const init = async () => {
      const bizId = getCurrentBusinessId()
      if (!bizId) { router.push('/dashboard'); return }
      setBusinessId(bizId)

      try {
        const { data: biz } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', bizId)
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
          .order('name', { ascending: true })
        setCustomers(custs || [])

        if (orderIdParam) {
          const { data: order } = await supabase
            .from('orders')
            .select(`
              *,
              customers ( * )
            `)
            .eq('id', orderIdParam)
            .eq('business_id', bizId)
            .single()
          if (order) {
            setSelectedCustomer(order.customers)
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
  }, [businessId, orderIdParam, router])

  const formatMoney = (val) => `₦${Number(val || 0).toLocaleString('en-NG')}`

  const subtotal = selectedOrders.reduce((sum, order) => {
    const price = Number(order.price_per_unit || order.price || 0)
    const qty = Number(order.quantity || 1)
    return sum + (price * qty)
  }, 0)

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

  const handleCreateOrder = async () => {
    if (!newOrder.title.trim()) { alert('Order title is required.'); return }
    if (Number(newOrder.quantity) < 1 || Number(newOrder.price_per_unit) < 0) { alert('Quantity must be at least 1 and price >= 0.'); return }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: created, error: createError } = await supabase
        .from('orders')
        .insert({
          business_id: businessId,
          customer_id: selectedCustomer.id,
          title: newOrder.title,
          description: newOrder.description || null,
          quantity: Number(newOrder.quantity),
          price_per_unit: Number(newOrder.price_per_unit),
          price: Number(newOrder.price_per_unit),
          due_date: newOrder.due_date,
          current_status: 'Order placed',
        })
        .select()
        .single()
      if (createError) throw createError

      const { data: refreshed } = await supabase
        .from('orders')
        .select('*')
        .eq('business_id', businessId)
        .eq('customer_id', selectedCustomer.id)
        .order('created_at', { ascending: false })
      setOrders(refreshed || [])
      setSelectedOrders(prev => [...prev, created])
      setShowNewOrderModal(false)
      setNewOrder({ title: '', description: '', quantity: 1, price_per_unit: 0, due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0] })
    } catch (err) {
      console.error(err)
      alert('Failed to create order.')
    }
  }

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel this invoice? All unsaved changes will be lost.')) {
      router.push(`/dashboard/invoices?business_id=${businessId}`)
    }
  }

  const handleSave = async () => {
    if (!selectedCustomer || selectedOrders.length === 0) { alert('Please select at least one order.'); return }
    if (!/^\d{10}$/.test(accountNumber)) { alert('Account number must be exactly 10 digits.'); return }
    if (cacNumber && !/^[A-Z]{2,3}-\d{5,7}$/.test(cacNumber)) { alert('CAC format: RC-12345 (5-7 digits)'); return }

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
        const itemTotal = Number(order.price_per_unit || order.price) * Number(order.quantity || 1)
        const { error: itemError } = await supabase
          .from('invoice_items')
          .insert({
            invoice_id: invoice.id,
            order_id: order.id,
            item_name: order.title || 'Order',
            description: order.description || '',
            quantity: order.quantity || 1,
            price: Number(order.price_per_unit || order.price),
            total: itemTotal,
          })
        if (itemError) throw itemError

        const { error: linkError } = await supabase
          .from('invoice_orders')
          .insert({
            invoice_id: invoice.id,
            order_id: order.id,
          })
        if (linkError) console.error('Failed to link order:', linkError)
      }

      router.push(`/dashboard/invoices/${invoice.id}?business_id=${businessId}`)
    } catch (err) {
      console.error(err)
      alert('Failed to create invoice.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--cresoa-bg)' }}><div className="cresoa-loading-spinner" /></div>
  if (error) return <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}><p>{error}</p><button onClick={() => router.push('/dashboard')} className="cresoa-primary-button">Go back</button></div>

  return (
    <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '100px' }}>
      <Navigation businessId={businessId} />
      <button onClick={handleCancel} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)', marginBottom: '1rem' }}>
        <Svg name="back" size={16} stroke="currentColor" /> Cancel
      </button>

      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 1.5rem', color: 'var(--cresoa-text)' }}>
        {step === 4 ? 'Review Invoice' : 'Create New Invoice'}
      </h1>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
        {[1, 2, 3, 4].map(s => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, background: step >= s ? 'var(--cresoa-accent)' : 'var(--cresoa-border)', color: step >= s ? '#fff' : 'var(--cresoa-text-muted)' }}>{s}</div>
            {s < 4 && <div style={{ width: '20px', height: '2px', background: step > s ? 'var(--cresoa-accent)' : 'var(--cresoa-border)' }} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', border: '1px solid var(--cresoa-border)', padding: '1.5rem' }}>
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

      {step === 2 && selectedCustomer && (
        <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', border: '1px solid var(--cresoa-border)', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Select Orders for {selectedCustomer.name || selectedCustomer.first_name}</h3>
            <button onClick={() => setShowNewOrderModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'var(--cresoa-accent)', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
              <Svg name="plus" size={14} stroke="#fff" /> New Order
            </button>
          </div>

          {orders.length === 0 && selectedOrders.length === 0 ? (
            <p style={{ color: 'var(--cresoa-text-muted)' }}>No orders found. Click "New Order" to create one.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {orders.map(order => {
                const isSelected = selectedOrders.some(o => o.id === order.id)
                return (
                  <div key={order.id} onClick={() => toggleOrder(order)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.8rem', border: `1px solid ${isSelected ? 'var(--cresoa-accent)' : 'var(--cresoa-border)'}`, borderRadius: '8px', background: isSelected ? 'var(--cresoa-accent-soft)' : 'var(--cresoa-bg)', cursor: 'pointer' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '4px', border: '2px solid var(--cresoa-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? 'var(--cresoa-accent)' : 'transparent' }}>
                      {isSelected && <Svg name="check" size={12} stroke="#fff" />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <strong>{order.title || 'Order'}</strong>
                      <div style={{ fontSize: '0.8rem', color: 'var(--cresoa-text-muted)' }}>Qty: {order.quantity || 1} × ₦{Number(order.price_per_unit || order.price).toLocaleString()}</div>
                    </div>
                    <div style={{ fontWeight: 600 }}>₦{((Number(order.price_per_unit || order.price) || 0) * (Number(order.quantity) || 1)).toLocaleString()}</div>
                  </div>
                )
              })}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button onClick={() => setStep(3)} disabled={selectedOrders.length === 0} className="cresoa-primary-button" style={{ opacity: selectedOrders.length === 0 ? 0.5 : 1 }}>
              Continue ({selectedOrders.length} selected)
            </button>
          </div>
        </div>
      )}

     {step === 3 && (
        <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', border: '1px solid var(--cresoa-border)', padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem' }}>Invoice Details</h3>

          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.2rem' }}>Thank You Note</label>
          <textarea value={thankYouNote} onChange={e => setThankYouNote(e.target.value)} rows={3} placeholder="Add your business tagline (e.g., Quality you can trust)" style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', marginBottom: '1rem' }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.2rem' }}>Issue Date</label>
              <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.2rem' }}>Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)' }} />
            </div>
          </div>

          <h4 style={{ margin: '1rem 0 0.5rem' }}>Bank Details (Required)</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', marginBottom: '1rem' }}>
            <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Bank Name" style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)' }} />
            <input type="text" value={accountNumber} onChange={e => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="Account Number (10 digits)" style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)' }} />
            {accountNumber && !/^\d{10}$/.test(accountNumber) && <p style={{ color: 'var(--cresoa-danger)', fontSize: '0.75rem', margin: '-0.3rem 0 0' }}>Must be exactly 10 digits</p>}
            <input type="text" value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="Account Name" style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)' }} />
          </div>

          <h4 style={{ margin: '1rem 0 0.5rem' }}>CAC Number (Optional)</h4>
          <input type="text" value={cacNumber} onChange={e => setCacNumber(e.target.value)} placeholder="e.g. RC-12345" style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', marginBottom: '0.5rem' }} />
          {cacNumber && !/^[A-Z]{2,3}-\d{5,7}$/.test(cacNumber) && <p style={{ color: 'var(--cresoa-danger)', fontSize: '0.75rem', margin: '-0.5rem 0 0.5rem' }}>Format: RC-12345 (5-7 digits)</p>}

          <button onClick={() => setStep(4)} className="cresoa-primary-button" style={{ width: '100%', justifyContent: 'center' }}>Review Invoice</button>
        </div>
      )}

      {step === 4 && (
        <div>
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid var(--cresoa-border)', padding: '1.5rem', marginBottom: '1rem' }}>
            <div style={{ borderBottom: '2px solid var(--cresoa-accent)', paddingBottom: '0.75rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {business?.logo_url ? <img src={business.logo_url} alt={business.name} style={{ width: '48px', height: '48px', objectFit: 'contain' }} /> : <div style={{ width: '48px', height: '48px', borderRadius: '6px', background: 'var(--cresoa-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>{business?.name?.charAt(0) || 'B'}</div>}
                <div>
                  <h2 style={{ margin: 0, color: 'var(--cresoa-primary)' }}>{business?.name || 'Business'}</h2>
                  {business?.location && <p style={{ margin: '2px 0', color: '#666', fontSize: '0.8rem' }}>{business.location}</p>}
                  {business?.phone && <p style={{ margin: '2px 0', color: '#666', fontSize: '0.8rem' }}>{business.phone}</p>}
                  {business?.email && <p style={{ margin: '2px 0', color: '#666', fontSize: '0.8rem' }}>{business.email}</p>}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h3 style={{ margin: 0 }}>INVOICE <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>(NGN)</span></h3>
                <p style={{ margin: '2px 0', color: '#666', fontSize: '0.8rem' }}>Issued: {issueDate}</p>
                <p style={{ margin: '2px 0', color: '#666', fontSize: '0.8rem' }}>Due: {dueDate}</p>
              </div>
            </div>

            <p style={{ fontWeight: 600 }}>BILL TO: {selectedCustomer?.name || selectedCustomer?.first_name}</p>
            {selectedCustomer?.phone && <p style={{ margin: '0', color: '#666', fontSize: '0.8rem' }}>{selectedCustomer.phone}</p>}
            {selectedCustomer?.email && <p style={{ margin: '0', color: '#666', fontSize: '0.8rem' }}>{selectedCustomer.email}</p>}
            {selectedCustomer?.address && <p style={{ margin: '0', color: '#666', fontSize: '0.8rem' }}>{selectedCustomer.address}</p>}

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginTop: '1rem' }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Item</th>
                  <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>Qty</th>
                  <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>Unit Price</th>
                  <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrders.map(order => {
                  const unitPrice = Number(order.price_per_unit || order.price)
                  const qty = Number(order.quantity || 1)
                  return (
                    <tr key={order.id}>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{order.title}</td>
                      <td style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #eee' }}>{qty}</td>
                      <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #eee' }}>{formatMoney(unitPrice)}</td>
                      <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #eee' }}>{formatMoney(unitPrice * qty)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <div style={{ width: '220px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span>Subtotal</span><span>{formatMoney(subtotal)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #eee', padding: '8px 0', fontWeight: 700 }}><span>Total</span><span>{formatMoney(total)}</span></div>
              </div>
            </div>

            <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f8f9fa', borderRadius: '8px' }}>
              <strong>Payment Details</strong>
              <div>Bank: {bankName} | Acct: {accountNumber} | Name: {accountName}</div>
            </div>
            {cacNumber && <p style={{ margin: '0.5rem 0', fontSize: '0.85rem' }}>CAC: {cacNumber}</p>}
            {thankYouNote && <p style={{ fontStyle: 'italic', color: '#666', marginTop: '1rem' }}>{thankYouNote}</p>}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={handleCancel} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} className="cresoa-primary-button" style={{ flex: 1, justifyContent: 'center' }}>{saving ? 'Saving...' : 'Save Invoice'}</button>
          </div>
        </div>
      )}

      {showNewOrderModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1.5rem', width: '100%', maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>New Order</h3>
              <button onClick={() => setShowNewOrderModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Svg name="x" size={20} stroke="currentColor" /></button>
            </div>
            <input type="text" placeholder="Order Title" value={newOrder.title} onChange={e => setNewOrder({ ...newOrder, title: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', marginBottom: '0.5rem' }} />
            <input type="text" placeholder="Description (optional)" value={newOrder.description} onChange={e => setNewOrder({ ...newOrder, description: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', marginBottom: '0.5rem' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input type="number" placeholder="Qty" value={newOrder.quantity} onChange={e => setNewOrder({ ...newOrder, quantity: Number(e.target.value) })} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)' }} />
              <input type="number" placeholder="Price per unit (₦)" value={newOrder.price_per_unit} onChange={e => setNewOrder({ ...newOrder, price_per_unit: Number(e.target.value) })} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)' }} />
            </div>
            <input type="date" value={newOrder.due_date} onChange={e => setNewOrder({ ...newOrder, due_date: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', marginBottom: '1rem' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button onClick={() => setShowNewOrderModal(false)} style={{ padding: '0.4rem 1rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleCreateOrder} style={{ padding: '0.4rem 1rem', borderRadius: '6px', border: 'none', background: 'var(--cresoa-accent)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

