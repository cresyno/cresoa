import { useClientSearchParams as useSearchParams } from '../../../lib/useClientSearchParams';
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../../lib/getBusinessId'
import { MeasurementForm } from '../../../../components/MeasurementForm'
import '../../../globals.css'

const STEPS = [
  { id: 1, label: 'Customer' },
  { id: 2, label: 'Garment' },
  { id: 3, label: 'Measurements' },
  { id: 4, label: 'Payment' },
  { id: 5, label: 'Review' },
]

const INITIAL_FORM = {
  customer_id: '',
  customer_name: '',
  customer_phone: '',
  customer_email: '',
  title: '',
  category: '',
  quantity: '1',
  fabric: '',
  notes: '',
  customer_notes: '',
  measurements: {},
  fitting_date: '',
  event_date: '',
  delivery_date: '',
  price: '',
  amount_paid: '',
}

const CATEGORIES = ['Senator', 'Agbada', 'Kaftan', 'Native wear', 'Suit', 'Dress', 'Skirt', 'Trousers', 'Shirt', 'Other']

// ─── EMBEDDED ICONS ───
const SvgIcons = {
  ArrowLeft: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>,
  Search: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  X: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  ChevronDown: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>,
  User: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  CheckCircle: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>,
  Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
}

export default function NewOrderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = getCurrentBusinessId() || searchParams.get('business_id')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [customers, setCustomers] = useState([])
  
  // Wizard State
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState(INITIAL_FORM)
  
  // UI State
  const [showCategoryMenu, setShowCategoryMenu] = useState(false)
  
  // Customer Inline Selection State
  const [isSelectingCustomer, setIsSelectingCustomer] = useState(true)
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [newCustName, setNewCustName] = useState('')
  const [newCustPhone, setNewCustPhone] = useState('')
  const [savingCustomer, setSavingCustomer] = useState(false)

  // Custom UI State
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', confirmText: '', onConfirm: null })
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState('success')

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg)
    setToastType(type)
    setTimeout(() => setToastMessage(''), 3000)
  }

  // ─── Data Loading ───
  useEffect(() => {
    if (!businessId) { router.push('/dashboard'); return }
    const loadCustomers = async () => {
      try {
        const { data } = await supabase
          .from('customers')
          .select('id, first_name, last_name, name, phone, email, measurements')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false })
        
        setCustomers((data || []).map(c => ({
          ...c,
          name: c.name || [c.first_name, c.last_name].filter(Boolean).join(' ')
        })))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadCustomers()
  }, [businessId, router])

  // ─── Derived Data ───
  const selectedCustomer = useMemo(() => customers.find(c => c.id === formData.customer_id), [customers, formData.customer_id])
  
  // LOADS ALL CUSTOMERS, NO SLICE
  const filteredCustomers = useMemo(() => {
    const q = customerSearch.toLowerCase()
    return customers.filter(c => 
      c.name?.toLowerCase().includes(q) || 
      c.phone?.includes(q)
    )
  }, [customers, customerSearch])
  
  const remainingBalance = Math.max((Number(formData.price) || 0) - (Number(formData.amount_paid) || 0), 0)

  // ─── Handlers ───
  const updateField = (name, value) => setFormData(prev => ({ ...prev, [name]: value }))

  const handleCustomerSelect = (customer) => {
    setFormData(prev => ({
      ...prev,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_phone: customer.phone || '',
      customer_email: customer.email || '',
      measurements: customer.measurements || {} 
    }))
    setIsSelectingCustomer(false)
    setCustomerSearch('')
  }

  const handleQuickAddCustomer = async () => {
    if (!newCustName.trim() || !newCustPhone.trim()) {
      showToast('Name and phone number are required.', 'error')
      return
    }
    setSavingCustomer(true)
    try {
      const names = newCustName.trim().split(/\s+/)
      const firstName = names.shift() || ''
      const lastName = names.join(' ') || firstName

      const { data: newCustomer, error } = await supabase
        .from('customers')
        .insert({
          business_id: businessId,
          first_name: firstName,
          last_name: lastName,
          name: newCustName.trim(),
          phone: newCustPhone.trim(),
        })
        .select('*')
        .single()
      
      if (error) throw error

      const formattedCustomer = {
        ...newCustomer,
        name: newCustomer.name || newCustName.trim()
      }
      setCustomers(prev => [formattedCustomer, ...prev])
      
      handleCustomerSelect(formattedCustomer)
      showToast('Customer created and selected')
      
      setNewCustName('')
      setNewCustPhone('')
      setIsCreatingCustomer(false)
    } catch (err) {
      showToast('Failed to create customer.', 'error')
    } finally {
      setSavingCustomer(false)
    }
  }

  const validateStep = () => {
    if (step === 1 && !formData.customer_id) {
      showToast('Please select a customer.', 'error'); return false
    }
    if (step === 2 && (!formData.title.trim() || !formData.category)) {
      showToast('Please enter the order name and category.', 'error'); return false
    }
    if (step === 4) {
      const price = Number(formData.price)
      const paid = Number(formData.amount_paid) || 0
      if (!price || price <= 0) { showToast('Please enter a valid total price.', 'error'); return false }
      if (paid > price) { showToast('Deposit cannot exceed the total price.', 'error'); return false }
    }
    return true
  }

  const handleNext = () => {
    if (validateStep()) setStep(prev => Math.min(prev + 1, STEPS.length))
  }

  const handleBack = () => {
    if (step === 1 && !isSelectingCustomer) {
      setIsSelectingCustomer(true)
      return
    }
    setStep(prev => Math.max(prev - 1, 1))
  }

  // ─── Submit ───
  const promptSubmit = () => {
    if (!validateStep()) return
    setModalConfig({
      isOpen: true,
      title: 'Create Order',
      message: `Are you sure you want to create this order for ${formData.customer_name} with a balance of ₦${remainingBalance.toLocaleString('en-NG')}?`,
      confirmText: 'Confirm & Create',
      onConfirm: async () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }))
        setSaving(true)
        try {
          let customerId = formData.customer_id

          // Sync measurements to customer
          if (customerId && Object.keys(formData.measurements).length > 0) {
            await supabase.from('customers').update({ measurements: formData.measurements }).eq('id', customerId)
          }

          const orderPayload = {
            business_id: businessId,
            customer_id: customerId,
            title: formData.title.trim(),
            description: formData.notes.trim() || null,
            price: Number(formData.price) || 0,
            amount_paid: Number(formData.amount_paid) || 0,
            current_status: 'Order placed',
            due_date: formData.delivery_date || null,
            category: formData.category,
            quantity: Number(formData.quantity) || 1,
            fabric: formData.fabric.trim() || null,
            fitting_date: formData.fitting_date || null,
            event_date: formData.event_date || null,
            delivery_date: formData.delivery_date || null,
            measurements: formData.measurements || {},
            customer_notes: formData.customer_notes.trim() || null,
            notes: formData.notes.trim() || null,
            updated_at: new Date().toISOString()
          }

          const { data: order, error: orderError } = await supabase.from('orders').insert(orderPayload).select('id').single()
          if (orderError) throw orderError

          const { data: { user } } = await supabase.auth.getUser()
          await supabase.from('business_activity_logs').insert({ business_id: businessId, performed_by: user?.id, action: 'order_created', details: { title: formData.title } })

          showToast('Order created successfully')
          router.push(`/dashboard/orders/${order.id}?business_id=${businessId}`)
          
        } catch (err) {
          showToast(err.message || 'Failed to create order.', 'error')
          setSaving(false)
        }
      }
    })
  }

  if (loading) return <div className="order-page-loading"><div className="spinner" /></div>

  return (
    <div className="wizard-page">
      {/* ─── HEADER & PROGRESS ─── */}
      <div className="wizard-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <button onClick={() => router.back()} className="order-back-btn" style={{ margin: 0 }}>
            <SvgIcons.ArrowLeft /> Cancel
          </button>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)' }}>Step {step} of {STEPS.length}</span>
        </div>
        
        <div className="wizard-progress-bar">
          {STEPS.map((s, idx) => (
            <div key={s.id} className={`wizard-progress-segment ${idx + 1 <= step ? 'active' : ''}`} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--cresoa-text-muted)' }}>
          <span>{STEPS[step - 1].label}</span>
          <span>{Math.round(((step - 1) / (STEPS.length - 1)) * 100)}% Complete</span>
        </div>
      </div>

      {/* ─── SCROLLABLE CONTENT ─── */}
      <div className="wizard-content">
        
        {/* STEP 1: CUSTOMER (Inline Selection) */}
        {step === 1 && (
          <div className="wizard-step">
            
            {/* 1A: CUSTOMER SELECTED */}
            {!isSelectingCustomer && !isCreatingCustomer && selectedCustomer ? (
              <>
                <h2 className="wizard-title">Customer Selected</h2>
                <p className="wizard-subtitle">This order will be created for this customer.</p>

                <div className="customer-selected-card">
                  <div className="customer-card-avatar">{formData.customer_name.charAt(0).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{formData.customer_name}</h3>
                    <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: 'var(--cresoa-text-muted)' }}>{formData.customer_phone || 'No phone number'}</p>
                  </div>
                  <button onClick={() => setIsSelectingCustomer(true)} className="order-btn-secondary">Change</button>
                </div>
              </>
            ) : null}

            {/* 1B: CREATING NEW CUSTOMER */}
            {isCreatingCustomer ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <button onClick={() => setIsCreatingCustomer(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text)', padding: 0 }}>
                    <SvgIcons.ArrowLeft />
                  </button>
                  <h2 className="wizard-title" style={{ margin: 0 }}>New Customer</h2>
                </div>
                <p className="wizard-subtitle">Add basic details now. Measurements can be added later.</p>

                <div className="form-group">
                  <label className="order-label">Full Name *</label>
                  <input type="text" className="order-input" placeholder="Enter customer's full name" value={newCustName} onChange={e => setNewCustName(e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="order-label">Phone Number *</label>
                  <input type="tel" className="order-input" placeholder="Enter phone number" value={newCustPhone} onChange={e => setNewCustPhone(e.target.value)} />
                </div>

                <button onClick={handleQuickAddCustomer} disabled={savingCustomer} className="cresoa-primary-button" style={{ padding: '14px', marginTop: '16px' }}>
                  {savingCustomer ? 'Saving...' : 'Save & Select Customer'}
                </button>
              </>
            ) : null}

            {/* 1C: SELECTING FROM LIST */}
            {isSelectingCustomer && !isCreatingCustomer ? (
              <>
                <h2 className="wizard-title">Who is this order for?</h2>
                <p className="wizard-subtitle">Select an existing customer or add a new one.</p>

                <div className="orders-search-wrapper" style={{ marginBottom: '16px' }}>
                  <span className="search-icon"><SvgIcons.Search /></span>
                  {/* NO AUTO FOCUS */}
                  <input 
                    type="text" 
                    className="orders-search-input" 
                    placeholder="Search by name or phone" 
                    value={customerSearch} 
                    onChange={e => setCustomerSearch(e.target.value)} 
                  />
                  {customerSearch && (
                    <button className="search-clear-btn" onClick={() => setCustomerSearch('')}>
                      <SvgIcons.X />
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '20px' }}>
                  {filteredCustomers.map(c => (
                    <div 
                      key={c.id} 
                      onClick={() => handleCustomerSelect(c)} 
                      className="member-dense-row" 
                      style={{ padding: '12px', border: '1px solid var(--cresoa-border)', borderRadius: '10px', cursor: 'pointer', background: 'var(--cresoa-surface)' }}
                    >
                      <div className="member-avatar">{c.name?.charAt(0).toUpperCase()}</div>
                      <div className="member-info">
                        <span className="member-name">{c.name}</span>
                        <span className="member-item">{c.phone || 'No phone number'}</span>
                      </div>
                    </div>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <p style={{ textAlign: 'center', color: 'var(--cresoa-text-muted)', marginTop: '20px' }}>No customers found.</p>
                  )}
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--cresoa-border)' }}>
                  <button onClick={() => setIsCreatingCustomer(true)} className="cresoa-primary-button full-width" style={{ padding: '14px', background: 'var(--cresoa-surface-soft)', color: 'var(--cresoa-text)' }}>
                    <SvgIcons.Plus /> Create New Customer
                  </button>
                </div>
              </>
            ) : null}

          </div>
        )}

        {/* STEP 2: GARMENT */}
        {step === 2 && (
          <div className="wizard-step">
            <h2 className="wizard-title">Garment Details</h2>
            <p className="wizard-subtitle">What are you making for {formData.customer_name}?</p>

            <div className="form-group">
              <label className="order-label">Order Name *</label>
              <input type="text" className="order-input" value={formData.title} onChange={e => updateField('title', e.target.value)} placeholder="Enter a name for this order" />
            </div>

            <div className="form-group" style={{ position: 'relative' }}>
              <label className="order-label">Garment Category *</label>
              <button className="order-input" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }} onClick={() => setShowCategoryMenu(!showCategoryMenu)}>
                <span style={{ color: formData.category ? 'var(--cresoa-text)' : 'var(--cresoa-text-muted)' }}>{formData.category || 'Select a category'}</span>
                <SvgIcons.ChevronDown />
              </button>
              
              {showCategoryMenu && (
                <div className="custom-dropdown-menu" style={{ top: '100%', marginTop: '4px', zIndex: 100 }}>
                  {CATEGORIES.map(cat => (
                    <button key={cat} className={`custom-dropdown-item ${formData.category === cat ? 'active' : ''}`} onClick={() => { updateField('category', cat); setShowCategoryMenu(false) }}>
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="order-label">Quantity</label>
                <input type="number" className="order-input" value={formData.quantity} onChange={e => updateField('quantity', e.target.value)} placeholder="Enter quantity" min="1" />
              </div>
              <div className="form-group">
                <label className="order-label">Fabric</label>
                <input type="text" className="order-input" value={formData.fabric} onChange={e => updateField('fabric', e.target.value)} placeholder="Enter fabric type" />
              </div>
            </div>

            <div className="form-group">
              <label className="order-label">Design Notes</label>
              <textarea className="order-input" rows={3} value={formData.notes} onChange={e => updateField('notes', e.target.value)} placeholder="Enter style, embroidery, or special instructions" />
            </div>
          </div>
        )}

        {/* STEP 3: MEASUREMENTS */}
          {step === 3 && (
          <div className="wizard-step">
            <h2 className="wizard-title">Measurements</h2>
            <p className="wizard-subtitle">Enter the sizing details for this order.</p>

            {selectedCustomer?.measurements && Object.keys(selectedCustomer.measurements).length > 0 && (
              <button onClick={() => updateField('measurements', { ...selectedCustomer.measurements })} className="import-meas-btn">
                <SvgIcons.CheckCircle />
                <div style={{ textAlign: 'left' }}>
                  <span style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem' }}>Import Saved Measurements</span>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--cresoa-text-muted)' }}>Use {formData.customer_name}'s profile</span>
                </div>
              </button>
            )}

            <div className="order-card" style={{ padding: '0' }}>
              <MeasurementForm measurements={formData.measurements} onChange={(updated) => updateField('measurements', updated)} showNotes={false} label="" />
            </div>
          </div>
        )}

        {/* STEP 4: DATES & PAYMENT */}
        {step === 4 && (
          <div className="wizard-step">
            <h2 className="wizard-title">Dates & Payment</h2>
            <p className="wizard-subtitle">Set the deadlines and agree the financials.</p>

            <div className="form-group">
              <label className="order-label">Delivery Date</label>
              <input type="date" className="order-input" value={formData.delivery_date} onChange={e => updateField('delivery_date', e.target.value)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '1rem' }}>
              <div className="form-group">
                <label className="order-label">Total Price (₦) *</label>
                <input type="number" className="order-input" value={formData.price} onChange={e => updateField('price', e.target.value)} placeholder="Enter total price" />
              </div>
              <div className="form-group">
                <label className="order-label">Deposit Paid (₦)</label>
                <input type="number" className="order-input" value={formData.amount_paid} onChange={e => updateField('amount_paid', e.target.value)} placeholder="Enter deposit paid" />
              </div>
            </div>

            <div className="payment-summary-box">
              <span>Balance Due</span>
              <strong style={{ color: remainingBalance > 0 ? 'var(--color-danger)' : 'var(--color-secondary)' }}>
                ₦{remainingBalance.toLocaleString('en-NG')}
              </strong>
            </div>
          </div>
        )}

        {/* STEP 5: REVIEW */}
        {step === 5 && (
          <div className="wizard-step">
            <h2 className="wizard-title">Review Order</h2>
            <p className="wizard-subtitle">Confirm the details before creating the order.</p>

            <div className="order-card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--cresoa-border)', paddingBottom: '12px', marginBottom: '12px' }}>
                <div className="customer-card-avatar">{formData.customer_name.charAt(0).toUpperCase()}</div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{formData.customer_name}</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: 'var(--cresoa-text-muted)' }}>{formData.customer_phone || 'No phone'}</p>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem' }}>
                <div><span style={{ color: 'var(--cresoa-text-muted)' }}>Garment:</span> <br/><strong>{formData.title}</strong></div>
                <div><span style={{ color: 'var(--cresoa-text-muted)' }}>Category:</span> <br/><strong>{formData.category}</strong></div>
                <div><span style={{ color: 'var(--cresoa-text-muted)' }}>Delivery:</span> <br/><strong>{formData.delivery_date || 'Not set'}</strong></div>
                <div><span style={{ color: 'var(--cresoa-text-muted)' }}>Quantity:</span> <br/><strong>{formData.quantity}</strong></div>
                <div style={{ gridColumn: '1 / -1', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid var(--cresoa-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--cresoa-text-muted)' }}>Total Price:</span>
                    <strong>₦{Number(formData.price).toLocaleString('en-NG')}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ color: 'var(--cresoa-text-muted)' }}>Deposit:</span>
                    <strong>₦{Number(formData.amount_paid || 0).toLocaleString('en-NG')}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed var(--cresoa-border)', fontWeight: 800 }}>
                    <span>Balance Due:</span>
                    <span style={{ color: remainingBalance > 0 ? 'var(--color-danger)' : 'var(--color-secondary)' }}>₦{remainingBalance.toLocaleString('en-NG')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── FIXED BOTTOM NAVIGATION ─── */}
      <div className="wizard-footer">
        {step > 1 || isSelectingCustomer === false ? (
          <button onClick={handleBack} className="order-btn-secondary" style={{ flex: 1, padding: '14px' }}>Back</button>
        ) : <div style={{ flex: 1 }} />}
        
        {step < STEPS.length ? (
          <button onClick={handleNext} className="cresoa-primary-button" style={{ flex: 2, padding: '14px' }}>
            Continue
          </button>
        ) : (
          <button onClick={promptSubmit} disabled={saving} className="cresoa-primary-button" style={{ flex: 2, padding: '14px' }}>
            {saving ? 'Creating...' : 'Create Order'}
          </button>
        )}
      </div>

      {/* ─── CONFIRM MODAL ─── */}
      {modalConfig.isOpen && (
        <div className="app-modal-overlay" onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}>
          <div className="app-modal-box" onClick={e => e.stopPropagation()}>
            <h3 className="app-modal-title">{modalConfig.title}</h3>
            <p className="app-modal-message">{modalConfig.message}</p>
            <div className="app-modal-actions">
              <button className="app-modal-btn cancel" onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}>Cancel</button>
              <button className="app-modal-btn confirm" onClick={modalConfig.onConfirm}>{modalConfig.confirmText}</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TOAST ─── */}
      {toastMessage && (
        <div className={`app-toast ${toastType}`}>
          {toastMessage}
        </div>
      )}

    </div>
  )
                               }
