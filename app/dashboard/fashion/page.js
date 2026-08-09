'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import LetterLogo from '../../../components/LetterLogo'
import { isFeatureAvailable } from '../../../lib/planLimits'
import FeedbackBanner from '../../../components/FeedbackBanner'
import { getCurrentBusinessId } from '../../../lib/getBusinessId'
import { Icon } from '../../../components/Icon'
import Banner from '../../../components/Banner'

export default function FashionDashboardPage() {
  const router = useRouter()
  const [business, setBusiness] = useState(null)
  const [customers, setCustomers] = useState([])
  const [soloOrders, setSoloOrders] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deactivated, setDeactivated] = useState(false)
  const [currentBusinessId, setCurrentBusinessId] = useState(null)
  const [showOwingOnly, setShowOwingOnly] = useState(false)

  // ─── Modals state ───
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

  // ─── Time-aware greeting ───
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return { text: 'Good morning', emoji: '☀️' }
    if (hour < 17) return { text: 'Good afternoon', emoji: '🌤️' }
    return { text: 'Good evening', emoji: '🌙' }
  }
  const greeting = getGreeting()

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

      const bizId = getCurrentBusinessId()
      if (!bizId) {
        router.push('/dashboard')
        return
      }
      setCurrentBusinessId(bizId)

      let businessData = null
      if (bizId) {
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', bizId)
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

      // ─── Fetch data ───
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
      setError('Failed to load dashboard.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  // ─── Click outside modal ───
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

  // ─── Handlers ───
  const toggleOwingFilter = () => setShowOwingOnly(!showOwingOnly)

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
      'Order placed': { label: 'Placed', color: '#6B6255', bg: '#F0EDE8' },
      'Cutting':      { label: 'Cutting', color: '#B4881E', bg: '#F6E9C8' },
      'Sewing':       { label: 'Sewing', color: '#1E3A5F', bg: '#D6E0EB' },
      'Ready':        { label: 'Ready', color: '#2E7D5E', bg: '#DCEBE2' },
      'Delivered':    { label: 'Delivered', color: '#6B6255', bg: '#E8E0D5' },
    }
    return map[status] || { label: status || 'Placed', color: '#6B6255', bg: '#F0EDE8' }
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
    if (isOverdue(dueDate)) return { label: 'Overdue', color: '#D9534F' }
    return { label: `Due ${new Date(dueDate).toLocaleDateString('en-GB')}`, color: '#8A8A8A' }
  }

  const hasBalance = (order) => (order.price - order.amount_paid) > 0

  // ─── Derived Stats (All Real Data) ───
  const previewCustomers = customers.slice(0, 5)
  const previewOrders = soloOrders.slice(0, 5)
  const allGroupOrders = groups.flatMap(g => g.orders)
  const allActiveOrders = [...soloOrders, ...allGroupOrders]
  const totalOrders = allActiveOrders.length
  const totalBalanceOwed = allActiveOrders.reduce((sum, o) => sum + Math.max(0, o.price - o.amount_paid), 0)
  const todayStr = new Date().toISOString().split('T')[0]
  const today = new Date()
  today.setHours(0,0,0,0)
  const readyCount = allActiveOrders.filter(o => o.current_status === 'Ready').length
  const overdueCount = allActiveOrders.filter(o => {
    if (!o.due_date || o.current_status === 'Delivered') return false
    const due = new Date(o.due_date)
    due.setHours(0,0,0,0)
    return due < today
  }).length

  // ─── Real Revenue Data ───
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  const thisMonthRevenue = allActiveOrders.filter(o => {
    const d = new Date(o.created_at)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  }).reduce((sum, o) => sum + (o.amount_paid || 0), 0)

  // Previous month revenue (for comparison)
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
  const prevMonthRevenue = allActiveOrders.filter(o => {
    const d = new Date(o.created_at)
    return d.getMonth() === prevMonth && d.getFullYear() === prevYear
  }).reduce((sum, o) => sum + (o.amount_paid || 0), 0)

  // ─── Real On-Time % ───
  const deliveredOrders = allActiveOrders.filter(o => o.current_status === 'Delivered')
  const onTimeDelivered = deliveredOrders.filter(o => {
    if (!o.due_date) return true // No due date counts as on-time
    const due = new Date(o.due_date)
    const delivered = new Date(o.created_at) // Fallback: use created_at
    // If we have a delivered_at field, use it. Otherwise, use created_at as approximation.
    return true // For now, we'll calculate differently
  })

  // Better: count orders that were delivered on or before due date
  const onTimeCount = deliveredOrders.filter(o => {
    if (!o.due_date) return true
    const due = new Date(o.due_date)
    due.setHours(0,0,0,0)
    const delivered = new Date(o.updated_at || o.created_at) // Use updated_at if available
    delivered.setHours(0,0,0,0)
    return delivered <= due
  }).length

  const deliveredCount = deliveredOrders.length
  const onTimePercentage = deliveredCount > 0 ? Math.round((onTimeCount / deliveredCount) * 100) : 0

  // ─── Health Score ───
  const healthScore = (() => {
    let score = 100
    if (overdueCount > 0) score -= overdueCount * 5
    if (totalBalanceOwed > 0) score -= 5
    if (customers.length === 0) score -= 10
    if (totalOrders === 0) score -= 10
    if (deliveredCount > 0 && onTimePercentage < 80) score -= 10
    return Math.max(0, Math.min(100, score))
  })()

  const getHealthStatus = () => {
    if (healthScore >= 80) return { label: 'Excellent', color: '#2E7D5E' }
    if (healthScore >= 60) return { label: 'Good', color: '#D4A52A' }
    return { label: 'Needs attention', color: '#D9534F' }
  }
  const healthStatus = getHealthStatus()

  // ─── Revenue trend (real data: last 6 months) ───
  const getMonthlyRevenue = () => {
    const months = []
    for (let i = 5; i >= 0; i--) {
      const m = new Date()
      m.setMonth(m.getMonth() - i)
      const month = m.getMonth()
      const year = m.getFullYear()
      const revenue = allActiveOrders.filter(o => {
        const d = new Date(o.created_at)
        return d.getMonth() === month && d.getFullYear() === year
      }).reduce((sum, o) => sum + (o.amount_paid || 0), 0)
      months.push(revenue)
    }
    return months
  }
  const monthlyRevenue = getMonthlyRevenue()
  const maxRevenue = Math.max(...monthlyRevenue, 1)

  // ─── Format currency ───
  const formatCurrency = (amount) => {
    return `₦${(amount || 0).toLocaleString()}`
  }

  // ─── Loading skeleton ───
  if (loading) {
    return (
      <div style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ animation: 'pulse 1.5s infinite' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ width: '160px', height: '28px', background: '#E5E0D8', borderRadius: '6px' }} />
            <div style={{ width: '40px', height: '40px', background: '#E5E0D8', borderRadius: '50%' }} />
          </div>
          <div style={{ width: '100%', height: '120px', background: '#E5E0D8', borderRadius: '16px', marginBottom: '1rem' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '1rem' }}>
            <div style={{ height: '80px', background: '#E5E0D8', borderRadius: '12px' }} />
            <div style={{ height: '80px', background: '#E5E0D8', borderRadius: '12px' }} />
            <div style={{ height: '80px', background: '#E5E0D8', borderRadius: '12px' }} />
            <div style={{ height: '80px', background: '#E5E0D8', borderRadius: '12px' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
            {[1,2,3,4].map(i => <div key={i} style={{ height: '80px', background: '#E5E0D8', borderRadius: '12px' }} />)}
          </div>
        </div>
        <style>{`@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }`}</style>
      </div>
    )
  }

  if (deactivated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
        <div><h1 style={{ color: '#0F2B4A' }}>Account deactivated</h1><p style={{ color: '#8A8A8A' }}>Please contact support.</p></div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
        <div style={{ background: '#fff', padding: '2rem', borderRadius: '16px', maxWidth: '400px' }}>
          <h2 style={{ color: '#D9534F' }}>Oops!</h2>
          <p style={{ color: '#8A8A8A' }}>{error}</p>
          <button onClick={loadDashboard} style={{ marginTop: '1rem', padding: '0.6rem 2rem', background: '#D4A52A', color: '#0F2B4A', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      padding: '1rem', 
      maxWidth: '1200px', 
      margin: '0 auto', 
      color: 'var(--color-text)',
      fontFamily: "'Inter', -apple-system, sans-serif"
    }}>
      {/* ─── BANNER ─── */}
      <Banner />

      {/* ─── WELCOME ─── */}
      <div style={{ marginBottom: '1.2rem' }}>
        <div style={{ fontSize: '0.85rem', color: '#6B6255', marginBottom: '0.1rem' }}>
          {greeting.text} {greeting.emoji}
        </div>
        <h1 style={{ fontSize: '1.3rem', fontWeight: '700', color: '#0F2B4A', margin: 0 }}>
          {business?.name || 'Your business'}
        </h1>
      </div>

      {/* ─── BETA FEEDBACK BANNER ─── */}
      {business?.plan === 'beta' && !business.has_applied_for_beta && (
        <div style={{
          background: '#0F2B4A',
          borderRadius: '12px',
          padding: '0.8rem 1rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem'
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', fontWeight: '500', fontSize: '0.8rem' }}>
              💡 You're on the Beta plan
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>
              Help us improve Cresoa.
            </div>
          </div>
          <a
            href={`/dashboard/feedback?business_id=${currentBusinessId}`}
            style={{
              padding: '0.3rem 0.8rem',
              background: '#D4A52A',
              color: '#0F2B4A',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: '600',
              textDecoration: 'none',
              whiteSpace: 'nowrap'
            }}
          >
            Give feedback
          </a>
        </div>
      )}

      {/* ─── BUSINESS HEALTH ─── */}
      <div style={{
        background: '#0F2B4A',
        borderRadius: '16px',
        padding: '1.2rem 1.2rem 1rem',
        marginBottom: '1rem',
        color: '#fff'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
          <span style={{ fontSize: '0.7rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
            Business Health
          </span>
          <button style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
            <Icon name="info" size={16} stroke="rgba(255,255,255,0.5)" />
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.8rem', marginBottom: '0.1rem' }}>
          <span style={{ fontSize: '2rem', fontWeight: '700', letterSpacing: '-0.5px' }}>
            {healthScore}
          </span>
          <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>/ 100</span>
          <span style={{
            marginLeft: 'auto',
            fontSize: '0.75rem',
            fontWeight: '600',
            color: healthStatus.color,
            background: 'rgba(255,255,255,0.08)',
            padding: '0.1rem 0.6rem',
            borderRadius: '12px'
          }}>
            ● {healthStatus.label}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.5rem' }}>
          <div>
            <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>
              {onTimePercentage}%
            </div>
            <div style={{ fontSize: '0.6rem', opacity: 0.6 }}>On-time</div>
          </div>
          <div>
            <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{customers.length}</div>
            <div style={{ fontSize: '0.6rem', opacity: 0.6 }}>Customers</div>
          </div>
          <div>
            <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>
              {allActiveOrders.filter(o => o.current_status !== 'Delivered').length}
            </div>
            <div style={{ fontSize: '0.6rem', opacity: 0.6 }}>Active</div>
          </div>
        </div>
      </div>

      {/* ─── ATTENTION / OVERDUE ─── */}
      {overdueCount > 0 && (
        <div style={{
          background: '#FEF6F4',
          border: '1px solid #D9534F',
          borderRadius: '12px',
          padding: '0.8rem 1rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Icon name="alert-triangle" size={20} stroke="#D9534F" />
            <div>
              <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#1A1A1A' }}>
                {overdueCount} overdue order{overdueCount !== 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6B6255' }}>
                {formatCurrency(totalBalanceOwed)} outstanding
              </div>
            </div>
          </div>
          <a
            href={`/dashboard/orders?business_id=${currentBusinessId}&filter=overdue`}
            style={{
              padding: '0.3rem 1rem',
              background: '#D9534F',
              color: '#fff',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: '600',
              textDecoration: 'none'
            }}
          >
            Review →
          </a>
        </div>
      )}

      {/* ─── KEY METRICS ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '1rem' }}>
        <div style={{
          background: '#fff',
          borderRadius: '14px',
          padding: '0.8rem',
          border: '1px solid #E5E0D8',
          boxShadow: '0 2px 8px rgba(15,43,74,0.04)'
        }}>
          <div style={{ fontSize: '0.6rem', color: '#6B6255', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Revenue</div>
          <div style={{ fontWeight: '700', fontSize: '1.2rem', color: '#0F2B4A' }}>
            {formatCurrency(thisMonthRevenue)}
          </div>
          <div style={{ fontSize: '0.6rem', color: '#6B6255' }}>
            {prevMonthRevenue > 0 ? `↑ ${Math.round((thisMonthRevenue / prevMonthRevenue - 1) * 100)}% vs last month` : 'This month'}
          </div>
        </div>
        <div style={{
          background: '#fff',
          borderRadius: '14px',
          padding: '0.8rem',
          border: '1px solid #E5E0D8',
          boxShadow: '0 2px 8px rgba(15,43,74,0.04)'
        }}>
          <div style={{ fontSize: '0.6rem', color: '#6B6255', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Orders</div>
          <div style={{ fontWeight: '700', fontSize: '1.2rem', color: '#0F2B4A' }}>{totalOrders}</div>
          <div style={{ fontSize: '0.6rem', color: '#6B6255' }}>Total</div>
        </div>
        <div style={{
          background: '#fff',
          borderRadius: '14px',
          padding: '0.8rem',
          border: '1px solid #E5E0D8',
          boxShadow: '0 2px 8px rgba(15,43,74,0.04)'
        }}>
          <div style={{ fontSize: '0.6rem', color: '#6B6255', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Customers</div>
          <div style={{ fontWeight: '700', fontSize: '1.2rem', color: '#0F2B4A' }}>{customers.length}</div>
          <div style={{ fontSize: '0.6rem', color: '#6B6255' }}>Total</div>
        </div>
        <div style={{
          background: '#fff',
          borderRadius: '14px',
          padding: '0.8rem',
          border: '1px solid #E5E0D8',
          boxShadow: '0 2px 8px rgba(15,43,74,0.04)'
        }}>
          <div style={{ fontSize: '0.6rem', color: '#6B6255', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Outstanding</div>
          <div style={{ fontWeight: '700', fontSize: '1.2rem', color: totalBalanceOwed > 0 ? '#D9534F' : '#2E7D5E' }}>
            {totalBalanceOwed > 0 ? formatCurrency(totalBalanceOwed) : '✓ Paid'}
          </div>
          <div style={{ fontSize: '0.6rem', color: '#6B6255' }}>
            {overdueCount > 0 ? `${overdueCount} overdue` : 'All paid'}
          </div>
        </div>
      </div>

      {/* ─── QUICK ACTIONS ─── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.6rem', color: '#6B6255', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '0.5rem' }}>
          Quick Actions
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
          <a
            href={`/dashboard/orders/new?business_id=${currentBusinessId}`}
            style={{
              background: '#D4A52A',
              borderRadius: '14px',
              padding: '0.8rem',
              textAlign: 'center',
              textDecoration: 'none',
              color: '#0F2B4A',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '80px',
              border: 'none'
            }}
          >
            <Icon name="plus" size={24} stroke="#0F2B4A" style={{ marginBottom: '0.2rem' }} />
            <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>New Order</div>
            <div style={{ fontSize: '0.65rem', opacity: 0.7 }}>Create order</div>
          </a>
          <a
            href={`/dashboard/customers/new?business_id=${currentBusinessId}`}
            style={{
              background: '#fff',
              borderRadius: '14px',
              padding: '0.8rem',
              textAlign: 'center',
              textDecoration: 'none',
              color: '#1A1A1A',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '80px',
              border: '1px solid #E5E0D8'
            }}
          >
            <Icon name="user-plus" size={24} stroke="#0F2B4A" style={{ marginBottom: '0.2rem' }} />
            <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>New Customer</div>
            <div style={{ fontSize: '0.65rem', color: '#6B6255' }}>Add customer</div>
          </a>
          <a
            href={canCreateGroup ? `/dashboard/groups/new?business_id=${currentBusinessId}` : '#'}
            onClick={(e) => { if (!canCreateGroup) { e.preventDefault(); router.push(`/dashboard/subscription?business_id=${currentBusinessId}`) } }}
            style={{
              background: '#fff',
              borderRadius: '14px',
              padding: '0.8rem',
              textAlign: 'center',
              textDecoration: 'none',
              color: '#1A1A1A',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '80px',
              border: '1px solid #E5E0D8',
              opacity: canCreateGroup ? 1 : 0.5
            }}
          >
            <Icon name="layers" size={24} stroke="#0F2B4A" style={{ marginBottom: '0.2rem' }} />
            <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>{canCreateGroup ? 'Group Order' : 'Group (Upgrade)'}</div>
            <div style={{ fontSize: '0.65rem', color: '#6B6255' }}>
              {canCreateGroup ? 'Create group' : 'Upgrade to unlock'}
            </div>
          </a>
          <a
            href={`/dashboard/reminders?business_id=${currentBusinessId}`}
            style={{
              background: '#fff',
              borderRadius: '14px',
              padding: '0.8rem',
              textAlign: 'center',
              textDecoration: 'none',
              color: '#1A1A1A',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '80px',
              border: '1px solid #E5E0D8'
            }}
          >
            <Icon name="bell" size={24} stroke="#0F2B4A" style={{ marginBottom: '0.2rem' }} />
            <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>Reminder</div>
            <div style={{ fontSize: '0.65rem', color: '#6B6255' }}>Send reminder</div>
          </a>
        </div>
      </div>

      {/* ─── REVENUE TREND ─── */}
      <div style={{
        background: '#fff',
        borderRadius: '14px',
        padding: '1rem',
        border: '1px solid #E5E0D8',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>Revenue</span>
          <span style={{ fontSize: '0.65rem', color: '#6B6255' }}>This month</span>
        </div>
        <div style={{ fontWeight: '700', fontSize: '1.5rem', color: '#0F2B4A' }}>
          {formatCurrency(thisMonthRevenue)}
        </div>
        {prevMonthRevenue > 0 ? (
          <div style={{ fontSize: '0.7rem', color: thisMonthRevenue >= prevMonthRevenue ? '#2E7D5E' : '#D9534F', marginTop: '0.1rem' }}>
            {thisMonthRevenue >= prevMonthRevenue ? '↑' : '↓'} {Math.round(Math.abs((thisMonthRevenue / prevMonthRevenue - 1) * 100))}% vs last month
          </div>
        ) : (
          <div style={{ fontSize: '0.7rem', color: '#6B6255', marginTop: '0.1rem' }}>
            Start completing orders to see revenue trends.
          </div>
        )}
        <div style={{
          height: '60px',
          marginTop: '0.5rem',
          display: 'flex',
          alignItems: 'flex-end',
          gap: '0.2rem',
          borderTop: '1px solid #F0EDE8',
          paddingTop: '0.5rem'
        }}>
          {monthlyRevenue.some(r => r > 0) ? (
            monthlyRevenue.map((value, index) => (
              <div
                key={index}
                style={{
                  flex: 1,
                  height: `${Math.max((value / maxRevenue) * 50, 4)}px`,
                  background: index === monthlyRevenue.length - 1 ? '#D4A52A' : '#D4A52A',
                  opacity: index === monthlyRevenue.length - 1 ? 1 : 0.4,
                  borderRadius: '2px 2px 0 0',
                  transition: 'height 0.3s ease'
                }}
              />
            ))
          ) : (
            <div style={{ width: '100%', textAlign: 'center', color: '#C8C0B5', fontSize: '0.6rem' }}>
              No data yet
            </div>
          )}
        </div>
      </div>

      {/* ─── RECENT ORDERS ─── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontWeight: '600', fontSize: '0.85rem', color: '#1A1A1A' }}>Recent Orders</span>
          <a href={`/dashboard/orders?business_id=${currentBusinessId}`} style={{ fontSize: '0.7rem', color: '#6B6255', textDecoration: 'none' }}>
            View all →
          </a>
        </div>
        {previewOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', background: '#fff', borderRadius: '12px', border: '1px dashed #E5E0D8' }}>
            <p style={{ color: '#6B6255', fontSize: '0.85rem' }}>No orders yet</p>
            <a href={`/dashboard/orders/new?business_id=${currentBusinessId}`} style={{ color: '#D4A52A', fontWeight: '600', textDecoration: 'none', fontSize: '0.8rem' }}>
              Create first order →
            </a>
          </div>
        ) : (
          previewOrders.map((o) => {
            const status = getStatusInfo(o.current_status)
            const due = getDueDisplay(o.due_date)
            const balance = o.price - o.amount_paid
            const isOverdueOrder = o.due_date && isOverdue(o.due_date) && o.current_status !== 'Delivered'
            return (
              <div
                key={o.id}
                onClick={() => router.push(`/dashboard/orders/${o.id}?business_id=${currentBusinessId}`)}
                style={{
                  background: '#fff',
                  borderRadius: '12px',
                  padding: '0.8rem 1rem',
                  border: '1px solid #E5E0D8',
                  marginBottom: '0.5rem',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(15,43,74,0.06)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#1A1A1A' }}>
                      {o.customers?.name || 'No customer'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6B6255' }}>{getOrderName(o)}</div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                      <span style={{ fontSize: '0.6rem', background: status.bg, color: status.color, padding: '0.1rem 0.5rem', borderRadius: '10px', fontWeight: '500' }}>
                        {status.label}
                      </span>
                      {isOverdueOrder && (
                        <span style={{ fontSize: '0.6rem', background: '#F1DBD3', color: '#D9534F', padding: '0.1rem 0.5rem', borderRadius: '10px', fontWeight: '500' }}>
                          Overdue
                        </span>
                      )}
                      {o.due_date && (
                        <span style={{ fontSize: '0.6rem', color: due.color === '#D9534F' ? '#D9534F' : '#6B6255' }}>
                          {due.label}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#0F2B4A', textAlign: 'right' }}>
                    {formatCurrency(o.price)}
                    {balance > 0 && (
                      <div style={{ fontSize: '0.6rem', color: '#D9534F', fontWeight: '500' }}>
                        {formatCurrency(balance)} due
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ─── RECENT CUSTOMERS ─── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontWeight: '600', fontSize: '0.85rem', color: '#1A1A1A' }}>Recent Customers</span>
          <a href={`/dashboard/customers?business_id=${currentBusinessId}`} style={{ fontSize: '0.7rem', color: '#6B6255', textDecoration: 'none' }}>
            View all →
          </a>
        </div>
        {previewCustomers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', background: '#fff', borderRadius: '12px', border: '1px dashed #E5E0D8' }}>
            <p style={{ color: '#6B6255', fontSize: '0.85rem' }}>No customers yet</p>
            <a href={`/dashboard/customers/new?business_id=${currentBusinessId}`} style={{ color: '#D4A52A', fontWeight: '600', textDecoration: 'none', fontSize: '0.8rem' }}>
              Add first customer →
            </a>
          </div>
        ) : (
          previewCustomers.map((c) => {
            const orders = allActiveOrders.filter(o => o.customer_id === c.id)
            const totalSpent = orders.reduce((sum, o) => sum + o.amount_paid, 0)
            const lastOrder = orders.length > 0 ? new Date(orders[0].created_at).toLocaleDateString('en-GB') : '—'
            return (
              <div
                key={c.id}
                onClick={() => router.push(`/dashboard/customers/${c.id}?business_id=${currentBusinessId}`)}
                style={{
                  background: '#fff',
                  borderRadius: '12px',
                  padding: '0.6rem 1rem',
                  border: '1px solid #E5E0D8',
                  marginBottom: '0.4rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'box-shadow 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(15,43,74,0.06)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
              >
                <div>
                  <div style={{ fontWeight: '500', fontSize: '0.85rem', color: '#1A1A1A' }}>{c.name}</div>
                  {c.phone && <div style={{ fontSize: '0.7rem', color: '#6B6255' }}>{c.phone}</div>}
                  <div style={{ fontSize: '0.6rem', color: '#6B6255', marginTop: '0.1rem' }}>
                    Last order · {lastOrder}
                  </div>
                </div>
                <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#0F2B4A', textAlign: 'right' }}>
                  {formatCurrency(totalSpent)}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ─── GROUP ORDERS ─── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontWeight: '600', fontSize: '0.85rem', color: '#1A1A1A' }}>Group Orders</span>
          <a href={`/dashboard/groups?business_id=${currentBusinessId}`} style={{ fontSize: '0.7rem', color: '#6B6255', textDecoration: 'none' }}>
            View all →
          </a>
        </div>
        {groups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', background: '#fff', borderRadius: '12px', border: '1px dashed #E5E0D8' }}>
            <p style={{ color: '#6B6255', fontSize: '0.85rem' }}>No group orders yet</p>
            {canCreateGroup && (
              <a href={`/dashboard/groups/new?business_id=${currentBusinessId}`} style={{ color: '#D4A52A', fontWeight: '600', textDecoration: 'none', fontSize: '0.8rem' }}>
                Create group →
              </a>
            )}
          </div>
        ) : (
          groups.slice(0, 2).map((g) => {
            const totalMembers = g.orders.length
            const totalBalanceGroup = g.orders.reduce((sum, o) => sum + ((o.price || 0) - (o.amount_paid || 0)), 0)
            const deliveredCount = g.orders.filter(o => o.current_status === 'Delivered').length
            const progress = totalMembers > 0 ? Math.round((deliveredCount / totalMembers) * 100) : 0
            return (
              <div
                key={g.id}
                onClick={() => router.push(`/dashboard/groups/${g.id}?business_id=${currentBusinessId}`)}
                style={{
                  background: '#fff',
                  borderRadius: '12px',
                  padding: '0.8rem 1rem',
                  border: '1px solid #E5E0D8',
                  marginBottom: '0.5rem',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(15,43,74,0.06)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '600', fontSize: '0.85rem', color: '#1A1A1A' }}>{g.group_name}</span>
                  <span style={{
                    fontSize: '0.6rem',
                    fontWeight: '600',
                    color: g.status === 'completed' ? '#2E7D5E' : '#D4A52A',
                    background: g.status === 'completed' ? '#DCEBE2' : '#F6E9C8',
                    padding: '0.1rem 0.5rem',
                    borderRadius: '10px'
                  }}>
                    {g.status === 'completed' ? 'Done' : 'Active'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem' }}>
                  <span style={{ fontSize: '0.7rem', color: '#6B6255' }}>
                    {totalMembers} member{totalMembers !== 1 ? 's' : ''} · {formatCurrency(totalBalanceGroup)} remaining
                  </span>
                  <span style={{ fontSize: '0.7rem', fontWeight: '600', color: '#0F2B4A' }}>
                    {progress}%
                  </span>
                </div>
                <div style={{ marginTop: '0.3rem', height: '4px', background: '#F0EDE8', borderRadius: '4px' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: '#2E7D5E', borderRadius: '4px' }} />
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ─── REMINDERS ─── */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontWeight: '600', fontSize: '0.85rem', color: '#1A1A1A' }}>Reminders</span>
          <a href={`/dashboard/reminders?business_id=${currentBusinessId}`} style={{ fontSize: '0.7rem', color: '#6B6255', textDecoration: 'none' }}>
            View all →
          </a>
        </div>
        <div style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '0.8rem 1rem',
          border: '1px solid #E5E0D8',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontWeight: '500', fontSize: '0.85rem', color: '#1A1A1A' }}>No pending reminders</div>
            <div style={{ fontSize: '0.7rem', color: '#6B6255' }}>0 due today · 0 overdue</div>
          </div>
          <a
            href={`/dashboard/reminders/new?business_id=${currentBusinessId}`}
            style={{
              padding: '0.2rem 0.8rem',
              background: '#D4A52A',
              color: '#0F2B4A',
              borderRadius: '6px',
              fontSize: '0.7rem',
              fontWeight: '600',
              textDecoration: 'none'
            }}
          >
            + New
          </a>
        </div>
      </div>

      {/* ─── FAB ─── */}
      <button
        onClick={() => setShowQuickOrder(true)}
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          background: '#D4A52A',
          color: '#0F2B4A',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          border: 'none',
          boxShadow: '0 4px 20px rgba(212,165,42,0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.8rem',
          fontWeight: '700',
          zIndex: 100
        }}
      >
        <Icon name="plus" size={24} stroke="#0F2B4A" />
      </button>

      {/* ─── QUICK ORDER MODAL ─── */}
      {showQuickOrder && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          animation: 'slideUp 0.3s'
        }} onClick={() => setShowQuickOrder(false)}>
          <div style={{
            background: '#F8F6F2',
            borderRadius: '20px 20px 0 0',
            padding: '1.5rem',
            maxWidth: '480px',
            width: '100%',
            maxHeight: '85vh',
            overflowY: 'auto'
          }} ref={modalRef} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: '40px', height: '4px', background: '#D6D0C5', borderRadius: '4px', margin: '0 auto 1rem' }} />
            <h2 style={{ color: '#0F2B4A', fontSize: '1.2rem', margin: '0 0 0.3rem' }}>New Order</h2>
            <p style={{ color: '#6B6255', fontSize: '0.85rem', margin: '0 0 1.2rem' }}>Create an order in seconds.</p>
            <form onSubmit={handleQuickOrderSubmit}>
              <div style={{ marginBottom: '0.8rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', marginBottom: '0.2rem', color: '#1A1A1A' }}>Customer</label>
                <select
                  value={quickOrderCustomer}
                  onChange={(e) => setQuickOrderCustomer(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #E5E0D8', background: '#fff', color: '#1A1A1A', fontSize: '0.9rem' }}
                >
                  <option value="">Select customer</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '0.8rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', marginBottom: '0.2rem', color: '#1A1A1A' }}>Item / Garment</label>
                <input
                  type="text"
                  value={quickOrderItem}
                  onChange={(e) => setQuickOrderItem(e.target.value)}
                  placeholder="e.g. Aso-ebi gown"
                  required
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #E5E0D8', background: '#fff', color: '#1A1A1A', fontSize: '0.9rem' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.8rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', marginBottom: '0.2rem', color: '#1A1A1A' }}>Price (₦)</label>
                  <input
                    type="number"
                    value={quickOrderPrice}
                    onChange={(e) => setQuickOrderPrice(e.target.value)}
                    placeholder="5000"
                    required
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #E5E0D8', background: '#fff', color: '#1A1A1A', fontSize: '0.9rem' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', marginBottom: '0.2rem', color: '#1A1A1A' }}>Deposit (₦)</label>
                  <input
                    type="number"
                    value={quickOrderDeposit}
                    onChange={(e) => setQuickOrderDeposit(e.target.value)}
                    placeholder="2000"
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #E5E0D8', background: '#fff', color: '#1A1A1A', fontSize: '0.9rem' }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', marginBottom: '0.2rem', color: '#1A1A1A' }}>Due date</label>
                <input
                  type="date"
                  value={quickOrderDue}
                  onChange={(e) => setQuickOrderDue(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #E5E0D8', background: '#fff', color: '#1A1A1A', fontSize: '0.9rem' }}
                />
              </div>
              <button
                type="submit"
                disabled={quickOrderLoading || customers.length === 0}
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#D4A52A',
                  color: '#0F2B4A',
                  fontWeight: '700',
                  fontSize: '1rem',
                  cursor: quickOrderLoading ? 'default' : 'pointer',
                  opacity: quickOrderLoading ? 0.6 : 1
                }}
              >
                {quickOrderLoading ? 'Creating...' : 'Create order'}
              </button>
              {quickOrderMessage && (
                <p style={{
                  marginTop: '0.5rem',
                  fontSize: '0.85rem',
                  color: quickOrderMessage.includes('✅') ? '#2E7D5E' : '#D9534F',
                  textAlign: 'center'
                }}>
                  {quickOrderMessage}
                </p>
              )}
            </form>
          </div>
        </div>
      )}

   {/* ─── SETTLE PAYMENT MODAL ─── */}
      {showSettleModal && settleOrder && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }} onClick={() => setShowSettleModal(false)}>
          <div style={{
            background: '#F8F6F2',
            borderRadius: '16px',
            padding: '1.5rem',
            maxWidth: '380px',
            width: '100%'
          }} ref={modalRef} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <h2 style={{ color: '#0F2B4A', fontSize: '1.1rem', margin: 0 }}>Record Payment</h2>
              <button onClick={() => setShowSettleModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', color: '#6B6255', cursor: 'pointer' }}>
                <Icon name="x" size={20} stroke="#6B6255" />
              </button>
            </div>
            <p style={{ color: '#6B6255', fontSize: '0.85rem', margin: '0 0 1rem' }}>
              {settleOrder.customers?.name || 'Customer'} · Balance: {formatCurrency(settleOrder.price - settleOrder.amount_paid)}
            </p>
            <form onSubmit={handleSettleSubmit}>
              <div style={{ marginBottom: '0.8rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', marginBottom: '0.2rem', color: '#1A1A1A' }}>Amount paid (₦)</label>
                <input
                  type="number"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  placeholder="Enter amount"
                  required
                  autoFocus
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #E5E0D8', background: '#fff', color: '#1A1A1A', fontSize: '0.9rem' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', marginBottom: '0.2rem', color: '#1A1A1A' }}>Note</label>
                <input
                  type="text"
                  value={settleNote}
                  onChange={(e) => setSettleNote(e.target.value)}
                  placeholder="e.g. Cash"
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #E5E0D8', background: '#fff', color: '#1A1A1A', fontSize: '0.9rem' }}
                />
              </div>
              <button
                type="submit"
                disabled={settleLoading}
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#2E7D5E',
                  color: '#fff',
                  fontWeight: '700',
                  fontSize: '1rem',
                  cursor: settleLoading ? 'default' : 'pointer',
                  opacity: settleLoading ? 0.6 : 1
                }}
              >
                {settleLoading ? 'Recording...' : 'Record payment'}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 480px) {
          .stat-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </div>
  )
                                                                                     }
