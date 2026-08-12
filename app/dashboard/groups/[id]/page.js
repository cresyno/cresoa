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

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (isNaN(date.getTime())) return '—'
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

  const [showMemberModal, setShowMemberModal] = useState(false)
  const [editingMemberId, setEditingMemberId] = useState(null)
  const [memberForm, setMemberForm] = useState(EMPTY_MEMBER)

  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentMemberId, setPaymentMemberId] = useState(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNote, setPaymentNote] = useState('')
  const [paymentsList, setPaymentsList] = useState([])

  const [showMemberDetailModal, setShowMemberDetailModal] = useState(false)
  const [detailMember, setDetailMember] = useState(null)
  const [detailMemberPayments, setDetailMemberPayments] = useState([])

  const [showMeasurementViewModal, setShowMeasurementViewModal] = useState(false)
  const [showMeasurementEditModal, setShowMeasurementEditModal] = useState(false)
  const [measurementMember, setMeasurementMember] = useState(null)
  const [tempMeasurements, setTempMeasurements] = useState({})

  const requestedBusinessId = searchParams.get('business_id')

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
        supabase.from('group_orders').select('*').eq('id', groupId).eq('business_id', bizId).single(),
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

  const stats = useMemo(() => {
    const total = members.reduce((sum, m) => sum + Number(m.price || 0), 0)
    const paid = members.reduce((sum, m) => sum + Number(m.amount_paid || 0), 0)
    const delivered = members.filter(m => m.current_status === 'Delivered').length
    const ready = members.filter(m => m.current_status === 'Ready').length
    const notStarted = members.filter(m => m.current_status === 'Order placed').length
    const balance = Math.max(total - paid, 0)
    const membersWithBalance = members.filter(m => (Number(m.price || 0) - Number(m.amount_paid || 0)) > 0).length
    return {
      count: members.length,
      total,
      paid,
      balance,
      delivered,
      ready,
      notStarted,
      membersWithBalance,
      progress: members.length ? Math.round((delivered / members.length) * 100) : 0,
    }
  }, [members])

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

  const closeMemberModal = () => {
    if (!saving) { setShowMemberModal(false); setEditingMemberId(null); setMemberForm(EMPTY_MEMBER) }
  }

  const openAddMember = () => {
    setError(''); setEditingMemberId(null); setMemberForm({ ...EMPTY_MEMBER, measurements: {} }); setShowMemberModal(true)
  }

  const openEditMember = (member) => {
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
    setShowMemberModal(true)
  }

  const handleMemberChange = (event) => {
    const { name, value } = event.target
    setMemberForm(prev => ({ ...prev, [name]: value }))
    if (name === 'customer_id' && value) {
      const customer = customers.find(item => item.id === value)
      if (customer) {
        setMemberForm(prev => ({
          ...prev,
          customer_id: value,
          customer_name: customerLabel(customer),
          phone: customer.phone || '',
        }))
      }
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
      const fallbackPayload = { business_id: businessId, first_name, last_name: last_name || null, phone: phone || null }
      const { data: fallback, error: fallbackError } = await supabase.from('customers').insert(fallbackPayload).select('id').single()
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
        measurements: memberForm.measurements && Object.keys(memberForm.measurements).length > 0 ? memberForm.measurements : null,
      }
      if (editingMemberId) {
        delete payload.current_status
        const { error: updateError } = await supabase.from('orders').update(payload).eq('id', editingMemberId).eq('business_id', businessId).eq('group_order_id', groupId)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase.from('orders').insert(payload)
        if (insertError) throw insertError
      }
      closeMemberModal()
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

  const fetchPayments = async (orderId) => {
    const { data, error } = await supabase.from('payment_records').select('*').eq('order_id', orderId).order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }

  const openPaymentModal = async (memberId) => {
    const member = members.find(m => m.id === memberId)
    if (!member) return
    const balance = Number(member.price || 0) - Number(member.amount_paid || 0)
    if (balance <= 0) { alert('This order is fully paid.'); return }
    setPaymentMemberId(memberId)
    setPaymentAmount('')
    setPaymentNote('')
    try {
      const payments = await fetchPayments(memberId)
      setPaymentsList(payments)
    } catch (e) { console.error(e); setPaymentsList([]) }
    setShowPaymentModal(true)
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
        body: JSON.stringify({ amount, note: paymentNote || 'Group member payment' }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to record payment')
      setPaymentAmount('')
      setPaymentNote('')
      await loadData()
      const updatedPayments = await fetchPayments(paymentMemberId)
      setPaymentsList(updatedPayments)
    } catch (err) {
      console.error('Payment error:', err)
      alert(err.message || 'Could not record payment.')
    }
  }

  const openMemberDetail = async (member) => {
    setDetailMember(member)
    try {
      const payments = await fetchPayments(member.id)
      setDetailMemberPayments(payments)
    } catch (e) { console.error(e); setDetailMemberPayments([]) }
    setShowMemberDetailModal(true)
  }

  const sendMemberStatusUpdate = (member) => {
    const customerPhone = member.customer?.phone
    if (!customerPhone) {
      alert('Member phone number not available.')
      return
    }
    const name = customerLabel(member.customer) || 'Customer'
    const status = member.current_status || 'Order placed'
    const price = Number(member.price || 0)
    const paid = Number(member.amount_paid || 0)
    const balance = price - paid
    const message = `Hi ${name},\n\nThis is an update from ${businessName}.\nYour order "${member.title || 'Order'}" is currently: ${status}.\nOutstanding balance: ${balance > 0 ? money(balance) : 'Paid in full'}.\n\nFor any questions, contact ${coordinatorName}.`
    const url = `https://wa.me/${customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  const openMeasurementView = (member) => {
    setMeasurementMember(member)
    setShowMeasurementViewModal(true)
  }

  const openMeasurementEdit = (member) => {
    setMeasurementMember(member)
    setTempMeasurements(member.measurements || {})
    setShowMeasurementEditModal(true)
  }

  const saveMeasurements = async () => {
    if (!measurementMember) return
    setSaving(true)
    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ measurements: tempMeasurements && Object.keys(tempMeasurements).length > 0 ? tempMeasurements : null })
        .eq('id', measurementMember.id)
        .eq('business_id', businessId)
      if (updateError) throw updateError
      await loadData()
      setShowMeasurementEditModal(false)
      setMeasurementMember(null)
    } catch (err) {
      console.error('Save measurements error:', err)
      alert('Could not save measurements.')
    } finally { setSaving(false) }
  }

  if (loading) { /* loading skeleton */ return <div>Loading...</div> } // Simplified for brevity
  if (error && !group) { /* error state */ return <div>Error</div> }
  if (!group) return null

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
              {group.due_date && ` · Due ${formatDate(group.due_date)}`} · {members.length} members
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

      {/* Dark Summary Bar */}
      <div style={{ background: 'linear-gradient(135deg, #0F2B4A, #1A3F66)', color: '#fff', borderRadius: '16px', padding: '1.2rem 1.5rem', marginBottom: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: '1rem', boxShadow: '0 8px 24px rgba(15,43,74,0.15)' }}>
        <div>
          <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7 }}>Total</div>
          <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{money(stats.total)}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7 }}>Paid</div>
          <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#72C49C' }}>{money(stats.paid)}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7 }}>Balance</div>
          <div style={{ fontWeight: 700, fontSize: '1.2rem', color: stats.balance > 0 ? '#EF7771' : '#72C49C' }}>{stats.balance > 0 ? money(stats.balance) : '✓ Paid'}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7 }}>Progress</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ flex: 1, height: '6px', borderRadius: '99px', background: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 'inherit', background: 'var(--cresoa-accent)', width: `${stats.progress}%`, transition: 'width 0.3s' }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>{stats.progress}%</span>
          </div>
          <div style={{ fontSize: '0.6rem', opacity: 0.7, marginTop: '0.2rem' }}>{stats.delivered} of {stats.count} delivered</div>
        </div>
      </div>

      {/* Pending Actions & Coordinator Update */}
      <Card style={{ padding: '0.8rem 1rem', marginBottom: '1rem', background: stats.balance > 0 || stats.notStarted > 0 ? 'rgba(212,165,42,0.06)' : 'var(--cresoa-surface)', borderColor: stats.balance > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>📋 Pending Actions</div>
            <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--cresoa-text-muted)', marginTop: '0.2rem' }}>
              {stats.membersWithBalance > 0 && <span style={{ color: 'var(--cresoa-danger)' }}>⚠ {stats.membersWithBalance} member{stats.membersWithBalance > 1 ? 's' : ''} ha{stats.membersWithBalance > 1 ? 've' : 's'} outstanding balance{stats.membersWithBalance > 1 ? 's' : ''}</span>}
              {stats.notStarted > 0 && <span>⏳ {stats.notStarted} member{stats.notStarted > 1 ? 's' : ''} not yet started</span>}
              {stats.membersWithBalance === 0 && stats.notStarted === 0 && <span>✅ All members are on track!</span>}
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

      {/* Members Section */}
      <SectionHeader title={`Members (${members.length})`} action={canManage ? 'Add member' : ''} onAction={canManage ? openAddMember : null} />

      {members.length === 0 ? (
        <Card style={{ padding: '3rem 1rem', textAlign: 'center' }}>
          <Icon name="users" size={32} stroke="var(--cresoa-text-muted)" />
          <h3 style={{ margin: '0.5rem 0' }}>No members yet</h3>
          <p style={{ color: 'var(--cresoa-text-muted)' }}>Add the first person in this group to start tracking their order.</p>
          {canManage && <button onClick={openAddMember} className="cresoa-primary-button" style={{ marginTop: '0.5rem' }}>Add first member</button>}
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: '0.8rem' }}>
          {members.map((member) => {
            const total = Number(member.price || 0)
            const paid = Number(member.amount_paid || 0)
            const balance = Math.max(total - paid, 0)
            const status = member.current_status || 'Order placed'
            const name = customerLabel(member.customer)

            return (
              <Card key={member.id} style={{ padding: '1rem', borderLeft: `4px solid ${balance > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-success)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '1rem' }}>{name}</strong>
                      <StatusPill status={status} />
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--cresoa-text-muted)', marginTop: '0.2rem' }}>
                      {member.title || 'Untitled'} · {member.customer?.phone || 'No phone'}
                    </div>
                    <div style={{ fontSize: '0.8rem', marginTop: '0.3rem', display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                      <span><strong>Total:</strong> {money(total)}</span>
                      <span><strong>Paid:</strong> {money(paid)}</span>
                      <span style={{ color: balance > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-success)' }}>
                        <strong>Balance:</strong> {balance > 0 ? money(balance) : 'Paid'}
                      </span>
                      <span>{member.due_date ? `Due: ${formatDate(member.due_date)}` : ''}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button onClick={() => openMemberDetail(member)} title="View" style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.7rem' }}>
                      View
                    </button>
                    <button onClick={() => openPaymentModal(member.id)} title="Payment" style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--cresoa-success)', background: 'transparent', cursor: 'pointer', color: 'var(--cresoa-success)' }}>
                      <Icon name="dollar-sign" size={14} stroke="currentColor" />
                    </button>
                    {canManage && (
                      <>
                        <button onClick={() => openEditMember(member)} title="Edit" style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}>
                          <Icon name="edit-2" size={14} stroke="currentColor" />
                        </button>
                        <button onClick={() => openMeasurementView(member)} title="Measurements" style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--cresoa-accent)', background: 'transparent', cursor: 'pointer', color: 'var(--cresoa-accent)' }}>
                          <Icon name="ruler" size={14} stroke="currentColor" />
                        </button>
                        <button onClick={() => handleDeleteMember(member.id)} title="Remove" style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--cresoa-danger)', background: 'transparent', cursor: 'pointer', color: 'var(--cresoa-danger)' }}>
                          <Icon name="trash-2" size={14} stroke="currentColor" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={businessId} />
      </div>

      {/* ─── Add/Edit Member Modal ────────────────────────── */}
      {showMemberModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(10,22,40,0.5)' }} onMouseDown={closeMemberModal}>
          <div style={{ width: '100%', maxWidth: '600px', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', padding: '20px', background: 'var(--cresoa-surface)', borderRadius: '16px', boxShadow: 'var(--shadow-lg)' }} onMouseDown={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div>
                <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Group Member</span>
                <h2 style={{ margin: '0.2rem 0 0', fontSize: '1.3rem' }}>{editingMemberId ? 'Edit member' : 'Add member'}</h2>
                <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>Create or update the individual order.</p>
              </div>
              <button onClick={closeMemberModal} disabled={saving} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}>
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
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.2rem' }}>Measurements</label>
                  <MeasurementForm
                    measurements={memberForm.measurements || {}}
                    onChange={(updated) => setMemberForm(prev => ({ ...prev, measurements: updated }))}
                  />
                </div>
              </div>

              {error && <p style={{ color: 'var(--cresoa-danger)', fontSize: '0.8rem', margin: '0.5rem 0 0' }}>{error}</p>}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--cresoa-border)' }}>
                <button type="button" onClick={closeMemberModal} disabled={saving} style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
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
          <div style={{ width: '100%', maxWidth: '500px', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', padding: '20px', background: 'var(--cresoa-surface)', borderRadius: '16px', boxShadow: 'var(--shadow-lg)' }} onMouseDown={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Payments</h2>
              <button onClick={() => setShowPaymentModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}>
                <Icon name="x" size={20} stroke="currentColor" />
              </button>
            </div>

            {paymentsList.length === 0 ? (
              <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem' }}>No payments recorded yet.</p>
            ) : (
              <div style={{ marginBottom: '1rem' }}>
                {paymentsList.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', borderBottom: '1px solid var(--cresoa-border)' }}>
                    <span>{money(p.amount)}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--cresoa-text-muted)' }}>{formatDate(p.created_at)} {p.note ? `· ${p.note}` : ''}</span>
                  </div>
                ))}
              </div>
            )}

    <form onSubmit={handleRecordPayment}>
              <div style={{ marginBottom: '0.8rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.2rem' }}>Amount (₦)</label>
                <input type="number" min="1" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="Enter amount" required autoFocus style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)' }} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.2rem' }}>Note (optional)</label>
                <input type="text" value={paymentNote} onChange={e => setPaymentNote(e.target.value)} placeholder="Payment note..." style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setShowPaymentModal(false)} style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
                <button type="submit" className="cresoa-primary-button" style={{ padding: '0.4rem 1.5rem', fontSize: '0.8rem' }}>Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Member Detail Modal ───────────────────────────── */}
      {showMemberDetailModal && detailMember && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(10,22,40,0.5)' }} onMouseDown={() => setShowMemberDetailModal(false)}>
          <div style={{ width: '100%', maxWidth: '550px', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', padding: '20px', background: 'var(--cresoa-surface)', borderRadius: '16px', boxShadow: 'var(--shadow-lg)' }} onMouseDown={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', margin: 0 }}>{customerLabel(detailMember.customer)}</h2>
                <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>{detailMember.title || 'Untitled'} · <StatusPill status={detailMember.current_status || 'Order placed'} /></p>
              </div>
              <button onClick={() => setShowMemberDetailModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}>
                <Icon name="x" size={20} stroke="currentColor" />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ background: 'var(--cresoa-bg)', padding: '0.5rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase' }}>Total</div>
                <div style={{ fontWeight: 700 }}>{money(detailMember.price)}</div>
              </div>
              <div style={{ background: 'var(--cresoa-bg)', padding: '0.5rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase' }}>Paid</div>
                <div style={{ fontWeight: 700, color: 'var(--cresoa-success)' }}>{money(detailMember.amount_paid)}</div>
              </div>
              <div style={{ background: 'var(--cresoa-bg)', padding: '0.5rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase' }}>Balance</div>
                <div style={{ fontWeight: 700, color: (detailMember.price - detailMember.amount_paid) > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-success)' }}>
                  {(detailMember.price - detailMember.amount_paid) > 0 ? money(detailMember.price - detailMember.amount_paid) : 'Paid'}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <strong style={{ fontSize: '0.85rem' }}>Payments</strong>
              {detailMemberPayments.length === 0 ? (
                <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.8rem' }}>No payments recorded.</p>
              ) : (
                <div>
                  {detailMemberPayments.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', borderBottom: '1px solid var(--cresoa-border)', fontSize: '0.8rem' }}>
                      <span>{money(p.amount)}</span>
                      <span style={{ color: 'var(--cresoa-text-muted)' }}>{formatDate(p.created_at)} {p.note || ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--cresoa-border)' }}>
              <button onClick={() => sendMemberStatusUpdate(detailMember)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-success)', background: 'transparent', cursor: 'pointer', color: 'var(--cresoa-success)' }}>
                <Icon name="send" size={14} stroke="currentColor" /> Send Update
              </button>
              <button onClick={() => { setShowMemberDetailModal(false); openPaymentModal(detailMember.id) }} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-accent)', background: 'transparent', cursor: 'pointer', color: 'var(--cresoa-accent)' }}>
                <Icon name="dollar-sign" size={14} stroke="currentColor" /> Record Payment
              </button>
              <button onClick={() => { setShowMemberDetailModal(false); openMeasurementView(detailMember) }} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-accent)', background: 'transparent', cursor: 'pointer', color: 'var(--cresoa-accent)' }}>
                <Icon name="ruler" size={14} stroke="currentColor" /> Measurements
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Measurement View Modal ────────────────────────── */}
      {showMeasurementViewModal && measurementMember && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(10,22,40,0.5)' }} onMouseDown={() => setShowMeasurementViewModal(false)}>
          <div style={{ width: '100%', maxWidth: '600px', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', padding: '20px', background: 'var(--cresoa-surface)', borderRadius: '16px', boxShadow: 'var(--shadow-lg)' }} onMouseDown={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Measurements – {customerLabel(measurementMember.customer)}</h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => { setShowMeasurementViewModal(false); openMeasurementEdit(measurementMember) }} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.8rem', borderRadius: '6px', border: '1px solid var(--cresoa-accent)', background: 'transparent', cursor: 'pointer', color: 'var(--cresoa-accent)' }}>
                  <Icon name="edit-2" size={14} stroke="currentColor" /> Edit
                </button>
                <button onClick={() => setShowMeasurementViewModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}>
                  <Icon name="x" size={20} stroke="currentColor" />
                </button>
              </div>
            </div>
            <MeasurementForm
              measurements={measurementMember.measurements || {}}
              readOnly
            />
          </div>
        </div>
      )}

      {/* ─── Measurement Edit Modal ────────────────────────── */}
      {showMeasurementEditModal && measurementMember && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(10,22,40,0.5)' }} onMouseDown={() => { if (!saving) setShowMeasurementEditModal(false) }}>
          <div style={{ width: '100%', maxWidth: '600px', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', padding: '20px', background: 'var(--cresoa-surface)', borderRadius: '16px', boxShadow: 'var(--shadow-lg)' }} onMouseDown={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Edit Measurements – {customerLabel(measurementMember.customer)}</h2>
              <button onClick={() => setShowMeasurementEditModal(false)} disabled={saving} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}>
                <Icon name="x" size={20} stroke="currentColor" />
              </button>
            </div>
            <MeasurementForm
              measurements={tempMeasurements}
              onChange={setTempMeasurements}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--cresoa-border)' }}>
              <button onClick={() => setShowMeasurementEditModal(false)} disabled={saving} style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
              <button onClick={saveMeasurements} disabled={saving} className="cresoa-primary-button" style={{ padding: '0.4rem 1.5rem', fontSize: '0.8rem' }}>
                {saving ? 'Saving...' : 'Save measurements'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
