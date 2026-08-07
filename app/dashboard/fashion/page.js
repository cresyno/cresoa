'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import LetterLogo from '../../../components/LetterLogo'
import { isFeatureAvailable } from '../../../lib/planLimits'
import FeedbackBanner from '../../../components/FeedbackBanner'
import { getCurrentBusinessId } from '../../../lib/getBusinessId'
import { Icon } from '../../../components/Icon'

export default function FashionDashboardPage() {
  const router = useRouter()
  const [business, setBusiness] = useState(null)
  const [customers, setCustomers] = useState([])
  const [soloOrders, setSoloOrders] = useState([])
  const [groups, setGroups] = useState([])
  const [expandedGroups, setExpandedGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deactivated, setDeactivated] = useState(false)
  const [showOwingOnly, setShowOwingOnly] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')

  // Quick Order Modal
  const [showQuickOrder, setShowQuickOrder] = useState(false)
  const [quickOrderCustomer, setQuickOrderCustomer] = useState('')
  const [quickOrderItem, setQuickOrderItem] = useState('')
  const [quickOrderPrice, setQuickOrderPrice] = useState('')
  const [quickOrderDeposit, setQuickOrderDeposit] = useState('')
  const [quickOrderDue, setQuickOrderDue] = useState('')
  const [quickOrderLoading, setQuickOrderLoading] = useState(false)
  const [quickOrderMessage, setQuickOrderMessage] = useState('')

  // Settle Payment Modal
  const [showSettleModal, setShowSettleModal] = useState(false)
  const [settleOrder, setSettleOrder] = useState(null)
  const [settleAmount, setSettleAmount] = useState('')
  const [settleNote, setSettleNote] = useState('')
  const [settleLoading, setSettleLoading] = useState(false)

  const modalRef = useRef(null)

  // ─── Load Dashboard ───
  const loadDashboard = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const businessId = getCurrentBusinessId()
      let businessData = null

      if (businessId) {
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', businessId)
          .maybeSingle()
        if (data && !error) businessData = data
      }

      if (!businessData) {
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .eq('owner_id', user.id)
          .single()
        if (error || !data) {
          router.push('/onboarding')
          return
        }
        businessData = data
      }

      if (businessData.is_active === false) {
        setDeactivated(true)
        setLoading(false)
        return
      }
      if (!businessData.onboarding_completed) {
        router.push('/onboarding')
        return
      }
      setBusiness(businessData)

      const { data: customerData } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', businessData.id)
        .order('created_at', { ascending: false })
      setCustomers(customerData || [])

      const { data: allOrders } = await supabase
        .from('orders')
        .select('*, customers(name, phone)')
        .eq('business_id', businessData.id)
        .order('created_at', { ascending: false })

      const { data: groupData } = await supabase
        .from('group_orders')
        .select('*, customers:coordinator_customer_id(name)')
        .eq('business_id', businessData.id)
        .order('created_at', { ascending: false })

      const withoutGroup = (allOrders || []).filter(o => !o.group_order_id)
      setSoloOrders(withoutGroup)

      const groupsWithOrders = (groupData || []).map(g => ({
        ...g,
        orders: (allOrders || []).filter(o => o.group_order_id === g.id)
      }))
      setGroups(groupsWithOrders)

    } catch (err) {
      console.error('Error loading dashboard:', err)
      setError('Failed to load dashboard. Please refresh.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        setShowQuickOrder(false)
        setShowSettleModal(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev =>
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    )
  }

  const toggleOwingFilter = () => setShowOwingOnly(!showOwingOnly)
  const clearFilter = () => { setShowOwingOnly(false); setStatusFilter('all') }

  const handleQuickOrderSubmit = async (e) => {
    e.preventDefault()
    setQuickOrderMessage('')
    setQuickOrderLoading(true)
    if (!quickOrderCustomer || !quickOrderItem || !quickOrderPrice) {
      setQuickOrderMessage('Please fill in customer, item, and price.')
      setQuickOrderLoading(false)
      return
    }
    const customerId = quickOrderCustomer
    const priceNum = Number(quickOrderPrice) || 0
    const depositNum = Number(quickOrderDeposit) || 0
    const { error } = await supabase
      .from('orders')
      .insert({
        business_id: business.id,
        customer_id: customerId,
        title: quickOrderItem,
        price: priceNum,
        amount_paid: depositNum,
        due_date: quickOrderDue || null,
        current_status: 'Order placed',
      })
    if (error) {
      setQuickOrderMessage('Error: ' + error.message)
      setQuickOrderLoading(false)
      return
    }
    setQuickOrderMessage('✅ Order created!')
    setQuickOrderCustomer('')
    setQuickOrderItem('')
    setQuickOrderPrice('')
    setQuickOrderDeposit('')
    setQuickOrderDue('')
    setQuickOrderLoading(false)
    setTimeout(() => {
      setShowQuickOrder(false)
      setQuickOrderMessage('')
      loadDashboard()
    }, 800)
  }

  const openSettleModal = (order) => {
    setSettleOrder(order)
    setSettleAmount('')
    setSettleNote('')
    setShowSettleModal(true)
  }

  const handleSettleSubmit = async (e) => {
    e.preventDefault()
    setSettleLoading(true)
    const amount = Number(settleAmount)
    if (!amount || amount <= 0) { setSettleLoading(false); return }
    const newTotal = settleOrder.amount_paid + amount
    if (newTotal > settleOrder.price) { setSettleLoading(false); return }
    await supabase.from('payment_records').insert({
      order_id: settleOrder.id,
      amount: amount,
      note: settleNote || 'Payment recorded from dashboard',
    })
    await supabase
      .from('orders')
      .update({ amount_paid: newTotal })
      .eq('id', settleOrder.id)
    setShowSettleModal(false)
    setSettleLoading(false)
    loadDashboard()
  }

  const canCreateGroup = business ? isFeatureAvailable(business.plan || 'free', 'groups') : false

  // ─── Helper Functions ───
  const getStatusInfo = (status) => {
    const map = {
      'Order placed': { label: 'Placed', color: 'var(--color-text-muted)', bg: 'var(--color-bg)' },
      'Cutting':      { label: 'Cutting', color: '#B4881E', bg: '#F6E9C8' },
      'Sewing':       { label: 'Sewing', color: '#1E3A5F', bg: '#D6E0EB' },
      'Ready':        { label: 'Ready', color: '#2E7D5E', bg: '#DCEBE2' },
      'Delivered':    { label: 'Delivered', color: '#6B6255', bg: '#E8E0D5' },
    }
    return map[status] || { label: status || 'Placed', color: 'var(--color-text-muted)', bg: 'var(--color-bg)' }
  }

  const getOrderName = (order) => {
    if (order.item_name?.trim()) return order.item_name
    if (order.name?.trim()) return order.name
    if (order.title?.trim()) return order.title
    if (order.customers?.name) return `${order.customers.name}'s order`
    return 'Order'
  }

  const isOverdue = (dueDate) => {
    if (!dueDate) return false
    const due = new Date(dueDate)
    due.setHours(0,0,0,0)
    const today = new Date()
    today.setHours(0,0,0,0)
    return due < today
  }

  const getDueDisplay = (dueDate) => {
    if (!dueDate) return { label: '—', color: 'var(--color-text-muted)' }
    if (isOverdue(dueDate)) return { label: 'Overdue', color: 'var(--color-danger)' }
    return { label: `Due ${new Date(dueDate).toLocaleDateString('en-GB')}`, color: 'var(--color-text-muted)' }
  }

  const hasBalance = (order) => (order.price - order.amount_paid) > 0

  const getFilteredOrders = (orders) => {
    let filtered = orders
    if (showOwingOnly) filtered = filtered.filter(o => hasBalance(o))
    if (statusFilter !== 'all') filtered = filtered.filter(o => o.current_status === statusFilter)
    return filtered
  }

  const getFilteredGroupOrders = (group) => {
    let filtered = group.orders
    if (showOwingOnly) filtered = filtered.filter(o => hasBalance(o))
    if (statusFilter !== 'all') filtered = filtered.filter(o => o.current_status === statusFilter)
    return filtered
  }

  // ─── Derived Stats ───
  const previewCustomers = customers.slice(0, 5)
  const previewOrders = soloOrders.slice(0, 5)
  const allGroupOrders = groups.flatMap(g => g.orders)
  const allActiveOrders = [...soloOrders, ...allGroupOrders]
  const totalOrders = allActiveOrders.length
  const totalBalanceOwed = allActiveOrders.reduce((sum, o) => sum + Math.max(0, o.price - o.amount_paid), 0)
  const todayStr = new Date().toISOString().split('T')[0]
  const today = new Date()
  today.setHours(0,0,0,0)
  const dueTodayCount = allActiveOrders.filter(o => o.due_date === todayStr && o.current_status !== 'Delivered').length
  const readyCount = allActiveOrders.filter(o => o.current_status === 'Ready').length
  const overdueCount = allActiveOrders.filter(o => {
    if (!o.due_date || o.current_status === 'Delivered') return false
    const due = new Date(o.due_date)
    due.setHours(0,0,0,0)
    return due < today
  }).length

  const todayRevenue = allActiveOrders.filter(o => {
    const d = new Date(o.created_at)
    return d.toDateString() === today.toDateString()
  }).reduce((sum, o) => sum + o.amount_paid, 0)

  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  const weekRevenue = allActiveOrders.filter(o => {
    const d = new Date(o.created_at)
    return d >= weekStart
  }).reduce((sum, o) => sum + o.amount_paid, 0)

  const monthRevenue = allActiveOrders.filter(o => {
    const d = new Date(o.created_at)
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
  }).reduce((sum, o) => sum + o.amount_paid, 0)

  const filteredPreviewOrders = getFilteredOrders(previewOrders)

  const healthScore = (() => {
    let score = 100
    if (overdueCount > 0) score -= overdueCount * 5
    if (totalBalanceOwed > 0) score -= 5
    if (customers.length === 0) score -= 10
    if (totalOrders === 0) score -= 10
    return Math.max(0, Math.min(100, score))
  })()

  // ─── Skeleton Loading ───
  if (loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ width: '120px', height: '24px', background: 'var(--color-border)', borderRadius: '6px' }} />
          <div style={{ width: '80px', height: '20px', background: 'var(--color-border)', borderRadius: '6px' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.8rem', marginBottom: '1.5rem' }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ background: 'var(--color-card)', padding: '1rem', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', animation: 'pulse 1.5s infinite' }}>
              <div style={{ width: '40%', height: '16px', background: 'var(--color-border)', borderRadius: '6px' }} />
              <div style={{ width: '60%', height: '20px', background: 'var(--color-border)', borderRadius: '6px', marginTop: '0.3rem' }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem', marginBottom: '1.5rem' }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ background: 'var(--color-card)', padding: '1rem', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', animation: 'pulse 1.5s infinite' }}>
              <div style={{ width: '50%', height: '14px', background: 'var(--color-border)', borderRadius: '6px' }} />
              <div style={{ width: '70%', height: '20px', background: 'var(--color-border)', borderRadius: '6px', marginTop: '0.3rem' }} />
            </div>
          ))}
        </div>
        <style>{`@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }`}</style>
      </div>
    )
  }

  if (deactivated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
        <div><h1 style={{ color: 'var(--color-text)' }}>Account deactivated</h1><p style={{ color: 'var(--color-text-muted)' }}>Please contact support.</p></div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
        <div style={{ background: 'var(--color-card)', padding: '2rem', borderRadius: '12px', maxWidth: '400px' }}>
          <h2 style={{ color: 'var(--color-danger)' }}>Oops!</h2>
          <p style={{ color: 'var(--color-text-muted)' }}>{error}</p>
          <button onClick={loadDashboard} style={{ marginTop: '1rem', padding: '0.6rem 2rem', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', color: 'var(--color-text)' }}>
      {/* ─── HEADER ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <LetterLogo name={business?.name} size={40} />
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: '500' }}>Welcome back,</div>
            <div style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--color-text)' }}>
              {business?.name || 'Your business'}
              <span style={{ fontSize: '0.7rem', color: 'var(--color-accent)', marginLeft: '0.4rem', fontWeight: '600' }}>Fashion</span>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
          <div style={{ fontWeight: '700', color: 'var(--color-text)', fontSize: '1.1rem' }}>₦{todayRevenue.toLocaleString()}</div>
        </div>
      </div>

      {business && <FeedbackBanner business={business} />}

      {/* ─── HEALTH SCORE ─── */}
      <div style={{ background: 'var(--color-primary)', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Business Health</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#fff' }}>{healthScore}<span style={{ fontSize: '1rem', opacity: 0.6 }}>/100</span></div>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <div style={{ textAlign: 'center' }}><div style={{ fontWeight: '700', color: '#fff' }}>{Math.round((1 - overdueCount / (totalOrders || 1)) * 100)}%</div><div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.7)' }}>On-time</div></div>
          <div style={{ textAlign: 'center' }}><div style={{ fontWeight: '700', color: '#fff' }}>{customers.length}</div><div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.7)' }}>Customers</div></div>
          <div style={{ textAlign: 'center' }}><div style={{ fontWeight: '700', color: '#fff' }}>{allActiveOrders.filter(o => o.current_status !== 'Delivered').length}</div><div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.7)' }}>Active</div></div>
        </div>
      </div>

      {/* ─── REVENUE CARDS ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'var(--color-card)', padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Today</div>
          <div style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--color-text)' }}>₦{todayRevenue.toLocaleString()}</div>
        </div>
        <div style={{ background: 'var(--color-card)', padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>This Week</div>
          <div style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--color-text)' }}>₦{weekRevenue.toLocaleString()}</div>
        </div>
        <div style={{ background: 'var(--color-card)', padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>This Month</div>
          <div style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--color-text)' }}>₦{monthRevenue.toLocaleString()}</div>
        </div>
      </div>

      {/* ─── STATS GRID ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.8rem', marginBottom: '1.5rem' }}>
        <a href={`/dashboard/customers?business_id=${getCurrentBusinessId() || ''}`} style={{ background: 'var(--color-card)', padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--color-border)', textDecoration: 'none', color: 'var(--color-text)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
            <Icon name="users" size={16} stroke="var(--color-text-muted)" />
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Customers</span>
          </div>
          <div style={{ fontWeight: '700', fontSize: '1.2rem' }}>{customers.length}</div>
        </a>
        <a href={`/dashboard/orders?business_id=${getCurrentBusinessId() || ''}`} style={{ background: 'var(--color-card)', padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--color-border)', textDecoration: 'none', color: 'var(--color-text)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
            <Icon name="package" size={16} stroke="var(--color-text-muted)" />
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Orders</span>
          </div>
          <div style={{ fontWeight: '700', fontSize: '1.2rem' }}>{totalOrders}</div>
        </a>
        <button onClick={toggleOwingFilter} style={{ background: 'var(--color-card)', padding: '0.8rem', borderRadius: '12px', border: showOwingOnly ? '2px solid var(--color-danger)' : '1px solid var(--color-border)', textDecoration: 'none', color: 'var(--color-text)', cursor: 'pointer', textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
            <Icon name="dollar" size={16} stroke="var(--color-text-muted)" />
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{showOwingOnly ? 'Filtered' : 'Owed'}</span>
          </div>
          <div style={{ fontWeight: '700', fontSize: '1.2rem', color: totalBalanceOwed > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>₦{totalBalanceOwed.toLocaleString()}</div>
        </button>
        <a href={`/dashboard/orders?business_id=${getCurrentBusinessId() || ''}&filter=ready`} style={{ background: 'var(--color-card)', padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--color-border)', textDecoration: 'none', color: 'var(--color-text)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
            <Icon name="check" size={16} stroke="var(--color-text-muted)" />
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Ready</span>
          </div>
          <div style={{ fontWeight: '700', fontSize: '1.2rem', color: 'var(--color-success)' }}>{readyCount}</div>
        </a>
        <a href={`/dashboard/orders?business_id=${getCurrentBusinessId() || ''}&filter=overdue`} style={{ background: 'var(--color-card)', padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--color-border)', textDecoration: 'none', color: 'var(--color-text)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
            <Icon name="alert" size={16} stroke="var(--color-text-muted)" />
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Overdue</span>
          </div>
          <div style={{ fontWeight: '700', fontSize: '1.2rem', color: 'var(--color-danger)' }}>{overdueCount}</div>
        </a>
      </div>

      {/* ─── ALERTS ─── */}
      {(overdueCount > 0 || dueTodayCount > 0 || readyCount > 0) && (
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {overdueCount > 0 && <span style={{ background: 'var(--color-danger)', color: '#fff', padding: '0.2rem 0.8rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '600' }}>Overdue: {overdueCount}</span>}
          {dueTodayCount > 0 && <span style={{ background: 'var(--color-accent)', color: '#fff', padding: '0.2rem 0.8rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '600' }}>Due today: {dueTodayCount}</span>}
          {readyCount > 0 && <span style={{ background: 'var(--color-success)', color: '#fff', padding: '0.2rem 0.8rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '600' }}>Ready: {readyCount}</span>}
        </div>
      )}

      {/* ─── QUICK ACTIONS ─── */}
      <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <a href={`/dashboard/orders/new?business_id=${getCurrentBusinessId() || ''}`} style={{ flex: '1', minWidth: '80px', background: 'var(--color-accent)', color: '#fff', padding: '0.6rem 0', borderRadius: '8px', textAlign: 'center', fontWeight: '600', fontSize: '0.85rem', textDecoration: 'none' }}>
          <Icon name="plus" size={16} stroke="#fff" style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} /> New Order
        </a>
        <a href={`/dashboard/customers/new?business_id=${getCurrentBusinessId() || ''}`} style={{ flex: '1', minWidth: '80px', background: 'var(--color-card)', color: 'var(--color-text)', padding: '0.6rem 0', borderRadius: '8px', textAlign: 'center', fontWeight: '600', fontSize: '0.85rem', textDecoration: 'none', border: '1px solid var(--color-border)' }}>
          <Icon name="user" size={16} stroke="currentColor" style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} /> New Customer
        </a>
        <a href={canCreateGroup ? `/dashboard/groups/new?business_id=${getCurrentBusinessId() || ''}` : '#'} style={{ flex: '1', minWidth: '80px', background: 'var(--color-card)', color: 'var(--color-text)', padding: '0.6rem 0', borderRadius: '8px', textAlign: 'center', fontWeight: '600', fontSize: '0.85rem', textDecoration: 'none', border: '1px solid var(--color-border)', opacity: canCreateGroup ? 1 : 0.5, cursor: canCreateGroup ? 'pointer' : 'default' }} onClick={(e) => { if (!canCreateGroup) { e.preventDefault(); router.push('/dashboard/subscription') } }}>
          <Icon name="group" size={16} stroke="currentColor" style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} /> {canCreateGroup ? 'Group Order' : 'Group (Upgrade)'}
        </a>
        <a href={`/dashboard/reminders?business_id=${getCurrentBusinessId() || ''}`} style={{ flex: '1', minWidth: '80px', background: 'var(--color-card)', color: 'var(--color-text)', padding: '0.6rem 0', borderRadius: '8px', textAlign: 'center', fontWeight: '600', fontSize: '0.85rem', textDecoration: 'none', border: '1px solid var(--color-border)' }}>
          <Icon name="bell" size={16} stroke="currentColor" style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} /> Reminders
        </a>
      </div>

      {/* ─── RECENT ORDERS ─── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>Recent Orders</h3>
          <a href={`/dashboard/orders?business_id=${getCurrentBusinessId() || ''}`} style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textDecoration: 'none' }}>View all →</a>
        </div>
        {filteredPreviewOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', background: 'var(--color-card)', borderRadius: '12px', border: '1px dashed var(--color-border)' }}>
            <p style={{ color: 'var(--color-text-muted)' }}>No orders yet</p>
            <a href={`/dashboard/orders/new?business_id=${getCurrentBusinessId() || ''}`} style={{ color: 'var(--color-accent)', fontWeight: '600', textDecoration: 'none' }}>Create first order →</a>
          </div>
        ) : (
          filteredPreviewOrders.map((o) => {
            const status = getStatusInfo(o.current_status)
            const due = getDueDisplay(o.due_date)
            const balance = o.price - o.amount_paid
            return (
              <div key={o.id} style={{ background: 'var(--color-card)', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid var(--color-border)', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1', minWidth: '150px' }}>
                    <div style={{ fontWeight: '600' }}>{o.customers?.name || 'No customer'} <span style={{ fontWeight: '400', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>· {getOrderName(o)}</span></div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.7rem', background: status.bg, color: status.color, padding: '0.1rem 0.5rem', borderRadius: '12px', fontWeight: '500' }}>{status.label}</span>
                      <span style={{ fontSize: '0.7rem', color: due.color }}>{due.label}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: '700', color: balance > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>₦{balance.toLocaleString()}</span>
                    <a href={`/dashboard/orders/${o.id}?business_id=${getCurrentBusinessId() || ''}`} style={{ padding: '0.2rem 0.6rem', fontSize: '0.7rem', color: 'var(--color-text-muted)', textDecoration: 'none', border: '1px solid var(--color-border)', borderRadius: '4px' }}>View</a>
                    <a href={`/dashboard/orders/${o.id}/edit?business_id=${getCurrentBusinessId() || ''}`} style={{ padding: '0.2rem 0.6rem', fontSize: '0.7rem', color: 'var(--color-text-muted)', textDecoration: 'none', border: '1px solid var(--color-border)', borderRadius: '4px' }}>Edit</a>
                    {balance > 0 && <button onClick={() => openSettleModal(o)} style={{ padding: '0.2rem 0.6rem', fontSize: '0.7rem', background: 'var(--color-success)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Pay</button>}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ─── GROUP ORDERS ─── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>Group Orders</h3>
          <a href={`/dashboard/groups?business_id=${getCurrentBusinessId() || ''}`} style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textDecoration: 'none' }}>View all →</a>
        </div>
        {groups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', background: 'var(--color-card)', borderRadius: '12px', border: '1px dashed var(--color-border)' }}>
            <p style={{ color: 'var(--color-text-muted)' }}>No group orders yet</p>
            {canCreateGroup && <a href={`/dashboard/groups/new?business_id=${getCurrentBusinessId() || ''}`} style={{ color: 'var(--color-accent)', fontWeight: '600', textDecoration: 'none' }}>Create group order →</a>}
          </div>
        ) : (
          groups.map((g) => {
            const isExpanded = expandedGroups.includes(g.id)
            const filteredOrders = getFilteredGroupOrders(g)
            const hasVisible = filteredOrders.length > 0
            if (showOwingOnly && !hasVisible) return null
            const combinedBalance = filteredOrders.reduce((sum, o) => sum + (o.price - o.amount_paid), 0)
            const progress = g.orders.length > 0 ? (g.orders.filter(o => o.current_status === 'Delivered').length / g.orders.length) * 100 : 0
            return (
              <div key={g.id} style={{ background: 'var(--color-card)', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid var(--color-border)', marginBottom: '0.5rem' }}>
                <div onClick={() => toggleGroup(g.id)} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: '600' }}>{g.group_name}</div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{isExpanded ? '▲' : '▼'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{g.orders.length} members</span>
                    <span style={{ fontSize: '0.7rem', color: combinedBalance > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>₦{combinedBalance.toLocaleString()}</span>
                  </div>
                  <div style={{ marginTop: '0.3rem', background: 'var(--color-bg)', borderRadius: '10px', height: '4px' }}>
                    <div style={{ width: `${progress}%`, height: '4px', background: 'var(--color-success)', borderRadius: '10px' }} />
                  </div>
                </div>
                {isExpanded && hasVisible && (
                  <div style={{ marginTop: '0.8rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem' }}>
                    {filteredOrders.map((o) => {
                      const status = getStatusInfo(o.current_status)
                      const due = getDueDisplay(o.due_date)
                      const balance = o.price - o.amount_paid
                      return (
                        <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0', borderBottom: '1px solid var(--color-border)' }}>
                          <div>
                            <div style={{ fontWeight: '500', fontSize: '0.85rem' }}>{o.customers?.name || 'No customer'}</div>
                            <div style={{ display: 'flex', gap: '0.3rem', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                              <span>{status.label}</span>
                              <span style={{ color: due.color }}>{due.label}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <span style={{ fontWeight: '600', color: balance > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>₦{balance.toLocaleString()}</span>
                            <a href={`/dashboard/orders/${o.id}?business_id=${getCurrentBusinessId() || ''}`} style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textDecoration: 'none' }}>View</a>
                            {balance > 0 && <button onClick={() => openSettleModal(o)} style={{ fontSize: '0.7rem', background: 'var(--color-success)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '0.1rem 0.4rem' }}>Pay</button>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* ─── RECENT CUSTOMERS ─── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>Recent Customers</h3>
          <a href={`/dashboard/customers?business_id=${getCurrentBusinessId() || ''}`} style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textDecoration: 'none' }}>View all →</a>
        </div>
        {previewCustomers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', background: 'var(--color-card)', borderRadius: '12px', border: '1px dashed var(--color-border)' }}>
            <p style={{ color: 'var(--color-text-muted)' }}>No customers yet</p>
            <a href={`/dashboard/customers/new?business_id=${getCurrentBusinessId() || ''}`} style={{ color: 'var(--color-accent)', fontWeight: '600', textDecoration: 'none' }}>Add customer →</a>
          </div>
        ) : (
          previewCustomers.map((c) => {
            const orders = allActiveOrders.filter(o => o.customer_id === c.id)
            const totalSpent = orders.reduce((sum, o) => sum + o.amount_paid, 0)
            const lastOrder = orders.length > 0 ? new Date(orders[0].created_at).toLocaleDateString('en-GB') : '—'
            return (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)' }}>
                <div>
                  <div style={{ fontWeight: '500' }}>{c.name}</div>
                  {c.phone && <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{c.phone}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: '500' }}>₦{totalSpent.toLocaleString()}</div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)' }}>Last: {lastOrder}</div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ─── FAB ─── */}
      <button onClick={() => setShowQuickOrder(true)} style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: 'var(--color-accent)', color: '#fff', width: '56px', height: '56px', borderRadius: '50%', border: 'none', boxShadow: 'var(--shadow-md)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="plus" size={24} stroke="#fff" />
      </button>

    {/* ─── QUICK ORDER MODAL ─── */}
      {showQuickOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'fadeIn 0.2s' }} onClick={() => setShowQuickOrder(false)}>
          <div ref={modalRef} onClick={(e) => e.stopPropagation()} style={{ background: 'var(--color-bg)', borderRadius: '20px 20px 0 0', padding: '1.5rem', maxWidth: '480px', width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ width: '40px', height: '4px', background: 'var(--color-border)', borderRadius: '4px', margin: '0 auto 1rem' }} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: '600', margin: '0 0 0.3rem' }}>New Order</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0 0 1.2rem' }}>Create an order in seconds.</p>
            <form onSubmit={handleQuickOrderSubmit}>
              <div style={{ marginBottom: '0.8rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', marginBottom: '0.2rem' }}>Customer</label>
                <select value={quickOrderCustomer} onChange={(e) => setQuickOrderCustomer(e.target.value)} required style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-card)' }}>
                  <option value="">Select customer</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '0.8rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', marginBottom: '0.2rem' }}>Item</label>
                <input type="text" value={quickOrderItem} onChange={(e) => setQuickOrderItem(e.target.value)} placeholder="e.g. Aso-ebi gown" required style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-card)' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.8rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', marginBottom: '0.2rem' }}>Price (₦)</label>
                  <input type="number" value={quickOrderPrice} onChange={(e) => setQuickOrderPrice(e.target.value)} placeholder="5000" required style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-card)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', marginBottom: '0.2rem' }}>Deposit (₦)</label>
                  <input type="number" value={quickOrderDeposit} onChange={(e) => setQuickOrderDeposit(e.target.value)} placeholder="2000" style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-card)' }} />
                </div>
              </div>
              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', marginBottom: '0.2rem' }}>Due date</label>
                <input type="date" value={quickOrderDue} onChange={(e) => setQuickOrderDue(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-card)' }} />
              </div>
              <button type="submit" disabled={quickOrderLoading || customers.length === 0} style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: 'none', background: 'var(--color-accent)', color: '#fff', fontWeight: '600', fontSize: '1rem', cursor: quickOrderLoading ? 'default' : 'pointer', opacity: quickOrderLoading ? 0.6 : 1 }}>Create order</button>
              {quickOrderMessage && <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: quickOrderMessage.startsWith('✅') ? 'var(--color-success)' : 'var(--color-danger)' }}>{quickOrderMessage}</p>}
            </form>
          </div>
        </div>
      )}

      {/* ─── SETTLE PAYMENT MODAL ─── */}
      {showSettleModal && settleOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowSettleModal(false)}>
          <div ref={modalRef} onClick={(e) => e.stopPropagation()} style={{ background: 'var(--color-bg)', borderRadius: '16px', padding: '1.5rem', maxWidth: '380px', width: '100%' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 0.3rem' }}>Record Payment</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0 0 1rem' }}>{settleOrder.customers?.name || 'Customer'} · Balance: ₦{(settleOrder.price - settleOrder.amount_paid).toLocaleString()}</p>
            <form onSubmit={handleSettleSubmit}>
              <div style={{ marginBottom: '0.8rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', marginBottom: '0.2rem' }}>Amount paid (₦)</label>
                <input type="number" value={settleAmount} onChange={(e) => setSettleAmount(e.target.value)} placeholder="Enter amount" required autoFocus style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-card)' }} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', marginBottom: '0.2rem' }}>Note</label>
                <input type="text" value={settleNote} onChange={(e) => setSettleNote(e.target.value)} placeholder="e.g. Cash" style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-card)' }} />
              </div>
              <button type="submit" disabled={settleLoading} style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: 'none', background: 'var(--color-success)', color: '#fff', fontWeight: '600', cursor: settleLoading ? 'default' : 'pointer', opacity: settleLoading ? 0.6 : 1 }}>Record payment</button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  )
        }
