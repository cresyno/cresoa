'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../lib/getBusinessId'
import { Icon } from '../../../components/Icon'
import { Card } from '../../../components/Card'
import { SectionHeader } from '../../../components/SectionHeader'
import { StatusPill } from '../../../components/StatusPill'
import { Navigation } from '../../../components/Navigation'
import { ProductionPipeline } from '../../../components/ProductionPipeline'
import '../../../globals.css'

const STAGES = ['Order placed', 'Cutting', 'Sewing', 'Ready', 'Delivered']

function money(value) {
  return `₦${Number(value || 0).toLocaleString('en-NG')}`
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getStatusInfo(status) {
  const map = {
    'Order placed': { label: 'Placed', className: 'placed' },
    Cutting: { label: 'Cutting', className: 'cutting' },
    Sewing: { label: 'Sewing', className: 'sewing' },
    Ready: { label: 'Ready', className: 'ready' },
    Delivered: { label: 'Delivered', className: 'delivered' },
  }
  return map[status] || { label: status || 'Placed', className: 'placed' }
}

export default function ProductionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = getCurrentBusinessId() || searchParams.get('business_id')

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedStage, setSelectedStage] = useState(null) // null = show all (except delivered)

  const loadOrders = async () => {
    if (!businessId) return
    setLoading(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data, error: fetchError } = await supabase
        .from('orders')
        .select(`
          *,
          customers (name, first_name, last_name, phone)
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setOrders(data || [])
    } catch (err) {
      console.error('Error loading production orders:', err)
      setError('Could not load production data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [businessId])

  // ─── Compute stats ──────────────────────────────────────
  const productionOrders = useMemo(() => {
    return orders.filter(o => o.current_status !== 'Delivered')
  }, [orders])

  const overdueOrders = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return productionOrders.filter(o => {
      if (!o.due_date) return false
      const due = new Date(o.due_date)
      due.setHours(0, 0, 0, 0)
      return due < today
    })
  }, [productionOrders])

  const dueTodayOrders = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return productionOrders.filter(o => {
      if (!o.due_date) return false
      const due = new Date(o.due_date)
      due.setHours(0, 0, 0, 0)
      return due.getTime() === today.getTime()
    })
  }, [productionOrders])

  // ─── Stage counts ──────────────────────────────────────
  const stageCounts = useMemo(() => {
    const counts = {}
    STAGES.forEach(s => counts[s] = 0)
    orders.forEach(o => {
      const status = o.current_status
      if (counts[status] !== undefined) counts[status]++
    })
    return counts
  }, [orders])

  // ─── Filtered orders based on selected stage ──────────
  const filteredOrders = useMemo(() => {
    if (!selectedStage) {
      // Show all production orders (excluding delivered)
      return productionOrders
    }
    return productionOrders.filter(o => o.current_status === selectedStage)
  }, [productionOrders, selectedStage])

  // ─── Handlers ──────────────────────────────────────────
  const handleStageClick = (stage) => {
    setSelectedStage(prev => prev === stage ? null : stage)
  }

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { error } = await supabase
        .from('orders')
        .update({ current_status: newStatus })
        .eq('id', orderId)
        .eq('business_id', businessId)
      if (error) throw error
      // Optimistically update local state
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, current_status: newStatus } : o))
    } catch (err) {
      console.error('Status update error:', err)
      alert('Could not update status.')
    }
  }

  // ─── Loading skeleton ──────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ width: '140px', height: '24px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
          <div style={{ width: '100px', height: '32px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: '0.8rem', marginBottom: '1rem' }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ background: 'var(--cresoa-surface)', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', animation: 'pulse 1.5s infinite' }}>
              <div style={{ width: '40%', height: '12px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
              <div style={{ width: '60%', height: '20px', background: 'var(--cresoa-border)', borderRadius: '6px', marginTop: '0.3rem' }} />
            </div>
          ))}
        </div>
        <div style={{ background: 'var(--cresoa-surface)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--cresoa-border)', animation: 'pulse 1.5s infinite', height: '200px' }} />
        <style>{`@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }`}</style>
        <Navigation businessId={businessId} />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
        <Card style={{ padding: '2rem', textAlign: 'center' }}>
          <Icon name="alert-circle" size={32} stroke="var(--cresoa-danger)" />
          <h2 style={{ margin: '0.5rem 0' }}>Couldn't load production</h2>
          <p style={{ color: 'var(--cresoa-text-muted)' }}>{error}</p>
          <button onClick={loadOrders} className="cresoa-primary-button" style={{ marginTop: '1rem' }}>Try again</button>
        </Card>
        <Navigation businessId={businessId} />
      </div>
    )
  }

  // ─── Main render ──────────────────────────────────────
  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
      <Navigation businessId={businessId} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <div>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Workshop</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0', color: 'var(--cresoa-text)' }}>Production</h1>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', margin: 0 }}>
            {productionOrders.length} orders in production · {overdueOrders.length} overdue
          </p>
        </div>
        <button onClick={() => router.push(`/dashboard/orders/new?business_id=${businessId}`)} className="cresoa-primary-button">
          <Icon name="plus" size={14} stroke="#fff" style={{ marginRight: '0.3rem' }} /> New Order
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
        <Card style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>In Production</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{productionOrders.length}</div>
        </Card>
        <Card style={{ padding: '0.6rem 0.8rem', textAlign: 'center', borderColor: overdueOrders.length > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-border)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Overdue</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: overdueOrders.length > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-success)' }}>
            {overdueOrders.length > 0 ? overdueOrders.length : '✓'}
          </div>
        </Card>
        <Card style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Due Today</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{dueTodayOrders.length}</div>
        </Card>
        <Card style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Ready</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--cresoa-success)' }}>{stageCounts['Ready'] || 0}</div>
        </Card>
      </div>

      {/* Overdue / Urgent Alert */}
      {overdueOrders.length > 0 && (
        <Card style={{ marginBottom: '1rem', background: 'var(--cresoa-danger-soft)', borderColor: 'var(--cresoa-danger)', padding: '0.8rem 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Icon name="alert-triangle" size={18} stroke="var(--cresoa-danger)" />
            <span style={{ fontWeight: 700, color: 'var(--cresoa-danger)' }}>
              {overdueOrders.length} order{overdueOrders.length > 1 ? 's' : ''} overdue
            </span>
            <button
              onClick={() => setSelectedStage(null)} // show all, but we can't filter by overdue easily
              style={{ marginLeft: 'auto', padding: '0.2rem 0.8rem', borderRadius: '20px', border: '1px solid var(--cresoa-danger)', background: 'transparent', color: 'var(--cresoa-danger)', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600 }}
            >
              View all
            </button>
          </div>
        </Card>
      )}

      {/* Production Pipeline */}
      <Card style={{ padding: '1rem', marginBottom: '1rem' }}>
        <SectionHeader title="Pipeline" subtitle="Click a stage to filter orders" />
        <ProductionPipeline
          counts={stageCounts}
          onStageClick={handleStageClick}
        />
        {selectedStage && (
          <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setSelectedStage(null)} style={{ border: 'none', background: 'transparent', color: 'var(--cresoa-accent)', cursor: 'pointer', fontSize: '0.8rem' }}>
              Clear filter
            </button>
          </div>
        )}
      </Card>

      {/* Orders List */}
      <SectionHeader
        title={selectedStage ? `Orders: ${selectedStage}` : 'All Orders in Production'}
        subtitle={filteredOrders.length > 0 ? `${filteredOrders.length} order${filteredOrders.length > 1 ? 's' : ''}` : 'No orders in this stage'}
      />

      {filteredOrders.length === 0 ? (
        <Card style={{ padding: '2rem', textAlign: 'center' }}>
          <Icon name="package" size={32} stroke="var(--cresoa-text-muted)" />
          <h3 style={{ margin: '0.5rem 0 0.2rem' }}>No orders here</h3>
          <p style={{ color: 'var(--cresoa-text-muted)' }}>All orders in this stage will appear here.</p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {filteredOrders.map(order => {
            const customer = order.customers
            const customerName = customer?.name || customer?.first_name || 'Unknown'
            const isOverdue = order.due_date && new Date(order.due_date) < new Date() && order.current_status !== 'Delivered'
            const balance = (order.price || 0) - (order.amount_paid || 0)
            return (
              <Card key={order.id} style={{ padding: '0.8rem 1rem', borderLeft: `4px solid ${isOverdue ? 'var(--cresoa-danger)' : 'var(--cresoa-accent)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '1rem' }}>{customerName}</strong>
                      <StatusPill status={order.current_status} />
                      {isOverdue && <span style={{ fontSize: '0.7rem', color: 'var(--cresoa-danger)', fontWeight: 600 }}>Overdue</span>}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--cresoa-text-muted)', marginTop: '0.2rem' }}>
                      {order.title || 'Untitled'} · Due: {formatDate(order.due_date)}
                      {balance > 0 && ` · ${money(balance)} due`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <select
                      value={order.current_status || 'Order placed'}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      style={{ padding: '0.2rem 0.5rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      {STAGES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => router.push(`/dashboard/orders/${order.id}?business_id=${businessId}`)}
                      style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                    >
                      <Icon name="eye" size={14} stroke="currentColor" /> View
                    </button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={businessId} />
      </div>
    </div>
  )
}
