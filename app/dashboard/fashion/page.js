'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import LetterLogo from '../../../components/LetterLogo'
import { isFeatureAvailable } from '../../../lib/planLimits'
import FeedbackBanner from '../../../components/FeedbackBanner'
import { getCurrentBusinessId } from '../../../lib/getBusinessId'

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

  const [showQuickOrder, setShowQuickOrder] = useState(false)
  const [quickOrderCustomer, setQuickOrderCustomer] = useState('')
  const [quickOrderItem, setQuickOrderItem] = useState('')
  const [quickOrderPrice, setQuickOrderPrice] = useState('')
  const [quickOrderDeposit, setQuickOrderDeposit] = useState('')
  const [quickOrderDue, setQuickOrderDue] = useState('')
  const [quickOrderLoading, setQuickOrderLoading] = useState(false)
  const [quickOrderMessage, setQuickOrderMessage] = useState('')

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
      'Order placed': { label: 'Placed', color: '#6B6255', bg: '#F0EDE8', icon: '📋' },
      'Cutting':      { label: 'Cutting', color: '#B4881E', bg: '#F6E9C8', icon: '✂️' },
      'Sewing':       { label: 'Sewing', color: '#1E3A5F', bg: '#D6E0EB', icon: '🧵' },
      'Ready':        { label: 'Ready', color: '#4C7A5E', bg: '#DCEBE2', icon: '✅' },
      'Delivered':    { label: 'Delivered', color: '#6B6255', bg: '#E8E0D5', icon: '📦' },
    }
    return map[status] || { label: status || 'Placed', color: '#6B6255', bg: '#F0EDE8', icon: '📋' }
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
    if (!dueDate) return { label: '—', color: '#C8C0B5' }
    if (isOverdue(dueDate)) return { label: '⚠️ Overdue', color: '#D9534F' }
    return { label: `Due ${new Date(dueDate).toLocaleDateString('en-GB')}`, color: '#8A8A8A' }
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
      <div style={{ minHeight: '100vh', background: '#F8F6F2', padding: '1rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '1.2rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', animation: 'pulse 1.5s infinite' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#E5E0D8' }} />
              <div><div style={{ width: '120px', height: '12px', background: '#E5E0D8', borderRadius: '6px', marginBottom: '4px' }} /><div style={{ width: '80px', height: '10px', background: '#E5E0D8', borderRadius: '6px' }} /></div>
            </div>
            <div style={{ width: '60px', height: '10px', background: '#E5E0D8', borderRadius: '6px' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: '0.8rem', marginBottom: '1rem' }}>
            {[1,2,3,4,5].map(i => <div key={i} style={{ background: '#fff', borderRadius: '12px', padding: '1rem', animation: 'pulse 1.5s infinite' }}><div style={{ width: '60%', height: '16px', background: '#E5E0D8', borderRadius: '6px', marginBottom: '6px' }} /><div style={{ width: '40%', height: '10px', background: '#E5E0D8', borderRadius: '6px' }} /></div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.8rem' }}>
            {[1,2,3].map(i => <div key={i} style={{ background: '#fff', borderRadius: '12px', padding: '1rem', animation: 'pulse 1.5s infinite' }}><div style={{ width: '70%', height: '14px', background: '#E5E0D8', borderRadius: '6px' }} /><div style={{ width: '40%', height: '10px', background: '#E5E0D8', borderRadius: '6px', marginTop: '6px' }} /></div>)}
          </div>
          <style>{`@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }`}</style>
        </div>
      </div>
    )
  }

  if (deactivated) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8F6F2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
        <div><h1 style={{ color: '#0F2B4A' }}>Account deactivated</h1><p style={{ color: '#8A8A8A' }}>Please contact support.</p></div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8F6F2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
        <div style={{ background: '#fff', padding: '2rem', borderRadius: '16px', maxWidth: '400px' }}>
          <h2 style={{ color: '#D9534F' }}>Oops!</h2>
          <p style={{ color: '#8A8A8A' }}>{error}</p>
          <button onClick={loadDashboard} style={{ background: '#D4A52A', color: '#0F2B4A', padding: '0.6rem 2rem', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer' }}>Retry</button>
        </div>
      </div>
    )
  }

  // ─── Main Render (inline styles for core sections) ───
  return (
    <div style={{ minHeight: '100vh', background: '#F8F6F2', padding: '1.2rem 1rem', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* ─── HEADER ─── */}
      <div style={{
        background: 'linear-gradient(135deg, #fff, #FAF8F5)',
        borderRadius: '16px',
        padding: '1rem 1.5rem',
        marginBottom: '1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 1px 3px rgba(15,43,74,0.04)',
        border: '1px solid rgba(15,43,74,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <LetterLogo name={business?.name} size={44} />
          <div>
            <div style={{ color: '#8A8A8A', fontSize: '0.7rem', fontWeight: '500' }}>Welcome back,</div>
            <div style={{ color: '#0F2B4A', fontSize: '1.2rem', fontWeight: '700' }}>
              {business?.name || 'Your business'}
              <span style={{ background: 'rgba(212,165,42,0.12)', color: '#D4A52A', padding: '0.05rem 0.6rem', borderRadius: '12px', fontSize: '0.6rem', fontWeight: '600', marginLeft: '0.4rem' }}>👗 Fashion</span>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.65rem', color: '#8A8A8A' }}>{new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
          <div style={{ fontWeight: '700', color: '#0F2B4A', fontSize: '1.1rem' }}>₦{todayRevenue.toLocaleString()}</div>
        </div>
      </div>

      {business && <FeedbackBanner business={business} />}

      {/* ─── BUSINESS HEALTH ─── */}
      <div style={{
        background: 'linear-gradient(135deg, #0F2B4A, #1A3F66)',
        borderRadius: '12px',
        padding: '1rem 1.5rem',
        marginBottom: '1rem',
        color: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.5rem',
        boxShadow: '0 8px 32px rgba(15,43,74,0.08)'
      }}>
        <div>
          <div style={{ fontSize: '0.7rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Business Health</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '700', letterSpacing: '-0.5px' }}>{healthScore}<span style={{ fontSize: '1rem', opacity: 0.6 }}>/100</span></div>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}><div style={{ fontWeight: '700', fontSize: '1rem' }}>{Math.round((1 - overdueCount / (totalOrders || 1)) * 100)}%</div><div style={{ fontSize: '0.6rem', opacity: 0.7 }}>On‑time</div></div>
          <div style={{ textAlign: 'center' }}><div style={{ fontWeight: '700', fontSize: '1rem' }}>{customers.length}</div><div style={{ fontSize: '0.6rem', opacity: 0.7 }}>Customers</div></div>
          <div style={{ textAlign: 'center' }}><div style={{ fontWeight: '700', fontSize: '1rem' }}>{allActiveOrders.filter(o => o.current_status !== 'Delivered').length}</div><div style={{ fontSize: '0.6rem', opacity: 0.7 }}>Active</div></div>
        </div>
      </div>

      {/* ─── REVENUE CARDS ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '1rem', textAlign: 'center', borderTop: '3px solid #D4A52A', boxShadow: '0 1px 3px rgba(15,43,74,0.04)' }}>
          <div style={{ fontSize: '0.6rem', color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Today</div>
          <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#0F2B4A' }}>₦{todayRevenue.toLocaleString()}</div>
          <span style={{ display: 'inline-block', padding: '0.1rem 0.5rem', borderRadius: '20px', fontSize: '0.55rem', fontWeight: '600', background: todayRevenue > 0 ? '#DCEBE2' : '#F0EDE8', color: todayRevenue > 0 ? '#2E7D5E' : '#8A8A8A' }}>{todayRevenue > 0 ? '📈' : '—'}</span>
        </div>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '1rem', textAlign: 'center', borderTop: '3px solid #D9534F', boxShadow: '0 1px 3px rgba(15,43,74,0.04)' }}>
          <div style={{ fontSize: '0.6rem', color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>This Week</div>
          <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#0F2B4A' }}>₦{weekRevenue.toLocaleString()}</div>
          <span style={{ display: 'inline-block', padding: '0.1rem 0.5rem', borderRadius: '20px', fontSize: '0.55rem', fontWeight: '600', background: weekRevenue > 0 ? '#DCEBE2' : '#F0EDE8', color: weekRevenue > 0 ? '#2E7D5E' : '#8A8A8A' }}>{weekRevenue > 0 ? '📈' : '—'}</span>
        </div>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '1rem', textAlign: 'center', borderTop: '3px solid #2E7D5E', boxShadow: '0 1px 3px rgba(15,43,74,0.04)' }}>
          <div style={{ fontSize: '0.6rem', color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>This Month</div>
          <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#0F2B4A' }}>₦{monthRevenue.toLocaleString()}</div>
          <span style={{ display: 'inline-block', padding: '0.1rem 0.5rem', borderRadius: '20px', fontSize: '0.55rem', fontWeight: '600', background: monthRevenue > 0 ? '#DCEBE2' : '#F0EDE8', color: monthRevenue > 0 ? '#2E7D5E' : '#8A8A8A' }}>{monthRevenue > 0 ? '📈' : '—'}</span>
        </div>
      </div>

      {/* ─── STATS GRID ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
        <a href="/dashboard/customers" style={{ background: '#fff', borderRadius: '12px', padding: '1rem', textAlign: 'center', border: '1px solid rgba(15,43,74,0.04)', textDecoration: 'none', boxShadow: '0 1px 3px rgba(15,43,74,0.04)' }}>
          <span style={{ fontSize: '1.4rem', display: 'block', marginBottom: '0.2rem' }}>👤</span>
          <div style={{ fontSize: '1.6rem', fontWeight: '700', color: '#0F2B4A' }}>{customers.length}</div>
          <div style={{ color: '#8A8A8A', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.3px', fontWeight: '600' }}>Customers</div>
        </a>
        <a href="/dashboard/orders" style={{ background: '#fff', borderRadius: '12px', padding: '1rem', textAlign: 'center', border: '1px solid rgba(15,43,74,0.04)', textDecoration: 'none', boxShadow: '0 1px 3px rgba(15,43,74,0.04)' }}>
          <span style={{ fontSize: '1.4rem', display: 'block', marginBottom: '0.2rem' }}>📦</span>
          <div style={{ fontSize: '1.6rem', fontWeight: '700', color: '#0F2B4A' }}>{totalOrders}</div>
          <div style={{ color: '#8A8A8A', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.3px', fontWeight: '600' }}>Orders</div>
        </a>
        <button onClick={toggleOwingFilter} style={{ background: '#fff', borderRadius: '12px', padding: '1rem', textAlign: 'center', border: showOwingOnly ? '2px solid #D9534F' : '1px solid rgba(15,43,74,0.04)', boxShadow: '0 1px 3px rgba(15,43,74,0.04)', cursor: 'pointer' }}>
          <span style={{ fontSize: '1.4rem', display: 'block', marginBottom: '0.2rem' }}>💰</span>
          <div style={{ fontSize: '1.6rem', fontWeight: '700', color: totalBalanceOwed > 0 ? '#D9534F' : '#2E7D5E' }}>₦{totalBalanceOwed.toLocaleString()}</div>
          <div style={{ color: '#8A8A8A', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.3px', fontWeight: '600' }}>{showOwingOnly ? '🔴 Filtered' : 'Owed'}</div>
        </button>
        <a href="/dashboard/orders?filter=ready" style={{ background: '#fff', borderRadius: '12px', padding: '1rem', textAlign: 'center', border: '1px solid rgba(15,43,74,0.04)', textDecoration: 'none', boxShadow: '0 1px 3px rgba(15,43,74,0.04)' }}>
          <span style={{ fontSize: '1.4rem', display: 'block', marginBottom: '0.2rem' }}>✅</span>
          <div style={{ fontSize: '1.6rem', fontWeight: '700', color: '#2E7D5E' }}>{readyCount}</div>
          <div style={{ color: '#8A8A8A', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.3px', fontWeight: '600' }}>Ready</div>
        </a>
        <a href="/dashboard/orders?filter=overdue" style={{ background: '#fff', borderRadius: '12px', padding: '1rem', textAlign: 'center', border: '1px solid rgba(15,43,74,0.04)', textDecoration: 'none', boxShadow: '0 1px 3px rgba(15,43,74,0.04)' }}>
          <span style={{ fontSize: '1.4rem', display: 'block', marginBottom: '0.2rem' }}>⚠️</span>
          <div style={{ fontSize: '1.6rem', fontWeight: '700', color: '#D9534F' }}>{overdueCount}</div>
          <div style={{ color: '#8A8A8A', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.3px', fontWeight: '600' }}>Overdue</div>
        </a>
      </div>

      {/* ─── ALERTS ─── */}
      {(overdueCount > 0 || dueTodayCount > 0 || readyCount > 0) && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {overdueCount > 0 && <span style={{ background: '#F1DBD3', color: '#D9534F', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600' }}>⚠️ {overdueCount} Overdue</span>}
          {dueTodayCount > 0 && <span style={{ background: '#FFF3E0', color: '#E67E22', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600' }}>📅 {dueTodayCount} Due today</span>}
          {readyCount > 0 && <span style={{ background: '#DCEBE2', color: '#2E7D5E', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600' }}>✅ {readyCount} Ready</span>}
        </div>
      )}

      {/* ─── QUICK ACTIONS ─── */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <a href="/dashboard/orders/new" style={{ flex: 1, minWidth: '80px', background: 'linear-gradient(135deg, #D4A52A, #C79A2B)', borderRadius: '12px', padding: '1rem', textAlign: 'center', textDecoration: 'none', color: '#0F2B4A', boxShadow: '0 1px 3px rgba(15,43,74,0.04)' }}>
          <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: '0.2rem' }}>📋</span>
          <span style={{ fontSize: '0.65rem', fontWeight: '600' }}>New Order</span>
        </a>
        <a href="/dashboard/customers/new" style={{ flex: 1, minWidth: '80px', background: '#0F2B4A', borderRadius: '12px', padding: '1rem', textAlign: 'center', textDecoration: 'none', color: '#fff', boxShadow: '0 1px 3px rgba(15,43,74,0.04)' }}>
          <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: '0.2rem' }}>👤</span>
          <span style={{ fontSize: '0.65rem', fontWeight: '600' }}>New Customer</span>
        </a>
        <a href={canCreateGroup ? "/dashboard/groups/new" : "#"} style={{ flex: 1, minWidth: '80px', background: '#fff', borderRadius: '12px', padding: '1rem', textAlign: 'center', textDecoration: 'none', color: '#0F2B4A', boxShadow: '0 1px 3px rgba(15,43,74,0.04)', opacity: canCreateGroup ? 1 : 0.5, border: canCreateGroup ? '2px solid #D4A52A' : '1px solid #E5E0D8' }} onClick={(e) => { if (!canCreateGroup) { e.preventDefault(); router.push('/dashboard/subscription') } }}>
          <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: '0.2rem' }}>👥</span>
          <span style={{ fontSize: '0.65rem', fontWeight: '600' }}>{canCreateGroup ? 'Group' : 'Group (Upgrade)'}</span>
        </a>
        <a href="/dashboard/reminders" style={{ flex: 1, minWidth: '80px', background: '#fff', borderRadius: '12px', padding: '1rem', textAlign: 'center', textDecoration: 'none', color: '#0F2B4A', boxShadow: '0 1px 3px rgba(15,43,74,0.04)' }}>
          <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: '0.2rem' }}>🔔</span>
          <span style={{ fontSize: '0.65rem', fontWeight: '600' }}>Reminders</span>
        </a>
      </div>

      {/* ─── RECENT ORDERS ─── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h3 style={{ color: '#0F2B4A', fontSize: '1.05rem', fontWeight: '700', margin: 0 }}>📋 Recent Orders</h3>
          <a href="/dashboard/orders" style={{ color: '#8A8A8A', fontSize: '0.75rem', textDecoration: 'none' }}>View all →</a>
        </div>
        {filteredPreviewOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#8A8A8A', background: '#fff', borderRadius: '12px', border: '1px dashed #E5E0D8' }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>📦</span>
            <h4 style={{ color: '#0F2B4A', fontSize: '1rem', margin: '0 0 0.2rem' }}>{showOwingOnly || statusFilter !== 'all' ? 'No orders match your filters' : 'No orders yet'}</h4>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>{showOwingOnly || statusFilter !== 'all' ? 'Try clearing the filters above.' : 'Create your first order to get started.'}</p>
            {!showOwingOnly && statusFilter === 'all' && <a href="/dashboard/orders/new" style={{ display: 'inline-block', marginTop: '0.5rem', padding: '0.5rem 1.2rem', borderRadius: '8px', background: '#D4A52A', color: '#0F2B4A', fontWeight: '600', textDecoration: 'none', fontSize: '0.85rem' }}>Create First Order →</a>}
          </div>
        ) : (
          filteredPreviewOrders.map((o) => {
            const status = getStatusInfo(o.current_status)
            const due = getDueDisplay(o.due_date)
            const balance = o.price - o.amount_paid
            return (
              <div key={o.id} style={{ background: '#fff', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '0.5rem', border: '1px solid rgba(15,43,74,0.04)', boxShadow: '0 1px 3px rgba(15,43,74,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: '#0F2B4A', fontSize: '0.95rem' }}>{o.customers?.name || 'No customer'}<span style={{ fontSize:'0.8rem', color:'#8A8A8A', marginLeft:'0.3rem' }}>· {getOrderName(o)}</span></div>
                    <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', marginTop:'0.2rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', padding: '0.15rem 0.7rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '600', background: status.bg, color: status.color }}><span style={{ marginRight:'0.2rem' }}>{status.icon}</span>{status.label}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: '500', color: due.color }}>{due.label}</span>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.3rem', flexShrink:0 }}>
                    <span style={{ fontWeight: '700', fontSize: '0.95rem', marginRight: '0.5rem', color: balance > 0 ? '#D9534F' : '#2E7D5E' }}>{balance > 0 ? `₦${balance.toLocaleString()}` : '✓'}</span>
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                      <a href={`/dashboard/orders/${o.id}`} style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '600', border: '1px solid #E5E0D8', background: '#fff', color: '#0F2B4A', textDecoration: 'none' }}>👁️</a>
                      {o.customers?.phone && <a href={`tel:${o.customers.phone}`} style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '600', border: '1px solid #E5E0D8', background: '#fff', color: '#0F2B4A', textDecoration: 'none' }}>📞</a>}
                      {balance > 0 && <button style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '600', border: '1px solid #2E7D5E', background: '#2E7D5E', color: '#fff', cursor: 'pointer' }} onClick={() => openSettleModal(o)}>💰</button>}
                      <a href={`/dashboard/orders/${o.id}?edit=true`} style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '600', border: '1px solid #0F2B4A', background: '#0F2B4A', color: '#fff', textDecoration: 'none' }}>✏️</a>
                      {o.customers?.phone && <button style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '600', border: '1px solid #D4A52A', background: '#D4A52A', color: '#0F2B4A', cursor: 'pointer' }} onClick={() => { const msg = `Hi ${o.customers?.name || ''}, your order ${getOrderName(o)} is ${status.label}.`; window.open(`https://wa.me/${o.customers.phone}?text=${encodeURIComponent(msg)}`, '_blank') }}>💬</button>}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ─── GROUP ORDERS ─── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h3 style={{ color: '#0F2B4A', fontSize: '1.05rem', fontWeight: '700', margin: 0 }}>👥 Group Orders</h3>
          <a href="/dashboard/groups" style={{ color: '#8A8A8A', fontSize: '0.75rem', textDecoration: 'none' }}>View all →</a>
        </div>
        {groups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#8A8A8A', background: '#fff', borderRadius: '12px', border: '1px dashed #E5E0D8' }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>👥</span>
            <h4 style={{ color: '#0F2B4A', fontSize: '1rem', margin: '0 0 0.2rem' }}>No group orders yet</h4>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>{canCreateGroup ? 'Create your first group order to manage Aso‑Ebi and bulk orders.' : 'Upgrade your plan to create group orders.'}</p>
            {canCreateGroup && <a href="/dashboard/groups/new" style={{ display: 'inline-block', marginTop: '0.5rem', padding: '0.5rem 1.2rem', borderRadius: '8px', background: '#D4A52A', color: '#0F2B4A', fontWeight: '600', textDecoration: 'none', fontSize: '0.85rem' }}>Create Group Order →</a>}
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
              <div key={g.id} style={{ background: '#fff', borderRadius: '12px', padding: '1rem', marginBottom: '0.5rem', border: isExpanded ? '1px solid #D4A52A' : '1px solid rgba(15,43,74,0.04)', boxShadow: '0 1px 3px rgba(15,43,74,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }} onClick={() => toggleGroup(g.id)}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontWeight: '700', color: '#0F2B4A', fontSize: '0.95rem' }}>{g.group_name}</span>
                      <span style={{ fontSize: '0.7rem', color: '#8A8A8A' }}>{g.orders.length} members</span>
                      {combinedBalance > 0 && <span style={{ fontSize: '0.6rem', background: '#F1DBD3', color: '#D9534F', padding: '0.1rem 0.5rem', borderRadius: '12px', fontWeight: '600' }}>₦{combinedBalance.toLocaleString()}</span>}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#8A8A8A' }}>Coordinator: {g.customers?.name || 'Unnamed'}</div>
                    <div style={{ marginTop: '0.3rem', background: '#F0EDE8', borderRadius: '10px', height: '4px', overflow: 'hidden' }}><div style={{ height: '100%', background: '#2E7D5E', borderRadius: '10px', width: `${progress}%` }} /></div>
                    <div style={{ fontSize: '0.8rem', fontWeight: '600', color: combinedBalance > 0 ? '#D9534F' : '#2E7D5E' }}>{combinedBalance > 0 ? `₦${combinedBalance.toLocaleString()} remaining` : '✓ All paid'}</div>
                  </div>
                  <span style={{ color: '#8A8A8A', fontSize: '0.8rem' }}>{isExpanded ? '▲' : '▼'}</span>
                </div>
                {isExpanded && hasVisible && (
                  <div style={{ marginTop: '1rem', borderTop: '1px solid #F0EDE8', paddingTop: '0.5rem' }}>
                    {filteredOrders.map((o) => {
                      const status = getStatusInfo(o.current_status)
                      const due = getDueDisplay(o.due_date)
                      const balance = o.price - o.amount_paid
                      return (
                        <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0', borderBottom: '1px solid #F0EDE8' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '600', color: '#0F2B4A', fontSize: '0.85rem' }}>{o.customers?.name || 'No customer'}</div>
                            <div style={{ fontSize: '0.7rem', color: '#8A8A8A', display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', padding: '0.05rem 0.4rem', borderRadius: '20px', fontSize: '0.55rem', fontWeight: '600', background: status.bg, color: status.color }}>{status.icon} {status.label}</span>
                              <span style={{ color: due.color }}>{due.label}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <span style={{ fontWeight: '700', color: balance > 0 ? '#D9534F' : '#2E7D5E' }}>{balance > 0 ? `₦${balance.toLocaleString()}` : '✓'}</span>
                            <a href={`/dashboard/orders/${o.id}`} style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '600', border: '1px solid #E5E0D8', background: '#fff', color: '#0F2B4A', textDecoration: 'none' }}>👁️</a>
                            {balance > 0 && <button style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '600', border: '1px solid #2E7D5E', background: '#2E7D5E', color: '#fff', cursor: 'pointer' }} onClick={() => openSettleModal(o)}>💰</button>}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h3 style={{ color: '#0F2B4A', fontSize: '1.05rem', fontWeight: '700', margin: 0 }}>👤 Recent Customers</h3>
          <a href="/dashboard/customers" style={{ color: '#8A8A8A', fontSize: '0.75rem', textDecoration: 'none' }}>View all →</a>
        </div>
        {previewCustomers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#8A8A8A', background: '#fff', borderRadius: '12px', border: '1px dashed #E5E0D8' }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>👤</span>
            <h4 style={{ color: '#0F2B4A', fontSize: '1rem', margin: '0 0 0.2rem' }}>No customers yet</h4>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>Add your first customer to start tracking orders.</p>
            <a href="/dashboard/customers/new" style={{ display: 'inline-block', marginTop: '0.5rem', padding: '0.5rem 1.2rem', borderRadius: '8px', background: '#D4A52A', color: '#0F2B4A', fontWeight: '600', textDecoration: 'none', fontSize: '0.85rem' }}>Add Customer →</a>
          </div>
        ) : (
          previewCustomers.map((c) => {
            const orders = allActiveOrders.filter(o => o.customer_id === c.id)
            const totalSpent = orders.reduce((sum, o) => sum + o.amount_paid, 0)
            const lastOrder = orders.length > 0 ? new Date(orders[0].created_at).toLocaleDateString('en-GB') : '—'
            return (
              <a key={c.id} href={`/dashboard/customers/${c.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 1rem', background: '#fff', borderRadius: '8px', border: '1px solid rgba(15,43,74,0.04)', textDecoration: 'none', marginBottom: '0.5rem', boxShadow: '0 1px 3px rgba(15,43,74,0.04)' }}>
                <div>
                  <div style={{ fontWeight: '600', color: '#0F2B4A', fontSize: '0.9rem' }}>{c.name}</div>
                  {c.phone && <div style={{ fontSize: '0.7rem', color: '#8A8A8A' }}>{c.phone}</div>}
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.7rem', color: '#8A8A8A' }}>
                  <div>₦{totalSpent.toLocaleString()}</div>
                  <div style={{ fontSize: '0.65rem' }}>Last: {lastOrder}</div>
                </div>
              </a>
            )
          })
        )}
      </div>

      {/* ─── FAB ─── */}
      <button style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', background: 'linear-gradient(135deg, #D4A52A, #C79A2B)', color: '#0F2B4A', width: '56px', height: '56px', borderRadius: '50%', border: 'none', fontSize: '1.8rem', fontWeight: '700', boxShadow: '0 4px 20px rgba(212,165,42,0.4)', cursor: 'pointer', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowQuickOrder(true)}>+</button>

      {/* ─── QUICK ORDER MODAL ─── */}
      {showQuickOrder && (
        <div style={{ position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex:1000, display:'flex', alignItems:'flex-end', justifyContent:'center', animation: 'slideUp 0.3s' }} onClick={() => setShowQuickOrder(false)}>
          <div style={{ background: '#F8F6F2', borderRadius: '20px 20px 0 0', padding: '1.5rem', maxWidth: '480px', width: '100%', maxHeight: '85vh', overflowY: 'auto' }} ref={modalRef} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: '40px', height: '4px', background: '#D6D0C5', borderRadius: '4px', margin: '0 auto 1rem' }}></div>
            <h2 style={{ color:'#0F2B4A', fontSize:'1.2rem', margin:'0 0 0.3rem' }}>Quick Order</h2>
            <p style={{ color:'#8A8A8A', fontSize:'0.85rem', margin:'0 0 1.2rem' }}>Create an order in seconds.</p>
            <form onSubmit={handleQuickOrderSubmit}>
              <div style={{ marginBottom:'0.8rem' }}>
                <label style={{ display:'block', fontSize:'0.85rem', fontWeight:'500' }}>Customer</label>
                <select style={{ width:'100%', padding:'0.7rem', borderRadius:'8px', border:'1px solid #E5E0D8', background:'#fff' }} value={quickOrderCustomer} onChange={(e) => setQuickOrderCustomer(e.target.value)} required>
                  <option value="">Select customer</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ marginBottom:'0.8rem' }}>
                <label style={{ display:'block', fontSize:'0.85rem', fontWeight:'500' }}>Item / Garment</label>
                <input style={{ width:'100%', padding:'0.7rem', borderRadius:'8px', border:'1px solid #E5E0D8' }} type="text" value={quickOrderItem} onChange={(e) => setQuickOrderItem(e.target.value)} placeholder="e.g. Aso-ebi gown" required />
              </div>
              <div style={{ display:'flex', gap:'0.5rem', marginBottom:'0.8rem' }}>
                <div style={{ flex:1 }}><label style={{ display:'block', fontSize:'0.85rem', fontWeight:'500' }}>Price (₦)</label><input style={{ width:'100%', padding:'0.7rem', borderRadius:'8px', border:'1px solid #E5E0D8' }} type="number" value={quickOrderPrice} onChange={(e) => setQuickOrderPrice(e.target.value)} placeholder="5000" required /></div>
                <div style={{ flex:1 }}><label style={{ display:'block', fontSize:'0.85rem', fontWeight:'500' }}>Deposit (₦)</label><input style={{ width:'100%', padding:'0.7rem', borderRadius:'8px', border:'1px solid #E5E0D8' }} type="number" value={quickOrderDeposit} onChange={(e) => setQuickOrderDeposit(e.target.value)} placeholder="2000" /></div>
              </div>
              <div style={{ marginBottom:'1.2rem' }}>
                <label style={{ display:'block', fontSize:'0.85rem', fontWeight:'500' }}>Due date</label>
                <input style={{ width:'100%', padding:'0.7rem', borderRadius:'8px', border:'1px solid #E5E0D8' }} type="date" value={quickOrderDue} onChange={(e) => setQuickOrderDue(e.target.value)} />
              </div>
              <button type="submit" disabled={quickOrderLoading || customers.length === 0} style={{ width:'100%', padding:'0.8rem', borderRadius:'10px', border:'none', background:'linear-gradient(135deg, #D4A52A, #C79A2B)', color:'#0F2B4A', fontWeight:'700', fontSize:'1rem', cursor: quickOrderLoading ? 'default' : 'pointer', opacity: quickOrderLoading ? 0.6 : 1 }}>
                {quickOrderLoading ? 'Creating...' : '🚀 Create order'}
              </button>
              {quickOrderMessage && <p style={{ marginTop:'0.8rem', fontSize:'0.85rem', color: quickOrderMessage.startsWith('✅') ? '#2E7D5E' : '#D9534F', textAlign:'center' }}>{quickOrderMessage}</p>}
            </form>
          </div>
        </div>
      )}

      {/* ─── SETTLE PAYMENT MODAL ─── */}
      {showSettleModal && settleOrder && (
        <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)', zIndex:1100, display:'flex', alignItems:'center', justifyContent:'center', padding:'1.5rem' }} onClick={() => setShowSettleModal(false)}>
          <div style={{ background:'#F8F6F2', borderRadius:'20px', padding:'1.8rem', maxWidth:'380px', width:'100%' }} ref={modalRef} onClick={(e) => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.3rem' }}>
              <h2 style={{ color:'#0F2B4A', fontSize:'1.1rem', margin:0 }}>💰 Record Payment</h2>
              <button onClick={() => setShowSettleModal(false)} style={{ background:'none', border:'none', fontSize:'1.3rem', color:'#8A8A8A', cursor:'pointer' }}>✕</button>
            </div>
            <p style={{ color:'#8A8A8A', fontSize:'0.85rem', margin:'0 0 1.2rem' }}>{settleOrder.customers?.name || 'Customer'} · Balance: ₦{(settleOrder.price - settleOrder.amount_paid).toLocaleString()}</p>
            <form onSubmit={handleSettleSubmit}>
              <div style={{ marginBottom:'0.8rem' }}>
                <label style={{ display:'block', fontSize:'0.85rem', fontWeight:'500' }}>Amount paid (₦)</label>
                <input style={{ width:'100%', padding:'0.7rem', borderRadius:'8px', border:'1px solid #E5E0D8' }} type="number" value={settleAmount} onChange={(e) => setSettleAmount(e.target.value)} placeholder="Enter amount" required autoFocus />
              </div>
              <div style={{ marginBottom:'1.2rem' }}>
                <label style={{ display:'block', fontSize:'0.85rem', fontWeight:'500' }}>Note (optional)</label>
                <input style={{ width:'100%', padding:'0.7rem', borderRadius:'8px', border:'1px solid #E5E0D8' }} type="text" value={settleNote} onChange={(e) => setSettleNote(e.target.value)} placeholder="e.g. Cash payment" />
              </div>
              <button type="submit" disabled={settleLoading} style={{ width:'100%', padding:'0.8rem', borderRadius:'10px', border:'none', background:'#2E7D5E', color:'#fff', fontWeight:'700', fontSize:'1rem', cursor: settleLoading ? 'default' : 'pointer', opacity: settleLoading ? 0.6 : 1 }}>
                {settleLoading ? 'Recording...' : '💰 Record payment'}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
        .btn-sm { padding: 0.25rem 0.6rem; border-radius: 6px; font-size: 0.7rem; font-weight: 600; border: 1px solid #E5E0D8; background: #fff; color: #0F2B4A; cursor: pointer; transition: all 0.2s ease; min-height: 32px; min-width: 32px; display: inline-flex; align-items: center; justify-content: center; }
        .btn-sm:hover { background: #F8F6F2; border-color: #D4A52A; transform: translateY(-1px); }
        .btn-sm.primary { background: #0F2B4A; color: #fff; border-color: #0F2B4A; }
        .btn-sm.primary:hover { background: #1A3F66; }
        .btn-sm.success { background: #2E7D5E; color: #fff; border-color: #2E7D5E; }
        .btn-sm.success:hover { background: #1E5A44; }
        .btn-sm.warning { background: #D4A52A; color: #0F2B4A; border-color: #D4A52A; }
        .btn-sm.warning:hover { background: #C79A2B; }
      `}</style>

      <div style={{ marginTop: '2.5rem', textAlign: 'center', fontSize: '0.6rem', color: '#C8C0B5', borderTop: '1px solid #E5E0D8', paddingTop: '1rem' }}>
        Cresoa Fashion · {new Date().getFullYear()}
      </div>
    </div>
  )
}
