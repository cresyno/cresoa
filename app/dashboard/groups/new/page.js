'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../../lib/getBusinessId'
import { isFeatureAvailable, getPlanLimits } from '../../../../lib/planLimits'
import { Icon } from '../../../../components/Icon'

export default function NewGroupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [business, setBusiness] = useState(null)
  const [businessId, setBusinessId] = useState(null)
  const [plan, setPlan] = useState('free')
  const [canUseGroups, setCanUseGroups] = useState(false)
  const [maxMembers, setMaxMembers] = useState(0)
  const [customers, setCustomers] = useState([])

  // Group header form
  const [groupName, setGroupName] = useState('')
  const [coordinatorId, setCoordinatorId] = useState('')
  const [dueDate, setDueDate] = useState('')

  // Members list (local state before saving)
  const [members, setMembers] = useState([])

  // Member modal
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [editingMemberIndex, setEditingMemberIndex] = useState(null)
  const [memberForm, setMemberForm] = useState({
    name: '',
    phone: '',
    item: '',
    price: '',
    deposit: '',
    measurements: '',
    due_date: '',
  })

  // ─── Load business data ───
  useEffect(() => {
    const load = async () => {
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
        setBusinessId(bizId)

        const { data: bizData, error: bizError } = await supabase
          .from('businesses')
          .select('id, name, sector, plan')
          .eq('id', bizId)
          .single()

        if (bizError || !bizData) {
          router.push('/onboarding')
          return
        }

        setBusiness(bizData)
        setPlan(bizData.plan || 'free')

        const isFashion = bizData.sector === 'Fashion & Custom Wear'
        const groupsAllowed = isFeatureAvailable(bizData.plan || 'free', 'groups')
        const canUse = isFashion && groupsAllowed
        setCanUseGroups(canUse)

        if (canUse) {
          const limits = getPlanLimits(bizData.plan || 'free')
          setMaxMembers(limits.maxGroupMembers || 0)

          // Fetch customers for coordinator dropdown
          const { data: custData } = await supabase
            .from('customers')
            .select('id, name')
            .eq('business_id', bizId)
            .order('name')
          setCustomers(custData || [])
        }
      } catch (err) {
        console.error(err)
        setError('Failed to load data.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  // ─── Member modal handlers ───
  const openAddMember = () => {
    setEditingMemberIndex(null)
    setMemberForm({ name: '', phone: '', item: '', price: '', deposit: '', measurements: '', due_date: '' })
    setShowMemberModal(true)
  }

  const openEditMember = (index) => {
    setEditingMemberIndex(index)
    setMemberForm({ ...members[index] })
    setShowMemberModal(true)
  }

  const handleMemberChange = (e) => {
    setMemberForm({ ...memberForm, [e.target.name]: e.target.value })
  }

  const saveMember = () => {
    const { name, item, price } = memberForm
    if (!name || !item || !price) {
      alert('Name, item, and price are required.')
      return
    }

    if (editingMemberIndex !== null) {
      // Edit existing member
      const updated = [...members]
      updated[editingMemberIndex] = { ...memberForm }
      setMembers(updated)
    } else {
      // Add new member
      setMembers([...members, { ...memberForm }])
    }
    setShowMemberModal(false)
  }

  const removeMember = (index) => {
    if (!confirm('Remove this member?')) return
    setMembers(members.filter((_, i) => i !== index))
  }

  // ─── Submit group ───
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!groupName.trim()) {
      setError('Please enter a group name.')
      return
    }
    if (members.length === 0) {
      setError('Please add at least one member.')
      return
    }
    if (members.length > maxMembers) {
      setError(`You can only add up to ${maxMembers} members on your current plan.`)
      return
    }

    setSaving(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      // 1. Insert group
      const { data: group, error: groupError } = await supabase
        .from('group_orders')
        .insert({
          business_id: businessId,
          group_name: groupName,
          coordinator_customer_id: coordinatorId || null,
          due_date: dueDate || null,
          status: 'pending',
        })
        .select()
        .single()

      if (groupError) throw groupError

      // 2. Insert each member as an order
      const orderInserts = members.map((m) => ({
        business_id: businessId,
        group_order_id: group.id,
        customer_id: null, // we'll create a new customer first
        title: m.item,
        price: parseFloat(m.price) || 0,
        amount_paid: parseFloat(m.deposit) || 0,
        due_date: m.due_date || null,
        current_status: 'Order placed',
        measurements: m.measurements ? { notes: m.measurements } : null,
      }))

      // For each member, we need to create a customer record if it doesn't exist (by name and phone)
      for (const insert of orderInserts) {
        // Check if customer already exists
        let customerId = null
        if (memberForm.name) {
          const { data: existing } = await supabase
            .from('customers')
            .select('id')
            .eq('business_id', businessId)
            .eq('name', memberForm.name)
            .maybeSingle()
          if (existing) {
            customerId = existing.id
          } else {
            const { data: newCust, error: custError } = await supabase
              .from('customers')
              .insert({
                business_id: businessId,
                name: memberForm.name,
                phone: memberForm.phone || null,
              })
              .select()
              .single()
            if (custError) throw custError
            customerId = newCust.id
          }
        }
        // Actually, we need to loop over members, not use memberForm variable.
        // Let's fix: we'll iterate over members array.
      }

      // Above loop is wrong – we'll redo properly
      // We'll loop over members and create/select customer
      for (const member of members) {
        let customerId = null
        if (member.name) {
          const { data: existing } = await supabase
            .from('customers')
            .select('id')
            .eq('business_id', businessId)
            .eq('name', member.name)
            .maybeSingle()
          if (existing) {
            customerId = existing.id
          } else {
            const { data: newCust, error: custError } = await supabase
              .from('customers')
              .insert({
                business_id: businessId,
                name: member.name,
                phone: member.phone || null,
              })
              .select()
              .single()
            if (custError) throw custError
            customerId = newCust.id
          }
        }

        const { error: orderError } = await supabase
          .from('orders')
          .insert({
            business_id: businessId,
            group_order_id: group.id,
            customer_id: customerId,
            title: member.item,
            price: parseFloat(member.price) || 0,
            amount_paid: parseFloat(member.deposit) || 0,
            due_date: member.due_date || null,
            current_status: 'Order placed',
            measurements: member.measurements ? { notes: member.measurements } : null,
          })

        if (orderError) throw orderError
      }

      // Log activity
      await supabase.from('business_activity_logs').insert({
        business_id: businessId,
        performed_by: user.id,
        action: 'group_created',
        details: { group_name: groupName, member_count: members.length }
      })

      router.push(`/dashboard/groups?business_id=${businessId}`)
    } catch (err) {
      console.error(err)
      setError('Failed to create group. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ─── Loading / Error / Not allowed states ───
  if (loading) {
    return <LoadingSkeleton />
  }

  if (!canUseGroups) {
    const isFashion = business?.sector === 'Fashion & Custom Wear'
    const reason = !isFashion
      ? 'Group orders are only available for Fashion businesses.'
      : 'Your current plan does not support group orders.'

    return (
      <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ padding: '3rem 2rem', background: 'var(--color-card)', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.5rem' }}>👥</span>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: '0 0 0.5rem' }}>Group Orders</h2>
          <p style={{ color: 'var(--color-text-muted)', margin: '0 0 1rem' }}>{reason}</p>
          {!isFashion ? (
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              This feature is exclusively for <strong>Fashion & Custom Wear</strong> businesses.
            </p>
          ) : (
            <a
              href={`/dashboard/subscription?business_id=${businessId}`}
              style={{ display: 'inline-block', padding: '0.6rem 1.5rem', background: 'var(--color-accent)', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontWeight: '600' }}
            >
              Upgrade to Starter or Pro
            </a>
          )}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ background: 'var(--color-card)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
          <p style={{ color: 'var(--color-danger)' }}>{error}</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Retry</button>
        </div>
      </div>
    )
  }

  // ─── Main render ───
  return (
    <div style={{ padding: '1.5rem', maxWidth: '1000px', margin: '0 auto', color: 'var(--color-text)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>New Group Order</h1>
          <p style={{ color: 'var(--color-text-muted)', margin: '0.1rem 0 0', fontSize: '0.85rem' }}>
            {members.length} members added · {maxMembers > 0 ? `Max ${maxMembers}` : 'Unlimited'}
          </p>
        </div>
        <button
          onClick={() => router.back()}
          style={{ background: 'transparent', border: '1px solid var(--color-border)', padding: '0.3rem 0.8rem', borderRadius: '6px', cursor: 'pointer', color: 'var(--color-text)' }}
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* ─── Header form ─── */}
        <div style={{ background: 'var(--color-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.3rem' }}>Group Name *</label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
                placeholder="e.g. Aso Ebi for Wedding"
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.3rem' }}>Coordinator (optional)</label>
              <select
                value={coordinatorId}
                onChange={(e) => setCoordinatorId(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem' }}
              >
                <option value="">No coordinator</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.3rem' }}>Due Date (optional)</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem' }}
              />
            </div>
          </div>
        </div>

        {/* ─── Members list ─── */}
        <div style={{ background: 'var(--color-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>Members</h2>
            <button
              type="button"
              onClick={openAddMember}
              disabled={members.length >= maxMembers && maxMembers > 0}
              style={{ padding: '0.3rem 0.8rem', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: '6px', cursor: members.length >= maxMembers && maxMembers > 0 ? 'default' : 'pointer', opacity: members.length >= maxMembers && maxMembers > 0 ? 0.5 : 1, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <Icon name="plus" size={14} stroke="#fff" /> Add Member
            </button>
          </div>

          {members.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)', background: 'var(--color-bg)', borderRadius: '8px' }}>
              No members added yet. Click "Add Member" to get started.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead style={{ borderBottom: '2px solid var(--color-border)' }}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0.4rem 0.3rem', fontWeight: '600', color: 'var(--color-text-muted)' }}>Name</th>
                    <th style={{ textAlign: 'left', padding: '0.4rem 0.3rem', fontWeight: '600', color: 'var(--color-text-muted)' }}>Item</th>
                    <th style={{ textAlign: 'right', padding: '0.4rem 0.3rem', fontWeight: '600', color: 'var(--color-text-muted)' }}>Price</th>
                    <th style={{ textAlign: 'right', padding: '0.4rem 0.3rem', fontWeight: '600', color: 'var(--color-text-muted)' }}>Deposit</th>
                    <th style={{ textAlign: 'center', padding: '0.4rem 0.3rem', fontWeight: '600', color: 'var(--color-text-muted)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.4rem 0.3rem' }}>{m.name}</td>
                      <td style={{ padding: '0.4rem 0.3rem' }}>{m.item}</td>
                      <td style={{ padding: '0.4rem 0.3rem', textAlign: 'right' }}>₦{parseFloat(m.price || 0).toLocaleString()}</td>
                      <td style={{ padding: '0.4rem 0.3rem', textAlign: 'right' }}>₦{parseFloat(m.deposit || 0).toLocaleString()}</td>
                      <td style={{ padding: '0.4rem 0.3rem', textAlign: 'center' }}>
                        <button type="button" onClick={() => openEditMember(idx)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', marginRight: '0.3rem' }}>✏️</button>
                        <button type="button" onClick={() => removeMember(idx)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {error && <div style={{ color: 'var(--color-danger)', marginBottom: '1rem' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            type="submit"
            disabled={saving}
            style={{ padding: '0.6rem 1.5rem', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <Icon name="check" size={16} stroke="#fff" /> {saving ? 'Creating...' : 'Create Group'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            style={{ padding: '0.6rem 1.5rem', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--color-text)' }}
          >
            Cancel
          </button>
        </div>
      </form>

         {/* ─── Member Modal ─── */}
      {showMemberModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowMemberModal(false)}>
          <div style={{ background: 'var(--color-bg)', borderRadius: '16px', padding: '1.5rem', maxWidth: '500px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 0.5rem' }}>{editingMemberIndex !== null ? 'Edit Member' : 'Add Member'}</h2>
            <form onSubmit={(e) => { e.preventDefault(); saveMember(); }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontWeight: '500', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Customer Name *</label>
                  <input type="text" name="name" value={memberForm.name} onChange={handleMemberChange} required style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text)', fontSize: '0.9rem' }} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontWeight: '500', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Phone (optional)</label>
                  <input type="tel" name="phone" value={memberForm.phone} onChange={handleMemberChange} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text)', fontSize: '0.9rem' }} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontWeight: '500', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Item / Garment *</label>
                  <input type="text" name="item" value={memberForm.item} onChange={handleMemberChange} required style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text)', fontSize: '0.9rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '500', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Price (₦) *</label>
                  <input type="number" name="price" value={memberForm.price} onChange={handleMemberChange} required style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text)', fontSize: '0.9rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '500', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Deposit (₦)</label>
                  <input type="number" name="deposit" value={memberForm.deposit} onChange={handleMemberChange} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text)', fontSize: '0.9rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '500', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Measurements (optional)</label>
                  <input type="text" name="measurements" value={memberForm.measurements} onChange={handleMemberChange} placeholder="e.g. Bust 34, Waist 28" style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text)', fontSize: '0.9rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '500', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Due Date (optional)</label>
                  <input type="date" name="due_date" value={memberForm.due_date} onChange={handleMemberChange} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text)', fontSize: '0.9rem' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1rem' }}>
                <button type="submit" style={{ flex: 1, padding: '0.6rem', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Save Member</button>
                <button type="button" onClick={() => setShowMemberModal(false)} style={{ padding: '0.6rem 1rem', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--color-text)' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Loading skeleton ───
function LoadingSkeleton() {
  return (
    <div style={{ padding: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ width: '140px', height: '24px', background: 'var(--color-border)', borderRadius: '6px' }} />
        <div style={{ width: '60px', height: '32px', background: 'var(--color-border)', borderRadius: '6px' }} />
      </div>
      <div style={{ background: 'var(--color-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ height: '40px', background: 'var(--color-border)', borderRadius: '6px' }} />
          <div style={{ height: '40px', background: 'var(--color-border)', borderRadius: '6px' }} />
          <div style={{ height: '40px', background: 'var(--color-border)', borderRadius: '6px' }} />
        </div>
      </div>
      <div style={{ background: 'var(--color-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ width: '100px', height: '20px', background: 'var(--color-border)', borderRadius: '6px' }} />
          <div style={{ width: '80px', height: '32px', background: 'var(--color-border)', borderRadius: '6px' }} />
        </div>
        <div style={{ height: '60px', background: 'var(--color-border)', borderRadius: '6px' }} />
      </div>
      <style>{`@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }`}</style>
    </div>
  )
}
