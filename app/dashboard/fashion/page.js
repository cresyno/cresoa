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

  // --- All your existing handlers (loadDashboard, toggleGroup, toggleOwingFilter, clearFilter, etc.) remain exactly the same ---
  // I'm copying them exactly as you have them – no changes.

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

  const toggleGroup = (groupId) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    )
  }

  const toggleOwingFilter = () => {
    setShowOwingOnly(!showOwingOnly)
  }

  const clearFilter = () => {
    setShowOwingOnly(false)
    setStatusFilter('all')
  }

  // Quick Order handlers
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

  // Settle Payment handlers
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
    if (!amount || amount <= 0) {
      setSettleLoading(false)
      return
    }

    const newTotal = settleOrder.amount_paid + amount
    if (newTotal > settleOrder.price) {
      setSettleLoading(false)
      return
    }

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

  // Check if group orders are available on the current plan
  const canCreateGroup = business ? isFeatureAvailable(business.plan || 'free', 'groups') : false

  // --- Helper functions (getStatusInfo, getOrderName, isOverdue, getDueDisplay, hasBalance, getFilteredOrders, getFilteredGroupOrders) – all unchanged ---
  // I'll keep them exactly as you have them.

  const getStatusInfo = (status) => {
    const map = {
      'Order placed': { label: 'Placed', color: '#6B6255', bg: '#F0EDE8' },
      'Cutting': { label: 'Cutting', color: '#B4881E', bg: '#F6E9C8' },
      'Sewing': { label: 'Sewing', color: '#1E3A5F', bg: '#D6E0EB' },
      'Ready': { label: 'Ready', color: '#4C7A5E', bg: '#DCEBE2' },
      'Delivered': { label: 'Delivered', color: '#6B6255', bg: '#E8E0D5' },
    }
    return map[status] || { label: status || 'Placed', color: '#6B6255', bg: '#F0EDE8' }
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
    due.setHours(0, 0, 0, 0)
    return due < new Date().setHours(0,0,0,0)
  }

  const getDueDisplay = (dueDate) => {
    if (!dueDate) return <span style={{ color: '#C8C0B5', fontSize: '0.7rem' }}>No deadline</span>
    if (isOverdue(dueDate)) {
      return <span style={{ color: '#D9534F', fontWeight: '700', textTransform: 'uppercase' }}>⚠️ OVERDUE</span>
    }
    return <span style={{ color: '#8A8A8A' }}>Due {new Date(dueDate).toLocaleDateString('en-GB')}</span>
  }

  const hasBalance = (order) => {
    return (order.price - order.amount_paid) > 0
  }

  const getFilteredOrders = (orders) => {
    let filtered = orders
    if (showOwingOnly) {
      filtered = filtered.filter(o => hasBalance(o))
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.current_status === statusFilter)
    }
    return filtered
  }

  const getFilteredGroupOrders = (group) => {
    let filtered = group.orders
    if (showOwingOnly) {
      filtered = filtered.filter(o => hasBalance(o))
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.current_status === statusFilter)
    }
    return filtered
  }

  // --- Loading and deactivated states ---
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8F6F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          .spinner { width: 40px; height: 40px; border: 4px solid #E5E0D8; border-top: 4px solid #0F2B4A; border-radius: 50%; animation: spin 0.8s linear infinite; }
        `}</style>
        <div className="spinner"></div>
      </div>
    )
  }

  if (deactivated) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8F6F2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
        <h1 style={{ color: '#0F2B4A', fontSize: '1.3rem' }}>Account deactivated</h1>
        <p style={{ color: '#8A8A8A' }}>Please contact support.</p>
      </div>
    )
  }

  // --- Compute stats ---
  const previewCustomers = customers.slice(0, 5)
  const previewOrders = soloOrders.slice(0, 5)
  const allGroupOrders = groups.flatMap((g) => g.orders)
  const allActiveOrders = [...soloOrders, ...allGroupOrders]
  const totalOrders = allActiveOrders.length
  const totalBalanceOwed = allActiveOrders.reduce((sum, o) => sum + Math.max(0, o.price - o.amount_paid), 0)
  const todayStr = new Date().toISOString().split('T')[0]
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueTodayCount = allActiveOrders.filter(o => o.due_date === todayStr && o.current_status !== 'Delivered').length
  const readyCount = allActiveOrders.filter(o => o.current_status === 'Ready').length
  const overdueCount = allActiveOrders.filter(o => {
    if (!o.due_date || o.current_status === 'Delivered') return false
    const due = new Date(o.due_date)
    due.setHours(0, 0, 0, 0)
    return due < today
  }).length

  // Revenue calculations
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

  // --- The JSX starts here – we'll put it in part 2 and 3. For now, we'll end part 1 with the return statement opening.
  return (
    <div style={{ minHeight: '100vh', background: '#F8F6F2', padding: '1.2rem 1rem', paddingBottom: '5rem', fontFamily: "'Inter', system-ui, sans-serif" }}>
<style>{`
  /* ─────────────────────────────────────────────
     GLASS CARD
     ───────────────────────────────────────────── */
  .glass-card {
    background: rgba(255,255,255,0.7);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.3);
    border-radius: 16px;
    box-shadow: 0 4px 16px rgba(15,43,74,0.06);
    padding: 0.8rem 1rem;
    transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }
  .glass-card:hover {
    box-shadow: 0 8px 32px rgba(15,43,74,0.1);
    transform: translateY(-2px);
  }

  /* ─────────────────────────────────────────────
     STAT CARD
     ───────────────────────────────────────────── */
  .stat-card {
    background: rgba(255,255,255,0.7);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.3);
    border-radius: 14px;
    padding: 0.7rem 0.4rem;
    text-align: center;
    text-decoration: none;
    transition: all 0.25s ease;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(15,43,74,0.04);
  }
  .stat-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(15,43,74,0.08);
    border-color: #D4A52A;
  }
  .stat-card .value { font-size: 1.3rem; font-weight: 700; margin: 0; }
  .stat-card .value.navy { color: #0F2B4A; }
  .stat-card .value.red { color: #D9534F; }
  .stat-card .value.green { color: #2E7D5E; }
  .stat-card .value.gold { color: #D4A52A; }
  .stat-card .label { color: #8A8A8A; font-size: 0.6rem; margin: 0.1rem 0 0; text-transform: uppercase; letter-spacing: 0.3px; }

  /* ─────────────────────────────────────────────
     BUTTONS & ACTIONS
     ───────────────────────────────────────────── */
  .action-btn {
    padding: 0.6rem 1rem;
    border-radius: 10px;
    font-size: 0.8rem;
    font-weight: 600;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(15,43,74,0.04);
  }
  .action-btn:active { transform: scale(0.96); }
  .action-btn-primary { background: linear-gradient(135deg, #D4A52A, #C79A2B); color: #0F2B4A; }
  .action-btn-secondary { background: #0F2B4A; color: #fff; }
  .action-btn-secondary:hover { background: #1A3F66; }
  .action-btn-outline { background: rgba(255,255,255,0.7); color: #0F2B4A; border: 1px solid #E5E0D8; }

  /* ─────────────────────────────────────────────
     GROUP CARD
     ───────────────────────────────────────────── */
  .group-card {
    background: rgba(255,255,255,0.7);
    backdrop-filter: blur(12px);
    border: 1px solid #E5E0D8;
    border-radius: 14px;
    padding: 1rem;
    margin-bottom: 1rem;
    transition: all 0.25s ease;
    box-shadow: 0 2px 8px rgba(15,43,74,0.03);
  }
  .group-card:hover { border-color: #D4A52A; box-shadow: 0 8px 24px rgba(15,43,74,0.06); }
  .group-card.expanded { border-color: #D4A52A; }

  /* ─────────────────────────────────────────────
     ORDER ROW
     ───────────────────────────────────────────── */
  .order-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.6rem 0;
    border-bottom: 1px solid #F0EDE8;
  }
  .order-row:last-child { border-bottom: none; }
  .order-info { flex: 1; min-width: 0; }
  .order-info .name { font-weight: 600; color: #0F2B4A; font-size: 0.9rem; margin: 0; line-height: 1.3; }
  .order-info .meta { font-size: 0.75rem; margin: 0.1rem 0 0; display: flex; align-items: center; gap: 0.3rem; flex-wrap: wrap; color: #8A8A8A; }
  .order-balance { font-weight: 700; font-size: 0.85rem; color: #D9534F; margin-right: 0.8rem; white-space: nowrap; }
  .order-balance.paid { color: #2E7D5E; }
  .order-actions { display: flex; gap: 0.3rem; flex-shrink: 0; align-items: center; }
  .order-actions .btn {
    padding: 0.2rem 0.6rem;
    border-radius: 6px;
    font-size: 0.65rem;
    font-weight: 600;
    text-decoration: none;
    border: 1px solid #E5E0D8;
    background: #fff;
    color: #0F2B4A;
    cursor: pointer;
    transition: all 0.15s ease;
    display: inline-flex;
    align-items: center;
    gap: 0.15rem;
    min-height: 28px;
  }
  .order-actions .btn:hover { background: #F8F6F2; }
  .order-actions .btn-view { background: #F5EFE2; border-color: #D6D0C5; }
  .order-actions .btn-call { background: #F6E9C8; border-color: #D4A52A; color: #0F2B4A; }
  .order-actions .btn-edit { background: #0F2B4A; border-color: #0F2B4A; color: #fff; }
  .order-actions .btn-edit:hover { background: #1A3F66; }
  .order-actions .btn-settle { background: #2E7D5E; border-color: #2E7D5E; color: #fff; }

  /* ─────────────────────────────────────────────
     CUSTOMER ROW
     ───────────────────────────────────────────── */
  .customer-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.6rem 1rem;
    background: rgba(255,255,255,0.7);
    backdrop-filter: blur(8px);
    border-radius: 12px;
    border: 1px solid #E5E0D8;
    text-decoration: none;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(15,43,74,0.02);
  }
  .customer-row:hover { border-color: #D4A52A; transform: translateX(4px); }
  .customer-row .name { color: #0F2B4A; font-weight: 600; font-size: 0.9rem; margin: 0; }
  .customer-row .phone { color: #8A8A8A; font-size: 0.75rem; margin: 0; }

  /* ─────────────────────────────────────────────
     FILTERS / SEARCH
     ───────────────────────────────────────────── */
  .search-bar {
    width: 100%;
    padding: 0.65rem 0.9rem;
    border-radius: 10px;
    border: 1px solid #E5E0D8;
    font-size: 0.9rem;
    background: rgba(255,255,255,0.7);
    backdrop-filter: blur(8px);
    box-sizing: border-box;
    color: #1A1A1A;
    transition: border-color 0.2s ease;
  }
  .search-bar:focus { outline: none; border-color: #D4A52A; }
  .filter-select {
    padding: 0.4rem 0.6rem;
    border-radius: 8px;
    border: 1px solid #E5E0D8;
    font-size: 0.75rem;
    background: rgba(255,255,255,0.7);
    color: #0F2B4A;
    cursor: pointer;
    min-width: 90px;
  }

  /* ─────────────────────────────────────────────
     MODALS
     ───────────────────────────────────────────── */
  .modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.4);
    backdrop-filter: blur(4px);
    z-index: 1000;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    animation: slideUp 0.3s ease-out;
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .modal-content {
    background: #F8F6F2;
    border-radius: 20px 20px 0 0;
    padding: 1.5rem;
    max-width: 480px;
    width: 100%;
    max-height: 85vh;
    overflow-y: auto;
    position: relative;
  }
  .modal-handle { width: 40px; height: 4px; background: #D6D0C5; border-radius: 4px; margin: 0 auto 1rem; }
  .settle-modal {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5);
    backdrop-filter: blur(4px);
    z-index: 1100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
  }
  .settle-modal-content {
    background: #F8F6F2;
    border-radius: 20px;
    padding: 1.8rem;
    max-width: 380px;
    width: 100%;
    animation: slideUp 0.3s ease-out;
  }
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
    box-shadow: 0 4px 16px rgba(212,165,42,0.4);
    cursor: pointer;
    transition: all 0.2s ease;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .fab:active { transform: scale(0.92); }
  .fab-label {
    position: fixed;
    bottom: 2.2rem;
    right: 4.8rem;
    background: #0F2B4A;
    color: #fff;
    padding: 0.3rem 0.8rem;
    border-radius: 20px;
    font-size: 0.7rem;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    z-index: 100;
    opacity: 0;
    transition: opacity 0.2s ease;
    pointer-events: none;
  }
  .fab:hover + .fab-label { opacity: 1; }

  .empty-state {
    background: rgba(255,255,255,0.5);
    backdrop-filter: blur(8px);
    border-radius: 14px;
    padding: 1.5rem;
    border: 1px solid #E5E0D8;
    text-align: center;
    color: #8A8A8A;
    font-size: 0.9rem;
    margin-bottom: 1.5rem;
  }
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.7rem;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .section-header h2 { color: #0F2B4A; font-size: 1rem; font-weight: 700; margin: 0; }
  .section-header a { color: #8A8A8A; font-size: 0.75rem; text-decoration: none; border-bottom: 1px solid transparent; }
  .section-header a:hover { border-bottom-color: #8A8A8A; }

  .order-status-badge {
    display: inline-block;
    padding: 0.1rem 0.5rem;
    border-radius: 20px;
    font-size: 0.55rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .filter-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: #F1DBD3;
    padding: 0.2rem 0.7rem 0.2rem 0.5rem;
    border-radius: 12px;
    font-size: 0.7rem;
    color: #D9534F;
    font-weight: 600;
  }
  .clear-filter-btn {
    background: #D9534F;
    color: #fff;
    border: none;
    padding: 0.1rem 0.5rem;
    border-radius: 12px;
    font-size: 0.7rem;
    font-weight: 600;
    cursor: pointer;
  }
  .clear-filter-btn:hover { background: #C0392B; }

  @media (max-width: 480px) {
    .stat-card .value { font-size: 1rem; }
    .action-btn { font-size: 0.7rem; padding: 0.4rem 0.6rem; }
    .order-row { flex-wrap: wrap; gap: 0.3rem; }
    .order-actions { margin-left: auto; }
  }
`}</style>

{/* ─── HEADER ─── */}
<div className="glass-card" style={{ marginBottom: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
    <LetterLogo name={business?.name} size={44} />
    <div>
      <p style={{ color: '#8A8A8A', fontSize: '0.7rem', margin: 0 }}>Welcome back,</p>
      <p style={{ color: '#0F2B4A', fontSize: '1.2rem', fontWeight: '700', margin: 0 }}>
        {business ? business.name : 'Your business'}
        <span style={{ background: 'rgba(212,165,42,0.15)', color: '#D4A52A', padding: '0.05rem 0.5rem', borderRadius: '10px', fontSize: '0.6rem', fontWeight: '600', marginLeft: '0.3rem' }}>
          👗 Fashion
        </span>
      </p>
    </div>
  </div>
  <div style={{ textAlign: 'right' }}>
    <div style={{ fontSize: '0.6rem', color: '#8A8A8A' }}>Today</div>
    <div style={{ fontSize: '1rem', fontWeight: '700', color: '#0F2B4A' }}>₦{todayRevenue.toLocaleString()}</div>
  </div>
</div>

{/* Feedback banner */}
{business && <FeedbackBanner business={business} />}

{/* ─── REVENUE ROW ─── */}
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1.2rem' }}>
  <div className="glass-card" style={{ padding: '0.6rem', textAlign: 'center', borderTop: '3px solid #D4A52A' }}>
    <div style={{ fontSize: '0.55rem', color: '#8A8A8A', textTransform: 'uppercase' }}>Today</div>
    <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0F2B4A' }}>₦{todayRevenue.toLocaleString()}</div>
  </div>
  <div className="glass-card" style={{ padding: '0.6rem', textAlign: 'center', borderTop: '3px solid #D9534F' }}>
    <div style={{ fontSize: '0.55rem', color: '#8A8A8A', textTransform: 'uppercase' }}>This Week</div>
    <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0F2B4A' }}>₦{weekRevenue.toLocaleString()}</div>
  </div>
  <div className="glass-card" style={{ padding: '0.6rem', textAlign: 'center', borderTop: '3px solid #2E7D5E' }}>
    <div style={{ fontSize: '0.55rem', color: '#8A8A8A', textTransform: 'uppercase' }}>This Month</div>
    <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0F2B4A' }}>₦{monthRevenue.toLocaleString()}</div>
  </div>
</div>

{/* ─── STATS ─── */}
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', marginBottom: '1.2rem' }}>
  <a href="/dashboard/customers" className="stat-card">
    <p className="value navy">{customers.length}</p>
    <p className="label">Customers</p>
  </a>
  <a href="/dashboard/orders" className="stat-card">
    <p className="value navy">{totalOrders}</p>
    <p className="label">Orders</p>
  </a>
  <button onClick={toggleOwingFilter} className="stat-card" style={{ border: showOwingOnly ? '2px solid #D9534F' : '' }}>
    <p className={`value ${totalBalanceOwed > 0 ? 'red' : 'green'}`}>₦{totalBalanceOwed.toLocaleString()}</p>
    <p className="label">{showOwingOnly ? '🔴 Filtered' : 'Owed'}</p>
  </button>
  <a href="/dashboard/orders?filter=ready" className="stat-card">
    <p className="value green">{readyCount}</p>
    <p className="label">Ready</p>
  </a>
  <a href="/dashboard/orders?filter=overdue" className="stat-card">
    <p className="value red">{overdueCount}</p>
    <p className="label">Overdue</p>
  </a>
</div>

{/* ─── ALERTS ─── */}
{(overdueCount > 0 || dueTodayCount > 0 || readyCount > 0) && (
  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
    {overdueCount > 0 && (
      <a href="/dashboard/orders?filter=overdue" className="glass-card" style={{ padding: '0.4rem 0.8rem', background: '#F1DBD3', borderColor: '#D9534F', textDecoration: 'none' }}>
        <span style={{ fontWeight: '700', color: '#D9534F' }}>{overdueCount}</span> Overdue
      </a>
    )}
    {dueTodayCount > 0 && (
      <a href="/dashboard/orders?filter=due_today" className="glass-card" style={{ padding: '0.4rem 0.8rem', background: '#FFF3E0', borderColor: '#E67E22', textDecoration: 'none' }}>
        <span style={{ fontWeight: '700', color: '#E67E22' }}>{dueTodayCount}</span> Due today
      </a>
    )}
    {readyCount > 0 && (
      <a href="/dashboard/orders?filter=ready" className="glass-card" style={{ padding: '0.4rem 0.8rem', background: '#F6E9C8', borderColor: '#D4A52A', textDecoration: 'none' }}>
        <span style={{ fontWeight: '700', color: '#D4A52A' }}>{readyCount}</span> Ready
      </a>
    )}
  </div>
)}

{/* ─── SEARCH + FILTER ─── */}
<div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
  <input
    type="text"
    className="search-bar"
    placeholder="🔍 Search by customer, order, or phone..."
    style={{ flex: 1 }}
    onKeyDown={(e) => {
      if (e.key === 'Enter' && e.target.value.trim()) {
        router.push(`/dashboard/orders?search=${encodeURIComponent(e.target.value.trim())}`)
      }
    }}
  />
  <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
    <option value="all">All</option>
    <option value="Order placed">Placed</option>
    <option value="Cutting">Cutting</option>
    <option value="Sewing">Sewing</option>
    <option value="Ready">Ready</option>
    <option value="Delivered">Delivered</option>
  </select>
</div>

{/* ─── QUICK ACTIONS ─── */}
<div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.2rem' }}>
  <a href="/dashboard/customers/new" className="action-btn action-btn-secondary">👤 + Customer</a>
  <a href="/dashboard/orders/new" className="action-btn action-btn-primary">📋 + Order</a>
  <a
    href={canCreateGroup ? "/dashboard/groups/new" : "#"}
    className="action-btn"
    style={{
      background: canCreateGroup ? 'rgba(212,165,42,0.2)' : '#E5E0D8',
      color: canCreateGroup ? '#0F2B4A' : '#8A8A8A',
      cursor: canCreateGroup ? 'pointer' : 'default',
    }}
    onClick={(e) => {
      if (!canCreateGroup) { e.preventDefault(); router.push('/dashboard/subscription') }
    }}
  >
    {canCreateGroup ? '👥 + Group' : '🔒 Group (Upgrade)'}
  </a>
  <a href="/dashboard/reminders" className="action-btn action-btn-outline">🔔 Reminders</a>
</div>

{/* ─── GROUP ORDERS ─── */}
<div style={{ marginBottom: '1.8rem' }}>
  <div className="section-header">
    <h2>Group Orders</h2>
    {showOwingOnly && (
      <span className="filter-badge">
        💰 Unpaid only
        <button onClick={clearFilter} className="clear-filter-btn">✕</button>
      </span>
    )}
  </div>

  {groups.length === 0 ? (
    <div className="empty-state">
      <p style={{ margin: '0 0 0.4rem' }}>No group orders yet.</p>
      {canCreateGroup ? (
        <a href="/dashboard/groups/new" style={{ color: '#D4A52A', fontWeight: '600', fontSize: '0.85rem', textDecoration: 'none' }}>👥 + Create a group order</a>
      ) : (
        <button onClick={() => router.push('/dashboard/subscription')} style={{ color: '#8A8A8A', fontWeight: '600', fontSize: '0.85rem', background: 'none', border: 'none', cursor: 'pointer' }}>
          🔒 Upgrade to create group orders
        </button>
      )}
    </div>
  ) : (
    groups.map((g) => {
      const isExpanded = expandedGroups.includes(g.id)
      const filteredOrders = getFilteredGroupOrders(g)
      const hasVisibleOrders = filteredOrders.length > 0
      if (showOwingOnly && !hasVisibleOrders) return null
      const combinedBalance = filteredOrders.reduce((sum, o) => sum + (o.price - o.amount_paid), 0)
      const memberCount = g.orders.length

      return (
        <div key={g.id} className={`group-card ${isExpanded ? 'expanded' : ''}`}>
          <button className="group-header" onClick={() => toggleGroup(g.id)} style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, color: '#0F2B4A', fontSize: '0.95rem', fontWeight: '700' }}>{g.group_name}</h3>
                <span style={{ color: '#8A8A8A', fontSize: '0.7rem' }}>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
                {showOwingOnly && combinedBalance > 0 && <span style={{ fontSize: '0.6rem', background: '#F1DBD3', color: '#D9534F', padding: '0.1rem 0.4rem', borderRadius: '10px', fontWeight: '700' }}>₦{combinedBalance.toLocaleString()}</span>}
              </div>
              <p style={{ fontSize: '0.75rem', color: '#8A8A8A', margin: '0.1rem 0' }}>Coordinator: {g.customers?.name || 'Unnamed'}</p>
              <p style={{ fontSize: '0.8rem', fontWeight: '600', margin: '0.2rem 0 0', color: combinedBalance > 0 ? '#D9534F' : '#2E7D5E' }}>
                {combinedBalance > 0 ? `₦${combinedBalance.toLocaleString()} remaining` : '✓ All paid'}
              </p>
            </div>
            <span className="group-toggle" style={{ background: 'none', border: 'none', color: '#8A8A8A', fontSize: '0.7rem', cursor: 'pointer' }}>{isExpanded ? '▲ Hide' : '▼ Show'}</span>
          </button>

          {isExpanded && hasVisibleOrders && (
            <div style={{ marginTop: '0.8rem', borderTop: '1px solid #F0EDE8', paddingTop: '0.8rem' }}>
              {filteredOrders.map((o) => {
                const status = getStatusInfo(o.current_status)
                const orderName = getOrderName(o)
                const dueDisplay = getDueDisplay(o.due_date)
                const phone = o.customers?.phone
                const balance = o.price - o.amount_paid
                return (
                  <div key={o.id} className="order-row">
                    <div className="order-info">
                      <p className="name">
                        {orderName}
                        <span className="order-status-badge" style={{ background: status.bg, color: status.color, marginLeft: '0.5rem' }}>{status.label}</span>
                      </p>
                      <div className="meta">
                              <span>{o.customers?.name || 'No customer'}</span>
                              <span>·</span>
                              {dueDisplay}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                            <span className={`order-balance ${balance <= 0 ? 'paid' : ''}`}>
                              {balance > 0 ? `₦${balance.toLocaleString()}` : '✓'}
                            </span>
                            <div className="order-actions">
                              <a href={`/dashboard/orders/${o.id}`} className="btn btn-view">👁️</a>
                              {phone && <a href={`tel:${phone}`} className="btn btn-call">📞</a>}
                              {balance > 0 && <button className="btn btn-settle" onClick={() => openSettleModal(o)}>💰</button>}
                              <a href={`/dashboard/orders/${o.id}?edit=true`} className="btn btn-edit">✏️</a>
                            </div>
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
      {/* ─── INDIVIDUAL ORDERS ─── */}
      <div style={{ marginBottom: '1.8rem' }}>
        <div className="section-header">
          <h2>Recent Orders</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {showOwingOnly && (
              <button onClick={clearFilter} className="clear-filter-btn">✕ Clear filter</button>
            )}
            {statusFilter !== 'all' && (
              <button onClick={() => setStatusFilter('all')} className="clear-filter-btn" style={{ background: '#6B6255' }}>✕ {statusFilter}</button>
            )}
            <a href="/dashboard/orders">View all →</a>
          </div>
        </div>

        {filteredPreviewOrders.length === 0 ? (
          <div className="empty-state">
            {showOwingOnly || statusFilter !== 'all' ? (
              <p>🎉 No orders match your filters. Try clearing the filters above.</p>
            ) : (
              <p>No individual orders yet. Create your first order to get started.</p>
            )}
          </div>
        ) : (
          <div className="glass-card" style={{ padding: '0.2rem 1rem' }}>
            {filteredPreviewOrders.map((o) => {
              const status = getStatusInfo(o.current_status)
              const orderName = getOrderName(o)
              const dueDisplay = getDueDisplay(o.due_date)
              const phone = o.customers?.phone
              const balance = o.price - o.amount_paid
              return (
                <div key={o.id} className="order-row">
                  <div className="order-info">
                    <p className="name">
                      {orderName}
                      <span className="order-status-badge" style={{ background: status.bg, color: status.color, marginLeft: '0.5rem' }}>{status.label}</span>
                    </p>
                    <div className="meta">
                      <span>{o.customers?.name || 'No customer'}</span>
                      <span>·</span>
                      {dueDisplay}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    <span className={`order-balance ${balance <= 0 ? 'paid' : ''}`}>
                      {balance > 0 ? `₦${balance.toLocaleString()}` : '✓'}
                    </span>
                    <div className="order-actions">
                      <a href={`/dashboard/orders/${o.id}`} className="btn btn-view">👁️</a>
                      {phone && <a href={`tel:${phone}`} className="btn btn-call">📞</a>}
                      {balance > 0 && <button className="btn btn-settle" onClick={() => openSettleModal(o)}>💰</button>}
                      <a href={`/dashboard/orders/${o.id}?edit=true`} className="btn btn-edit">✏️</a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ─── RECENT CUSTOMERS ─── */}
      <div>
        <div className="section-header">
          <h2>Recent Customers</h2>
          <a href="/dashboard/customers">View all →</a>
        </div>

        {previewCustomers.length === 0 ? (
          <div className="empty-state">
            <p>No customers yet. Add your first customer to start tracking orders.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {previewCustomers.map((c) => {
              const activeOrders = allActiveOrders.filter(o => o.customer_id === c.id && o.current_status !== 'Delivered').length
              return (
                <a key={c.id} href={`/dashboard/customers/${c.id}`} className="customer-row">
                  <div>
                    <p className="name">{c.name}</p>
                    {c.phone && <p className="phone">{c.phone}</p>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {activeOrders > 0 && <span style={{ background: '#F6E9C8', color: '#0F2B4A', fontSize: '0.55rem', padding: '0.1rem 0.5rem', borderRadius: '10px' }}>{activeOrders} active</span>}
                    <span style={{ color: '#D4A52A', fontSize: '0.8rem' }}>→</span>
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </div>

      {/* ─── FLOATING ACTION BUTTON ─── */}
      <button className="fab" onClick={() => setShowQuickOrder(true)}>+</button>
      <span className="fab-label">Quick Order</span>

      {/* ─── QUICK ORDER MODAL ─── */}
      {showQuickOrder && (
        <div className="modal-overlay" onClick={() => setShowQuickOrder(false)}>
          <div className="modal-content" ref={modalRef} onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle"></div>
            <h2 style={{ color: '#0F2B4A', fontSize: '1.2rem', margin: '0 0 0.3rem' }}>Quick Order</h2>
            <p style={{ color: '#8A8A8A', fontSize: '0.85rem', margin: '0 0 1.2rem' }}>Create an order in seconds.</p>

            <form onSubmit={handleQuickOrderSubmit}>
              <div style={{ marginBottom: '0.8rem' }}>
                <label style={{ display: 'block', color: '#1A1A1A', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Customer</label>
                <select className="filter-select" style={{ width: '100%', padding: '0.7rem' }} value={quickOrderCustomer} onChange={(e) => setQuickOrderCustomer(e.target.value)} required>
                  <option value="">Select customer</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {customers.length === 0 && <p style={{ fontSize: '0.75rem', color: '#D9534F' }}>No customers yet. Add one first.</p>}
              </div>

              <div style={{ marginBottom: '0.8rem' }}>
                <label style={{ display: 'block', color: '#1A1A1A', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Item / Garment</label>
                <input className="search-bar" type="text" value={quickOrderItem} onChange={(e) => setQuickOrderItem(e.target.value)} placeholder="e.g. Aso-ebi gown" required />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.8rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', color: '#1A1A1A', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Price (₦)</label>
                  <input className="search-bar" type="number" value={quickOrderPrice} onChange={(e) => setQuickOrderPrice(e.target.value)} placeholder="5000" required />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', color: '#1A1A1A', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Deposit (₦)</label>
                  <input className="search-bar" type="number" value={quickOrderDeposit} onChange={(e) => setQuickOrderDeposit(e.target.value)} placeholder="2000" />
                </div>
              </div>

              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ display: 'block', color: '#1A1A1A', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Due date</label>
                <input className="search-bar" type="date" value={quickOrderDue} onChange={(e) => setQuickOrderDue(e.target.value)} />
              </div>

              <button type="submit" disabled={quickOrderLoading || customers.length === 0} style={{
                width: '100%', padding: '0.8rem', borderRadius: '10px',
                border: 'none', background: 'linear-gradient(135deg, #D4A52A, #C79A2B)',
                color: '#0F2B4A', fontSize: '1rem', fontWeight: '700',
                boxShadow: '0 4px 16px rgba(212,165,42,0.3)',
                cursor: quickOrderLoading ? 'default' : 'pointer',
                opacity: quickOrderLoading ? 0.6 : 1,
              }}>
                {quickOrderLoading ? 'Creating...' : '🚀 Create order'}
              </button>

              {quickOrderMessage && (
                <p style={{ marginTop: '0.8rem', fontSize: '0.85rem', color: quickOrderMessage.startsWith('✅') ? '#2E7D5E' : '#D9534F', textAlign: 'center' }}>
                  {quickOrderMessage}
                </p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ─── SETTLE PAYMENT MODAL ─── */}
      {showSettleModal && settleOrder && (
        <div className="settle-modal" onClick={() => setShowSettleModal(false)}>
          <div className="settle-modal-content" ref={modalRef} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <h2 style={{ color: '#0F2B4A', fontSize: '1.1rem', margin: 0 }}>💰 Record Payment</h2>
              <button onClick={() => setShowSettleModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', color: '#8A8A8A', cursor: 'pointer' }}>✕</button>
            </div>
            <p style={{ color: '#8A8A8A', fontSize: '0.85rem', margin: '0 0 1.2rem' }}>
              {settleOrder.customers?.name || 'Customer'} · Balance: ₦{(settleOrder.price - settleOrder.amount_paid).toLocaleString()}
            </p>

            <form onSubmit={handleSettleSubmit}>
              <div style={{ marginBottom: '0.8rem' }}>
                <label style={{ display: 'block', color: '#1A1A1A', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Amount paid (₦)</label>
                <input className="search-bar" type="number" value={settleAmount} onChange={(e) => setSettleAmount(e.target.value)} placeholder="Enter amount" required autoFocus />
              </div>

              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ display: 'block', color: '#1A1A1A', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Note (optional)</label>
                <input className="search-bar" type="text" value={settleNote} onChange={(e) => setSettleNote(e.target.value)} placeholder="e.g. Cash payment" />
              </div>

              <button type="submit" disabled={settleLoading} style={{
                width: '100%', padding: '0.8rem', borderRadius: '10px',
                border: 'none', background: '#2E7D5E',
                color: '#fff', fontSize: '1rem', fontWeight: '700',
                cursor: settleLoading ? 'default' : 'pointer',
                opacity: settleLoading ? 0.6 : 1,
              }}>
                {settleLoading ? 'Recording...' : '💰 Record payment'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── FOOTER ─── */}
      <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.6rem', color: '#C8C0B5' }}>
        Cresoa Fashion · {new Date().getFullYear()}
      </div>
    </div>
  )
                        }
