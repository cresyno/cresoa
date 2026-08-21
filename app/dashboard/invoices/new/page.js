'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { requireBusinessAccess } from '../../../../lib/requireBusinessAccess'
import { supabase } from '../../../../lib/supabaseClient'
import { Navigation } from '../../../../components/Navigation'
import '../../../globals.css'

// ─── Self-contained SVG icons ───
const Svg = ({ name, size = 20, stroke = 'currentColor', style }) => {
  const icons = {
    back: <><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></>,
    search: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
    check: <polyline points="20 6 9 17 4 12" />,
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    trash: <><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></>,
    save: <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></>,
    x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
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
  const [selectedOrder, setSelectedOrder] = useState(null)

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

  const [step, setStep] = useState(1) // 1: customer, 2: order, 3: details, 4: review
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const init = async () => {
      try {
        const bizId = await requireBusinessAccess(router)
        if (!bizId) return

        setBusinessId(bizId)

        // Fetch business
        const { data: bizData } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', bizId)
          .single()
        if (bizData) {
          setBusiness(bizData)
          setBankName(bizData.bank_name || '')
          setAccountNumber(bizData.account_number || '')
          setAccountName(bizData.account_name || '')
        }

        // Fetch all customers for this business
        const { data: customerData } = await supabase
          .from('customers')
          .select('*')
          .eq('business_id', bizId)
          .order('name', { ascending: true })
        if (customerData) setCustomers(customerData)

        // If order_id param exists, skip to review
        if (orderIdParam) {
          // Fetch the order with its customer
          const { data: order, error: orderError } = await supabase
            .from('orders')
            .select(`
              *,
              customers ( id, name, first_name, last_name, phone, email, address )
            `)
            .eq('id', orderIdParam)
            .eq('business_id', bizId)
            .single()

          if (orderError) throw orderError
          if (order) {
            setSelectedCustomer(order.customers)
            setSelectedOrder(order)
            // Prefill item info from order
            setThankYouNote(order.notes || '')
            setIssueDate(order.created_at ? order.created_at.split('T')[0] : new Date().toISOString().split('T')[0])
            setDueDate(order.due_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0])
            // Skip to review step
            setStep(4)
          }
        }
      } catch (err) {
        console.error(err)
        setError('Could not load required data.')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router, orderIdParam])

  // ─── Helpers ───
  const formatMoney = (val) => `₦${Number(val || 0).toLocaleString('en-NG')}`

  const orderSubtotal = selectedOrder ? Number(selectedOrder.price) * Number(selectedOrder.quantity || 1) : 0
  const total = orderSubtotal // No discount/tax

  const isBankComplete = bankName.trim() && accountNumber.trim() && accountName.trim()
  const isAccountNumberValid = /^\d{10}$/.test(accountNumber)

  // Filter customers
  const filteredCustomers = customers.filter(c =>
    (c.name || c.first_name || '').toLowerCase().includes(customerSearch.toLowerCase())
  )

  // When a customer is selected, fetch their orders
  const handleCustomerSelect = async (customer) => {
    setSelectedCustomer(customer)
    setStep(2)
    // Fetch orders for this customer
    const { data: orderData } = await supabase
      .from('orders')
      .select('*')
      .eq('business_id', businessId)
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
    setOrders(orderData || [])
    setSelectedOrder(null) // reset selected order
  }

  const handleOrderSelect = (order) => {
    setSelectedOrder(order)
    setThankYouNote(order.notes || '')
    setIssueDate(order.created_at ? order.created_at.split('T')[0] : new Date().toISOString().split('T')[0])
    setDueDate(order.due_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0])
    setStep(3)
  }

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel this invoice? All unsaved changes will be lost.')) {
      router.push(`/dashboard/invoices?business_id=${businessId}`)
    }
  }

  const handleSave = async () => {
    if (!selectedCustomer || !selectedOrder) {
      alert('Please select a customer and an order.')
      return
    }
    if (!isAccountNumberValid) {
      alert('Account Number must be exactly 10 digits.')
      return
    }
    if (!isBankComplete) {
      alert('Please fill in all bank details.')
      return
    }

    setSaving(true)
    try {
      // Generate invoice number
      const prefix = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`
      const { count } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .like('invoice_number', `${prefix}-%`)
      const nextNum = String((count || 0) + 1).padStart(3, '0')
      const invoiceNumber = `${prefix}-${nextNum}`

      // Insert invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          business_id: businessId,
          customer_id: selectedCustomer.id,
          order_id: selectedOrder.id,
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
        })
        .select()
        .single()

      if (invoiceError) throw invoiceError

      // Insert item (single line from order)
      const { error: itemError } = await supabase
        .from('invoice_items')
        .insert({
          invoice_id: invoice.id,
          item_name: selectedOrder.title || 'Order',
          description: selectedOrder.description || '',
          quantity: selectedOrder.quantity || 1,
          price: selectedOrder.price || 0,
        })
      if (itemError) throw itemError

      // Redirect to invoice detail page
      router.push(`/dashboard/invoices/${invoice.id}?business_id=${businessId}`)
    } catch (err) {
      console.error(err)
      alert('Failed to create invoice. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cresoa-bg)' }}>
        <div className="cresoa-loading-spinner" />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--cresoa-danger)' }}>{error}</p>
        <button onClick={() => router.push('/dashboard')} className="cresoa-primary-button">Go back</button>
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '100px' }}>
      <Navigation businessId={businessId} />

      {/* Back / Cancel */}
      <button onClick={handleCancel} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)', marginBottom: '1rem' }}>
        <Svg name="back" size={16} stroke="currentColor" /> Cancel
      </button>

      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 1.5rem', color: 'var(--cresoa-text)' }}>
        {step === 4 ? 'Review Invoice' : 'Create New Invoice'}
      </h1>

      {/* Wizard Stepper (4 steps) */}
      {step !== 4 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
          {[1, 2, 3, 4].map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', background: step >= s ? 'var(--cresoa-accent)' : 'var(--cresoa-border)', color: step >= s ? '#fff' : 'var(--cresoa-text-muted)' }}>
                {s}
              </div>
              {s < 4 && <div style={{ width: '20px', height: '2px', background: step > s ? 'var(--cresoa-accent)' : 'var(--cresoa-border)' }} />}
            </div>
          ))}
        </div>
      )}

      {/* STEP 1: Customer */}
      {step === 1 && (
        <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', border: '1px solid var(--cresoa-border)', padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem', color: 'var(--cresoa-text)' }}>Select Customer</h3>
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--cresoa-border)', borderRadius: '8px', padding: '0.4rem 0.8rem', marginBottom: '1rem', background: 'var(--cresoa-bg)' }}>
            <Svg name="search" size={16} stroke="var(--cresoa-text-muted)" style={{ marginRight: '0.5rem' }} />
            <input
              type="text"
              placeholder="Search registered customers..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', color: 'var(--cresoa-text)', fontSize: '0.85rem' }}
            />
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filteredCustomers.length === 0 ? (
              <p style={{ color: 'var(--cresoa-text-muted)', textAlign: 'center' }}>No customers found.</p>
            ) : (
              filteredCustomers.map(customer => (
                <button
                  key={customer.id}
                  onClick={() => handleCustomerSelect(customer)}
                  style={{
                    textAlign: 'left',
                    padding: '0.8rem',
                    borderRadius: '8px',
                    border: '1px solid var(--cresoa-border)',
                    background: 'var(--cresoa-bg)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    width: '100%'
                  }}
                >
                  <span style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--cresoa-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                    {(customer.name || customer.first_name || '?').charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <strong style={{ color: 'var(--cresoa-text)' }}>{customer.name || customer.first_name || 'Unnamed'}</strong>
                    {customer.phone && <div style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.75rem' }}>{customer.phone}</div>}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* STEP 2: Order */}
      {step === 2 && selectedCustomer && (
        <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', border: '1px solid var(--cresoa-border)', padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem', color: 'var(--cresoa-text)' }}>Select Order for {selectedCustomer.name || selectedCustomer.first_name}</h3>
          {orders.length === 0 ? (
            <p style={{ color: 'var(--cresoa-text-muted)' }}>No orders found for this customer.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {orders.map(order => (
                <button
                  key={order.id}
                  onClick={() => handleOrderSelect(order)}
                  style={{
                    textAlign: 'left',
                    padding: '0.8rem',
                    borderRadius: '8px',
                    border: '1px solid var(--cresoa-border)',
                    background: 'var(--cresoa-bg)',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  <strong style={{ color: 'var(--cresoa-text)' }}>{order.title || 'Order'}</strong>
                  <div style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.8rem' }}>
                    {formatMoney(order.price)} · {order.quantity || 1} item(s) · {order.current_status || 'Status'}
                  </div>
                </button>
              ))}
            </div>
          )}
          <button onClick={() => setStep(1)} style={{ marginTop: '1rem', background: 'none', border: 'none', color: 'var(--cresoa-text-muted)', cursor: 'pointer' }}>
            ← Back to customer selection
          </button>
        </div>
      )}

      {/* STEP 3: Order Details (non-editable) & Editable Info */}
      {step === 3 && selectedOrder && (
        <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', border: '1px solid var(--cresoa-border)', padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem', color: 'var(--cresoa-text)' }}>Order Details (Non-Editable)</h3>

          {/* Non-Editable Order Info */}
          <div style={{ border: '1px solid var(--cresoa-border)', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', background: 'var(--cresoa-bg)' }}>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem' }}><strong>Order:</strong> {selectedOrder.title}</p>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem' }}><strong>Price:</strong> {formatMoney(selectedOrder.price)}</p>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem' }}><strong>Quantity:</strong> {selectedOrder.quantity || 1}</p>
            <p style={{ margin: '0', fontSize: '0.9rem' }}><strong>Status:</strong> {selectedOrder.current_status}</p>
          </div>

          {/* Editable: Thank You Note */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--cresoa-text-muted)', display: 'block', marginBottom: '0.2rem' }}>Thank You Note (Editable)</label>
            <textarea
              value={thankYouNote}
              onChange={(e) => setThankYouNote(e.target.value)}
              rows={3}
              placeholder="Thank you for your business!"
              style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)', resize: 'vertical' }}
            />
          </div>

          {/* Editable: Due Date */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--cresoa-text-muted)', display: 'block', marginBottom: '0.2rem' }}>Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)' }}
            />
          </div>

          {/* Editable: Bank Details (Mandatory) */}
          <div style={{ border: '1px solid var(--cresoa-danger)', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
            <strong style={{ color: 'var(--cresoa-danger)', display: 'block', marginBottom: '0.5rem' }}>Bank Details (Required)</strong>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Bank Name"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }}
              />
              <input
                type="text"
                placeholder="Account Number (10 digits)"
                value={accountNumber}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 10) // only digits, max 10
                  setAccountNumber(digits)
                }}
                style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }}
              />
              {accountNumber.length > 0 && !isAccountNumberValid && (
                <p style={{ margin: 0, color: 'var(--cresoa-danger)', fontSize: '0.75rem' }}>Account Number must be exactly 10 digits.</p>
              )}
              <input
                type="text"
                placeholder="Account Name"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }}
              />
            </div>
          </div>

          <button
            onClick={() => setStep(4)}
            disabled={!isBankComplete}
            className="cresoa-primary-button"
            style={{ width: '100%', justifyContent: 'center', opacity: isBankComplete ? 1 : 0.6 }}
          >
            Review Invoice
          </button>
        </div>
      )}

          {/* STEP 4: Review & Save */}
      {step === 4 && (
        <div>
          {/* Invoice Preview */}
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid var(--cresoa-border)', padding: '1.5rem', marginBottom: '1rem', color: '#1a1a1a' }}>
            {/* Header */}
            <div style={{ borderBottom: '2px solid var(--cresoa-accent)', paddingBottom: '0.75rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {business?.logo_url ? (
                  <img src={business.logo_url} alt={business.name} style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '6px' }} />
                ) : (
                  <div style={{ width: '48px', height: '48px', borderRadius: '6px', background: 'var(--cresoa-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
                    {(business?.name || 'B').charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 style={{ margin: 0, color: 'var(--cresoa-primary)', fontSize: '1.2rem', fontWeight: 700 }}>{business?.name || 'Business'}</h2>
                  {business?.location && <p style={{ margin: '2px 0', fontSize: '0.8rem', color: '#666' }}>{business.location}</p>}
                  {business?.phone && <p style={{ margin: '2px 0', fontSize: '0.8rem', color: '#666' }}>{business.phone}</p>}
                  {business?.email && <p style={{ margin: '2px 0', fontSize: '0.8rem', color: '#666' }}>{business.email}</p>}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontWeight: 700 }}>INVOICE</p>
                <p style={{ margin: 0, color: '#666', fontSize: '0.8rem' }}>#TBD</p>
                <p style={{ margin: 0, color: '#666', fontSize: '0.8rem' }}>Issued: {issueDate}</p>
                <p style={{ margin: 0, color: '#666', fontSize: '0.8rem' }}>Due: {dueDate}</p>
              </div>
            </div>

            {/* Bill To */}
            {selectedCustomer && (
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#666', fontWeight: 700 }}>BILL TO</p>
                <p style={{ margin: 0, fontWeight: 600 }}>{selectedCustomer.name || selectedCustomer.first_name}</p>
                {selectedCustomer.phone && <p style={{ margin: 0, color: '#666', fontSize: '0.8rem' }}>{selectedCustomer.phone}</p>}
                {selectedCustomer.email && <p style={{ margin: 0, color: '#666', fontSize: '0.8rem' }}>{selectedCustomer.email}</p>}
              </div>
            )}

            {/* Item Table (Single item from order) */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '1rem' }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Item</th>
                  <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>Qty</th>
                  <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>Price</th>
                  <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                    {selectedOrder.title || 'Order'}
                    {selectedOrder.description && <div style={{ color: '#666', fontSize: '0.75rem' }}>{selectedOrder.description}</div>}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #eee' }}>{selectedOrder.quantity || 1}</td>
                  <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #eee' }}>{formatMoney(selectedOrder.price)}</td>
                  <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #eee', fontWeight: 600 }}>{formatMoney(orderSubtotal)}</td>
                </tr>
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
              <div style={{ width: '200px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span>Subtotal</span><span>{formatMoney(orderSubtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #eee', padding: '8px 0', fontWeight: 700, fontSize: '1.1rem' }}>
                  <span>Total</span><span>{formatMoney(total)}</span>
                </div>
              </div>
            </div>

            {/* Bank Details */}
            {isBankComplete && (
              <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #eee', fontSize: '0.85rem' }}>
                <strong>PAYMENT DETAILS</strong>
                <div>Bank: {bankName} | Acct: {accountNumber} | Name: {accountName}</div>
              </div>
            )}

            {/* Custom Note */}
            {thankYouNote && <p style={{ fontStyle: 'italic', color: '#666', fontSize: '0.85rem' }}>{thankYouNote}</p>}

            {/* Footer */}
            <p style={{ textAlign: 'center', color: '#999', fontSize: '0.7rem', borderTop: '1px solid #eee', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
              Powered by Cresoa — Business management made simple.
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={handleCancel}
              style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer', fontWeight: 600, color: 'var(--cresoa-text)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !isBankComplete || !isAccountNumberValid}
              className="cresoa-primary-button"
              style={{ flex: 1, justifyContent: 'center', opacity: (saving || !isBankComplete || !isAccountNumberValid) ? 0.6 : 1 }}
            >
              {saving ? 'Saving...' : 'Save Invoice'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
                  }
