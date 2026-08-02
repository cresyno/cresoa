'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import LetterLogo from '../../../components/LetterLogo'
import { isFeatureAvailable } from '../../../lib/planLimits'
import FeedbackBanner from '../../../components/FeedbackBanner'

export default function FashionDashboardPage() {
  const router = useRouter()
  const [business, setBusiness] = useState(null)
  const [customers, setCustomers] = useState([])
  const [soloOrders, setSoloOrders] = useState([])
  const [groups, setGroups] = useState([])
  const [expandedGroups, setExpandedGroups] = useState([])
  const [loading, setLoading] = useState(true)
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    let { data: businessData } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', user.id)
      .single()

    if (!businessData) {
      const businessName = user.user_metadata?.business_name || 'My Business'
      const { data: newBusiness } = await supabase
        .from('businesses')
        .insert({
          owner_id: user.id,
          name: businessName,
          business_type: 'fashion',
        })
        .select()
        .single()
      businessData = newBusiness
    }

    if (businessData && businessData.is_active === false) {
      setDeactivated(true)
      setLoading(false)
      return
    }

    if (businessData && !businessData.onboarding_completed) {
      router.push('/onboarding')
      return
    }
    setBusiness(businessData)

    if (businessData) {
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
    }

    setLoading(false)
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  // Click outside to close modals
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
  const toggleGroup = (groupId) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
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
    if (order.item_name && order.item_name.trim()) return order.item_name
    if (order.name && order.name.trim()) return order.name
    if (order.title && order.title.trim()) return order.title
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
  const allGroupOrders = groups.flatMap((g) => g.orders)
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

  // ─── Business Health Score ───
  const healthScore = (() => {
    let score = 100
    if (overdueCount > 0) score -= overdueCount * 5
    if (totalBalanceOwed > 0) score -= 5
    if (customers.length === 0) score -= 10
    if (totalOrders === 0) score -= 10
    return Math.max(0, Math.min(100, score))
  })()

  // ─── Loading / Deactivated ───
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8F6F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid #E5E0D8', borderTop: '4px solid #0F2B4A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (deactivated) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8F6F2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
        <h1 style={{ color: '#0F2B4A' }}>Account deactivated</h1>
        <p style={{ color: '#8A8A8A' }}>Please contact support.</p>
      </div>
    )
  }

  // ─── Return ───
  return (
    <div style={{ minHeight: '100vh', background: '#F8F6F2', padding: '1.2rem 1rem', paddingBottom: '5rem', fontFamily: "'Inter', system-ui, sans-serif" }}>
<style>{`
  /* ─── CARD GLASS ─── */
  .glass { background: rgba(255,255,255,0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.3); border-radius: 16px; box-shadow: 0 4px 16px rgba(15,43,74,0.06); transition: all 0.25s ease; }
  .glass:hover { box-shadow: 0 8px 32px rgba(15,43,74,0.1); transform: translateY(-2px); }

  .stat-card { background: rgba(255,255,255,0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.3); border-radius: 14px; padding: 0.7rem 0.4rem; text-align: center; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 8px rgba(15,43,74,0.04); text-decoration: none; }
  .stat-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(15,43,74,0.08); border-color: #D4A52A; }
  .stat-card .value { font-size: 1.4rem; font-weight: 700; margin: 0; }
  .stat-card .value.navy { color: #0F2B4A; }
  .stat-card .value.red { color: #D9534F; }
  .stat-card .value.green { color: #2E7D5E; }
  .stat-card .value.gold { color: #D4A52A; }
  .stat-card .label { color: #8A8A8A; font-size: 0.6rem; margin: 0.1rem 0 0; text-transform: uppercase; letter-spacing: 0.3px; }

  .action-card { background: rgba(255,255,255,0.7); backdrop-filter: blur(12px); border: 1px solid #E5E0D8; border-radius: 14px; padding: 0.8rem; text-align: center; text-decoration: none; transition: all 0.2s; box-shadow: 0 2px 8px rgba(15,43,74,0.04); flex: 1; min-width: 80px; }
  .action-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(15,43,74,0.08); border-color: #D4A52A; }
  .action-card .icon { font-size: 1.8rem; display: block; margin-bottom: 0.2rem; }
  .action-card .label { font-size: 0.7rem; font-weight: 600; color: #0F2B4A; }

  .order-card { background: rgba(255,255,255,0.7); backdrop-filter: blur(8px); border: 1px solid #E5E0D8; border-radius: 14px; padding: 1rem 1.2rem; margin-bottom: 0.8rem; transition: all 0.2s; }
  .order-card:hover { border-color: #D4A52A; box-shadow: 0 4px 16px rgba(15,43,74,0.06); }
  .order-card .top { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem; }
  .order-card .customer { font-weight: 600; color: #0F2B4A; font-size: 1rem; }
  .order-card .item { font-size: 0.85rem; color: #8A8A8A; }
  .order-card .status-badge { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.2rem 0.8rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
  .order-card .due { font-size: 0.75rem; font-weight: 500; }
  .order-card .balance { font-weight: 700; font-size: 1rem; margin-right: 0.5rem; }
  .order-card .balance.positive { color: #D9534F; }
  .order-card .balance.zero { color: #2E7D5E; }
  .order-card .actions { display: flex; gap: 0.4rem; margin-top: 0.3rem; flex-wrap: wrap; }

  .btn-sm { padding: 0.3rem 0.7rem; border-radius: 8px; font-size: 0.75rem; font-weight: 600; border: 1px solid #E5E0D8; background: #fff; color: #0F2B4A; cursor: pointer; transition: all 0.15s; min-height: 32px; min-width: 32px; display: inline-flex; align-items: center; justify-content: center; }
  .btn-sm:hover { background: #F8F6F2; }
  .btn-sm.primary { background: #0F2B4A; color: #fff; border-color: #0F2B4A; }
  .btn-sm.success { background: #2E7D5E; color: #fff; border-color: #2E7D5E; }
  .btn-sm.warning { background: #D4A52A; color: #0F2B4A; border-color: #D4A52A; }

  .section-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem; }
  .section-title h3 { color: #0F2B4A; font-size: 1.1rem; font-weight: 700; margin: 0; }
  .section-title a { color: #8A8A8A; fontSize: 0.75rem; text-decoration: none; border-bottom: 1px solid transparent; }
  .section-title a:hover { border-bottom-color: #8A8A8A; }

  .empty-state { background: rgba(255,255,255,0.5); backdrop-filter: blur(8px); border-radius: 14px; padding: 2rem 1rem; border: 1px solid #E5E0D8; text-align: center; color: #8A8A8A; }
  .empty-state .icon { font-size: 2.5rem; display: block; margin-bottom: 0.5rem; }

  .fab { position: fixed; bottom: 1.5rem; right: 1.5rem; background: linear-gradient(135deg, #D4A52A, #C79A2B); color: #0F2B4A; width: 56px; height: 56px; border-radius: 50%; border: none; font-size: 1.8rem; font-weight: 700; box-shadow: 0 4px 16px rgba(212,165,42,0.4); cursor: pointer; z-index: 100; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
  .fab:active { transform: scale(0.92); }

  .modal-overlay { position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); z-index:1000; display:flex; align-items:flex-end; justify-content:center; animation: slideUp 0.3s; }
  @keyframes slideUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
  .modal-content { background: #F8F6F2; border-radius:20px 20px 0 0; padding:1.5rem; max-width:480px; width:100%; max-height:85vh; overflow-y:auto; }
  .modal-handle { width:40px; height:4px; background:#D6D0C5; border-radius:4px; margin:0 auto 1rem; }
  .settle-modal { position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); backdrop-filter:blur(4px); z-index:1100; display:flex; align-items:center; justify-content:center; padding:1.5rem; }
  .settle-content { background:#F8F6F2; border-radius:20px; padding:1.8rem; max-width:380px; width:100%; }

  .input { width:100%; padding:0.7rem; border-radius:8px; border:1px solid #E5E0D8; background:rgba(255,255,255,0.7); backdrop-filter:blur(4px); font-size:0.95rem; }
  .input:focus { outline:none; border-color:#D4A52A; }
  .select { width:100%; padding:0.7rem; border-radius:8px; border:1px solid #E5E0D8; background:rgba(255,255,255,0.7); backdrop-filter:blur(4px); font-size:0.95rem; }

  /* ─── Health Card ─── */
  .health-card { background: linear-gradient(135deg, #0F2B4A, #1A3F66); border-radius: 16px; padding: 1rem; color: #fff; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; }
  .health-card .score { font-size: 2rem; font-weight: 700; }
  .health-card .label { font-size: 0.75rem; opacity: 0.8; }

  @media (max-width:480px) {
    .stat-card .value { font-size: 1rem; }
    .action-card { min-width: 60px; padding: 0.6rem; }
    .order-card .top { flex-direction: column; align-items: stretch; }
    .order-card .actions { justify-content: flex-start; }
    .health-card { flex-direction: column; align-items: stretch; text-align: center; }
  }
`}</style>

{/* ─── HEADER ─── */}
<div className="glass" style={{ padding: '0.8rem 1rem', marginBottom: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
    <LetterLogo name={business?.name} size={44} />
    <div>
      <div style={{ color: '#8A8A8A', fontSize: '0.7rem' }}>Welcome back,</div>
      <div style={{ color: '#0F2B4A', fontSize: '1.2rem', fontWeight: '700' }}>
        {business?.name || 'Your business'}
        <span style={{ background: 'rgba(212,165,42,0.15)', color: '#D4A52A', padding: '0.05rem 0.5rem', borderRadius: '10px', fontSize: '0.6rem', fontWeight: '600', marginLeft: '0.3rem' }}>👗 Fashion</span>
      </div>
    </div>
  </div>
  <div style={{ textAlign: 'right', fontSize: '0.7rem', color: '#8A8A8A' }}>
    <div>{new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
    <div style={{ fontWeight: '700', color: '#0F2B4A', fontSize: '1rem' }}>₦{todayRevenue > 0 ? todayRevenue.toLocaleString() : '0'}</div>
  </div>
</div>

{/* Feedback banner */}
{business && <FeedbackBanner business={business} />}

{/* ─── BUSINESS HEALTH SCORE ─── */}
<div className="health-card" style={{ marginBottom: '1.2rem' }}>
  <div>
    <div className="label">Business Health</div>
    <div className="score">{healthScore}<span style={{ fontSize: '1rem', opacity: 0.7 }}>/100</span></div>
  </div>
  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
    <div><span style={{ opacity: 0.7 }}>✅ On‑time:</span> {totalOrders > 0 ? Math.round((1 - overdueCount / totalOrders) * 100) : 100}%</div>
    <div><span style={{ opacity: 0.7 }}>👥 Customers:</span> {customers.length}</div>
    <div><span style={{ opacity: 0.7 }}>📦 Active:</span> {allActiveOrders.filter(o => o.current_status !== 'Delivered').length}</div>
  </div>
</div>

{/* ─── REVENUE BAR ─── */}
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.5rem', marginBottom: '1.2rem' }}>
  <div className="glass" style={{ padding: '0.6rem', textAlign: 'center', borderTop: '3px solid #D4A52A' }}>
    <div style={{ fontSize: '0.55rem', color: '#8A8A8A', textTransform: 'uppercase' }}>Today</div>
    <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0F2B4A' }}>₦{todayRevenue > 0 ? todayRevenue.toLocaleString() : '0'}</div>
    <div style={{ fontSize: '0.55rem', color: todayRevenue > 0 ? '#2E7D5E' : '#8A8A8A' }}>{todayRevenue > 0 ? '📈' : '—'}</div>
  </div>
  <div className="glass" style={{ padding: '0.6rem', textAlign: 'center', borderTop: '3px solid #D9534F' }}>
    <div style={{ fontSize: '0.55rem', color: '#8A8A8A', textTransform: 'uppercase' }}>This Week</div>
    <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0F2B4A' }}>₦{weekRevenue > 0 ? weekRevenue.toLocaleString() : '0'}</div>
    <div style={{ fontSize: '0.55rem', color: weekRevenue > 0 ? '#2E7D5E' : '#8A8A8A' }}>{weekRevenue > 0 ? '📈' : '—'}</div>
  </div>
  <div className="glass" style={{ padding: '0.6rem', textAlign: 'center', borderTop: '3px solid #2E7D5E' }}>
    <div style={{ fontSize: '0.55rem', color: '#8A8A8A', textTransform: 'uppercase' }}>This Month</div>
    <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0F2B4A' }}>₦{monthRevenue > 0 ? monthRevenue.toLocaleString() : '0'}</div>
    <div style={{ fontSize: '0.55rem', color: monthRevenue > 0 ? '#2E7D5E' : '#8A8A8A' }}>{monthRevenue > 0 ? '📈' : '—'}</div>
  </div>
</div>

{/* ─── KEY METRICS ─── */}
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '0.5rem', marginBottom: '1.2rem' }}>
  <a href="/dashboard/customers" className="stat-card"><p className="value navy">{customers.length}</p><p className="label">Customers</p></a>
  <a href="/dashboard/orders" className="stat-card"><p className="value navy">{totalOrders}</p><p className="label">Orders</p></a>
  <button onClick={toggleOwingFilter} className="stat-card" style={{ border: showOwingOnly ? '2px solid #D9534F' : '' }}>
    <p className={`value ${totalBalanceOwed > 0 ? 'red' : 'green'}`}>₦{totalBalanceOwed > 0 ? totalBalanceOwed.toLocaleString() : '0'}</p>
    <p className="label">{showOwingOnly ? '🔴 Filtered' : 'Owed'}</p>
  </button>
  <a href="/dashboard/orders?filter=ready" className="stat-card"><p className="value green">{readyCount}</p><p className="label">Ready</p></a>
  <a href="/dashboard/orders?filter=overdue" className="stat-card"><p className="value red">{overdueCount}</p><p className="label">Overdue</p></a>
</div>

{/* ─── ALERTS ─── */}
{(overdueCount > 0 || dueTodayCount > 0 || readyCount > 0) && (
  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
    {overdueCount > 0 && <div className="glass" style={{ padding: '0.3rem 0.8rem', background: '#F1DBD3', borderColor: '#D9534F' }}>⚠️ {overdueCount} Overdue</div>}
    {dueTodayCount > 0 && <div className="glass" style={{ padding: '0.3rem 0.8rem', background: '#FFF3E0', borderColor: '#E67E22' }}>📅 {dueTodayCount} Due today</div>}
    {readyCount > 0 && <div className="glass" style={{ padding: '0.3rem 0.8rem', background: '#F6E9C8', borderColor: '#D4A52A' }}>✅ {readyCount} Ready</div>}
  </div>
)}

{/* ─── QUICK ACTION CARDS ─── */}
<div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
  <a href="/dashboard/orders/new" className="action-card"><span className="icon">📋</span><span className="label">New Order</span></a>
  <a href="/dashboard/customers/new" className="action-card"><span className="icon">👤</span><span className="label">New Customer</span></a>
  <a href={canCreateGroup ? "/dashboard/groups/new" : "#"} className="action-card" style={{ opacity: canCreateGroup ? 1 : 0.5 }} onClick={(e) => { if (!canCreateGroup) { e.preventDefault(); router.push('/dashboard/subscription') } }}>
    <span className="icon">👥</span><span className="label">{canCreateGroup ? 'Group' : 'Group (Upgrade)'}</span>
  </a>
  <a href="/dashboard/reminders" className="action-card"><span className="icon">🔔</span><span className="label">Reminders</span></a>
</div>
      {/* ─── RECENT ORDERS ─── */}
      <div style={{ marginBottom: '1.8rem' }}>
        <div className="section-title">
          <h3>📋 Recent Orders</h3>
          <a href="/dashboard/orders">View all →</a>
        </div>
        {filteredPreviewOrders.length === 0 ? (
          <div className="empty-state">
            <span className="icon">📦</span>
            {showOwingOnly || statusFilter !== 'all' ? 'No orders match your filters.' : 'No orders yet. Create your first order!'}
          </div>
        ) : (
          filteredPreviewOrders.map((o) => {
            const status = getStatusInfo(o.current_status)
            const due = getDueDisplay(o.due_date)
            const balance = o.price - o.amount_paid
            return (
              <div key={o.id} className="order-card">
                <div className="top">
                  <div style={{ flex: 1 }}>
                    <div className="customer">{o.customers?.name || 'No customer'} <span style={{ fontSize:'0.8rem', color:'#8A8A8A' }}>· {getOrderName(o)}</span></div>
                    <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', marginTop:'0.3rem' }}>
                      <span className="status-badge" style={{ background: status.bg, color: status.color }}><span style={{ marginRight:'0.2rem' }}>{status.icon}</span>{status.label}</span>
                      <span className="due" style={{ color: due.color }}>{due.label}</span>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.3rem', flexShrink:0 }}>
                    <span className={`balance ${balance > 0 ? 'positive' : 'zero'}`}>{balance > 0 ? `₦${balance.toLocaleString()}` : '✓'}</span>
                    <div className="actions">
                      <a href={`/dashboard/orders/${o.id}`} className="btn-sm">👁️</a>
                      {o.customers?.phone && <a href={`tel:${o.customers.phone}`} className="btn-sm">📞</a>}
                      {balance > 0 && <button className="btn-sm success" onClick={() => openSettleModal(o)}>💰</button>}
                      <a href={`/dashboard/orders/${o.id}?edit=true`} className="btn-sm primary">✏️</a>
                      <button className="btn-sm warning" onClick={() => {
                        if (o.customers?.phone) {
                          const msg = `Hi ${o.customers?.name || ''}, your order ${getOrderName(o)} is ${status.label}.`
                          window.open(`https://wa.me/${o.customers.phone}?text=${encodeURIComponent(msg)}`, '_blank')
                        }
                      }}>💬</button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ─── GROUP ORDERS ─── */}
      <div style={{ marginBottom: '1.8rem' }}>
        <div className="section-title">
          <h3>👥 Group Orders</h3>
          <a href="/dashboard/groups">View all →</a>
        </div>
        {groups.length === 0 ? (
          <div className="empty-state">
            <span className="icon">👥</span>
            {canCreateGroup ? <a href="/dashboard/groups/new" style={{ color:'#D4A52A', fontWeight:'600', textDecoration:'none' }}>Create your first group order</a> : 'Upgrade to create group orders'}
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
              <div key={g.id} className="glass" style={{ padding: '1rem', marginBottom: '1rem', border: isExpanded ? '2px solid #D4A52A' : '1px solid #E5E0D8' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', cursor:'pointer' }} onClick={() => toggleGroup(g.id)}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', alignItems:'center' }}>
                      <strong style={{ color:'#0F2B4A' }}>{g.group_name}</strong>
                      <span style={{ fontSize:'0.7rem', color:'#8A8A8A' }}>{g.orders.length} members</span>
                      {combinedBalance > 0 && <span style={{ fontSize:'0.6rem', background:'#F1DBD3', color:'#D9534F', padding:'0.1rem 0.4rem', borderRadius:'10px' }}>₦{combinedBalance.toLocaleString()}</span>}
                    </div>
                    <div style={{ fontSize:'0.75rem', color:'#8A8A8A' }}>Coordinator: {g.customers?.name || 'Unnamed'}</div>
                    <div style={{ marginTop:'0.3rem', background:'#E5E0D8', borderRadius:'10px', height:'6px', overflow:'hidden' }}>
                      <div style={{ width: `${progress}%`, background: '#2E7D5E', height: '100%', borderRadius: '10px', transition: 'width 0.3s ease' }} />
                    </div>
                  </div>
                  <span style={{ fontSize:'0.7rem', color:'#8A8A8A', marginLeft:'0.5rem' }}>{isExpanded ? '▲' : '▼'}</span>
                </div>
                {isExpanded && hasVisible && (
                  <div style={{ marginTop:'0.8rem', borderTop:'1px solid #E5E0D8', paddingTop:'0.8rem' }}>
                    {filteredOrders.map((o) => {
                      const status = getStatusInfo(o.current_status)
                      const due = getDueDisplay(o.due_date)
                      const balance = o.price - o.amount_paid
                      return (
                        <div key={o.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.4rem 0', borderBottom:'1px solid #F0EDE8' }}>
                          <div style={{ flex:1 }}>
                            <div style={{ fontWeight:'600', color:'#0F2B4A', fontSize:'0.85rem' }}>{o.customers?.name || 'No customer'}</div>
                            <div style={{ fontSize:'0.7rem', color:'#8A8A8A', display:'flex', gap:'0.3rem', flexWrap:'wrap' }}>
                              <span className="status-badge" style={{ background: status.bg, color: status.color, fontSize:'0.55rem' }}>{status.icon} {status.label}</span>
                              <span style={{ color: due.color }}>{due.label}</span>
                            </div>
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:'0.3rem' }}>
                            <span style={{ fontWeight:'700', color: balance > 0 ? '#D9534F' : '#2E7D5E' }}>{balance > 0 ? `₦${balance.toLocaleString()}` : '✓'}</span>
                            <a href={`/dashboard/orders/${o.id}`} className="btn-sm">👁️</a>
                            {balance > 0 && <button className="btn-sm success" onClick={() => openSettleModal(o)}>💰</button>}
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
        <div className="section-title">
          <h3>👤 Recent Customers</h3>
          <a href="/dashboard/customers">View all →</a>
        </div>
        {previewCustomers.length === 0 ? (
          <div className="empty-state"><span className="icon">👤</span>No customers yet. Add your first customer.</div>
        ) : (
          previewCustomers.map((c) => {
            const orders = allActiveOrders.filter(o => o.customer_id === c.id)
            const totalSpent = orders.reduce((sum, o) => sum + o.amount_paid, 0)
            const lastOrder = orders.length > 0 ? new Date(orders[0].created_at).toLocaleDateString('en-GB') : '—'
            return (
              <a key={c.id} href={`/dashboard/customers/${c.id}`} className="glass" style={{ padding: '0.6rem 1rem', marginBottom: '0.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', textDecoration:'none' }}>
                <div>
                  <div style={{ fontWeight:'600', color:'#0F2B4A' }}>{c.name}</div>
                  {c.phone && <div style={{ fontSize:'0.7rem', color:'#8A8A8A' }}>{c.phone}</div>}
                </div>
                <div style={{ textAlign:'right', fontSize:'0.7rem', color:'#8A8A8A' }}>
                  <div>₦{totalSpent > 0 ? totalSpent.toLocaleString() : '0'}</div>
                  <div>Last: {lastOrder}</div>
                </div>
              </a>
            )
          })
        )}
      </div>

      {/* ─── FLOATING ACTION BUTTON ─── */}
      <button className="fab" onClick={() => setShowQuickOrder(true)}>+</button>

      {/* ─── QUICK ORDER MODAL ─── */}
      {showQuickOrder && (
        <div className="modal-overlay" onClick={() => setShowQuickOrder(false)}>
          <div className="modal-content" ref={modalRef} onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle"></div>
            <h2 style={{ color:'#0F2B4A', fontSize:'1.2rem', margin:'0 0 0.3rem' }}>Quick Order</h2>
            <p style={{ color:'#8A8A8A', fontSize:'0.85rem', margin:'0 0 1.2rem' }}>Create an order in seconds.</p>
            <form onSubmit={handleQuickOrderSubmit}>
              <div style={{ marginBottom:'0.8rem' }}>
                <label style={{ display:'block', fontSize:'0.85rem', fontWeight:'500' }}>Customer</label>
                <select className="select" value={quickOrderCustomer} onChange={(e) => setQuickOrderCustomer(e.target.value)} required>
                  <option value="">Select customer</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ marginBottom:'0.8rem' }}>
                <label style={{ display:'block', fontSize:'0.85rem', fontWeight:'500' }}>Item / Garment</label>
                <input className="input" type="text" value={quickOrderItem} onChange={(e) => setQuickOrderItem(e.target.value)} placeholder="e.g. Aso-ebi gown" required />
              </div>
              <div style={{ display:'flex', gap:'0.5rem', marginBottom:'0.8rem' }}>
                <div style={{ flex:1 }}><label style={{ display:'block', fontSize:'0.85rem', fontWeight:'500' }}>Price (₦)</label><input className="input" type="number" value={quickOrderPrice} onChange={(e) => setQuickOrderPrice(e.target.value)} placeholder="5000" required /></div>
                <div style={{ flex:1 }}><label style={{ display:'block', fontSize:'0.85rem', fontWeight:'500' }}>Deposit (₦)</label><input className="input" type="number" value={quickOrderDeposit} onChange={(e) => setQuickOrderDeposit(e.target.value)} placeholder="2000" /></div>
              </div>
              <div style={{ marginBottom:'1.2rem' }}>
                <label style={{ display:'block', fontSize:'0.85rem', fontWeight:'500' }}>Due date</label>
                <input className="input" type="date" value={quickOrderDue} onChange={(e) => setQuickOrderDue(e.target.value)} />
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
        <div className="settle-modal" onClick={() => setShowSettleModal(false)}>
          <div className="settle-content" ref={modalRef} onClick={(e) => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.3rem' }}>
              <h2 style={{ color:'#0F2B4A', fontSize:'1.1rem', margin:0 }}>💰 Record Payment</h2>
              <button onClick={() => setShowSettleModal(false)} style={{ background:'none', border:'none', fontSize:'1.3rem', color:'#8A8A8A', cursor:'pointer' }}>✕</button>
            </div>
            <p style={{ color:'#8A8A8A', fontSize:'0.85rem', margin:'0 0 1.2rem' }}>{settleOrder.customers?.name || 'Customer'} · Balance: ₦{(settleOrder.price - settleOrder.amount_paid).toLocaleString()}</p>
            <form onSubmit={handleSettleSubmit}>
              <div style={{ marginBottom:'0.8rem' }}>
                <label style={{ display:'block', fontSize:'0.85rem', fontWeight:'500' }}>Amount paid (₦)</label>
                <input className="input" type="number" value={settleAmount} onChange={(e) => setSettleAmount(e.target.value)} placeholder="Enter amount" required autoFocus />
              </div>
              <div style={{ marginBottom:'1.2rem' }}>
                <label style={{ display:'block', fontSize:'0.85rem', fontWeight:'500' }}>Note (optional)</label>
                <input className="input" type="text" value={settleNote} onChange={(e) => setSettleNote(e.target.value)} placeholder="e.g. Cash payment" />
              </div>
              <button type="submit" disabled={settleLoading} style={{ width:'100%', padding:'0.8rem', borderRadius:'10px', border:'none', background:'#2E7D5E', color:'#fff', fontWeight:'700', fontSize:'1rem', cursor: settleLoading ? 'default' : 'pointer', opacity: settleLoading ? 0.6 : 1 }}>
                {settleLoading ? 'Recording...' : '💰 Record payment'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── FOOTER ─── */}
      <div style={{ marginTop:'2rem', textAlign:'center', fontSize:'0.6rem', color:'#C8C0B5' }}>Cresoa Fashion · {new Date().getFullYear()}</div>
    </div>
  )
                  }
