import { useClientSearchParams as useSearchParams } from '../../../../lib/useClientSearchParams';

export async function generateStaticParams() {
  return [{ slug: "default", id: "default" }];
}
'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../../../lib/getBusinessId'
import { Navigation } from '../../../../../components/Navigation'
import { MeasurementForm } from '../../../../../components/MeasurementForm'
import './edit-order.css' // <-- New specific CSS file

// ─── EMBEDDED ICONS (No Emojis) ───
const SvgIcons = {
  ArrowLeft: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>,
  ChevronDown: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>,
  Search: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  X: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  Trash: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>,
  Check: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
}

export default function EditOrderPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const orderId = params.id
  const businessId = getCurrentBusinessId() || searchParams.get('business_id')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)
  
  const [customers, setCustomers] = useState([])
  const [order, setOrder] = useState(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const statusMenuRef = useRef(null)

  // Custom UI State
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', confirmText: '', isDestructive: false, onConfirm: null })
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState('success')

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg)
    setToastType(type)
    setTimeout(() => setToastMessage(''), 3000)
  }

  const [formData, setFormData] = useState({
    customer_id: '',
    title: '',
    price: '',
    amount_paid: '',
    due_date: '',
    current_status: 'Order placed',
    notes: '',
    measurements: {},
  })

  const STATUS_OPTIONS = ['Order placed', 'Cutting', 'Sewing', 'Ready', 'Delivered']

  useEffect(() => {
    function handleClickOutside(event) {
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target)) {
        setShowStatusMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const load = async () => {
      if (!businessId || !orderId) { router.push('/dashboard'); return }

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }

        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .eq('business_id', businessId)
          .single()

        if (orderError) throw orderError
        setOrder(orderData)

        setFormData({
          customer_id: orderData.customer_id || '',
          title: orderData.title || '',
          price: orderData.price || '',
          amount_paid: orderData.amount_paid || '',
          due_date: orderData.due_date || '',
          current_status: orderData.current_status || 'Order placed',
          notes: orderData.notes || '',
          measurements: orderData.measurements || {},
        })

        const { data: custData } = await supabase
          .from('customers')
          .select('id, name, first_name, last_name, phone, email')
          .eq('business_id', businessId)
          .order('first_name')

        setCustomers((custData || []).map(c => ({
          ...c,
          display_name: c.name || [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Unnamed'
        })))

      } catch (err) {
        setError('Failed to load order.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [orderId, businessId])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError(null)
  }

  const handleCustomerSelect = (cust) => {
    setFormData(prev => ({ ...prev, customer_id: cust.id }))
    setShowCustomerModal(false)
    setCustomerSearch('')
  }

  const handleStatusSelect = (status) => {
    setFormData(prev => ({ ...prev, current_status: status }))
    setShowStatusMenu(false)
  }

  const promptDelete = () => {
    setModalConfig({
      isOpen: true,
      title: 'Delete Order',
      message: 'Are you sure you want to delete this order? This action cannot be undone.',
      confirmText: 'Delete Order',
      isDestructive: true,
      onConfirm: async () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }))
        setDeleting(true)
        try {
          const { data: { session } } = await supabase.auth.getSession()
          const response = await fetch(`/api/orders/${orderId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          })
          if (!response.ok) throw new Error('Failed to delete order')
          router.push(`/dashboard/orders?business_id=${businessId}`)
          showToast('Order deleted successfully')
        } catch (err) {
          showToast('Failed to delete order', 'error')
          setDeleting(false)
        }
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const payload = {
        customer_id: formData.customer_id || null,
        title: formData.title,
        price: parseFloat(formData.price) || 0,
        amount_paid: parseFloat(formData.amount_paid) || 0,
        due_date: formData.due_date || null,
        current_status: formData.current_status,
        notes: formData.notes || null,
        measurements: formData.measurements || {},
        updated_at: new Date().toISOString()
      }

      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify(payload)
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to update order')

      showToast('Order updated successfully')
      router.push(`/dashboard/orders/${orderId}?business_id=${businessId}`)

    } catch (err) {
      setError(err.message || 'Failed to update order.')
      setSaving(false)
    }
  }

  const selectedCustomer = useMemo(() => customers.find(c => c.id === formData.customer_id), [customers, formData.customer_id])
  const remainingBalance = useMemo(() => Math.max((Number(formData.price) || 0) - (Number(formData.amount_paid) || 0), 0), [formData.price, formData.amount_paid])
  
  const filteredCustomers = useMemo(() => {
    const q = customerSearch.toLowerCase()
    return customers.filter(c => c.display_name.toLowerCase().includes(q) || c.phone?.includes(q)).slice(0, 10)
  }, [customers, customerSearch])

  if (loading) return <div className="order-page-loading"><div className="spinner" /></div>
  if (error && !order) return <div className="order-page-error"><h2>Couldn't load order</h2><button onClick={() => window.location.reload()} className="cresoa-primary-button">Retry</button></div>
  if (!order) return null

  return (
    <div className="edit-order-page">
      <Navigation businessId={businessId} />

      <div className="edit-header">
        <div>
          <button onClick={() => router.push(`/dashboard/orders/${orderId}?business_id=${businessId}`)} className="order-back-btn" style={{ margin: 0, marginBottom: '8px' }}>
            <SvgIcons.ArrowLeft /> Back to Order
          </button>
          <h1 className="edit-title">Edit Order</h1>
          <p className="edit-subtitle">Update details for #{orderId.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* CUSTOMER */}
        <div className="edit-card">
          <h3 className="edit-section-title">Customer</h3>
          <div className="edit-form-group" style={{ marginBottom: 0 }}>
            <button 
              type="button" 
              className="edit-input" 
              onClick={() => setShowCustomerModal(true)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            >
              <span style={{ color: selectedCustomer ? 'var(--cresoa-text)' : 'var(--cresoa-text-muted)' }}>
                {selectedCustomer ? selectedCustomer.display_name : 'Select a customer'}
              </span>
              <SvgIcons.ChevronDown />
            </button>
          </div>
        </div>

        {/* ORDER DETAILS */}
        <div className="edit-card">
          <h3 className="edit-section-title">Order Details</h3>
          
          <div className="edit-form-group">
            <label className="edit-label">Garment Name</label>
            <input type="text" name="title" value={formData.title} onChange={handleChange} required className="edit-input" placeholder="Enter order name" />
          </div>

          <div className="edit-finance-grid">
            <div className="edit-form-group">
              <label className="edit-label">Total Price (₦)</label>
              <input type="number" name="price" value={formData.price} onChange={handleChange} required min="0" className="edit-input" placeholder="Enter total price" />
            </div>
            <div className="edit-form-group">
              <label className="edit-label">Deposit Paid (₦)</label>
              <input type="number" name="amount_paid" value={formData.amount_paid} onChange={handleChange} min="0" className="edit-input" placeholder="Enter deposit paid" />
            </div>
          </div>

          <div className="edit-balance-box">
            <span>Balance Due</span>
            <span style={{ color: remainingBalance > 0 ? 'var(--color-danger)' : 'var(--color-secondary)' }}>
              ₦{remainingBalance.toLocaleString('en-NG')}
            </span>
          </div>
        </div>

        {/* DATES & STATUS */}
        <div className="edit-card">
          <h3 className="edit-section-title">Dates & Status</h3>
          
          <div className="edit-form-group">
            <label className="edit-label">Due Date</label>
            <input type="date" name="due_date" value={formData.due_date} onChange={handleChange} className="edit-input" />
          </div>

          <div className="edit-form-group" ref={statusMenuRef}>
            <label className="edit-label">Production Status</label>
            <div className="custom-dropdown-wrapper">
              <button type="button" className="custom-dropdown-btn" onClick={() => setShowStatusMenu(!showStatusMenu)}>
                {formData.current_status}
                <SvgIcons.ChevronDown />
              </button>
              {showStatusMenu && (
                <div className="custom-dropdown-menu">
                  {STATUS_OPTIONS.map(opt => (
                    <button type="button" key={opt} className={`custom-dropdown-item ${formData.current_status === opt ? 'active' : ''}`} onClick={() => handleStatusSelect(opt)}>
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MEASUREMENTS */}
        <div className="edit-card">
          <h3 className="edit-section-title">Measurements</h3>
          <MeasurementForm
            measurements={formData.measurements || {}}
            onChange={(updated) => setFormData(prev => ({ ...prev, measurements: updated }))}
            showNotes={false}
            label=""
          />
        </div>

        {/* NOTES */}
        <div className="edit-card">
          <h3 className="edit-section-title">Private Notes</h3>
          <textarea name="notes" value={formData.notes} onChange={handleChange} rows={4} className="edit-input" placeholder="Add private notes for your team..." />
        </div>

        {/* ERROR MESSAGE */}
        {error && (
          <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--color-danger-soft)', color: 'var(--color-danger)', marginBottom: '16px', fontWeight: 600 }}>
            {error}
          </div>
        )}

      </form>

      {/* FIXED FOOTER */}
      <div className="edit-fixed-footer">
        <button type="button" onClick={promptDelete} disabled={deleting} className="btn-delete-edit">
          <SvgIcons.Trash />
        </button>
        <button type="button" onClick={handleSubmit} disabled={saving} className="cresoa-primary-button btn-save-edit">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* CUSTOMER SELECT MODAL */}
      {showCustomerModal && (
        <div className="app-modal-overlay" onClick={() => setShowCustomerModal(false)}>
          <div className="app-modal-box" onClick={e => e.stopPropagation()} style={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Select Customer</h2>
              <button onClick={() => setShowCustomerModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}><SvgIcons.X /></button>
            </div>

            <div className="orders-search-wrapper" style={{ marginBottom: '1rem' }}>
              <span className="search-icon"><SvgIcons.Search /></span>
              <input type="text" className="orders-search-input" placeholder="Search by name or phone" value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} autoFocus />
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filteredCustomers.map(c => (
                <div key={c.id} onClick={() => handleCustomerSelect(c)} className="member-dense-row" style={{ padding: '12px', marginBottom: '8px', border: '1px solid var(--cresoa-border)', borderRadius: '10px' }}>
                  <div className="member-avatar">{c.display_name.charAt(0).toUpperCase()}</div>
                  <div className="member-info">
                    <span className="member-name">{c.display_name}</span>
                    <span className="member-item">{c.phone || 'No phone number'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM MODAL (Delete Confirmation) */}
      {modalConfig.isOpen && (
        <div className="app-modal-overlay" onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}>
          <div className="app-modal-box" onClick={e => e.stopPropagation()}>
            <h3 className="app-modal-title">{modalConfig.title}</h3>
            <p className="app-modal-message">{modalConfig.message}</p>
            <div className="app-modal-actions">
              <button className="app-modal-btn cancel" onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}>Cancel</button>
              <button className={`app-modal-btn confirm ${modalConfig.isDestructive ? 'destructive' : ''}`} onClick={modalConfig.onConfirm}>{modalConfig.confirmText}</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toastMessage && (
        <div className={`app-toast ${toastType}`}>
          {toastMessage}
        </div>
      )}

    </div>
  )
    }
