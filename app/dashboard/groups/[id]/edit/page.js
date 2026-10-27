'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../../../lib/getBusinessId'
// Reusing the edit-order CSS for a consistent look
import './orders/[id]/edit/edit-order.css' 

// ─── EMBEDDED ICONS ───
const SvgIcons = {
  ArrowLeft: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>,
  ChevronDown: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>,
  Search: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  X: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  Trash: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>,
  User: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
}

export default function EditGroupPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const groupId = params.id
  const requestedBusinessId = searchParams.get('business_id')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)
  const [businessId, setBusinessId] = useState(null)
  
  const [customers, setCustomers] = useState([])
  const [formData, setFormData] = useState({
    group_name: '',
    coordinator_customer_id: '',
    due_date: '',
  })

  // UI State
  const [showCoordinatorModal, setShowCoordinatorModal] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', confirmText: '', isDestructive: false, onConfirm: null })
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState('success')

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg)
    setToastType(type)
    setTimeout(() => setToastMessage(''), 3000)
  }

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }

        const bizId = requestedBusinessId || getCurrentBusinessId()
        if (!bizId) { router.push('/dashboard'); return }
        setBusinessId(bizId)

        // Fetch group
        const { data: group, error: groupError } = await supabase
          .from('group_orders')
          .select('*')
          .eq('id', groupId)
          .eq('business_id', bizId)
          .single()

        if (groupError) throw groupError
        setFormData({
          group_name: group.group_name || '',
          coordinator_customer_id: group.coordinator_customer_id || '',
          due_date: group.due_date || '',
        })

        // Fetch customers
        const { data: customersData } = await supabase
          .from('customers')
          .select('id, name, first_name, last_name, phone')
          .eq('business_id', bizId)
          .order('first_name')

        setCustomers((customersData || []).map(c => ({
          ...c,
          display_name: c.name || [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Unnamed'
        })))

      } catch (err) {
        console.error(err)
        setError('Failed to load group.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [groupId, router, requestedBusinessId])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleCoordinatorSelect = (cust) => {
    setFormData(prev => ({ ...prev, coordinator_customer_id: cust.id }))
    setShowCoordinatorModal(false)
    setCustomerSearch('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error: updateError } = await supabase
        .from('group_orders')
        .update({
          group_name: formData.group_name,
          coordinator_customer_id: formData.coordinator_customer_id || null,
          due_date: formData.due_date || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', groupId)
        .eq('business_id', businessId)

      if (updateError) throw updateError

      await supabase.from('business_activity_logs').insert({
        business_id: businessId,
        performed_by: user.id,
        action: 'group_updated',
        details: { group_name: formData.group_name }
      })

      showToast('Group updated successfully')
      router.push(`/dashboard/groups/${groupId}?business_id=${businessId}`)
    } catch (err) {
      console.error(err)
      showToast(err.message || 'Failed to update group.', 'error')
      setSaving(false)
    }
  }

  // ─── CUSTOM DELETE MODAL ───
  const promptDelete = () => {
    setModalConfig({
      isOpen: true,
      title: 'Delete Group',
      message: 'Are you sure you want to delete this group? All linked orders will be unassigned from this group, but the orders themselves will NOT be deleted.',
      confirmText: 'Delete Group',
      isDestructive: true,
      onConfirm: async () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }))
        setDeleting(true)
        
        try {
          const { data: { user } } = await supabase.auth.getUser()
          
          // Unlink orders
          await supabase.from('orders').update({ group_order_id: null }).eq('group_order_id', groupId)

          // Delete group
          const { error } = await supabase.from('group_orders').delete().eq('id', groupId).eq('business_id', businessId)
          if (error) throw error

          await supabase.from('business_activity_logs').insert({
            business_id: businessId,
            performed_by: user.id,
            action: 'group_deleted',
            details: { id: groupId }
          })

          showToast('Group deleted successfully')
          router.push(`/dashboard/groups?business_id=${businessId}`)
        } catch (err) {
          console.error(err)
          showToast('Failed to delete group.', 'error')
          setDeleting(false)
        }
      }
    })
  }

  const selectedCoordinator = useMemo(() => customers.find(c => c.id === formData.coordinator_customer_id), [customers, formData.coordinator_customer_id])
  const filteredCustomers = useMemo(() => {
    const q = customerSearch.toLowerCase()
    return customers.filter(c => c.display_name.toLowerCase().includes(q) || c.phone?.includes(q)).slice(0, 10)
  }, [customers, customerSearch])

  if (loading) return <div className="order-page-loading"><div className="spinner" /></div>
  if (error) return <div className="order-page-error"><h2>Error</h2><p>{error}</p><button onClick={() => window.location.reload()} className="cresoa-primary-button">Retry</button></div>

  return (
    <div className="edit-order-page">
      <div className="edit-header">
        <div>
          <button onClick={() => router.back()} className="order-back-btn" style={{ margin: 0, marginBottom: '8px' }}>
            <SvgIcons.ArrowLeft /> Cancel
          </button>
          <h1 className="edit-title">Edit Group</h1>
          <p className="edit-subtitle">Update the group details below.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="edit-card">
          <div className="form-group">
            <label className="order-label">Group Name *</label>
            <input
              type="text"
              name="group_name"
              value={formData.group_name}
              onChange={handleChange}
              required
              className="order-input"
              placeholder="Enter group name"
            />
          </div>

          <div className="form-group">
            <label className="order-label">Coordinator</label>
            <button 
              type="button" 
              className="order-input" 
              onClick={() => setShowCoordinatorModal(true)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            >
              <span style={{ color: selectedCoordinator ? 'var(--cresoa-text)' : 'var(--cresoa-text-muted)' }}>
                {selectedCoordinator ? selectedCoordinator.display_name : 'Select a coordinator (optional)'}
              </span>
              <SvgIcons.ChevronDown />
            </button>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="order-label">Event Due Date</label>
            <input
              type="date"
              name="due_date"
              value={formData.due_date}
              onChange={handleChange}
              className="order-input"
            />
          </div>
        </div>

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

      {/* CUSTOMER SELECT MODAL (For Coordinator) */}
      {showCoordinatorModal && (
        <div className="app-modal-overlay" onClick={() => setShowCoordinatorModal(false)}>
          <div className="app-modal-box" onClick={e => e.stopPropagation()} style={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Select Coordinator</h2>
              <button onClick={() => setShowCoordinatorModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}><SvgIcons.X /></button>
            </div>

            <div className="orders-search-wrapper" style={{ marginBottom: '1rem' }}>
              <span className="search-icon"><SvgIcons.Search /></span>
              <input type="text" className="orders-search-input" placeholder="Search by name or phone" value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} autoFocus />
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div 
                onClick={() => { setFormData(prev => ({ ...prev, coordinator_customer_id: '' })); setShowCoordinatorModal(false) }} 
                className="member-dense-row" 
                style={{ padding: '12px', marginBottom: '8px', border: '1px solid var(--cresoa-border)', borderRadius: '10px', cursor: 'pointer' }}
              >
                <div className="member-avatar" style={{ background: 'var(--cresoa-surface-soft)', color: 'var(--cresoa-text-muted)' }}><SvgIcons.X /></div>
                <div className="member-info">
                  <span className="member-name">No Coordinator</span>
                  <span className="member-item">Remove coordinator from this group</span>
                </div>
              </div>

              {filteredCustomers.map(c => (
                <div key={c.id} onClick={() => handleCoordinatorSelect(c)} className="member-dense-row" style={{ padding: '12px', marginBottom: '8px', border: '1px solid var(--cresoa-border)', borderRadius: '10px', cursor: 'pointer' }}>
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

      {/* CUSTOM DELETE MODAL */}
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
