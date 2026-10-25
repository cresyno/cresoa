'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../lib/getBusinessId'
import { isFeatureAvailable, getPlanLimits } from '../../../lib/planLimits'
import { Navigation } from '../../../components/Navigation'
import '../../globals.css'

// ─── EMBEDDED ICONS ───
const SvgIcons = {
  Search: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
  ),
  X: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
  ),
  ChevronDown: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
  ),
  MoreVertical: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="5" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="19" r="1.5" fill="currentColor"/>
    </svg>
  ),
  Edit: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
  ),
  Trash: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
  ),
  Users: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
  ),
  AlertCircle: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
  ),
  Plus: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
  )
}

export default function GroupsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [business, setBusiness] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Dropdown & Menu State
  const [openMenuId, setOpenMenuId] = useState(null)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const menuRef = useRef(null)
  const statusMenuRef = useRef(null)

  // Custom Modal & Toast State
  const [modalConfig, setModalConfig] = useState({
    isOpen: false, title: '', message: '', confirmText: '', isDestructive: false, onConfirm: null
  })
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState('success')
  const [deletingId, setDeletingId] = useState(null)

  const businessId = getCurrentBusinessId()

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg)
    setToastType(type)
    setTimeout(() => setToastMessage(''), 3000)
  }

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setOpenMenuId(null)
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target)) setShowStatusMenu(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadGroups = async () => {
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const bizId = getCurrentBusinessId()
      if (!bizId) { router.push('/dashboard'); return }

      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('id, name, sector, plan')
        .eq('id', bizId)
        .single()

      if (businessError || !businessData) {
        router.push('/onboarding')
        return
      }

      setBusiness(businessData)
      
      const isFashion = businessData.sector?.trim().toLowerCase() === 'fashion' || businessData.sector === 'Fashion & Custom Wear'
      const groupsAllowed = isFeatureAvailable(businessData.plan || 'free', 'groups')

      if (!isFashion || !groupsAllowed) {
        setGroups([])
        setLoading(false)
        return
      }

      const { data: groupData, error: groupError } = await supabase
        .from('group_orders')
        .select(`
          id,
          business_id,
          group_name,
          coordinator_customer_id,
          due_date,
          status,
          created_at,
          updated_at,
          coordinator:coordinator_customer_id (
            id,
            name,
            first_name,
            last_name,
            phone
          )
        `)
        .eq('business_id', bizId)
        .order('created_at', { ascending: false })

      if (groupError) throw groupError

      const enrichedGroups = await Promise.all(
        (groupData || []).map(async (group) => {
          const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('id, price, amount_paid, current_status')
            .eq('group_order_id', group.id)

          const orderRows = orders || []
          const memberCount = orderRows.length
          const totalBalance = orderRows.reduce(
            (total, order) => total + Math.max(0, Number(order.price || 0) - Number(order.amount_paid || 0)),
            0
          )
          const deliveredCount = orderRows.filter(
            (order) => String(order.current_status || '').toLowerCase() === 'delivered'
          ).length

          return {
            ...group,
            memberCount,
            totalBalance,
            deliveredCount,
          }
        })
      )

      setGroups(enrichedGroups)
    } catch (loadError) {
      setError('We could not load your groups right now.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadGroups() }, [router, searchParams])

  const planLimits = getPlanLimits(business?.plan || 'free')
  const memberLimit = planLimits?.maxGroupMembers || 0

  const canUseGroups =
    business &&
    (business.sector?.trim().toLowerCase() === 'fashion' || business.sector === 'Fashion & Custom Wear') &&
    isFeatureAvailable(business.plan || 'free', 'groups')

  const stats = useMemo(() => {
    const totalGroups = groups.length
    const totalMembers = groups.reduce((sum, group) => sum + Number(group.memberCount || 0), 0)
    const totalBalance = groups.reduce((sum, group) => sum + Number(group.totalBalance || 0), 0)
    const totalOrders = groups.reduce((sum, group) => sum + Number(group.memberCount || 0), 0)
    const totalDelivered = groups.reduce((sum, group) => sum + Number(group.deliveredCount || 0), 0)
    const progress = totalOrders > 0 ? Math.round((totalDelivered / totalOrders) * 100) : 0

    return { totalGroups, totalMembers, totalBalance, totalOrders, totalDelivered, progress }
  }, [groups])

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase()
    return groups.filter((group) => {
      const groupStatus = String(group.status || 'pending').toLowerCase()
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && groupStatus !== 'completed') ||
        groupStatus === statusFilter

      const coordinatorName = [
        group.coordinator?.name,
        group.coordinator?.first_name,
        group.coordinator?.last_name,
      ].filter(Boolean).join(' ').toLowerCase()

      const groupName = String(group.group_name || '').toLowerCase()
      const matchesSearch = !query || groupName.includes(query) || coordinatorName.includes(query)

      return matchesStatus && matchesSearch
    })
  }, [groups, search, statusFilter])

  const formatMoney = (value) => `₦${Number(value || 0).toLocaleString('en-NG')}`

  const formatDate = (value) => {
    if (!value) return 'No deadline'
    const date = new Date(`${value}T00:00:00`)
    if (Number.isNaN(date.getTime())) return 'No deadline'
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const getStatusLabel = (status) => {
    const normalized = String(status || 'pending').toLowerCase()
    if (normalized === 'completed') return 'Completed'
    if (normalized === 'active') return 'Active'
    if (normalized === 'cancelled') return 'Cancelled'
    if (normalized === 'pending') return 'Pending'
    return normalized.charAt(0).toUpperCase() + normalized.slice(1)
  }

  const getStatusColor = (status) => {
    const normalized = String(status || 'pending').toLowerCase()
    if (normalized === 'completed') return 'var(--color-secondary)'
    if (normalized === 'active') return 'var(--color-primary)'
    if (normalized === 'cancelled') return 'var(--color-danger)'
    return 'var(--color-accent)'
  }

  // ─── CUSTOM DELETE MODAL (Replaces window.confirm) ───
  const promptDelete = (group) => {
    setOpenMenuId(null)
    setModalConfig({
      isOpen: true,
      title: 'Delete Group Order?',
      message: `Are you sure you want to delete "${group.group_name}"? Linked orders will be unassigned from this group, but the orders themselves will NOT be deleted.`,
      confirmText: 'Delete Group',
      isDestructive: true,
      onConfirm: async () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }))
        setDeletingId(group.id)
        try {
          const { error: unlinkError } = await supabase
            .from('orders')
            .update({ group_order_id: null })
            .eq('group_order_id', group.id)
          if (unlinkError) throw unlinkError

          const { error: deleteError } = await supabase
            .from('group_orders')
            .delete()
            .eq('id', group.id)
            .eq('business_id', businessId)
          if (deleteError) throw deleteError

          setGroups((current) => current.filter((item) => item.id !== group.id))
          showToast('Group deleted successfully')
        } catch (deleteError) {
          showToast('We could not delete this group. Please try again.', 'error')
        } finally {
          setDeletingId(null)
        }
      }
    })
  }

  const statusOptions = [
    { label: 'All Groups', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Active', value: 'active' },
    { label: 'Completed', value: 'completed' }
  ]

  // ─── LOADING ───
  if (loading) {
    return (
      <div className="orders-page">
        <div className="orders-header-skeleton">
          <div className="skeleton-box" style={{ width: '140px', height: '28px' }} />
          <div className="skeleton-box" style={{ width: '110px', height: '38px' }} />
        </div>
        <div className="orders-metrics-grid">
          {[1,2,3,4].map(i => <div key={i} className="skeleton-box" style={{ height: '80px', borderRadius: '12px' }} />)}
        </div>
        <div className="orders-filters-skeleton">
           <div className="skeleton-box" style={{ height: '44px', width: '100%', marginBottom: '10px' }} />
        </div>
        <div className="orders-list">
          {[1,2,3].map(i => <div key={i} className="skeleton-box" style={{ height: '160px', marginBottom: '12px', borderRadius: '16px' }} />)}
        </div>
        <Navigation businessId={businessId} />
      </div>
    )
  }

  // ─── RESTRICTED ───
  if (!canUseGroups) {
    const isFashion = business?.sector?.trim().toLowerCase() === 'fashion' || business?.sector === 'Fashion & Custom Wear'
    return (
      <div className="orders-page">
        <Navigation businessId={businessId} />
        <div className="cresoa-card" style={{ display: 'flex', alignItems: 'center', gap: '24px', padding: '2rem', flexWrap: 'wrap', marginTop: '2rem' }}>
          <div style={{ width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px', background: 'rgba(212,165,42,0.12)', color: 'var(--color-accent)' }}>
            <SvgIcons.Users />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Orders management</p>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0' }}>Group Orders</h1>
            <p style={{ color: 'var(--cresoa-text-muted)', margin: '0 0 0.8rem' }}>
              {isFashion ? 'Group orders are not included in your current plan.' : 'Group orders are currently available only for Fashion & Custom Wear businesses.'}
            </p>
            {isFashion && (
              <Link href={`/dashboard/subscription?business_id=${businessId}`} className="cresoa-primary-button" style={{ display: 'inline-block', textDecoration: 'none' }}>
                Upgrade plan
              </Link>
            )}
          </div>
        </div>
        <div style={{ marginTop: '2rem' }}><Navigation businessId={businessId} /></div>
      </div>
    )
  }

  // ─── MAIN RENDER ───
  return (
    <div className="orders-page">
      <Navigation businessId={businessId} />

      {/* Header */}
      <div className="orders-header">
        <div>
          <h1 className="orders-title">Group Orders</h1>
          <p className="orders-subtitle">Manage Aso-Ebi, members & deliveries</p>
        </div>
        <Link href={`/dashboard/groups/new?business_id=${businessId || ''}`} className="cresoa-primary-button">
          <SvgIcons.Plus /> New Group
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="orders-metrics-grid">
        <div className="orders-metric-box">
          <span className="metric-label">Groups</span>
          <span className="metric-value">{stats.totalGroups}</span>
        </div>
        <div className="orders-metric-box">
          <span className="metric-label">Members</span>
          <span className="metric-value">{stats.totalMembers}</span>
        </div>
        <div className="orders-metric-box">
          <span className="metric-label">Outstanding</span>
          <span className="metric-value text-danger" style={{ fontSize: '1.1rem' }}>{formatMoney(stats.totalBalance)}</span>
        </div>
        <div className="orders-metric-box">
          <span className="metric-label">Delivered</span>
          <span className="metric-value text-success">{stats.progress}%</span>
        </div>
      </div>

      {/* Filters */}
      <div className="orders-filters">
        <div className="orders-search-wrapper">
          <span className="search-icon"><SvgIcons.Search /></span>
          <input 
            type="text" 
            className="orders-search-input" 
            placeholder="Search groups or coordinator..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
          {search && (
            <button className="search-clear-btn" onClick={() => setSearch('')}>
              <SvgIcons.X />
            </button>
          )}
        </div>
        
        <div className="orders-filter-row">
          <div className="custom-select-wrapper" ref={statusMenuRef}>
            <button className="custom-select-btn" onClick={() => setShowStatusMenu(!showStatusMenu)}>
              {statusOptions.find(o => o.value === statusFilter)?.label}
              <SvgIcons.ChevronDown />
            </button>
            {showStatusMenu && (
              <div className="custom-dropdown-menu">
                {statusOptions.map(opt => (
                  <button 
                    key={opt.value} 
                    className={`custom-dropdown-item ${statusFilter === opt.value ? 'active' : ''}`}
                    onClick={() => { setStatusFilter(opt.value); setShowStatusMenu(false); }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Group List */}
      {filteredGroups.length === 0 ? (
        <div className="orders-empty">
          <div className="empty-icon"><SvgIcons.Users /></div>
          <h3>{groups.length === 0 ? 'No groups yet' : 'No matching groups'}</h3>
          <p>{groups.length === 0 ? 'Create your first group to manage Aso-Ebi and bulk orders.' : 'Try a different search term or filter.'}</p>
          {groups.length === 0 ? (
            <Link href={`/dashboard/groups/new?business_id=${businessId || ''}`} className="cresoa-primary-button">Create your first group</Link>
          ) : (
            <button onClick={() => { setSearch(''); setStatusFilter('all') }} className="cresoa-primary-button">Clear Filters</button>
          )}
        </div>
      ) : (
        <div className="orders-list">
          {filteredGroups.map((group) => {
            const memberCount = Number(group.memberCount || 0)
            const deliveredCount = Number(group.deliveredCount || 0)
            const groupProgress = memberCount > 0 ? Math.round((deliveredCount / memberCount) * 100) : 0
            const status = String(group.status || 'pending').toLowerCase()
            const isOverdue = group.due_date && new Date(`${group.due_date}T23:59:59`) < new Date() && status !== 'completed'
            const coordinator = group.coordinator?.name || [group.coordinator?.first_name, group.coordinator?.last_name].filter(Boolean).join(' ') || 'No coordinator'
            const isMenuOpen = openMenuId === group.id

            return (
              <div key={group.id} className="cresoa-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                {/* Top Row: Name, Status, Actions */}
                {/* Top Row: Name, Status, Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--cresoa-text)' }}>{group.group_name}</h3>
                      <span className="badge-status" style={{ background: `${getStatusColor(status)}15`, color: getStatusColor(status) }}>
                        {getStatusLabel(status)}
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0', color: 'var(--cresoa-text-muted)', fontSize: '0.8rem', fontWeight: 500 }}>
                      Coordinator: <strong style={{ color: 'var(--cresoa-text)' }}>{coordinator}</strong>
                    </p>
                  </div>

                  <div className="menu-container" ref={isMenuOpen ? menuRef : null}>
                    <button className={`btn-menu-trigger ${isMenuOpen ? 'active' : ''}`} onClick={() => setOpenMenuId(isMenuOpen ? null : group.id)}>
                      <SvgIcons.MoreVertical />
                    </button>
                    {isMenuOpen && (
                      <div className="dropdown-menu">
                        <Link href={`/dashboard/groups/${group.id}/edit?business_id=${businessId || ''}`} className="dropdown-item">
                          <SvgIcons.Edit /> Edit Group
                        </Link>
                        <div className="dropdown-divider"></div>
                        <button onClick={() => promptDelete(group)} disabled={deletingId === group.id} className="dropdown-item text-danger">
                          <SvgIcons.Trash /> {deletingId === group.id ? 'Deleting...' : 'Delete Group'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Middle Row: Deadline & Outstanding */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--cresoa-bg)', padding: '12px', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--cresoa-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Event Deadline</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: isOverdue ? 'var(--color-danger)' : 'var(--cresoa-text)' }}>
                      {isOverdue && '⚠ '}{formatDate(group.due_date)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--cresoa-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Balance Due</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: Number(group.totalBalance) > 0 ? 'var(--color-danger)' : 'var(--color-secondary)' }}>
                      {Number(group.totalBalance) > 0 ? formatMoney(group.totalBalance) : '✓ Fully Paid'}
                    </span>
                  </div>
                </div>

                {/* Bottom Row: Progress */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                    <span style={{ color: 'var(--cresoa-text-muted)' }}>{memberCount} Members</span>
                    <span style={{ color: 'var(--color-secondary)' }}>{deliveredCount} Delivered ({groupProgress}%)</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--cresoa-border)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--color-secondary)', borderRadius: '99px', width: `${groupProgress}%`, transition: 'width 0.3s' }} />
                  </div>
                </div>

                {/* Primary Button */}
                <Link href={`/dashboard/groups/${group.id}?business_id=${businessId || ''}`} className="cresoa-primary-button full-width" style={{ marginTop: '4px', textDecoration: 'none' }}>
                  Manage Group
                </Link>

              </div>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={businessId} />
      </div>

      {/* CUSTOM MODAL */}
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
          {toastType === 'success' ? '✅ ' : '⚠️ '} {toastMessage}
        </div>
      )}

    </div>
  )
                      }
