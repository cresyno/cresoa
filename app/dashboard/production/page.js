'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../lib/getBusinessId'
import { Navigation } from '../../../components/Navigation'
import { ProductionPipeline } from '../../../components/ProductionPipeline'
import { StatusPill } from '../../../components/StatusPill'
import '../../globals.css'

const STAGES = ['Order placed', 'Cutting', 'Sewing', 'Ready', 'Delivered']

// ─── EMBEDDED ICONS ───
const SvgIcons = {
  Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  Alert: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
  Eye: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
  Check: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  X: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  Package: () => <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.91 8.84L12 13 3.09 8.84" /><line x1="12" y1="22" x2="12" y2="13" /><line x1="2" y1="4" x2="12" y2="9" /><line x1="22" y1="4" x2="12" y2="9" /></svg>
}

function money(value) { return `₦${Number(value || 0).toLocaleString('en-NG')}` }
function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ProductionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = getCurrentBusinessId() || searchParams.get('business_id')

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedStage, setSelectedStage] = useState(null)
  
  // Custom UI State
  const [statusOrder, setStatusOrder] = useState(null) // Order being updated
  const [selectedStatus, setSelectedStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState('success')

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg)
    setToastType(type)
    setTimeout(() => setToastMessage(''), 3000)
  }

  const loadOrders = async () => {
    if (!businessId) return
    setLoading(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data, error: fetchError } = await supabase
        .from('orders')
        .select(`*, customers (name, first_name, last_name, phone)`)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setOrders(data || [])
    } catch (err) {
      setError('Could not load production data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadOrders() }, [businessId])

  const productionOrders = useMemo(() => orders.filter(o => o.current_status !== 'Delivered'), [orders])
  
  const overdueOrders = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return productionOrders.filter(o => {
      if (!o.due_date) return false
      const due = new Date(o.due_date); due.setHours(0, 0, 0, 0)
      return due < today
    })
  }, [productionOrders])

  const dueTodayOrders = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return productionOrders.filter(o => {
      if (!o.due_date) return false
      const due = new Date(o.due_date); due.setHours(0, 0, 0, 0)
      return due.getTime() === today.getTime()
    })
  }, [productionOrders])

  const stageCounts = useMemo(() => {
    const counts = {}
    STAGES.forEach(s => counts[s] = 0)
    orders.forEach(o => { if (counts[o.current_status] !== undefined) counts[o.current_status]++ })
    return counts
  }, [orders])

  const filteredOrders = useMemo(() => {
    if (!selectedStage) return productionOrders
    return productionOrders.filter(o => o.current_status === selectedStage)
  }, [productionOrders, selectedStage])

  const handleStageClick = (stage) => setSelectedStage(prev => prev === stage ? null : stage)

  // ─── Status Update Logic ───
  const openStatusModal = (order) => {
    setStatusOrder(order)
    setSelectedStatus(order.current_status || 'Order placed')
  }

  const handleStatusUpdate = async () => {
    if (!statusOrder || !selectedStatus) return
    setSaving(true)
    try {
      const { error } = await supabase.from('orders').update({ current_status: selectedStatus }).eq('id', statusOrder.id).eq('business_id', businessId)
      if (error) throw error
      
      setOrders(prev => prev.map(o => o.id === statusOrder.id ? { ...o, current_status: selectedStatus } : o))
      showToast(`Status updated to ${selectedStatus}`)
      setStatusOrder(null)
    } catch (err) {
      showToast('Could not update status', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="order-page-loading"><div className="spinner" /></div>
  if (error) return <div className="order-page-error"><h2>Error</h2><p>{error}</p><button onClick={loadOrders} className="cresoa-primary-button">Try again</button></div>

  return (
    <div className="orders-page">
      <Navigation businessId={businessId} />

      {/* HEADER */}
      <div className="orders-header">
        <div>
          <h1 className="orders-title">Production</h1>
          <p className="orders-subtitle">
            {productionOrders.length} active orders · <span style={{ color: overdueOrders.length > 0 ? 'var(--color-danger)' : 'inherit' }}>{overdueOrders.length} overdue</span>
          </p>
        </div>
        <button onClick={() => router.push(`/dashboard/orders/new?business_id=${businessId}`)} className="cresoa-primary-button">
          <SvgIcons.Plus /> New Order
        </button>
      </div>

      {/* STATS GRID */}
      <div className="orders-metrics-grid">
        <div className="orders-metric-box">
          <span className="metric-label">In Production</span>
          <span className="metric-value">{productionOrders.length}</span>
        </div>
        <div className="orders-metric-box">
          <span className="metric-label">Overdue</span>
          <span className="metric-value" style={{ color: overdueOrders.length > 0 ? 'var(--color-danger)' : 'var(--color-secondary)' }}>
            {overdueOrders.length > 0 ? overdueOrders.length : '✓'}
          </span>
        </div>
        <div className="orders-metric-box">
          <span className="metric-label">Due Today</span>
          <span className="metric-value">{dueTodayOrders.length}</span>
        </div>
        <div className="orders-metric-box">
          <span className="metric-label">Ready</span>
          <span className="metric-value" style={{ color: 'var(--color-secondary)' }}>{stageCounts['Ready'] || 0}</span>
        </div>
      </div>

      {/* OVERDUE ALERT */}
      {overdueOrders.length > 0 && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '16px', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <SvgIcons.Alert />
          <span style={{ fontWeight: 700, color: 'var(--color-danger)', fontSize: '0.9rem' }}>
            {overdueOrders.length} order{overdueOrders.length > 1 ? 's are' : ' is'} overdue
          </span>
          <button onClick={() => setSelectedStage(null)} style={{ marginLeft: 'auto', background: 'var(--color-danger)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
            View All
          </button>
        </div>
      )}

      {/* PIPELINE */}
      <div className="cresoa-card" style={{ padding: '16px', marginBottom: '1.25rem' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 700 }}>Pipeline</h3>
        <ProductionPipeline counts={stageCounts} onStageClick={handleStageClick} />
        {selectedStage && (
          <div style={{ marginTop: '8px', textAlign: 'right' }}>
            <button onClick={() => setSelectedStage(null)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}>
              Clear Filter ({selectedStage})
            </button>
          </div>
        )}
      </div>

      {/* LIST HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
          {selectedStage ? `${selectedStage} Orders` : 'All Orders in Production'}
        </h2>
        <span style={{ fontSize: '0.8rem', color: 'var(--cresoa-text-muted)', fontWeight: 600 }}>{filteredOrders.length} orders</span>
      </div>

      {/* ORDERS LIST */}
      {filteredOrders.length === 0 ? (
        <div className="orders-empty" style={{ padding: '3rem 1rem' }}>
          <SvgIcons.Package />
          <h3>No orders in this stage</h3>
          <p>Everything is up to date here.</p>
        </div>
      ) : (
        <div className="orders-list">
          {filteredOrders.map(order => {
            const customerName = order.customers?.name || order.customers?.first_name || 'Unknown'
            const isOverdue = order.due_date && new Date(order.due_date) < new Date()
            const balance = (order.price || 0) - (order.amount_paid || 0)
            const status = order.current_status || 'Order placed'

            return (
              <div key={order.id} className="cresoa-card" style={{ padding: '16px', borderLeft: `4px solid ${isOverdue ? 'var(--color-danger)' : 'var(--color-primary)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  
                  {/* Left Side: Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--cresoa-text)' }}>{customerName}</h4>
                      {isOverdue && <span style={{ fontSize: '0.7rem', color: 'white', background: 'var(--color-danger)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>Overdue</span>}
                    </div>
                    <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: 'var(--cresoa-text-muted)' }}>
                      {order.title || 'Untitled'} · Due: {formatDate(order.due_date)}
                    </p>
                    {balance > 0 && <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-danger)', fontWeight: 600 }}>{money(balance)} balance</p>}
                  </div>

                  {/* Right Side: Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    {/* Status Pill (Tap to change) */}
                    <button 
                      onClick={() => openStatusModal(order)}
                      className={`badge-status ${status === 'Delivered' ? 'success' : status === 'Ready' ? 'warning' : 'info'}`}
                      style={{ cursor: 'pointer', border: '1px solid transparent' }}
                    >
                      {status}
                    </button>
                    
                    <button 
                      onClick={() => router.push(`/dashboard/orders/${order.id}?business_id=${businessId}`)}
                      className="order-btn-secondary"
                      style={{ padding: '4px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <SvgIcons.Eye /> View
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: '2rem' }}><Navigation businessId={businessId} /></div>

      {/* ─── CUSTOM STATUS UPDATE MODAL ─── */}
      {statusOrder && (
        <div className="app-modal-overlay" onClick={() => setStatusOrder(null)}>
          <div className="app-modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 800 }}>Update Production Stage</h2>
              <button onClick={() => setStatusOrder(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}><SvgIcons.X /></button>
            </div>
            
            <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', margin: '0 0 16px 0' }}>
              Changing stage for <strong>{statusOrder.customers?.name || statusOrder.customers?.first_name}</strong>
            </p>

            <div style={{ display: 'grid', gap: '8px' }}>
              {STAGES.map(stage => (
                <button 
                  key={stage}
                  onClick={() => setSelectedStatus(stage)}
                  className={`order-btn-secondary ${selectedStatus === stage ? 'active' : ''}`}
                  style={{ justifyContent: 'space-between', padding: '14px 16px', borderColor: selectedStatus === stage ? 'var(--color-primary)' : 'var(--cresoa-border)' }}
                >
                  <span>{stage}</span>
                  {selectedStatus === stage && <SvgIcons.Check />}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '1.5rem' }}>
              <button onClick={() => setStatusOrder(null)} className="order-btn-secondary" style={{ flex: 1, padding: '12px' }}>Cancel</button>
              <button onClick={handleStatusUpdate} disabled={saving} className="cresoa-primary-button" style={{ flex: 1, padding: '12px' }}>
                {saving ? 'Updating...' : 'Save Stage'}
              </button>
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
