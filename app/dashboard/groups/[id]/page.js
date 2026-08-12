'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../../lib/getBusinessId'
import { Icon } from '../../../../components/Icon'
import { Card } from '../../../../components/Card'
import { SectionHeader } from '../../../../components/SectionHeader'
import { StatusPill } from '../../../../components/StatusPill'
import { Navigation } from '../../../../components/Navigation'
import { isFeatureAvailable, getPlanLimits } from '../../../../lib/planLimits'
import '../../../../globals.css'

const EMPTY_MEMBER = {
  customer_id: '',
  customer_name: '',
  phone: '',
  item: '',
  price: '',
  deposit: '',
  measurements: '',
  due_date: '',
}

const STATUS_OPTIONS = ['Order placed', 'Cutting', 'Sewing', 'Ready', 'Delivered']

function splitName(fullName) {
  const value = String(fullName || '').trim()
  const parts = value.split(/\s+/).filter(Boolean)
  return { first_name: parts[0] || '', last_name: parts.slice(1).join(' ') || null }
}

function money(value) {
  const amount = Number(value || 0)
  return `₦${amount.toLocaleString('en-NG')}`
}

function getStatusInfo(status) {
  const map = {
    'Order placed': { label: 'Placed', className: 'placed' },
    Cutting: { label: 'Cutting', className: 'cutting' },
    Sewing: { label: 'Sewing', className: 'sewing' },
    Ready: { label: 'Ready', className: 'ready' },
    Delivered: { label: 'Delivered', className: 'delivered' },
  }
  return map[status] || { label: status || 'Placed', className: 'placed' }
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

  const [showMemberModal, setShowMemberModal] = useState(false)
  const [editingMemberId, setEditingMemberId] = useState(null)
  const [memberForm, setMemberForm] = useState(EMPTY_MEMBER)

  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentMemberId, setPaymentMemberId] = useState(null)
  const [paymentAmount, setPaymentAmount] = useState('')

  const requestedBusinessId = searchParams.get('business_id')

  // ─── Load Data ────────────────────────────────────────────
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
        supabase.from('businesses').select('id, plan, sector').eq('id', bizId).single(),
        supabase.from('group_orders').select('*').eq('id', groupId).eq('business_id', bizId).single(),
      ])

      if (bizError) throw bizError
      if (groupError) throw groupError

      const plan = bizData?.plan || 'free'
      setBusinessPlan(plan)
      setCanManage(isFeatureAvailable(plan, 'groups'))

      const limits = getPlanLimits(plan)
      setMaxMembers(limits?.maxGroupMembers || 0)
      setGroup(groupData)

      const [{ data: memberData, error: memberError }, { data: customerData, error: customerError }] = await Promise.all([
        supabase
          .from('orders')
          .select(`*, customer:customer_id (id, name, first_name, last_name, phone)`)
          .eq('group_order_id', groupId)
          .eq('business_id', bizId)
          .order('created_at', { ascending: false }),
        supabase.from('customers').select('id, name, first_name, last_name, phone').eq('business_id', bizId).order('first_name', { ascending: true }),
      ])

      if (memberError) throw memberError
      if (customerError) console.warn('Customer list warning:', customerError)

      setMembers(memberData || [])
      setCustomers(customerData || [])
    } catch (err) {
      console.error('Error loading group:', err)
      setError(err?.message || 'Failed to load group details.')
    } finally {
      setLoading(false)
    }
  }, [groupId, requestedBusinessId, router])

  useEffect(() => { loadData() }, [loadData])

  // ─── Stats ────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = members.reduce((sum, m) => sum + Number(m.price || 0), 0)
    const paid = members.reduce((sum, m) => sum + Number(m.amount_paid || 0), 0)
    const delivered = members.filter(m => m.current_status === 'Delivered').length
    const ready = members.filter(m => m.current_status === 'Ready').length
    const notStarted = members.filter(m => m.current_status === 'Order placed').length
    const balance = Math.max(total - paid, 0)
    return { count: members.length, total, paid, balance, delivered, ready, notStarted, progress: members.length ? Math.round((delivered / members.length) * 100) : 0 }
  }, [members])

  // ─── Coordinator WhatsApp ──────────────────────────────────
  const coordinatorName = group?.coordinator?.name || group?.coordinator_name || 'Coordinator'
  const coordinatorPhone = group?.coordinator?.phone

  const getGroupSummaryMessage = () => {
    const deliveredCount = stats.delivered
    const totalCount = stats.count
    const pendingCount = totalCount - deliveredCount
    const balanceAmount = stats.balance

    let message = `📋 *Group Order Update*\n\n`
    message += `👥 *${group?.group_name}*\n`
    message += `👤 Coordinator: ${coordinatorName}\n\n`
    message += `📦 *${deliveredCount} of ${totalCount}* orders delivered\n`
    if (pendingCount > 0) message += `⏳ ${pendingCount} orders still pending\n`
    if (balanceAmount > 0) message += `💰 *${money(balanceAmount)}* outstanding balance\n\n`
    message += `📊 *Member Status:*\n`

    members.forEach(m => {
      const name = customerLabel(m.customer) || 'Unknown'
      const status = m.current_status || 'Order placed'
      const price = Number(m.price || 0)
      const paid = Number(m.amount_paid || 0)
      const balance = price - paid
      message += `- ${name}: ${status}${balance > 0 ? ` (${money(balance)} due)` : ''}\n`
    })

    return message
  }

  const sendCoordinatorUpdate = () => {
    if (!coordinatorPhone) {
      alert('Coordinator phone number not available.')
      return
    }
    const message = getGroupSummaryMessage()
    const url = `https://wa.me/${coordinatorPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  // ─── Member CRUD ──────────────────────────────────────────
  const closeModal = () => {
    if (!saving) { setShowMemberModal(false); setEditingMemberId(null); setMemberForm(EMPTY_MEMBER) }
  }

  const openAddMember = () => { setError(''); setEditingMemberId(null); setMemberForm(EMPTY_MEMBER); setShowMemberModal(true) }
  const openEditMember = (member) => {
    setError(''); setEditingMemberId(member.id)
    setMemberForm({
      customer_id: member.customer_id || '',
      customer_name: customerLabel(member.customer),
      phone: member.customer?.phone || '',
      item: member.title || '',
      price: String(member.price ?? ''),
      deposit: String(member.amount_paid ?? ''),
      measurements: member.measurements?.notes || '',
      due_date: member.due_date || '',
    })
    setShowMemberModal(true)
  }

  const openPaymentModal = (memberId) => {
    const member = members.find(m => m.id === memberId)
    if (!member) return
    const balance = Number(member.price || 0) - Number(member.amount_paid || 0)
    if (balance <= 0) { alert('This order is fully paid.'); return }
    setPaymentMemberId(memberId)
    setPaymentAmount('')
    setShowPaymentModal(true)
  }

  const handleMemberChange = (event) => {
    const { name, value } = event.target
    setMemberForm(prev => ({ ...prev, [name]: value }))
    if (name === 'customer_id' && value) {
      const customer = customers.find(item => item.id === value)
      if (customer) setMemberForm(prev => ({ ...prev, customer_id: value, customer_name: customerLabel(customer), phone: customer.phone || '' }))
    }
  }

  const findOrCreateCustomer = async () => {
    const name = memberForm.customer_name.trim()
    const phone = memberForm.phone.trim()
    if (!name) throw new Error('Customer name is required.')
    if (memberForm.customer_id) return memberForm.customer_id

    if (phone) {
      const { data: byPhone, error: phoneError } = await supabase.from('customers').select('id').eq('business_id', businessId).eq('phone', phone).maybeSingle()
      if (phoneError) throw phoneError
      if (byPhone) return byPhone.id
    }

    const { first_name, last_name } = splitName(name)
    let query = supabase.from('customers').select('id').eq('business_id', businessId).eq('first_name', first_name)
    if (last_name) query = query.eq('last_name', last_name)
    const { data: existing, error: existingError } = await query.maybeSingle()
    if (existingError) throw existingError
    if (existing) return existing.id

    const payload = { business_id: businessId, first_name, last_name: last_name || null, phone: phone || null, name }
    const { data: created, error: createError } = await supabase.from('customers').insert(payload).select('id').single()
    if (createError) {
      const { data: fallback, error: fallbackError } = await supabase.from('customers').insert({ business_id: businessId, first_name, last_name: last_name || null, phone: phone || null }).select('id').single()
      if (fallbackError) throw fallbackError
      if (!fallback?.id) throw new Error('Customer was created but no ID returned.')
      return fallback.id
    }
    if (!created?.id) throw new Error('Customer was created but no ID returned.')
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
        measurements: memberForm.measurements.trim() ? { notes: memberForm.measurements.trim() } : null,
      }
      if (editingMemberId) {
        delete payload.current_status
        const { error: updateError } = await supabase.from('orders').update(payload).eq('id', editingMemberId).eq('business_id', businessId).eq('group_order_id', groupId)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase.from('orders').insert(payload)
        if (insertError) throw insertError
      }
      closeModal()
      await loadData()
    } catch (err) {
      console.error('Save group member error:', err)
      setError(err?.message || 'Failed to save group member.')
    } finally { setSaving(false) }
  }

  const handleDeleteMember = async (orderId) => {
    if (!canManage) return
    if (!window.confirm('Remove this member from the group?')) return
    setError('')
    try {
      const { error: updateError } = await supabase.from('orders').update({ group_order_id: null }).eq('id', orderId).eq('business_id', businessId).eq('group_order_id', groupId)
      if (updateError) throw updateError
      await loadData()
    } catch (err) {
      console.error('Remove member error:', err)
      setError(err?.message || 'Failed to remove member.')
    }
  }

  const handleStatusChange = async (orderId, status) => {
    if (!canManage) return
    const { error: updateError } = await supabase.from('orders').update({ current_status: status }).eq('id', orderId).eq('business_id', businessId).eq('group_order_id', groupId)
    if (updateError) { setError(updateError.message || 'Failed to update status.'); return }
    setMembers(prev => prev.map(m => m.id === orderId ? { ...m, current_status: status } : m))
  }

  const handleRecordPayment = async (event) => {
    event.preventDefault()
    const amount = parseFloat(paymentAmount)
    if (!amount || amount <= 0) { alert('Enter a valid amount.'); return }
    const member = members.find(m => m.id === paymentMemberId)
    if (!member) return
    const balance = Number(member.price || 0) - Number(member.amount_paid || 0)
    if (amount > balance) { alert(`Amount exceeds balance of ${money(balance)}.`); return }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const response = await fetch(`/api/orders/${paymentMemberId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ amount, note: 'Group member payment' }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to record payment')
      setShowPaymentModal(false)
      setPaymentMemberId(null)
      setPaymentAmount('')
      await loadData()
    } catch (err) {
      console.error('Payment error:', err)
      alert(err.message || 'Could not record payment.')
    }
  }

  // ─── Loading / Error ──────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ width: '140px', height: '24px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
          <div style={{ width: '100px', height: '32px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: '0.8rem', marginBottom: '1rem' }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ background: 'var(--cresoa-surface)', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', animation: 'pulse 1.5s infinite' }}>
              <div style={{ width: '40%', height: '12px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
              <div style={{ width: '60%', height: '20px', background: 'var(--cresoa-border)', borderRadius: '6px', marginTop: '0.3rem' }} />
            </div>
          ))}
        </div>
        <div style={{ background: 'var(--cresoa-surface)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--cresoa-border)', animation: 'pulse 1.5s infinite', height: '200px' }} />
        <style>{`@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }`}</style>
        <Navigation businessId={businessId} />
      </div>
    )
  }

  if (error && !group) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
        <Card style={{ padding: '2rem', textAlign: 'center' }}>
          <Icon name="alert-circle" size={32} stroke="var(--cresoa-danger)" />
          <h2 style={{ margin: '0.5rem 0' }}>Unable to load group</h2>
          <p style={{ color: 'var(--cresoa-text-muted)' }}>{error}</p>
          <button onClick={loadData} className="cresoa-primary-button" style={{ marginTop: '1rem' }}>Try again</button>
        </Card>
        <Navigation businessId={businessId} />
      </div>
    )
  }

  if (!group) return null

  // ─── Main Render ──────────────────────────────────────────
  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
      <Navigation businessId={businessId} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', border: '1px solid var(--cresoa-border)', borderRadius: '10px', background: 'var(--cresoa-surface)', cursor: 'pointer', color: 'var(--cresoa-text)' }}>
            <Icon name="arrow-left" size={17} stroke="currentColor" />
          </button>
          <div>
            <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Group Order</p>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0.2rem 0', color: 'var(--cresoa-text)' }}>{group.group_name}</h1>
            <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', margin: 0 }}>
              Coordinator: <strong>{coordinatorName}</strong>
              {group.due_date && ` · Due ${new Date(group.due_date).toLocaleDateString('en-GB')}`}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {canManage && (
            <button onClick={openAddMember} className="cresoa-primary-button">
              <Icon name="plus" size={14} stroke="#fff" style={{ marginRight: '0.3rem' }} /> Add member
            </button>
          )}
          <button onClick={() => router.push(`/dashboard/groups/${groupId}/edit?business_id=${businessId}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
            <Icon name="edit-2" size={14} stroke="currentColor" /> Edit group
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.6rem 1rem', marginBottom: '0.8rem', borderRadius: '8px', background: 'var(--cresoa-danger-soft)', color: 'var(--cresoa-danger)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
        </div>
      )}

           {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
        <Card style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Total</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{money(stats.total)}</div>
        </Card>
        <Card style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Paid</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--cresoa-success)' }}>{money(stats.paid)}</div>
        </Card>
        <Card style={{ padding: '0.6rem 0.8rem', textAlign: 'center', borderColor: stats.balance > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-success)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Balance</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: stats.balance > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-success)' }}>
            {stats.balance > 0 ? money(stats.balance) : '✓ Paid'}
          </div>
        </Card>
        <Card style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Progress</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <div style={{ flex: 1, height: '6px', borderRadius: '99px', background: 'var(--cresoa-bg)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 'inherit', background: 'var(--cresoa-success)', width: `${stats.progress}%`, transition: 'width 0.3s' }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{stats.progress}%</span>
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', marginTop: '0.2rem' }}>{stats.delivered} of {stats.count} delivered</div>
        </Card>
      </div>

      {/* Pending Actions & Coordinator Update */}
      <Card style={{ padding: '0.8rem 1rem', marginBottom: '1rem', background: 'rgba(212,165,42,0.06)', borderColor: 'var(--cresoa-accent)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>📋 Pending Actions</div>
            <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--cresoa-text-muted)', marginTop: '0.2rem' }}>
              {stats.balance > 0 && <span>⚠ {stats.count - stats.delivered} members have outstanding balances</span>}
              {stats.notStarted > 0 && <span>⏳ {stats.notStarted} members not yet started</span>}
              {stats.balance === 0 && stats.notStarted === 0 && <span>✅ All members are on track!</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {coordinatorPhone && (
              <button onClick={sendCoordinatorUpdate} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-success)', background: 'transparent', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: 'var(--cresoa-success)' }}>
                <Icon name="send" size={14} stroke="currentColor" /> Send update to coordinator
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Members Table */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '0.8rem 1rem', borderBottom: '1px solid var(--cresoa-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.95rem' }}>Members</h3>
            <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.75rem' }}>{members.length} members</span>
          </div>
          {canManage && (
            <button onClick={openAddMember} className="cresoa-primary-button" style={{ padding: '0.3rem 0.8rem', fontSize: '0.75rem' }}>
              <Icon name="plus" size={12} stroke="#fff" style={{ marginRight: '0.2rem' }} /> Add member
            </button>
          )}
        </div>

        {members.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
            <Icon name="users" size={32} stroke="var(--cresoa-text-muted)" />
            <h3 style={{ margin: '0.5rem 0' }}>No members yet</h3>
            <p style={{ color: 'var(--cresoa-text-muted)' }}>Add the first person in this group to start tracking their order.</p>
            {canManage && <button onClick={openAddMember} className="cresoa-primary-button" style={{ marginTop: '0.5rem' }}>Add first member</button>}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: '700px' }}>
              <thead>
                <tr style={{ background: 'var(--cresoa-bg)' }}>
                  <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Member</th>
                  <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Order</th>
                  <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Due</th>
                  <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Total</th>
                  <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Balance</th>
                  <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Status</th>
                  {canManage && <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const total = Number(member.price || 0)
                  const paid = Number(member.amount_paid || 0)
                  const balance = Math.max(total - paid, 0)
                  const status = getStatusInfo(member.current_status)
                  const name = customerLabel(member.customer)

                  return (
                    <tr key={member.id} style={{ borderTop: '1px solid var(--cresoa-border)' }}>
                      <td style={{ padding: '0.6rem 0.8rem' }}>
                        <div style={{ fontWeight: 600 }}>{name}</div>
                        {member.customer?.phone && <div style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.7rem' }}>{member.customer.phone}</div>}
                      </td>
                      <td style={{ padding: '0.6rem 0.8rem' }}>
                        <div>{member.title || 'Untitled'}</div>
                        {member.measurements?.notes && <div style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.7rem' }}>{member.measurements.notes}</div>}
                      </td>
                      <td style={{ padding: '0.6rem 0.8rem' }}>
                        {member.due_date ? new Date(member.due_date).toLocaleDateString('en-GB') : '—'}
                      </td>
                      <td style={{ padding: '0.6rem 0.8rem', fontWeight: 600 }}>{money(total)}</td>
                      <td style={{ padding: '0.6rem 0.8rem', color: balance > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-success)' }}>
                        {balance > 0 ? money(balance) : 'Paid'}
                      </td>
                      <td style={{ padding: '0.6rem 0.8rem' }}>
                        {canManage ? (
                          <select
                            value={member.current_status || 'Order placed'}
                            onChange={(e) => handleStatusChange(member.id, e.target.value)}
                            style={{ padding: '0.2rem 0.6rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', fontSize: '0.75rem', cursor: 'pointer' }}
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <StatusPill status={member.current_status || 'Order placed'} />
                        )}
                      </td>
                      {canManage && (
                        <td style={{ padding: '0.6rem 0.8rem' }}>
                          <div style={{ display: 'flex', gap: '0.3rem' }}>
                            <button onClick={() => openPaymentModal(member.id)} title="Record payment" style={{ padding: '0.2rem 0.4rem', borderRadius: '4px', border: '1px solid var(--cresoa-success)', background: 'transparent', cursor: 'pointer', color: 'var(--cresoa-success)' }}>
                              <Icon name="dollar-sign" size={14} stroke="currentColor" />
                            </button>
                            <button onClick={() => openEditMember(member)} title="Edit member" style={{ padding: '0.2rem 0.4rem', borderRadius: '4px', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}>
                              <Icon name="edit-2" size={14} stroke="currentColor" />
                            </button>
                            <button onClick={() => handleDeleteMember(member.id)} title="Remove member" style={{ padding: '0.2rem 0.4rem', borderRadius: '4px', border: '1px solid var(--cresoa-danger)', background: 'transparent', cursor: 'pointer', color: 'var(--cresoa-danger)' }}>
                              <Icon name="trash-2" size={14} stroke="currentColor" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={businessId} />
      </div>

      {/* ─── Add/Edit Member Modal ────────────────────────── */}
      {showMemberModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(10,22,40,0.5)' }} onMouseDown={closeModal}>
          <div style={{ width: '100%', maxWidth: '600px', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', padding: '20px', background: 'var(--cresoa-surface)', borderRadius: '16px', boxShadow: 'var(--shadow-lg)' }} onMouseDown={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div>
                <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Group Member</span>
                <h2 style={{ margin: '0.2rem 0 0', fontSize: '1.3rem' }}>{editingMemberId ? 'Edit member' : 'Add member'}</h2>
                <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>Create or update the individual order.</p>
              </div>
              <button onClick={closeModal} disabled={saving} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}>
                <Icon name="x" size={20} stroke="currentColor" />
              </button>
            </div>

            <form onSubmit={saveMember}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.2rem' }}>Existing customer</label>
                  <select name="customer_id" value={memberForm.customer_id} onChange={handleMemberChange} disabled={saving} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)' }}>
                    <option value="">New customer</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{customerLabel(c)}{c.phone ? ` · ${c.phone}` : ''}</option>)}
                  </select>
                  <small style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.7rem' }}>Select a customer to reuse their existing record, or leave as New customer.</small>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.2rem' }}>Customer name *</label>
                  <input name="customer_name" value={memberForm.customer_name} onChange={handleMemberChange} placeholder="e.g. Amaka Okafor" required disabled={saving || !!memberForm.customer_id} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.2rem' }}>Phone</label>
                  <input name="phone" value={memberForm.phone} onChange={handleMemberChange} placeholder="080..." disabled={saving || !!memberForm.customer_id} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)' }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.2rem' }}>Item / garment *</label>
                  <input name="item" value={memberForm.item} onChange={handleMemberChange} placeholder="e.g. Aso Ebi blouse and wrapper" required disabled={saving} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.2rem' }}>Price (₦) *</label>
                  <input type="number" min="0" step="0.01" name="price" value={memberForm.price} onChange={handleMemberChange} placeholder="0" required disabled={saving} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.2rem' }}>Deposit (₦)</label>
                  <input type="number" min="0" step="0.01" name="deposit" value={memberForm.deposit} onChange={handleMemberChange} placeholder="0" disabled={saving} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.2rem' }}>Due date</label>
                  <input type="date" name="due_date" value={memberForm.due_date} onChange={handleMemberChange} disabled={saving} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.2rem' }}>Measurements / fitting notes</label>
                  <input name="measurements" value={memberForm.measurements} onChange={handleMemberChange} placeholder="Optional" disabled={saving} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)' }} />
                </div>
              </div>

              {error && <p style={{ color: 'var(--cresoa-danger)', fontSize: '0.8rem', margin: '0.5rem 0 0' }}>{error}</p>}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--cresoa-border)' }}>
                <button type="button" onClick={closeModal} disabled={saving} style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
                <button type="submit" disabled={saving} className="cresoa-primary-button" style={{ padding: '0.4rem 1.5rem', fontSize: '0.8rem' }}>
                  {saving ? 'Saving...' : editingMemberId ? 'Save changes' : 'Add member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

     {/* ─── Payment Modal ──────────────────────────────────── */}
      {showPaymentModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(10,22,40,0.5)' }} onMouseDown={() => { if (!saving) setShowPaymentModal(false) }}>
          <form style={{ width: '100%', maxWidth: '400px', padding: '20px', background: 'var(--cresoa-surface)', borderRadius: '16px', boxShadow: 'var(--shadow-lg)' }} onSubmit={handleRecordPayment} onMouseDown={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Record Payment</h2>
              <button type="button" onClick={() => setShowPaymentModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}>
                <Icon name="x" size={20} stroke="currentColor" />
              </button>
            </div>
            <div style={{ marginBottom: '0.8rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.2rem' }}>Amount (₦)</label>
              <input type="number" min="1" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="Enter amount" required autoFocus style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" onClick={() => setShowPaymentModal(false)} style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
              <button type="submit" className="cresoa-primary-button" style={{ padding: '0.4rem 1.5rem', fontSize: '0.8rem' }}>Record</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
