
export async function generateStaticParams() {
  return [{ slug: "default", id: "default" }];
}
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../../lib/getBusinessId'
import { Navigation } from '../../../../components/Navigation'
import { MeasurementForm } from '../../../../components/MeasurementForm'
import { isFeatureAvailable, getPlanLimits } from '../../../../lib/planLimits'
import '../../../globals.css'

const EMPTY_MEMBER = {
  customer_id: '',
  customer_name: '',
  phone: '',
  item: '',
  price: '',
  deposit: '',
  measurements: {},
  due_date: '',
}

const PRODUCTION_STAGES = ['Order placed', 'Cutting', 'Sewing', 'Ready', 'Delivered']

// ─── EMBEDDED ICONS (Only the essentials) ───
const SvgIcons = {
  ArrowLeft: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>,
  Search: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  Edit: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>,
  Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  X: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  ChevronRight: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>,
  Check: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
}

function splitName(fullName) {
  const value = String(fullName || '').trim()
  const parts = value.split(/\s+/).filter(Boolean)
  return { first_name: parts[0] || '', last_name: parts.slice(1).join(' ') || null }
}

const formatNaira = (value) => `₦${Number(value || 0).toLocaleString('en-NG')}`

function formatDate(value) {
  if (!value) return 'Not set'
  const date = new Date(value)
  if (isNaN(date.getTime())) return 'Not set'
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function customerLabel(customer) {
  if (!customer) return 'Unknown'
  if (customer.name) return customer.name
  return [customer.first_name, customer.last_name].filter(Boolean).join(' ') || 'Unknown'
}

export default function GroupDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const groupId = params?.id

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [group, setGroup] = useState(null)
  const [members, setMembers] = useState([])
  const [customers, setCustomers] = useState([])
  const [businessId, setBusinessId] = useState(null)
  const [businessPlan, setBusinessPlan] = useState('free')
  const [maxMembers, setMaxMembers] = useState(0)
  const [canManage, setCanManage] = useState(false)
  const [businessName, setBusinessName] = useState('')

  const [activeFilter, setActiveFilter] = useState('all')
  const [search, setSearch] = useState('')

  // Modals
  const [showMemberFormModal, setShowMemberFormModal] = useState(false)
  const [editingMemberId, setEditingMemberId] = useState(null)
  const [memberForm, setMemberForm] = useState(EMPTY_MEMBER)

  const [showMemberHubModal, setShowMemberHubModal] = useState(false)
  const [hubMember, setHubMember] = useState(null)

  const [showStatusModal, setShowStatusModal] = useState(false)
  const [statusMember, setStatusMember] = useState(null)
  const [selectedStatus, setSelectedStatus] = useState('')

  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentMemberId, setPaymentMemberId] = useState(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNote, setPaymentNote] = useState('')
  const [paymentsList, setPaymentsList] = useState([])

  const [showMeasurementModal, setShowMeasurementModal] = useState(false)
  const [measurementMember, setMeasurementMember] = useState(null)
  const [tempMeasurements, setTempMeasurements] = useState({})

  // Custom UI
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', confirmText: '', isDestructive: false, onConfirm: null })
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState('success')
  
  const requestedBusinessId = searchParams.get('business_id')

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg)
    setToastType(type)
    setTimeout(() => setToastMessage(''), 3000)
  }

  const loadData = useCallback(async () => {
    if (!groupId) return
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const bizId = requestedBusinessId || getCurrentBusinessId()
      if (!bizId) { router.push('/dashboard'); return }
      setBusinessId(bizId)

      const [{ data: bizData, error: bizError }, { data: groupData, error: groupError }] = await Promise.all([
        supabase.from('businesses').select('id, plan, sector, name').eq('id', bizId).single(),
        supabase.from('group_orders').select(`*, coordinator:coordinator_customer_id (id, name, first_name, last_name, phone)`).eq('id', groupId).eq('business_id', bizId).single(),
      ])

      if (bizError) throw bizError
      if (groupError) throw groupError

      const plan = bizData?.plan || 'free'
      setBusinessPlan(plan)
      setBusinessName(bizData?.name || 'Your business')
      setCanManage(isFeatureAvailable(plan, 'groups'))
      const limits = getPlanLimits(plan)
      setMaxMembers(limits?.maxGroupMembers || 0)
      setGroup(groupData)

      const [{ data: memberData, error: memberError }, { data: customerData }] = await Promise.all([
        supabase.from('orders').select(`*, customer:customer_id (id, name, first_name, last_name, phone)`).eq('group_order_id', groupId).eq('business_id', bizId).order('created_at', { ascending: false }),
        supabase.from('customers').select('id, name, first_name, last_name, phone').eq('business_id', bizId).order('first_name', { ascending: true }),
      ])

      if (memberError) throw memberError
      setMembers(memberData || [])
      setCustomers(customerData || [])
    } catch (err) {
      setError(err?.message || 'Failed to load group details.')
    } finally {
      setLoading(false)
    }
  }, [groupId, requestedBusinessId, router])

  useEffect(() => { loadData() }, [loadData])

  // ─── Derived Data ───
  const stats = useMemo(() => {
    const total = members.reduce((sum, m) => sum + Number(m.price || 0), 0)
    const paid = members.reduce((sum, m) => sum + Number(m.amount_paid || 0), 0)
    const balance = Math.max(total - paid, 0)
    const owingCount = members.filter(m => (Number(m.price || 0) - Number(m.amount_paid || 0)) > 0).length
    return { total, paid, balance, count: members.length, owingCount }
  }, [members])

  const filteredMembers = useMemo(() => {
    let result = members
    if (activeFilter === 'owing') {
      result = result.filter(m => (Number(m.price || 0) - Number(m.amount_paid || 0)) > 0)
    } else if (activeFilter !== 'all') {
      result = result.filter(m => (m.current_status || 'Order placed') === activeFilter)
    }
    
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(m => {
        const name = customerLabel(m.customer).toLowerCase()
        const item = (m.title || '').toLowerCase()
        return name.includes(q) || item.includes(q)
      })
    }
    return result
  }, [members, activeFilter, search])

  const coordinator = group?.coordinator
  const coordinatorName = coordinator?.name || coordinator?.first_name || 'Coordinator'
  const coordinatorPhone = coordinator?.phone

  // ─── Actions ───
  const openMemberHub = (member) => {
    setHubMember(member)
    setShowMemberHubModal(true)
  }

  const openStatusModal = (member) => {
    setShowMemberHubModal(false)
    setStatusMember(member)
    setSelectedStatus(member.current_status || 'Order placed')
    setShowStatusModal(true)
  }

  const handleStatusUpdate = async () => {
    if (!statusMember || !selectedStatus) return
    setSaving(true)
    try {
      const { error: updateError } = await supabase.from('orders').update({ current_status: selectedStatus }).eq('id', statusMember.id)
      if (updateError) throw updateError
      setMembers(prev => prev.map(m => m.id === statusMember.id ? { ...m, current_status: selectedStatus } : m))
      setShowStatusModal(false)
      setStatusMember(null)
      showToast(`Status updated to ${selectedStatus}`)
    } catch (err) {
      showToast('Failed to update status', 'error')
    } finally {
      setSaving(false)
    }
  }

  const openAddMember = () => {
    setError(''); setEditingMemberId(null); setMemberForm({ ...EMPTY_MEMBER, measurements: {} }); setShowMemberFormModal(true)
  }

  const openEditMember = (member) => {
    setShowMemberHubModal(false)
    setError(''); setEditingMemberId(member.id)
    setMemberForm({
      customer_id: member.customer_id || '',
      customer_name: customerLabel(member.customer),
      phone: member.customer?.phone || '',
      item: member.title || '',
      price: String(member.price ?? ''),
      deposit: String(member.amount_paid ?? ''),
      measurements: member.measurements || {},
      due_date: member.due_date || '',
    })
    setShowMemberFormModal(true)
  }

  const handleMemberChange = (event) => {
    const { name, value } = event.target
    setMemberForm(prev => ({ ...prev, [name]: value }))
    if (name === 'customer_id' && value) {
      const customer = customers.find(item => item.id === value)
      if (customer) {
        setMemberForm(prev => ({ ...prev, customer_id: value, customer_name: customerLabel(customer), phone: customer.phone || '' }))
      }
    }
  }

  const findOrCreateCustomer = async () => {
    const name = memberForm.customer_name.trim()
    const phone = memberForm.phone.trim()
    if (!name) throw new Error('Customer name is required.')
    if (memberForm.customer_id) return memberForm.customer_id

    if (phone) {
      const { data: byPhone } = await supabase.from('customers').select('id').eq('business_id', businessId).eq('phone', phone).maybeSingle()
      if (byPhone) return byPhone.id
    }

    const { first_name, last_name } = splitName(name)
    let query = supabase.from('customers').select('id').eq('business_id', businessId).eq('first_name', first_name)
    if (last_name) query = query.eq('last_name', last_name)
    const { data: existing } = await query.maybeSingle()
    if (existing) return existing.id

    const { data: created, error: createError } = await supabase.from('customers').insert({ business_id: businessId, first_name, last_name: last_name || null, phone: phone || null, name }).select('id').single()
    if (createError) {
      const { data: fallback } = await supabase.from('customers').insert({ business_id: businessId, first_name, last_name: last_name || null, phone: phone || null }).select('id').single()
      if (!fallback?.id) throw new Error('Customer creation failed.')
      return fallback.id
    }
    return created.id
  }

  const saveMember = async (event) => {
    event?.preventDefault()
    setError('')
    const name = memberForm.customer_name.trim()
    const item = memberForm.item.trim()
    const price = Number(memberForm.price)
    
    if (!name || !item || !Number.isFinite(price) || price < 0) {
      setError('Customer name, item, and a valid price are required.')
      return
    }
    if (!editingMemberId && maxMembers > 0 && members.length >= maxMembers) {
      setError(`Your current plan allows up to ${maxMembers} group members.`)
      return
    }
    
    setSaving(true)
    try {
      const customerId = await findOrCreateCustomer()
      const payload = {
        business_id: businessId,
        group_order_id: groupId,
        customer_id: customerId,
        title: item,
        price,
        amount_paid: Number(memberForm.deposit) || 0,
        due_date: memberForm.due_date || null,
        current_status: editingMemberId ? undefined : 'Order placed',
        measurements: memberForm.measurements && Object.keys(memberForm.measurements).length > 0 ? memberForm.measurements : null,
      }
      if (editingMemberId) {
        delete payload.current_status
        const { error: updateError } = await supabase.from('orders').update(payload).eq('id', editingMemberId)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase.from('orders').insert(payload)
        if (insertError) throw insertError
      }
      setShowMemberFormModal(false)
      await loadData()
      showToast(editingMemberId ? 'Member updated' : 'Member added successfully')
    } catch (err) {
      setError(err?.message || 'Failed to save group member.')
    } finally { setSaving(false) }
  }

  const promptDeleteMember = (member) => {
    setShowMemberHubModal(false)
    setModalConfig({
      isOpen: true,
      title: 'Remove Member',
      message: `Are you sure you want to remove ${customerLabel(member.customer)} from this group? Their individual order will remain in your main orders list.`,
      confirmText: 'Remove Member',
      isDestructive: true,
      onConfirm: async () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }))
        try {
          const { error: updateError } = await supabase.from('orders').update({ group_order_id: null }).eq('id', member.id)
          if (updateError) throw updateError
          await loadData()
          showToast('Member removed from group')
        } catch (err) {
          showToast('Failed to remove member.', 'error')
        }
      }
    })
  }

  // ─── Payments ───
  const fetchPayments = async (orderId) => {
    const { data } = await supabase.from('payment_records').select('*').eq('order_id', orderId).order('created_at', { ascending: false })
    return data || []
  }

  const openPaymentModal = async (member) => {
    setShowMemberHubModal(false)
    const balance = Number(member.price || 0) - Number(member.amount_paid || 0)
    if (balance <= 0) { showToast('This order is fully paid.', 'error'); return }
    setPaymentMemberId(member.id)
    setPaymentAmount('')
    setPaymentNote('')
    try {
      const payments = await fetchPayments(member.id)
      setPaymentsList(payments)
    } catch (e) { setPaymentsList([]) }
    setShowPaymentModal(true)
  }

  const handleRecordPayment = async (event) => {
    event.preventDefault()
    const amount = parseFloat(paymentAmount)
    if (!amount || amount <= 0) { showToast('Enter a valid amount.', 'error'); return }
    const member = members.find(m => m.id === paymentMemberId)
    if (!member) return
    const balance = Number(member.price || 0) - Number(member.amount_paid || 0)
    if (amount > balance) { showToast(`Amount exceeds balance of ${formatNaira(balance)}.`, 'error'); return }
    
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/orders/${paymentMemberId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ amount, note: paymentNote || 'Group member payment' }),
      })
      if (!response.ok) throw new Error('Failed')
      setPaymentAmount('')
      setPaymentNote('')
      await loadData()
      const updatedPayments = await fetchPayments(paymentMemberId)
      setPaymentsList(updatedPayments)
      showToast('Payment recorded successfully')
    } catch (err) {
      showToast('Could not record payment.', 'error')
    } finally { setSaving(false) }
  }

  // ─── Measurements ───
  const openMeasurementModal = (member) => {
    setShowMemberHubModal(false)
    setMeasurementMember(member)
    setTempMeasurements(member.measurements || {})
    setShowMeasurementModal(true)
  }

  const saveMeasurements = async () => {
    if (!measurementMember) return
    setSaving(true)
    try {
      const { error: updateError } = await supabase.from('orders').update({ measurements: tempMeasurements && Object.keys(tempMeasurements).length > 0 ? tempMeasurements : null }).eq('id', measurementMember.id)
      if (updateError) throw updateError
      await loadData()
      setShowMeasurementModal(false)
      setMeasurementMember(null)
      showToast('Measurements saved')
    } catch (err) {
      showToast('Could not save measurements.', 'error')
    } finally { setSaving(false) }
  }

  // ─── WhatsApp ───
  const sendMemberStatusUpdate = (member) => {
    setShowMemberHubModal(false)
    const customerPhone = member.customer?.phone
    if (!customerPhone) { showToast('Member phone number not available.', 'error'); return }
    const name = customerLabel(member.customer) || 'Customer'
    const status = member.current_status || 'Order placed'
    const price = Number(member.price || 0)
    const paid = Number(member.amount_paid || 0)
    const balance = price - paid
    const message = `Hello ${name},\n\nThis is an update from ${businessName}.\nYour order "${member.title || 'Order'}" is currently: ${status}.\nOutstanding balance: ${balance > 0 ? formatNaira(balance) : 'Paid in full'}.\n\nFor any questions, contact ${coordinatorName}.`
    const url = `https://wa.me/${customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  const sendCoordinatorUpdate = () => {
    if (!coordinatorPhone) { showToast('Coordinator phone number not available.', 'error'); return }
    let message = `Group Order Update\n\nGroup: ${group?.group_name}\nCoordinator: ${coordinatorName}\n\nTotal Expected: ${formatNaira(stats.total)}\nTotal Collected: ${formatNaira(stats.paid)}\nOutstanding Balance: ${formatNaira(stats.balance)}\n\nPlease ensure all balances are cleared before the event date.`
    const url = `https://wa.me/${coordinatorPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  if (loading) return <div className="order-page-loading"><div className="spinner" /></div>
  if (error && !group) return <div className="order-page-error"><h2>Unable to load group</h2><button onClick={loadData} className="cresoa-primary-button">Try again</button></div>
  if (!group) return null

  return (
    <div className="order-details-page">
      <Navigation businessId={businessId} />

      <button onClick={() => router.push(`/dashboard/groups?business_id=${businessId}`)} className="order-back-btn">
        <SvgIcons.ArrowLeft /> Groups
      </button>

      {/* ─── HEADER ─── */}
     <div className="customer-profile-header" style={{ marginBottom: '1rem' }}>
        <div className="customer-profile-left">
          <div className="customer-avatar-large" style={{ background: 'var(--color-primary)' }}>
            {group.group_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="order-title">{group.group_name}</h1>
            <p className="order-subtitle">
              Coordinator: <strong>{coordinatorName}</strong>
              {group.due_date && ` · Due ${formatDate(group.due_date)}`}
            </p>
          </div>
        </div>

        <div className="customer-header-actions">
          <button onClick={() => router.push(`/dashboard/groups/${groupId}/edit?business_id=${businessId}`)} className="order-btn-secondary">
            <SvgIcons.Edit /> Edit
          </button>
          {canManage && (
            <button onClick={openAddMember} className="cresoa-primary-button">
              <SvgIcons.Plus /> Add Member
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.6rem 1rem', marginBottom: '1rem', borderRadius: '8px', background: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}>
          {error}
        </div>
      )}

      {/* ─── FINANCIAL COMMAND CENTER ─── */}
      <div className="cresoa-card" style={{ marginBottom: '1rem', background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '12px' }}>
          <div>
            <span style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.8, fontWeight: 700 }}>Expected</span>
            <span style={{ fontSize: '1rem', fontWeight: 800 }}>{formatNaira(stats.total)}</span>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.8, fontWeight: 700 }}>Collected</span>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: '#72C49C' }}>{formatNaira(stats.paid)}</span>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.8, fontWeight: 700 }}>Owing</span>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: stats.balance > 0 ? '#EF7771' : '#72C49C' }}>
              {stats.balance > 0 ? formatNaira(stats.balance) : 'Paid'}
            </span>
          </div>
        </div>
        <button onClick={sendCoordinatorUpdate} className="order-btn-secondary full-width" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', borderColor: 'rgba(255,255,255,0.2)', padding: '8px', fontSize: '0.8rem' }}>
          Send WhatsApp Update to Coordinator
        </button>
      </div>

      {/* ─── SEARCH & SMART FILTERS ─── */}
      <div className="orders-search-wrapper" style={{ marginBottom: '1rem' }}>
        <span className="search-icon"><SvgIcons.Search /></span>
        <input type="text" className="orders-search-input" placeholder="Search member or item..." value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button className="search-clear-btn" onClick={() => setSearch('')}><SvgIcons.X /></button>}
      </div>

      <div className="smart-tabs-container">
        <button className={`smart-tab ${activeFilter === 'all' ? 'active' : ''}`} onClick={() => setActiveFilter('all')}>All ({stats.count})</button>
        <button className={`smart-tab ${activeFilter === 'owing' ? 'active' : ''}`} onClick={() => setActiveFilter('owing')}>Owing ({stats.owingCount})</button>
        {PRODUCTION_STAGES.map(stage => {
          const count = members.filter(m => (m.current_status || 'Order placed') === stage).length
          return (
            <button key={stage} className={`smart-tab ${activeFilter === stage ? 'active' : ''}`} onClick={() => setActiveFilter(stage)}>{stage} ({count})</button>
          )
        })}
      </div>

      {/* ─── HIGH-DENSITY MEMBER LIST ─── */}
      <div className="member-dense-list">
        {filteredMembers.length === 0 ? (
          <div className="orders-empty" style={{ padding: '3rem 1rem' }}><h3>No members found</h3><p>There are no members matching this filter.</p></div>
        ) : (
          filteredMembers.map((member) => {
            const balance = Number(member.price || 0) - Number(member.amount_paid || 0)
            const name = customerLabel(member.customer)
            const status = member.current_status || 'Order placed'

            return (
              <div key={member.id} className="member-dense-row" onClick={() => openMemberHub(member)}>
                <div className="member-avatar">
                  {name.charAt(0).toUpperCase()}
                </div>
                
                <div className="member-info">
                  <span className="member-name">{name}</span>
                  <span className="member-item">{member.title || 'Untitled'}</span>
                </div>

                <div className="member-status-col">
                  <span className={`status-dot ${status === 'Delivered' ? 'delivered' : status === 'Ready' ? 'ready' : 'active'}`} />
                  <span className="status-text">{status}</span>
                </div>

                <div className="member-finance-col">
                  <span className={`member-balance ${balance > 0 ? 'owing' : 'paid'}`}>
                    {balance > 0 ? formatNaira(balance) : 'Paid'}
                  </span>
                  <SvgIcons.ChevronRight />
                </div>
              </div>
            )
          })
        )}
      </div>

      <div style={{ marginTop: '2rem' }}><Navigation businessId={businessId} /></div>

      {/* ─── MEMBER HUB MODAL ─── */}
      {showMemberHubModal && hubMember && (
        <div className="app-modal-overlay" onClick={() => setShowMemberHubModal(false)}>
          <div className="app-modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="customer-card-avatar" style={{ width: '48px', height: '48px', fontSize: '1.2rem' }}>
                  {customerLabel(hubMember.customer).charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 800 }}>{customerLabel(hubMember.customer)}</h2>
                  <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', margin: '2px 0 0', fontWeight: 500 }}>{hubMember.title || 'Untitled'}</p>
                </div>
              </div>
              <button onClick={() => setShowMemberHubModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}><SvgIcons.X /></button>
            </div>

            <div className="order-finance-grid" style={{ marginBottom: '1.5rem', background: 'var(--cresoa-bg)', padding: '12px', borderRadius: '12px' }}>
              <div className="order-finance-item">
                <span className="label">Total</span>
                <span className="value">{formatNaira(hubMember.price)}</span>
              </div>
              <div className="order-finance-item">
                <span className="label">Paid</span>
                <span className="value text-success">{formatNaira(hubMember.amount_paid)}</span>
              </div>
              <div className="order-finance-item">
                <span className="label">Balance</span>
                <span className="value text-danger">{formatNaira(Number(hubMember.price) - Number(hubMember.amount_paid))}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={() => openStatusModal(hubMember)} className="order-btn-secondary full-width" style={{ justifyContent: 'flex-start', padding: '14px 16px' }}>
                <span className={`status-dot ${hubMember.current_status === 'Delivered' ? 'delivered' : hubMember.current_status === 'Ready' ? 'ready' : 'active'}`} style={{ marginRight: '8px' }} />
                Update Status ({hubMember.current_status || 'Order placed'})
              </button>
              <button onClick={() => openPaymentModal(hubMember)} className="cresoa-primary-button full-width" style={{ justifyContent: 'flex-start', padding: '14px 16px' }}>
                Record Payment
              </button>
              <button onClick={() => openMeasurementModal(hubMember)} className="order-btn-secondary full-width" style={{ justifyContent: 'flex-start', padding: '14px 16px' }}>
                View & Edit Measurements
              </button>
              <button onClick={() => sendMemberStatusUpdate(hubMember)} className="order-btn-secondary full-width" style={{ justifyContent: 'flex-start', padding: '14px 16px', color: 'var(--color-secondary)' }}>
                Send WhatsApp Update
              </button>
              <button onClick={() => openEditMember(hubMember)} className="order-btn-secondary full-width" style={{ justifyContent: 'flex-start', padding: '14px 16px' }}>
                Edit Order Details
              </button>
              
              <div style={{ height: '1px', background: 'var(--cresoa-border)', margin: '8px 0' }} />
              
              <button onClick={() => promptDeleteMember(hubMember)} className="order-btn-secondary full-width" style={{ justifyContent: 'flex-start', padding: '14px 16px', color: 'var(--color-danger)', borderColor: 'var(--color-danger-soft)' }}>
                Remove from Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── STATUS MODAL ─── */}
      {showStatusModal && statusMember && (
        <div className="app-modal-overlay" onClick={() => setShowStatusModal(false)}>
          <div className="app-modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Update Status</h2>
              <button onClick={() => setShowStatusModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}><SvgIcons.X /></button>
            </div>
            <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', margin: '0 0 1rem 0' }}>Changing status for <strong>{customerLabel(statusMember.customer)}</strong></p>
            <div style={{ display: 'grid', gap: '8px' }}>
              {PRODUCTION_STAGES.map(stage => (
                <button key={stage} onClick={() => setSelectedStatus(stage)} className={`order-btn-secondary ${selectedStatus === stage ? 'active' : ''}`} style={{ justifyContent: 'space-between', padding: '12px 16px', borderColor: selectedStatus === stage ? 'var(--color-primary)' : 'var(--cresoa-border)' }}>
                  <span>{stage}</span>
                  {selectedStatus === stage && <SvgIcons.Check />}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '1.5rem' }}>
              <button onClick={() => setShowStatusModal(false)} className="order-btn-secondary" style={{ flex: 1 }}>Cancel</button>
              <button onClick={handleStatusUpdate} disabled={saving} className="cresoa-primary-button" style={{ flex: 1 }}>Save Status</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ADD/EDIT MEMBER MODAL ─── */}
      {showMemberFormModal && (
        <div className="app-modal-overlay" onClick={() => { if (!saving) setShowMemberFormModal(false) }}>
          <div className="app-modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>Group Member</span>
                <h2 style={{ margin: '0.2rem 0 0', fontSize: '1.3rem' }}>{editingMemberId ? 'Edit Member' : 'Add Member'}</h2>
              </div>
              <button onClick={() => setShowMemberFormModal(false)} disabled={saving} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}><SvgIcons.X /></button>
            </div>
            <form onSubmit={saveMember} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="order-label">Existing Customer (Optional)</label>
                <select name="customer_id" value={memberForm.customer_id} onChange={handleMemberChange} disabled={saving} className="order-input">
                  <option value="">-- Create New Customer --</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{customerLabel(c)} {c.phone ? `(${c.phone})` : ''}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="order-label">Customer Name *</label>
                  <input name="customer_name" value={memberForm.customer_name} onChange={handleMemberChange} required disabled={saving || !!memberForm.customer_id} className="order-input" placeholder="e.g. Amaka Okafor" />
                </div>
                <div>
                  <label className="order-label">Phone Number</label>
                  <input name="phone" value={memberForm.phone} onChange={handleMemberChange} disabled={saving || !!memberForm.customer_id} className="order-input" placeholder="080..." />
                </div>
              </div>
              <div>
                <label className="order-label">Item / Garment *</label>
                <input name="item" value={memberForm.item} onChange={handleMemberChange} required disabled={saving} className="order-input" placeholder="e.g. Aso Ebi Lace" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="order-label">Total Price (₦) *</label>
                  <input type="number" min="0" name="price" value={memberForm.price} onChange={handleMemberChange} required disabled={saving} className="order-input" placeholder="0" />
                </div>
                <div>
                  <label className="order-label">Deposit Paid (₦)</label>
                  <input type="number" min="0" name="deposit" value={memberForm.deposit} onChange={handleMemberChange} disabled={saving} className="order-input" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="order-label">Due Date</label>
                <input type="date" name="due_date" value={memberForm.due_date} onChange={handleMemberChange} disabled={saving} className="order-input" />
              </div>
              <div style={{ marginTop: '8px' }}>
                <label className="order-label" style={{ marginBottom: '8px', display: 'block' }}>Measurements</label>
                <MeasurementForm measurements={memberForm.measurements || {}} onChange={(updated) => setMemberForm(prev => ({ ...prev, measurements: updated }))} />
              </div>
              {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.8rem', margin: 0 }}>{error}</p>}
              <div style={{ display: 'flex', gap: '12px', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowMemberFormModal(false)} disabled={saving} className="order-btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" disabled={saving} className="cresoa-primary-button" style={{ flex: 1 }}>{saving ? 'Saving...' : editingMemberId ? 'Save Changes' : 'Add Member'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── PAYMENT MODAL ─── */}
 {showPaymentModal && (
        <div className="app-modal-overlay" onClick={() => { if (!saving) setShowPaymentModal(false) }}>
          <div className="app-modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Record Payment</h2>
              <button onClick={() => setShowPaymentModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}><SvgIcons.X /></button>
            </div>
            {paymentsList.length > 0 && (
              <div style={{ marginBottom: '1rem', maxHeight: '120px', overflowY: 'auto', background: 'var(--cresoa-bg)', padding: '10px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--cresoa-text-muted)', textTransform: 'uppercase' }}>Recent Payments</span>
                {paymentsList.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderBottom: '1px solid var(--cresoa-border)', padding: '6px 0' }}>
                    <span>{formatNaira(p.amount)}</span>
                    <span style={{ color: 'var(--cresoa-text-muted)' }}>{formatDate(p.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="order-label">Amount (₦)</label>
                <input type="number" min="1" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} required autoFocus className="order-input" placeholder="Enter amount" />
              </div>
              <div>
                <label className="order-label">Note (Optional)</label>
                <input type="text" value={paymentNote} onChange={e => setPaymentNote(e.target.value)} className="order-input" placeholder="e.g. Cash transfer" />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowPaymentModal(false)} className="order-btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" disabled={saving} className="cresoa-primary-button" style={{ flex: 1 }}>Save Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MEASUREMENT MODAL ─── */}
      {showMeasurementModal && measurementMember && (
        <div className="app-modal-overlay" onClick={() => { if (!saving) setShowMeasurementModal(false) }}>
          <div className="app-modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Measurements</h2>
              <button onClick={() => setShowMeasurementModal(false)} disabled={saving} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}><SvgIcons.X /></button>
            </div>
            <MeasurementForm measurements={tempMeasurements} onChange={setTempMeasurements} />
            <div style={{ display: 'flex', gap: '12px', marginTop: '1.5rem' }}>
              <button onClick={() => setShowMeasurementModal(false)} disabled={saving} className="order-btn-secondary" style={{ flex: 1 }}>Cancel</button>
              <button onClick={saveMeasurements} disabled={saving} className="cresoa-primary-button" style={{ flex: 1 }}>Save Measurements</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CUSTOM CONFIRM MODAL ─── */}
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

      {/* ─── TOAST ─── */}
      {toastMessage && <div className={`app-toast ${toastType}`}>{toastMessage}</div>}
    </div>
  )
}
