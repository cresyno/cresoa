'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import LetterLogo from '../../../components/LetterLogo'

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

  // Loading skeleton
  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '1.5rem 1.2rem' }}>
        <style>{`
          @keyframes shimmer {
            0% { background-position: -200px 0; }
            100% { background-position: calc(200px + 100%) 0; }
          }
          .skeleton {
            background: #E8E0D5;
            border-radius: 8px;
            background-image: linear-gradient(90deg, #E8E0D5 0px, #F5EFE2 40px, #E8E0D5 80px);
            background-size: 200px 100%;
            animation: shimmer 1.2s ease-in-out infinite;
          }
          .skeleton-text { height: 14px; margin-bottom: 6px; }
          .skeleton-title { height: 20px; width: 60%; margin-bottom: 8px; }
          .skeleton-card { height: 80px; border-radius: 12px; }
        `}</style>
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
            <div className="skeleton" style={{ width: '44px', height: '44px', borderRadius: '12px' }}></div>
            <div>
              <div className="skeleton skeleton-text" style={{ width: '80px' }}></div>
              <div className="skeleton skeleton-title" style={{ width: '120px' }}></div>
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1.2rem' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton skeleton-card"></div>
          ))}
        </div>
        <div className="skeleton" style={{ height: '44px', borderRadius: '10px', marginBottom: '1rem' }}></div>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: '40px', width: '80px', borderRadius: '8px' }}></div>
          ))}
        </div>
        <div className="skeleton" style={{ height: '24px', width: '120px', marginBottom: '0.7rem' }}></div>
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton" style={{ height: '60px', borderRadius: '12px', marginBottom: '0.6rem' }}></div>
        ))}
      </main>
    )
  }

  if (deactivated) {
    return (
      <main style={{ minHeight: '100vh', background: '#F5EFE2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', textAlign: 'center' }}>
        <div>
          <h1 style={{ color: '#1E3A5F', fontSize: '1.3rem', marginBottom: '0.6rem' }}>Account deactivated</h1>
          <p style={{ color: '#6B6255', fontSize: '0.9rem' }}>
            Please contact support to reactivate your account.
          </p>
        </div>
      </main>
    )
  }

  const previewCustomers = customers.slice(0, 5)
  const previewOrders = soloOrders.slice(0, 5)

  const allGroupOrders = groups.flatMap((g) => g.orders)
  const allActiveOrders = [...soloOrders, ...allGroupOrders]
  const totalOrders = allActiveOrders.length
  const totalBalanceOwed = allActiveOrders.reduce(
    (sum, o) => sum + Math.max(0, o.price - o.amount_paid), 0
  )

  const todayStr = new Date().toISOString().split('T')[0]
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const dueTodayCount = allActiveOrders.filter(
    (o) => o.due_date === todayStr && o.current_status !== 'Delivered'
  ).length

  const readyCount = allActiveOrders.filter((o) => o.current_status === 'Ready').length

  // Overdue count
  const overdueCount = allActiveOrders.filter((o) => {
    if (!o.due_date || o.current_status === 'Delivered') return false
    const due = new Date(o.due_date)
    due.setHours(0, 0, 0, 0)
    return due < today
  }).length

  // Get Status Info
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
    return due < today
  }

  const getDueDisplay = (dueDate) => {
    if (!dueDate) return <span style={{ color: '#C8C0B5', fontSize: '0.7rem' }}>No deadline</span>
    if (isOverdue(dueDate)) {
      return (
        <span style={{
          color: '#AE4A34',
          fontWeight: '700',
          textTransform: 'uppercase',
          animation: 'pulseGlow 1.5s ease-in-out infinite'
        }}>
          ⚠️ OVERDUE
        </span>
      )
    }
    return <span style={{ color: '#6B6255' }}>Due {new Date(dueDate).toLocaleDateString('en-GB')}</span>
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

  const filteredPreviewOrders = getFilteredOrders(previewOrders)

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '1.5rem 1.2rem', paddingBottom: '5rem' }}>
      <style>{`
        @keyframes pulseGlow {
          0%, 100% { opacity: 1; text-shadow: 0 0 4px rgba(174, 74, 52, 0.2); }
          50% { opacity: 0.8; text-shadow: 0 0 12px rgba(174, 74, 52, 0.5); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(30px); }
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          animation: slideUp 0.3s ease-out;
        }
        .modal-overlay.closing {
          animation: slideDown 0.25s ease-in;
        }
        .modal-content {
          background: #F5EFE2;
          border-radius: 20px 20px 0 0;
          padding: 1.5rem;
          max-width: 480px;
          width: 100%;
          max-height: 85vh;
          overflow-y: auto;
          position: relative;
        }
        .modal-handle {
          width: 40px;
          height: 4px;
          background: #D6D0C5;
          border-radius: 4px;
          margin: 0 auto 1rem;
        }
        .order-status-badge {
          display: inline-block;
          padding: 0.15rem 0.6rem;
          border-radius: 20px;
          font-size: 0.65rem;
          font-weight: 600;
          letter-spacing: 0.3px;
          text-transform: uppercase;
        }
        .stat-card {
          background: #fff;
          border-radius: 10px;
          padding: 0.7rem 0.5rem;
          border: 1px solid #E8E0D5;
          text-align: center;
          text-decoration: none;
          transition: border-color 0.15s ease, background 0.15s ease;
          cursor: pointer;
          position: relative;
        }
        .stat-card:hover {
          border-color: #C79A2B;
          background: #FBF8F0;
        }
        .stat-card.active {
          border-color: #AE4A34;
          background: #F1DBD3;
        }
        .stat-card .label {
          color: #6B6255;
          font-size: 0.7rem;
          margin: 0.1rem 0 0;
        }
        .stat-card .value {
          font-size: 1.3rem;
          font-weight: 700;
          margin: 0;
        }
        .stat-card .value.red { color: #AE4A34; }
        .stat-card .value.green { color: #4C7A5E; }
        .stat-card .value.navy { color: #1E3A5F; }
        .action-btn {
          padding: 0.6rem 1rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          border: none;
          cursor: pointer;
          transition: transform 0.1s ease;
        }
        .action-btn:active {
          transform: scale(0.97);
        }
        .group-card {
          border: 1px solid #E8E0D5;
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 1rem;
          background: #fff;
          transition: border-color 0.2s ease;
        }
        .group-card.expanded {
          border-color: #C79A2B;
        }
        .order-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.7rem 0;
          border-bottom: 1px solid #F0EDE8;
        }
        .order-row:last-child {
          border-bottom: none;
        }
        .order-info {
          flex: 1;
          min-width: 0;
        }
        .order-info .name {
          font-weight: 600;
          color: #1E3A5F;
          font-size: 0.9rem;
          margin: 0;
          line-height: 1.3;
        }
        .order-info .meta {
          font-size: 0.78rem;
          margin: 0.1rem 0 0;
          display: flex;
          align-items: center;
          gap: 0.3rem;
          flex-wrap: wrap;
        }
        .order-balance {
          font-weight: 700;
          font-size: 0.85rem;
          color: #AE4A34;
          margin-right: 0.8rem;
          white-space: nowrap;
        }
        .order-balance.paid {
          color: #4C7A5E;
        }
        .order-actions {
          display: flex;
          gap: 0.3rem;
          flex-shrink: 0;
          align-items: center;
        }
        .order-actions .btn {
          padding: 0.3rem 0.6rem;
          border-radius: 6px;
          font-size: 0.65rem;
          font-weight: 600;
          text-decoration: none;
          border: 1px solid #E8E0D5;
          background: #fff;
          color: #1E3A5F;
          transition: background 0.1s ease;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.15rem;
          min-height: 28px;
        }
        .order-actions .btn:hover {
        background: #F5EFE2;
        }
        .order-actions .btn-view {
          background: #F5EFE2;
          border-color: #D6D0C5;
          color: #1E3A5F;
        }
        .order-actions .btn-view:hover {
          background: #EBE3D8;
        }
        .order-actions .btn-call {
          background: #F6E9C8;
          border-color: #C79A2B;
          color: #1E3A5F;
          font-weight: 700;
        }
        .order-actions .btn-call:hover {
          background: #E8D5A0;
        }
        .order-actions .btn-edit {
          background: #1E3A5F;
          border-color: #1E3A5F;
          color: #fff;
        }
        .order-actions .btn-edit:hover {
          background: #0F1E30;
        }
        .order-actions .btn-settle {
          background: #4C7A5E;
          border-color: #4C7A5E;
          color: #fff;
          font-weight: 600;
        }
        .order-actions .btn-settle:hover {
          background: #3A5F4A;
        }
        .customer-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.7rem 1rem;
          background: #fff;
          border-radius: 8px;
          border: 1px solid #E8E0D5;
          text-decoration: none;
        }
        .customer-row:hover {
          border-color: #C79A2B;
        }
        .customer-row .name {
          color: #1E3A5F;
          font-weight: 600;
          font-size: 0.9rem;
          margin: 0;
        }
        .customer-row .phone {
          color: #6B6255;
          font-size: 0.8rem;
          margin: 0;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.7rem;
          flex-wrap: wrap;
          gap: 0.4rem;
        }
        .section-header h2 {
          color: #1E3A5F;
          font-size: 1rem;
          font-weight: 700;
          margin: 0;
        }
        .section-header a {
          color: #6B6255;
          font-size: 0.8rem;
          font-weight: 500;
          text-decoration: none;
          border-bottom: 1px solid transparent;
        }
        .section-header a:hover {
          border-bottom-color: #6B6255;
        }
        .empty-state {
          background: #fff;
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid #E8E0D5;
          text-align: center;
          color: #6B6255;
          font-size: 0.9rem;
          margin-bottom: 1.5rem;
        }
        .quick-actions {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          margin-bottom: 1.5rem;
        }
        .search-bar {
          width: 100%;
          padding: 0.65rem 0.9rem;
          border-radius: 10px;
          border: 1px solid #E8E0D5;
          font-size: 0.9rem;
          background: #fff;
          box-sizing: border-box;
          color: #2B2620;
          transition: border-color 0.2s ease;
        }
        .search-bar:focus {
          outline: none;
          border-color: #C79A2B;
        }
        .search-bar::placeholder {
          color: #A89888;
        }
        .filter-select {
          padding: 0.4rem 0.6rem;
          border-radius: 8px;
          border: 1px solid #E8E0D5;
          font-size: 0.75rem;
          background: #fff;
          color: #1E3A5F;
          cursor: pointer;
          min-width: 90px;
        }
        .filter-select:focus {
          outline: none;
          border-color: #C79A2B;
        }
        .group-coordinator {
          font-size: 0.78rem;
          color: #6B6255;
          margin: 0.1rem 0 0.2rem;
        }
        .group-balance {
          font-size: 0.82rem;
          font-weight: 600;
          margin: 0.2rem 0 0;
        }
        .group-balance.owing {
          color: #AE4A34;
        }
        .group-balance.paid {
          color: #4C7A5E;
        }
        .group-toggle {
          background: none;
          border: none;
          color: #6B6255;
          font-size: 0.7rem;
          cursor: pointer;
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
        }
        .group-toggle:hover {
          background: #F0EDE8;
        }
        .group-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          width: 100%;
          cursor: pointer;
          background: none;
          border: none;
          padding: 0;
          text-align: left;
        }
        .group-header-left {
          flex: 1;
          min-width: 0;
        }
        .group-header-left h3 {
          margin: 0;
          color: #1E3A5F;
          font-size: 0.95rem;
          font-weight: 700;
        }
        .group-count {
          color: #6B6255;
          font-size: 0.7rem;
          white-space: nowrap;
          margin-left: 0.5rem;
        }
        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.2rem;
        }
        .header-brand {
          display: flex;
          align-items: center;
          gap: 0.7rem;
        }
        .header-brand .greeting {
          color: #2B2620;
          font-size: 0.8rem;
          margin: 0;
        }
        .header-brand .business-name {
          color: #1E3A5F;
          font-size: 1.2rem;
          font-weight: 700;
          margin: 0;
        }
        .clear-filter-btn {
          background: #AE4A34;
          color: #fff;
          border: none;
          padding: 0.2rem 0.7rem;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.1s ease;
        }
        .clear-filter-btn:hover {
          background: #8A3626;
        }
        .filter-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: #F1DBD3;
          padding: 0.2rem 0.7rem 0.2rem 0.5rem;
          border-radius: 12px;
          font-size: 0.7rem;
          color: #AE4A34;
          font-weight: 600;
        }
        .fab {
          position: fixed;
          bottom: 1.5rem;
          right: 1.5rem;
          background: linear-gradient(135deg, #C79A2B, #B4881E);
          color: #1E3A5F;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: none;
          font-size: 1.8rem;
          font-weight: 700;
          box-shadow: 0 4px 16px rgba(199, 154, 43, 0.4);
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .fab:active {
          transform: scale(0.92);
        }
        .fab-label {
          position: fixed;
          bottom: 2.2rem;
          right: 4.8rem;
          background: #1E3A5F;
          color: #fff;
          padding: 0.3rem 0.8rem;
          border-radius: 20px;
          font-size: 0.7rem;
          font-weight: 600;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          z-index: 100;
          opacity: 0;
          transition: opacity 0.2s ease;
          pointer-events: none;
        }
        .fab:hover + .fab-label {
          opacity: 1;
        }
        .alert-strip {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }
        .alert-strip .alert-item {
          flex: 1;
          min-width: 80px;
          padding: 0.5rem 0.6rem;
          border-radius: 8px;
          text-align: center;
          font-size: 0.7rem;
          font-weight: 600;
          text-decoration: none;
          transition: transform 0.1s ease;
        }
        .alert-strip .alert-item:active {
          transform: scale(0.97);
        }
        .alert-strip .alert-item .count {
          font-size: 1rem;
          font-weight: 800;
          display: block;
        }
        .alert-strip .overdue {
          background: #F1DBD3;
          color: #AE4A34;
        }
        .alert-strip .overdue:hover {
          background: #E8C8BE;
        }
        .alert-strip .today {
          background: #FFF3E0;
          color: #E67E22;
        }
        .alert-strip .today:hover {
          background: #FFE8CC;
        }
        .alert-strip .ready {
          background: #F6E9C8;
          color: #B4881E;
        }
        .alert-strip .ready:hover {
          background: #F0DEB0;
        }
        .quick-order-input {
          width: 100%;
          padding: 0.7rem;
          border-radius: 8px;
          border: 1px solid #E8E0D5;
          font-size: 0.95rem;
          background: #fff;
          box-sizing: border-box;
          color: #2B2620;
        }
        .quick-order-input:focus {
          outline: none;
          border-color: #C79A2B;
        }
        .quick-order-select {
          width: 100%;
          padding: 0.7rem;
          border-radius: 8px;
          border: 1px solid #E8E0D5;
          font-size: 0.95rem;
          background: #fff;
          box-sizing: border-box;
          color: #2B2620;
        }
        .quick-order-select:focus {
          outline: none;
          border-color: #C79A2B;
        }
        .settle-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
          z-index: 1100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
        }
        .settle-modal-content {
          background: #F5EFE2;
          border-radius: 20px;
          padding: 1.8rem;
          max-width: 380px;
          width: 100%;
          animation: slideUp 0.3s ease-out;
        }
        .fashion-badge {
          display: inline-block;
          background: rgba(199,154,43,0.15);
          color: #C79A2B;
          padding: 0.05rem 0.5rem;
          border-radius: 10px;
          font-size: 0.55rem;
          font-weight: 600;
          margin-left: 0.3rem;
        }
      `}</style>
    {/* ===== HEADER ===== */}
      <div className="header-top">
        <div className="header-brand">
          <LetterLogo name={business?.name} size={44} />
          <div>
            <p className="greeting">Welcome back,</p>
            <p className="business-name">
              {business ? business.name : 'Your business'}
              <span className="fashion-badge">👗 Fashion</span>
            </p>
          </div>
        </div>
      </div>

      {/* ===== ALERT STRIP ===== */}
      {(overdueCount > 0 || dueTodayCount > 0 || readyCount > 0) && (
        <div className="alert-strip">
          {overdueCount > 0 && (
            <a href="/dashboard/orders?filter=overdue" className="alert-item overdue">
              <span className="count">{overdueCount}</span>
              Overdue
            </a>
          )}
          {dueTodayCount > 0 && (
            <a href="/dashboard/orders?filter=due_today" className="alert-item today">
              <span className="count">{dueTodayCount}</span>
              Due today
            </a>
          )}
          {readyCount > 0 && (
            <a href="/dashboard/orders?filter=ready" className="alert-item ready">
              <span className="count">{readyCount}</span>
              Ready
            </a>
          )}
        </div>
      )}

      {/* ===== STATS ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1.2rem' }}>
        <a href="/dashboard/customers" className="stat-card">
          <p className="value navy">{customers.length}</p>
          <p className="label">👤 Customers</p>
        </a>
        <a href="/dashboard/orders" className="stat-card">
          <p className="value navy">{totalOrders}</p>
          <p className="label">📦 Orders</p>
        </a>
        <button
          onClick={toggleOwingFilter}
          className={`stat-card ${showOwingOnly ? 'active' : ''}`}
          style={{ border: showOwingOnly ? '2px solid #AE4A34' : '' }}
        >
          <p className={`value ${totalBalanceOwed > 0 ? 'red' : 'green'}`}>
            ₦{totalBalanceOwed.toLocaleString()}
          </p>
          <p className="label">{showOwingOnly ? '🔴 Filtered' : '💰 Owed'}</p>
        </button>
      </div>

      {/* ===== SEARCH + FILTER ===== */}
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
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="Order placed">Placed</option>
          <option value="Cutting">Cutting</option>
          <option value="Sewing">Sewing</option>
          <option value="Ready">Ready</option>
          <option value="Delivered">Delivered</option>
        </select>
      </div>

      {/* ===== QUICK ACTIONS ===== */}
      <div className="quick-actions">
        <a href="/dashboard/customers/new" className="action-btn" style={{ background: '#1E3A5F', color: '#fff' }}>
          👤 + Customer
        </a>
        <a href="/dashboard/orders/new" className="action-btn" style={{ background: '#C79A2B', color: '#1E3A5F' }}>
          📋 + Order
        </a>
        <a href="/dashboard/groups/new" className="action-btn" style={{ background: '#AE4A34', color: '#fff' }}>
          👥 + Group
        </a>
        <a href="/dashboard/reminders" className="action-btn" style={{ background: '#4C7A5E', color: '#fff' }}>
          🔔 Reminders
        </a>
      </div>

      {/* ===== GROUP ORDERS ===== */}
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
            <a href="/dashboard/groups/new" style={{ color: '#AE4A34', fontWeight: '600', fontSize: '0.85rem', textDecoration: 'none' }}>
              👥 + Create a group order
            </a>
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
                <button className="group-header" onClick={() => toggleGroup(g.id)}>
                  <div className="group-header-left">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <h3>{g.group_name}</h3>
                      <span className="group-count">{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
                      {showOwingOnly && combinedBalance > 0 && (
                        <span style={{ fontSize: '0.6rem', background: '#F1DBD3', color: '#AE4A34', padding: '0.1rem 0.4rem', borderRadius: '10px', fontWeight: '700' }}>
                          ₦{combinedBalance.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <p className="group-coordinator">Coordinator: {g.customers?.name || 'Unnamed'}</p>
                    <p className={`group-balance ${combinedBalance > 0 ? 'owing' : 'paid'}`}>
                      {combinedBalance > 0
                        ? `₦${combinedBalance.toLocaleString()} remaining`
                        : '✓ All paid'}
                    </p>
                  </div>
                  <span className="group-toggle">{isExpanded ? '▲ Hide' : '▼ Show'}</span>
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
                              <span
                                className="order-status-badge"
                                style={{ background: status.bg, color: status.color, marginLeft: '0.5rem' }}
                              >
                                {status.label}
                              </span>
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
                              {phone && (
                                <a href={`tel:${phone}`} className="btn btn-call">📞</a>
                              )}
                              {balance > 0 && (
                                <button className="btn btn-settle" onClick={() => openSettleModal(o)}>
                                  💰
                                </button>
                              )}
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
      {/* ===== INDIVIDUAL ORDERS ===== */}
      <div style={{ marginBottom: '1.8rem' }}>
        <div className="section-header">
          <h2>Recent Orders</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {showOwingOnly && (
              <button onClick={clearFilter} className="clear-filter-btn">✕ Clear filter</button>
            )}
            {statusFilter !== 'all' && (
              <button
                onClick={() => setStatusFilter('all')}
                className="clear-filter-btn"
                style={{ background: '#6B6255' }}
              >
                ✕ {statusFilter}
              </button>
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
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E8E0D5', padding: '0.2rem 1rem' }}>
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
                      <span
                        className="order-status-badge"
                        style={{ background: status.bg, color: status.color, marginLeft: '0.5rem' }}
                      >
                        {status.label}
                      </span>
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
                      {phone && (
                        <a href={`tel:${phone}`} className="btn btn-call">📞</a>
                      )}
                      {balance > 0 && (
                        <button className="btn btn-settle" onClick={() => openSettleModal(o)}>
                          💰
                        </button>
                      )}
                      <a href={`/dashboard/orders/${o.id}?edit=true`} className="btn btn-edit">✏️</a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ===== CUSTOMERS ===== */}
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
            {previewCustomers.map((c) => (
              <a key={c.id} href={`/dashboard/customers/${c.id}`} className="customer-row">
                <div>
                  <p className="name">{c.name}</p>
                  {c.phone && <p className="phone">{c.phone}</p>}
                </div>
                <span style={{ color: '#C79A2B', fontSize: '0.8rem' }}>→</span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* ===== FLOATING QUICK ORDER BUTTON ===== */}
      <button className="fab" onClick={() => setShowQuickOrder(true)}>
        +
      </button>
      <span className="fab-label">Quick Order</span>

      {/* ===== QUICK ORDER MODAL ===== */}
      {showQuickOrder && (
        <div className="modal-overlay" onClick={() => setShowQuickOrder(false)}>
          <div className="modal-content" ref={modalRef} onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle"></div>
            <h2 style={{ color: '#1E3A5F', fontSize: '1.2rem', margin: '0 0 0.3rem' }}>Quick Order</h2>
            <p style={{ color: '#6B6255', fontSize: '0.85rem', margin: '0 0 1.2rem' }}>Create an order in seconds.</p>

            <form onSubmit={handleQuickOrderSubmit}>
              <div style={{ marginBottom: '0.8rem' }}>
                <label style={{ display: 'block', color: '#2B2620', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Customer</label>
                <select
                  className="quick-order-select"
                  value={quickOrderCustomer}
                  onChange={(e) => setQuickOrderCustomer(e.target.value)}
                  required
                >
                  <option value="">Select customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {customers.length === 0 && (
                  <p style={{ fontSize: '0.75rem', color: '#AE4A34', marginTop: '0.2rem' }}>
                    No customers yet. Add one first.
                  </p>
                )}
              </div>

              <div style={{ marginBottom: '0.8rem' }}>
                <label style={{ display: 'block', color: '#2B2620', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Item / Garment</label>
                <input
                  className="quick-order-input"
                  type="text"
                  value={quickOrderItem}
                  onChange={(e) => setQuickOrderItem(e.target.value)}
                  placeholder="e.g. Aso-ebi gown"
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.8rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', color: '#2B2620', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Price (₦)</label>
                  <input
                    className="quick-order-input"
                    type="number"
                    value={quickOrderPrice}
                    onChange={(e) => setQuickOrderPrice(e.target.value)}
                    placeholder="5000"
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', color: '#2B2620', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Deposit (₦)</label>
                  <input
                    className="quick-order-input"
                    type="number"
                    value={quickOrderDeposit}
                    onChange={(e) => setQuickOrderDeposit(e.target.value)}
                    placeholder="2000"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ display: 'block', color: '#2B2620', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Due date</label>
                <input
                  className="quick-order-input"
                  type="date"
                  value={quickOrderDue}
                  onChange={(e) => setQuickOrderDue(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={quickOrderLoading || customers.length === 0}
                style={{
                  width: '100%', padding: '0.8rem', borderRadius: '8px',
                  border: 'none', background: 'linear-gradient(135deg, #C79A2B, #B4881E)',
                  color: '#1E3A5F', fontSize: '1rem', fontWeight: '700',
                  boxShadow: '0 4px 14px rgba(199,154,43,0.3)',
                  transition: 'transform 0.1s ease',
                }}
              >
                {quickOrderLoading ? 'Creating...' : '🚀 Create order'}
              </button>

              {quickOrderMessage && (
                <p style={{ marginTop: '0.8rem', fontSize: '0.85rem', color: quickOrderMessage.startsWith('✅') ? '#4C7A5E' : '#AE4A34', textAlign: 'center' }}>
                  {quickOrderMessage}
                </p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ===== SETTLE PAYMENT MODAL ===== */}
      {showSettleModal && settleOrder && (
        <div className="settle-modal" onClick={() => setShowSettleModal(false)}>
          <div className="settle-modal-content" ref={modalRef} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <h2 style={{ color: '#1E3A5F', fontSize: '1.1rem', margin: 0 }}>💰 Record Payment</h2>
              <button
                onClick={() => setShowSettleModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.3rem', color: '#6B6255', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <p style={{ color: '#6B6255', fontSize: '0.85rem', margin: '0 0 1.2rem' }}>
              {settleOrder.customers?.name || 'Customer'} · Balance: ₦{(settleOrder.price - settleOrder.amount_paid).toLocaleString()}
            </p>

            <form onSubmit={handleSettleSubmit}>
              <div style={{ marginBottom: '0.8rem' }}>
                <label style={{ display: 'block', color: '#2B2620', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Amount paid (₦)</label>
                <input
                  className="quick-order-input"
                  type="number"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  placeholder="Enter amount"
                  required
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ display: 'block', color: '#2B2620', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Note (optional)</label>
                <input
                  className="quick-order-input"
                  type="text"
                  value={settleNote}
                  onChange={(e) => setSettleNote(e.target.value)}
                  placeholder="e.g. Cash payment"
                />
              </div>

              <button
                type="submit"
                disabled={settleLoading}
                style={{
                  width: '100%', padding: '0.8rem', borderRadius: '8px',
                  border: 'none', background: '#4C7A5E',
                  color: '#fff', fontSize: '1rem', fontWeight: '700',
                  transition: 'transform 0.1s ease',
                }}
              >
                {settleLoading ? 'Recording...' : '💰 Record payment'}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  )
              }
