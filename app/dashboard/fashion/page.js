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

    // ─── FORCE TEST BUSINESS ID ───
    const TEST_BUSINESS_ID = '35c2e34d-832b-471a-b015-5063ce85c653';
    let businessData = null;

    // Try to load the Test Business directly
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', TEST_BUSINESS_ID)
      .maybeSingle();

    if (data && !error) {
      businessData = data;
      alert(`✅ FORCED: Loaded Test Business: ${businessData.name}`);
    } else {
      // Fallback to owner if something goes wrong
      const { data: ownerData, error: ownerError } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .single();
      if (ownerError || !ownerData) {
        router.push('/onboarding');
        return;
      }
      businessData = ownerData;
      alert(`⚠️ Fallback to owned: ${businessData.name}`);
    }

    if (businessData && businessData.is_active === false) {
      setDeactivated(true);
      setLoading(false);
      return;
    }

    if (businessData && !businessData.onboarding_completed) {
      router.push('/onboarding');
      return;
    }
    setBusiness(businessData);

    // ─── Fetch data for this business ───
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

return (
  <div style={{ minHeight: '100vh', background: '#F8F6F2', padding: '1.2rem 1rem', fontFamily: "'Inter', -apple-system, sans-serif" }}>
    <style>{`
      * { box-sizing: border-box; }
      :root {
        --spacing-xs: 0.25rem;
        --spacing-sm: 0.5rem;
        --spacing-md: 1rem;
        --spacing-lg: 1.5rem;
        --spacing-xl: 2rem;
        --spacing-2xl: 2.5rem;
        --radius-sm: 8px;
        --radius-md: 12px;
        --radius-lg: 16px;
        --radius-xl: 20px;
        --shadow-sm: 0 1px 3px rgba(15,43,74,0.04);
        --shadow-md: 0 4px 16px rgba(15,43,74,0.06);
        --shadow-lg: 0 8px 32px rgba(15,43,74,0.08);
        --shadow-xl: 0 12px 48px rgba(15,43,74,0.12);
      }
      .card {
        background: #fff;
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-sm);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border: 1px solid rgba(15,43,74,0.04);
      }
      .card:hover {
        box-shadow: var(--shadow-md);
        transform: translateY(-2px);
      }
      .stat-card {
        background: #fff;
        border-radius: var(--radius-md);
        padding: var(--spacing-md);
        text-align: center;
        border: 1px solid rgba(15,43,74,0.04);
        box-shadow: var(--shadow-sm);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
        text-decoration: none;
        position: relative;
        overflow: hidden;
      }
      .stat-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: transparent;
        transition: background 0.3s ease;
      }
      .stat-card:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-lg);
      }
      .stat-card:hover::before {
        background: #D4A52A;
      }
      .stat-card .icon { font-size: 1.4rem; display: block; margin-bottom: 0.2rem; }
      .stat-card .value { font-size: 1.6rem; font-weight: 700; color: #0F2B4A; margin: 0; letter-spacing: -0.5px; }
      .stat-card .label { color: #8A8A8A; font-size: 0.7rem; margin: 0.1rem 0 0; text-transform: uppercase; letter-spacing: 0.3px; font-weight: 600; }
      .stat-card .trend { font-size: 0.6rem; margin-left: 0.3rem; font-weight: 600; }
      .stat-card .trend.up { color: #2E7D5E; }
      .stat-card .trend.down { color: #D9534F; }
      .revenue-card {
        background: #fff;
        border-radius: var(--radius-md);
        padding: var(--spacing-md);
        text-align: center;
        border: 1px solid rgba(15,43,74,0.04);
        box-shadow: var(--shadow-sm);
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }
      .revenue-card .amount { font-size: 1.4rem; font-weight: 700; color: #0F2B4A; margin: 0.1rem 0 0; }
      .revenue-card .label { font-size: 0.6rem; color: #8A8A8A; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
      .revenue-card .badge { display: inline-block; padding: 0.1rem 0.5rem; border-radius: 20px; font-size: 0.55rem; font-weight: 600; margin-top: 0.2rem; }
      .action-card {
        background: #fff;
        border-radius: var(--radius-md);
        padding: var(--spacing-md);
        text-align: center;
        border: 1px solid rgba(15,43,74,0.04);
        box-shadow: var(--shadow-sm);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        text-decoration: none;
        flex: 1;
        min-width: 80px;
      }
      .action-card:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-lg);
        border-color: #D4A52A;
      }
      .action-card .icon { font-size: 1.8rem; display: block; margin-bottom: 0.2rem; }
      .action-card .label { font-size: 0.65rem; font-weight: 600; color: #0F2B4A; }
      .order-card {
        background: #fff;
        border-radius: var(--radius-md);
        padding: var(--spacing-md) var(--spacing-lg);
        margin-bottom: var(--spacing-sm);
        border: 1px solid rgba(15,43,74,0.04);
        box-shadow: var(--shadow-sm);
        transition: all 0.3s ease;
      }
      .order-card:hover {
        box-shadow: var(--shadow-md);
        border-color: rgba(212,165,42,0.15);
      }
      .order-card .top { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--spacing-md); flex-wrap: wrap; }
      .order-card .customer { font-weight: 600; color: #0F2B4A; font-size: 0.95rem; }
      .order-card .item { font-size: 0.8rem; color: #8A8A8A; }
      .order-card .status-badge { display: inline-flex; align-items: center; gap: 0.2rem; padding: 0.15rem 0.7rem; border-radius: 20px; font-size: 0.7rem; font-weight: 600; }
      .order-card .due { font-size: 0.75rem; font-weight: 500; }
      .order-card .balance { font-weight: 700; font-size: 0.95rem; margin-right: 0.5rem; }
      .order-card .balance.positive { color: #D9534F; }
      .order-card .balance.zero { color: #2E7D5E; }
      .order-card .actions { display: flex; gap: 0.3rem; flex-wrap: wrap; margin-top: 0.3rem; }
      .btn-sm { padding: 0.25rem 0.6rem; border-radius: 6px; font-size: 0.7rem; font-weight: 600; border: 1px solid #E5E0D8; background: #fff; color: #0F2B4A; cursor: pointer; transition: all 0.2s ease; min-height: 32px; min-width: 32px; display: inline-flex; align-items: center; justify-content: center; }
      .btn-sm:hover { background: #F8F6F2; border-color: #D4A52A; transform: translateY(-1px); }
      .btn-sm.primary { background: #0F2B4A; color: #fff; border-color: #0F2B4A; }
      .btn-sm.primary:hover { background: #1A3F66; }
      .btn-sm.success { background: #2E7D5E; color: #fff; border-color: #2E7D5E; }
      .btn-sm.success:hover { background: #1E5A44; }
      .btn-sm.warning { background: #D4A52A; color: #0F2B4A; border-color: #D4A52A; }
      .btn-sm.warning:hover { background: #C79A2B; }
      .section-title { display: flex; justify-content: space-between; align-items: center; margin: var(--spacing-lg) 0 var(--spacing-sm); }
      .section-title h3 { color: #0F2B4A; font-size: 1.05rem; font-weight: 700; margin: 0; letter-spacing: -0.3px; }
      .section-title a { color: #8A8A8A; font-size: 0.75rem; text-decoration: none; font-weight: 500; border-bottom: 1px solid transparent; transition: border-color 0.2s; }
      .section-title a:hover { border-bottom-color: #8A8A8A; }
      .empty-state { text-align: center; padding: var(--spacing-xl); color: #8A8A8A; background: #fff; border-radius: var(--radius-md); border: 1px dashed #E5E0D8; }
      .empty-state .icon { font-size: 2.5rem; display: block; margin-bottom: var(--spacing-sm); }
      .empty-state h4 { color: #0F2B4A; font-size: 1rem; margin: 0 0 0.2rem; }
      .empty-state p { margin: 0; font-size: 0.85rem; }
      .empty-state .cta { display: inline-block; margin-top: var(--spacing-sm); padding: 0.5rem 1.2rem; border-radius: var(--radius-sm); background: #D4A52A; color: #0F2B4A; font-weight: 600; text-decoration: none; font-size: 0.85rem; transition: all 0.2s ease; }
      .empty-state .cta:hover { background: #C79A2B; transform: translateY(-2px); }
      .group-card { background: #fff; border-radius: var(--radius-md); padding: var(--spacing-md); margin-bottom: var(--spacing-sm); border: 1px solid rgba(15,43,74,0.04); box-shadow: var(--shadow-sm); transition: all 0.3s ease; }
      .group-card:hover { box-shadow: var(--shadow-md); }
      .group-card.expanded { border-color: #D4A52A; }
      .group-card .header { display: flex; justify-content: space-between; align-items: flex-start; cursor: pointer; }
      .group-card .header .name { font-weight: 700; color: #0F2B4A; font-size: 0.95rem; }
      .group-card .header .meta { font-size: 0.7rem; color: #8A8A8A; }
      .group-card .header .balance { font-size: 0.8rem; font-weight: 600; }
      .group-card .header .balance.owing { color: #D9534F; }
      .group-card .header .balance.paid { color: #2E7D5E; }
      .group-card .progress { margin-top: 0.3rem; background: #F0EDE8; border-radius: 10px; height: 4px; overflow: hidden; }
      .group-card .progress .bar { height: 100%; background: #2E7D5E; border-radius: 10px; transition: width 0.6s ease; }
      .fab {
        position: fixed;
        bottom: 1.5rem;
        right: 1.5rem;
        background: linear-gradient(135deg, #D4A52A, #C79A2B);
        color: #0F2B4A;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        border: none;
        font-size: 1.8rem;
        font-weight: 700;
        box-shadow: 0 4px 20px rgba(212,165,42,0.4);
        cursor: pointer;
        z-index: 100;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
      }
      .fab:hover { transform: scale(1.05); box-shadow: 0 8px 32px rgba(212,165,42,0.5); }
      .fab:active { transform: scale(0.92); }
      .customer-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--spacing-sm) var(--spacing-md);
        background: #fff;
        border-radius: var(--radius-sm);
        border: 1px solid rgba(15,43,74,0.04);
        text-decoration: none;
        transition: all 0.2s ease;
        margin-bottom: var(--spacing-sm);
        box-shadow: var(--shadow-sm);
      }
      .customer-row:hover { border-color: #D4A52A; transform: translateX(4px); box-shadow: var(--shadow-md); }
      .customer-row .name { font-weight: 600; color: #0F2B4A; font-size: 0.9rem; }
      .customer-row .phone { font-size: 0.7rem; color: #8A8A8A; }
      .customer-row .stats { text-align: right; font-size: 0.7rem; color: #8A8A8A; }
      .customer-row .stats strong { color: #0F2B4A; }
      .health-card {
        background: linear-gradient(135deg, #0F2B4A, #1A3F66);
        border-radius: var(--radius-md);
        padding: var(--spacing-md) var(--spacing-lg);
        color: #fff;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--spacing-sm);
        box-shadow: var(--shadow-lg);
      }
      .health-card .score { font-size: 1.8rem; font-weight: 700; letter-spacing: -0.5px; }
      .health-card .label { font-size: 0.7rem; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.5px; }
      .health-card .stats { display: flex; gap: var(--spacing-lg); flex-wrap: wrap; }
      .health-card .stats .item { text-align: center; }
      .health-card .stats .item .num { font-weight: 700; font-size: 1rem; }
      .health-card .stats .item .desc { font-size: 0.6rem; opacity: 0.7; }
      .alert-badge { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.3rem 0.8rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
      .alert-badge.overdue { background: #F1DBD3; color: #D9534F; }
      .alert-badge.today { background: #FFF3E0; color: #E67E22; }
      .alert-badge.ready { background: #DCEBE2; color: #2E7D5E; }
      .glass { 
        background: rgba(255,255,255,0.6); 
        backdrop-filter: blur(12px); 
        -webkit-backdrop-filter: blur(12px); 
        border: 1px solid rgba(255,255,255,0.3); 
        border-radius: var(--radius-md); 
        box-shadow: var(--shadow-sm); 
        padding: var(--spacing-md); 
        transition: all 0.3s ease; 
      }
      .glass:hover { box-shadow: var(--shadow-md); }
      .modal-overlay { position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); z-index:1000; display:flex; align-items:flex-end; justify-content:center; animation: slideUp 0.3s; }
      @keyframes slideUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
      .modal-content { background: #F8F6F2; border-radius:20px 20px 0 0; padding:1.5rem; max-width:480px; width:100%; max-height:85vh; overflow-y:auto; }
      .modal-handle { width:40px; height:4px; background:#D6D0C5; border-radius:4px; margin:0 auto 1rem; }
      .settle-modal { position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); backdrop-filter:blur(4px); z-index:1100; display:flex; align-items:center; justify-content:center; padding:1.5rem; }
      .settle-content { background:#F8F6F2; border-radius:20px; padding:1.8rem; max-width:380px; width:100%; }
      @media (max-width: 640px) {
        .stat-card .value { font-size: 1.2rem; }
        .action-card { min-width: 60px; padding: var(--spacing-sm); }
        .action-card .icon { font-size: 1.4rem; }
        .action-card .label { font-size: 0.55rem; }
        .order-card .top { flex-direction: column; align-items: stretch; }
        .order-card .actions { justify-content: flex-start; }
        .health-card { flex-direction: column; align-items: stretch; text-align: center; }
        .health-card .stats { justify-content: center; }
        .revenue-card .amount { font-size: 1.1rem; }
        .customer-row { flex-wrap: wrap; gap: var(--spacing-sm); }
      }
      @media (min-width: 641px) {
        .stat-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: var(--spacing-sm); }
        .revenue-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacing-sm); }
        .action-grid { display: flex; gap: var(--spacing-sm); flex-wrap: wrap; }
        .alert-row { display: flex; gap: var(--spacing-sm); flex-wrap: wrap; }
      }
    `}</style>

    {/* ─── HEADER ─── */}
    <div className="card" style={{ padding: 'var(--spacing-md) var(--spacing-lg)', marginBottom: 'var(--spacing-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #fff, #FAF8F5)' }}>
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
    <div className="health-card" style={{ marginBottom: 'var(--spacing-md)' }}>
      <div>
        <div className="label">Business Health</div>
        <div className="score">{healthScore}<span style={{ fontSize: '1rem', opacity: 0.6 }}>/100</span></div>
      </div>
      <div className="stats">
        <div className="item"><div className="num">{Math.round((1 - overdueCount / (totalOrders || 1)) * 100)}%</div><div className="desc">On‑time</div></div>
        <div className="item"><div className="num">{customers.length}</div><div className="desc">Customers</div></div>
        <div className="item"><div className="num">{allActiveOrders.filter(o => o.current_status !== 'Delivered').length}</div><div className="desc">Active</div></div>
      </div>
    </div>

    {/* ─── REVENUE ─── */}
    <div className="revenue-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
      <div className="revenue-card" style={{ borderTop: '3px solid #D4A52A' }}>
        <div className="label">Today</div>
        <div className="amount">₦{todayRevenue.toLocaleString()}</div>
        <span className="badge" style={{ background: todayRevenue > 0 ? '#DCEBE2' : '#F0EDE8', color: todayRevenue > 0 ? '#2E7D5E' : '#8A8A8A' }}>{todayRevenue > 0 ? '📈' : '—'}</span>
      </div>
      <div className="revenue-card" style={{ borderTop: '3px solid #D9534F' }}>
        <div className="label">This Week</div>
        <div className="amount">₦{weekRevenue.toLocaleString()}</div>
        <span className="badge" style={{ background: weekRevenue > 0 ? '#DCEBE2' : '#F0EDE8', color: weekRevenue > 0 ? '#2E7D5E' : '#8A8A8A' }}>{weekRevenue > 0 ? '📈' : '—'}</span>
      </div>
      <div className="revenue-card" style={{ borderTop: '3px solid #2E7D5E' }}>
        <div className="label">This Month</div>
        <div className="amount">₦{monthRevenue.toLocaleString()}</div>
        <span className="badge" style={{ background: monthRevenue > 0 ? '#DCEBE2' : '#F0EDE8', color: monthRevenue > 0 ? '#2E7D5E' : '#8A8A8A' }}>{monthRevenue > 0 ? '📈' : '—'}</span>
      </div>
    </div>

    {/* ─── KEY METRICS ─── */}
    <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
      <a href="/dashboard/customers" className="stat-card">
        <span className="icon">👤</span>
        <div className="value">{customers.length}</div>
        <div className="label">Customers</div>
      </a>
      <a href="/dashboard/orders" className="stat-card">
        <span className="icon">📦</span>
        <div className="value">{totalOrders}</div>
        <div className="label">Orders</div>
      </a>
      <button onClick={toggleOwingFilter} className="stat-card" style={{ border: showOwingOnly ? '2px solid #D9534F' : '1px solid rgba(15,43,74,0.04)' }}>
        <span className="icon">💰</span>
        <div className="value" style={{ color: totalBalanceOwed > 0 ? '#D9534F' : '#2E7D5E' }}>₦{totalBalanceOwed.toLocaleString()}</div>
        <div className="label">{showOwingOnly ? '🔴 Filtered' : 'Owed'}</div>
      </button>
      <a href="/dashboard/orders?filter=ready" className="stat-card">
        <span className="icon">✅</span>
        <div className="value" style={{ color: '#2E7D5E' }}>{readyCount}</div>
        <div className="label">Ready</div>
      </a>
      <a href="/dashboard/orders?filter=overdue" className="stat-card">
        <span className="icon">⚠️</span>
        <div className="value" style={{ color: '#D9534F' }}>{overdueCount}</div>
        <div className="label">Overdue</div>
      </a>
    </div>

{/* ─── ALERTS ─── */}
    {(overdueCount > 0 || dueTodayCount > 0 || readyCount > 0) && (
      <div className="alert-row" style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)', flexWrap: 'wrap' }}>
        {overdueCount > 0 && <span className="alert-badge overdue">⚠️ {overdueCount} Overdue</span>}
        {dueTodayCount > 0 && <span className="alert-badge today">📅 {dueTodayCount} Due today</span>}
        {readyCount > 0 && <span className="alert-badge ready">✅ {readyCount} Ready</span>}
      </div>
    )}

    {/* ─── QUICK ACTIONS ─── */}
    <div className="action-grid" style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap', marginBottom: 'var(--spacing-lg)' }}>
      <a href="/dashboard/orders/new" className="action-card" style={{ background: 'linear-gradient(135deg, #D4A52A, #C79A2B)', color: '#0F2B4A', border: 'none' }}>
        <span className="icon">📋</span>
        <span className="label" style={{ color: '#0F2B4A' }}>New Order</span>
      </a>
      <a href="/dashboard/customers/new" className="action-card" style={{ background: '#0F2B4A', color: '#fff', border: 'none' }}>
        <span className="icon">👤</span>
        <span className="label" style={{ color: '#fff' }}>New Customer</span>
      </a>
      <a href={canCreateGroup ? "/dashboard/groups/new" : "#"} className="action-card" style={{ opacity: canCreateGroup ? 1 : 0.5, border: canCreateGroup ? '2px solid #D4A52A' : '1px solid #E5E0D8' }} onClick={(e) => { if (!canCreateGroup) { e.preventDefault(); router.push('/dashboard/subscription') } }}>
          <span className="icon">👥</span>
          <span className="label">{canCreateGroup ? 'Group' : 'Group (Upgrade)'}</span>
        </a>
        <a href="/dashboard/reminders" className="action-card">
          <span className="icon">🔔</span>
          <span className="label">Reminders</span>
        </a>
      </div>
      {/* ─── RECENT ORDERS ─── */}
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <div className="section-title">
          <h3>📋 Recent Orders</h3>
          <a href="/dashboard/orders">View all →</a>
        </div>
        {filteredPreviewOrders.length === 0 ? (
          <div className="empty-state">
            <span className="icon">📦</span>
            <h4>{showOwingOnly || statusFilter !== 'all' ? 'No orders match your filters' : 'No orders yet'}</h4>
            <p>{showOwingOnly || statusFilter !== 'all' ? 'Try clearing the filters above.' : 'Create your first order to get started.'}</p>
            {!showOwingOnly && statusFilter === 'all' && <a href="/dashboard/orders/new" className="cta">Create First Order →</a>}
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
                    <div className="customer">{o.customers?.name || 'No customer'}<span style={{ fontSize:'0.8rem', color:'#8A8A8A', marginLeft:'0.3rem' }}>· {getOrderName(o)}</span></div>
                    <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', marginTop:'0.2rem' }}>
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
                      {o.customers?.phone && (
                        <button className="btn-sm warning" onClick={() => {
                          const msg = `Hi ${o.customers?.name || ''}, your order ${getOrderName(o)} is ${status.label}.`
                          window.open(`https://wa.me/${o.customers.phone}?text=${encodeURIComponent(msg)}`, '_blank')
                        }}>💬</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ─── GROUP ORDERS ─── */}
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <div className="section-title">
          <h3>👥 Group Orders</h3>
          <a href="/dashboard/groups">View all →</a>
        </div>
        {groups.length === 0 ? (
          <div className="empty-state">
            <span className="icon">👥</span>
            <h4>No group orders yet</h4>
            <p>{canCreateGroup ? 'Create your first group order to manage Aso‑Ebi and bulk orders.' : 'Upgrade your plan to create group orders.'}</p>
            {canCreateGroup && <a href="/dashboard/groups/new" className="cta">Create Group Order →</a>}
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
              <div key={g.id} className={`group-card ${isExpanded ? 'expanded' : ''}`}>
                <div className="header" onClick={() => toggleGroup(g.id)}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className="name">{g.group_name}</span>
                      <span className="meta">{g.orders.length} members</span>
                      {combinedBalance > 0 && <span style={{ fontSize: '0.6rem', background: '#F1DBD3', color: '#D9534F', padding: '0.1rem 0.5rem', borderRadius: '12px', fontWeight: '600' }}>₦{combinedBalance.toLocaleString()}</span>}
                    </div>
                    <div className="meta">Coordinator: {g.customers?.name || 'Unnamed'}</div>
                    <div className="progress"><div className="bar" style={{ width: `${progress}%` }} /></div>
                    <div className={`balance ${combinedBalance > 0 ? 'owing' : 'paid'}`}>
                      {combinedBalance > 0 ? `₦${combinedBalance.toLocaleString()} remaining` : '✓ All paid'}
                    </div>
                  </div>
                  <span style={{ color: '#8A8A8A', fontSize: '0.8rem' }}>{isExpanded ? '▲' : '▼'}</span>
                </div>
                {isExpanded && hasVisible && (
                  <div style={{ marginTop: 'var(--spacing-md)', borderTop: '1px solid #F0EDE8', paddingTop: 'var(--spacing-sm)' }}>
                    {filteredOrders.map((o) => {
                      const status = getStatusInfo(o.current_status)
                      const due = getDueDisplay(o.due_date)
                      const balance = o.price - o.amount_paid
                      return (
                        <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0', borderBottom: '1px solid #F0EDE8' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '600', color: '#0F2B4A', fontSize: '0.85rem' }}>{o.customers?.name || 'No customer'}</div>
                            <div style={{ fontSize: '0.7rem', color: '#8A8A8A', display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                              <span className="status-badge" style={{ background: status.bg, color: status.color, fontSize:'0.55rem', padding:'0.05rem 0.4rem' }}>{status.icon} {status.label}</span>
                              <span style={{ color: due.color }}>{due.label}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <span style={{ fontWeight: '700', color: balance > 0 ? '#D9534F' : '#2E7D5E' }}>{balance > 0 ? `₦${balance.toLocaleString()}` : '✓'}</span>
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
          <div className="empty-state">
            <span className="icon">👤</span>
            <h4>No customers yet</h4>
            <p>Add your first customer to start tracking orders.</p>
            <a href="/dashboard/customers/new" className="cta">Add Customer →</a>
          </div>
        ) : (
          previewCustomers.map((c) => {
            const orders = allActiveOrders.filter(o => o.customer_id === c.id)
            const totalSpent = orders.reduce((sum, o) => sum + o.amount_paid, 0)
            const lastOrder = orders.length > 0 ? new Date(orders[0].created_at).toLocaleDateString('en-GB') : '—'
            return (
              <a key={c.id} href={`/dashboard/customers/${c.id}`} className="customer-row">
                <div>
                  <div className="name">{c.name}</div>
                  {c.phone && <div className="phone">{c.phone}</div>}
                </div>
                <div className="stats">
                  <div>₦{totalSpent.toLocaleString()}</div>
                  <div style={{ fontSize: '0.65rem' }}>Last: {lastOrder}</div>
                </div>
              </a>
            )
          })
        )}
      </div>

      {/* ─── FAB ─── */}
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
                <select className="select" value={quickOrderCustomer} onChange={(e) => setQuickOrderCustomer(e.target.value)} required style={{ width:'100%', padding:'0.7rem', borderRadius:'8px', border:'1px solid #E5E0D8', background:'#fff' }}>
                  <option value="">Select customer</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ marginBottom:'0.8rem' }}>
                <label style={{ display:'block', fontSize:'0.85rem', fontWeight:'500' }}>Item / Garment</label>
                <input className="input" type="text" value={quickOrderItem} onChange={(e) => setQuickOrderItem(e.target.value)} placeholder="e.g. Aso-ebi gown" required style={{ width:'100%', padding:'0.7rem', borderRadius:'8px', border:'1px solid #E5E0D8' }} />
              </div>
              <div style={{ display:'flex', gap:'0.5rem', marginBottom:'0.8rem' }}>
                <div style={{ flex:1 }}><label style={{ display:'block', fontSize:'0.85rem', fontWeight:'500' }}>Price (₦)</label><input className="input" type="number" value={quickOrderPrice} onChange={(e) => setQuickOrderPrice(e.target.value)} placeholder="5000" required style={{ width:'100%', padding:'0.7rem', borderRadius:'8px', border:'1px solid #E5E0D8' }} /></div>
                <div style={{ flex:1 }}><label style={{ display:'block', fontSize:'0.85rem', fontWeight:'500' }}>Deposit (₦)</label><input className="input" type="number" value={quickOrderDeposit} onChange={(e) => setQuickOrderDeposit(e.target.value)} placeholder="2000" style={{ width:'100%', padding:'0.7rem', borderRadius:'8px', border:'1px solid #E5E0D8' }} /></div>
              </div>
              <div style={{ marginBottom:'1.2rem' }}>
                <label style={{ display:'block', fontSize:'0.85rem', fontWeight:'500' }}>Due date</label>
                <input className="input" type="date" value={quickOrderDue} onChange={(e) => setQuickOrderDue(e.target.value)} style={{ width:'100%', padding:'0.7rem', borderRadius:'8px', border:'1px solid #E5E0D8' }} />
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
                <input className="input" type="number" value={settleAmount} onChange={(e) => setSettleAmount(e.target.value)} placeholder="Enter amount" required autoFocus style={{ width:'100%', padding:'0.7rem', borderRadius:'8px', border:'1px solid #E5E0D8' }} />
              </div>
              <div style={{ marginBottom:'1.2rem' }}>
                <label style={{ display:'block', fontSize:'0.85rem', fontWeight:'500' }}>Note (optional)</label>
                <input className="input" type="text" value={settleNote} onChange={(e) => setSettleNote(e.target.value)} placeholder="e.g. Cash payment" style={{ width:'100%', padding:'0.7rem', borderRadius:'8px', border:'1px solid #E5E0D8' }} />
              </div>
              <button type="submit" disabled={settleLoading} style={{ width:'100%', padding:'0.8rem', borderRadius:'10px', border:'none', background:'#2E7D5E', color:'#fff', fontWeight:'700', fontSize:'1rem', cursor: settleLoading ? 'default' : 'pointer', opacity: settleLoading ? 0.6 : 1 }}>
                {settleLoading ? 'Recording...' : '💰 Record payment'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── FOOTER ─── */}
      <div style={{ marginTop: 'var(--spacing-2xl)', textAlign: 'center', fontSize: '0.6rem', color: '#C8C0B5', borderTop: '1px solid #E5E0D8', paddingTop: 'var(--spacing-md)' }}>
        Cresoa Fashion · {new Date().getFullYear()}
      </div>
    </div>
  )
        }
