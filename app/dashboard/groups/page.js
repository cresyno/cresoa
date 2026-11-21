import { useClientSearchParams as useSearchParams } from '../../lib/useClientSearchParams';
import { useClientSearchParams as useSearchParams } from '@/lib/useClientSearchParams';
'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
  Plus: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
  ),
  Phone: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  AlertTriangle: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

const formatMoney = (value) => `₦${Number(value || 0).toLocaleString('en-NG')}`

const getEventCountdown = (dateString) => {
  if (!dateString) return { text: 'Add event date', color: '#D97706', urgent: true }
  const eventDate = new Date(`${dateString}T00:00:00`)
  const today = new Date()
  today.setHours(0,0,0,0)
  const diffTime = eventDate - today
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) return { text: `Overdue by ${Math.abs(diffDays)} days!`, color: '#FF3B30', urgent: true }
  if (diffDays === 0) return { text: 'Owambe is TODAY!', color: '#FF3B30', urgent: true }
  if (diffDays <= 7) return { text: `Owambe in ${diffDays} days!`, color: '#FF3B30', urgent: true }
  if (diffDays <= 14) return { text: `Owambe in ${diffDays} days`, color: '#D97706', urgent: false }
  return { text: `Owambe in ${diffDays} days`, color: '#666', urgent: false }
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
  
  const [openMenuId, setOpenMenuId] = useState(null)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const menuRef = useRef(null)
  const statusMenuRef = useRef(null)

  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', confirmText: '', isDestructive: false, onConfirm: null })
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState('success')
  const [deletingId, setDeletingId] = useState(null)

  const businessId = getCurrentBusinessId()

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg); setToastType(type); setTimeout(() => setToastMessage(''), 3000)
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
    setLoading(true); setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const bizId = getCurrentBusinessId()
      if (!bizId) { router.push('/dashboard'); return }

      const { data: businessData, error: businessError } = await supabase.from('businesses').select('id, name, sector, plan').eq('id', bizId).single()
      if (businessError || !businessData) { router.push('/onboarding'); return }

      setBusiness(businessData)
      
      const isFashion = businessData.sector?.trim().toLowerCase() === 'fashion' || businessData.sector === 'Fashion & Custom Wear'
      const groupsAllowed = isFeatureAvailable(businessData.plan || 'free', 'groups')

      if (!isFashion || !groupsAllowed) {
        setGroups([]); setLoading(false); return
      }

      const { data: groupData, error: groupError } = await supabase
        .from('group_orders')
        .select(`
          id, business_id, group_name, coordinator_customer_id, due_date, status, created_at, updated_at,
          coordinator:coordinator_customer_id ( id, name, first_name, last_name, phone )
        `)
        .eq('business_id', bizId)
        .order('created_at', { ascending: false })

      if (groupError) throw groupError

      const enrichedGroups = await Promise.all(
        (groupData || []).map(async (group) => {
          const { data: orders } = await supabase.from('orders').select('id, price, amount_paid, current_status').eq('group_order_id', group.id)
          const orderRows = orders || []
          
          const memberCount = orderRows.length
          const totalBalance = orderRows.reduce((total, order) => total + Math.max(0, Number(order.price || 0) - Number(order.amount_paid || 0)), 0)
          const deliveredCount = orderRows.filter((order) => String(order.current_status || '').toLowerCase() === 'delivered').length
          const owingMembersCount = orderRows.filter((order) => (Number(order.price || 0) - Number(order.amount_paid || 0)) > 0).length

          // Derive a better stage than just "Pending"
          let derivedStage = 'Collecting Measurements'
          if (memberCount > 0) {
            if (deliveredCount === memberCount) derivedStage = 'Completed'
            else if (deliveredCount > 0) derivedStage = 'Sewing/Ready'
            else derivedStage = 'In Production'
          }

          return { ...group, memberCount, totalBalance, deliveredCount, owingMembersCount, derivedStage }
        })
      )

      setGroups(enrichedGroups)
    } catch (loadError) {
      setError('We could not load your groups right now.')
    } finally { setLoading(false) }
  }

  useEffect(() => { loadGroups() }, [router, searchParams])

  const planLimits = getPlanLimits(business?.plan || 'free')
  const canUseGroups = business && (business.sector?.trim().toLowerCase() === 'fashion' || business.sector === 'Fashion & Custom Wear') && isFeatureAvailable(business.plan || 'free', 'groups')

  const totalGroupBalance = useMemo(() => groups.reduce((sum, group) => sum + Number(group.totalBalance || 0), 0), [groups])

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase()
    return groups.filter((group) => {
      const matchesStatus = statusFilter === 'all' || group.status === statusFilter
      const coordinatorName = [group.coordinator?.name, group.coordinator?.first_name, group.coordinator?.last_name].filter(Boolean).join(' ').toLowerCase()
      const groupName = String(group.group_name || '').toLowerCase()
      const matchesSearch = !query || groupName.includes(query) || coordinatorName.includes(query)
      return matchesStatus && matchesSearch
    })
  }, [groups, search, statusFilter])

  const handleWhatsApp = (phone, name, balance) => {
    if (!phone) return
    let cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.startsWith('0')) cleanPhone = '234' + cleanPhone.slice(1)
    const text = balance > 0 
      ? `Hello ${name}, a friendly reminder from Cresoa regarding the outstanding balance of ₦${balance.toLocaleString()} for your group order.`
      : `Hello ${name}, how is the group order coming along?`
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank')
  }

  const handleCall = (phone) => {
    if (!phone) return
    window.location.href = `tel:${phone.replace(/\D/g, '')}`
  }

  const promptDelete = (group) => {
    setOpenMenuId(null)
    setModalConfig({
      isOpen: true, title: 'Delete Group Order?',
      message: `Are you sure you want to delete "${group.group_name}"? Linked orders will be unassigned from this group, but the orders themselves will NOT be deleted.`,
      confirmText: 'Delete Group', isDestructive: true,
      onConfirm: async () => {
        setModalConfig(prev => ({ ...prev, isOpen: false })); setDeletingId(group.id)
        try {
          const { error: unlinkError } = await supabase.from('orders').update({ group_order_id: null }).eq('group_order_id', group.id)
          if (unlinkError) throw unlinkError
          const { error: deleteError } = await supabase.from('group_orders').delete().eq('id', group.id).eq('business_id', businessId)
          if (deleteError) throw deleteError
          setGroups((current) => current.filter((item) => item.id !== group.id))
          showToast('Group deleted successfully')
        } catch (deleteError) {
          showToast('We could not delete this group. Please try again.', 'error')
        } finally { setDeletingId(null) }
      }
    })
  }

  const statusOptions = [
    { label: 'All Groups', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Active', value: 'active' },
    { label: 'Completed', value: 'completed' }
  ]

  if (loading) return <div className="orders-page"><div className="skeleton-box" style={{ height: '200px', borderRadius: '16px' }} /><Navigation businessId={businessId} /></div>
  
  if (!canUseGroups) {
    const isFashion = business?.sector?.trim().toLowerCase() === 'fashion' || business?.sector === 'Fashion & Custom Wear'
    return (
      <div className="orders-page">
        <Navigation businessId={businessId} />
        <div className="cresoa-card" style={{ display: 'flex', alignItems: 'center', gap: '24px', padding: '2rem', flexWrap: 'wrap', marginTop: '2rem' }}>
          <div style={{ width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px', background: 'rgba(212,165,42,0.12)', color: 'var(--color-accent)' }}><SvgIcons.Users /></div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0' }}>Aso-Ebi & Group Orders</h1>
            <p style={{ color: 'var(--cresoa-text-muted)', margin: '0 0 0.8rem' }}>{isFashion ? 'Group orders are not included in your current plan.' : 'Group orders are currently available only for Fashion & Custom Wear businesses.'}</p>
            {isFashion && <Link href={`/dashboard/subscription?business_id=${businessId}`} className="cresoa-primary-button" style={{ display: 'inline-block', textDecoration: 'none' }}>Upgrade plan</Link>}
          </div>
        </div>
        <div style={{ marginTop: '2rem' }}><Navigation businessId={businessId} /></div>
      </div>
    )
  }

  return (
    <div className="orders-page" style={{ paddingBottom: '100px' }}>
      <Navigation businessId={businessId} />

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', marginTop: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#0F2B4A' }}>Aso-Ebi</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.95rem', color: '#555' }}>Group sewing in one place</p>
        </div>
        <Link href={`/dashboard/groups/new?business_id=${businessId || ''}`} style={{ background: '#0F2B4A', color: '#FFF', padding: '10px 16px', borderRadius: '8px', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <SvgIcons.Plus /> New Group
        </Link>
      </div>

      {/* TOTAL BALANCE BANNER */}
      {totalGroupBalance > 0 && (
        <div style={{ background: 'linear-gradient(135deg, #0F2B4A, #1A4685)', padding: '1.25rem', borderRadius: '16px', color: '#FFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: '#A0B2C6', fontWeight: 600, marginBottom: '4px' }}>Total Group Balance Due</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#D4AF37' }}>{formatMoney(totalGroupBalance)}</div>
          </div>
        </div>
      )}

      {/* FILTERS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: '#F8F9FA', borderRadius: '12px', padding: '0 1rem', border: '1px solid #EAEAEA' }}>
          <span style={{ color: '#999' }}><SvgIcons.Search /></span>
          <input type="text" placeholder="Search group or leader..." value={search} onChange={e => setSearch(e.target.value)} style={{ border: 'none', background: 'transparent', padding: '14px 10px', outline: 'none', width: '100%', fontSize: '0.95rem' }} />
          {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}><SvgIcons.X /></button>}
        </div>
        
        {/* Hide status filter if groups < 5 */}
        {groups.length >= 5 && (
          <div style={{ position: 'relative', width: '100%' }} ref={statusMenuRef}>
            <button onClick={() => setShowStatusMenu(!showStatusMenu)} style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', background: '#FFFFFF', border: '1px solid #EAEAEA', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#0F2B4A' }}>
              {statusOptions.find(o => o.value === statusFilter)?.label}
              <SvgIcons.ChevronDown />
            </button>
            {showStatusMenu && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: '#FFF', border: '1px solid #EAEAEA', borderRadius: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 10, overflow: 'hidden' }}>
                {statusOptions.map(opt => (
                  <button key={opt.value} onClick={() => { setStatusFilter(opt.value); setShowStatusMenu(false); }} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: statusFilter === opt.value ? '#F4F6F8' : '#FFF', border: 'none', borderBottom: '1px solid #F0F0F0', cursor: 'pointer', fontSize: '0.9rem', color: '#0F2B4A', fontWeight: statusFilter === opt.value ? 700 : 500 }}>{opt.label}</button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* LIST */}
      {filteredGroups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', background: '#F8F9FA', borderRadius: '16px', border: '2px dashed #EAEAEA' }}>
          <div style={{ color: '#0F2B4A', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}><SvgIcons.Users /></div>
          <h3 style={{ fontSize: '1.2rem', color: '#0F2B4A', margin: '0 0 10px 0' }}>{groups.length === 0 ? 'No groups yet' : 'No matching groups'}</h3>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>{groups.length === 0 ? 'Create your first group to manage Aso-Ebi and bulk orders.' : 'Try a different search term or filter.'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredGroups.map((group) => {
            const memberCount = Number(group.memberCount || 0)
            const deliveredCount = Number(group.deliveredCount || 0)
            const groupProgress = memberCount > 0 ? Math.round((deliveredCount / memberCount) * 100) : 0
            const coordinatorName = group.coordinator?.name || [group.coordinator?.first_name, group.coordinator?.last_name].filter(Boolean).join(' ') || 'No leader'
            const coordinatorPhone = group.coordinator?.phone || ''
            const isMenuOpen = openMenuId === group.id
            const eventCountdown = getEventCountdown(group.due_date)

            return (
              <div key={group.id} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#FFF', borderRadius: '16px', border: '1px solid #EAEAEA', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                
                {/* LINE 1: Name & Stage */}
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F2B4A' }}>{group.group_name}</h3>
                      <span style={{ background: '#F4F6F8', color: '#0F2B4A', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                        {group.derivedStage}
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0', color: '#666', fontSize: '0.85rem' }}>Group Leader: <strong style={{ color: '#0F2B4A' }}>{coordinatorName}</strong></p>
                  </div>

                  <div className="menu-container" ref={isMenuOpen ? menuRef : null} style={{ position: 'relative' }}>
                    <button onClick={() => setOpenMenuId(isMenuOpen ? null : group.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', padding: '4px' }}><SvgIcons.MoreVertical /></button>
                    {isMenuOpen && (
                      <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: '#FFF', border: '1px solid #EAEAEA', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', minWidth: '160px', zIndex: 30, overflow: 'hidden' }}>
                        <Link href={`/dashboard/groups/${group.id}/edit?business_id=${businessId || ''}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: '#333', textDecoration: 'none' }}><SvgIcons.Edit /> Edit Group</Link>
                        <button onClick={() => promptDelete(group)} disabled={deletingId === group.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: '#FF3B30', fontWeight: 600 }}><SvgIcons.Trash /> Delete</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* LINE 2: Event & Money */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8F9FA', padding: '12px', borderRadius: '10px', border: '1px solid #EAEAEA' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.7rem', color: '#666', fontWeight: 700, textTransform: 'uppercase' }}>Event Date</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: eventCountdown.color }}>{eventCountdown.text}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                    <span style={{ fontSize: '0.7rem', color: '#666', fontWeight: 700, textTransform: 'uppercase' }}>Balance</span>
                    {Number(group.totalBalance) > 0 ? (
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FF3B30' }}>{formatMoney(group.totalBalance)}</span>
                    ) : (
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#137333' }}>Fully Paid</span>
                    )}
                  </div>
                </div>

                {/* LINE 3: Progress & Owing Members */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                    <span style={{ color: '#666' }}>{memberCount} member{memberCount === 1 ? '' : 's'} {group.owingMembersCount > 0 && `· ${group.owingMembersCount} owe`}</span>
                    <span style={{ color: groupProgress > 0 ? '#137333' : '#999' }}>{deliveredCount} of {memberCount} delivered</span>
                  </div>
                  <div style={{ height: '6px', background: '#EAEAEA', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: groupProgress > 0 ? '#137333' : '#EAEAEA', borderRadius: '99px', width: `${groupProgress}%`, transition: 'width 0.3s' }} />
                  </div>
                </div>

                {/* LINE 4: Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #EAEAEA', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {coordinatorPhone ? (
                      <>
                        <button onClick={() => handleWhatsApp(coordinatorPhone, coordinatorName, group.totalBalance)} style={{ background: Number(group.totalBalance) > 0 ? '#E6F4EA' : '#F4F6F8', color: Number(group.totalBalance) > 0 ? '#137333' : '#0F2B4A', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                          {Number(group.totalBalance) > 0 ? 'Chase Leader' : 'Chat Leader'}
                        </button>
                        <button onClick={() => handleCall(coordinatorPhone)} style={{ background: '#F4F6F8', color: '#0F2B4A', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <SvgIcons.Phone />
                        </button>
                      </>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: '#999', fontStyle: 'italic' }}>No leader phone</span>
                    )}
                  </div>
                  <Link href={`/dashboard/groups/${group.id}?business_id=${businessId || ''}`} style={{ background: '#0F2B4A', color: '#FFF', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none' }}>
                    Open Group
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: '2rem' }}><Navigation businessId={businessId} /></div>

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

      {toastMessage && <div className={`app-toast ${toastType}`}>{toastMessage}</div>}
    </div>
  )
                      }
