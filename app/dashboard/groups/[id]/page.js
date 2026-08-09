'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../../lib/getBusinessId'
import { Icon } from '../../../../components/Icon'
import { isFeatureAvailable } from '../../../../lib/planLimits'

export default function GroupDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const groupId = params.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [group, setGroup] = useState(null)
  const [members, setMembers] = useState([])
  const [businessId, setBusinessId] = useState(null)
  const [businessPlan, setBusinessPlan] = useState('free')
  const [canManage, setCanManage] = useState(false)

  // Member modal
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [editingMemberId, setEditingMemberId] = useState(null)
  const [memberForm, setMemberForm] = useState({
    customer_name: '',
    item: '',
    price: '',
    deposit: '',
    measurements: '',
    due_date: '',
  })
  const [saving, setSaving] = useState(false)

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

        // Fetch business plan
        const { data: bizData } = await supabase
          .from('businesses')
          .select('plan')
          .eq('id', bizId)
          .single()
        if (bizData) setBusinessPlan(bizData.plan || 'free')
        setCanManage(isFeatureAvailable(bizData?.plan || 'free', 'groups'))

        // Fetch group
        const { data: groupData, error: groupError } = await supabase
          .from('group_orders')
          .select('*, coordinator:coordinator_customer_id(name, phone)')
          .eq('id', groupId)
          .eq('business_id', bizId)
          .single()

        if (groupError) throw groupError
        setGroup(groupData)

        // Fetch members (orders in this group)
        const { data: memberData, error: memberError } = await supabase
          .from('orders')
          .select('*, customer:customer_id(name, phone)')
          .eq('group_order_id', groupId)
          .eq('business_id', bizId)
          .order('created_at', { ascending: false })

        if (memberError) throw memberError
        setMembers(memberData || [])

      } catch (err) {
        console.error('Error loading group:', err)
        setError('Failed to load group details.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [groupId, router])

  const handleDeleteMember = async (orderId) => {
    if (!confirm('Remove this member from the group?')) return
    try {
      const { error } = await supabase
        .from('orders')
        .update({ group_order_id: null })
        .eq('id', orderId)
      if (error) throw error
      setMembers(members.filter(m => m.id !== orderId))
    } catch (err) {
      alert('Failed to remove member.')
    }
  }

  const openAddMember = () => {
    setEditingMemberId(null)
    setMemberForm({ customer_name: '', item: '', price: '', deposit: '', measurements: '', due_date: '' })
    setShowMemberModal(true)
  }

  const handleMemberChange = (e) => {
    setMemberForm({ ...memberForm, [e.target.name]: e.target.value })
  }

  const saveMember = async () => {
    const { customer_name, item, price } = memberForm
    if (!customer_name || !item || !price) {
      alert('Name, item, and price are required.')
      return
    }

    setSaving(true)
    try {
      // Find or create customer
      let customerId = null
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('business_id', businessId)
        .eq('name', customer_name)
        .maybeSingle()
      if (existing) {
        customerId = existing.id
      } else {
        const { data: newCust, error: custError } = await supabase
          .from('customers')
          .insert({
            business_id: businessId,
            name: customer_name,
          })
          .select()
          .single()
        if (custError) throw custError
        customerId = newCust.id
      }

      // Create order linked to group
      const { error } = await supabase
        .from('orders')
        .insert({
          business_id: businessId,
          group_order_id: groupId,
          customer_id: customerId,
          title: item,
          price: parseFloat(price) || 0,
          amount_paid: parseFloat(memberForm.deposit) || 0,
          due_date: memberForm.due_date || null,
          current_status: 'Order placed',
          measurements: memberForm.measurements ? { notes: memberForm.measurements } : null,
        })

      if (error) throw error

      // Refresh members
      const { data: memberData } = await supabase
        .from('orders')
        .select('*, customer:customer_id(name, phone)')
        .eq('group_order_id', groupId)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
      setMembers(memberData || [])
      setShowMemberModal(false)
    } catch (err) {
      console.error(err)
      alert('Failed to add member.')
    } finally {
      setSaving(false)
    }
  }

  const getStatusInfo = (status) => {
    const map = {
      'Order placed': { label: 'Placed', color: '#6B6255', bg: '#F0EDE8' },
      'Cutting':      { label: 'Cutting', color: '#B4881E', bg: '#F6E9C8' },
      'Sewing':       { label: 'Sewing', color: '#1E3A5F', bg: '#D6E0EB' },
      'Ready':        { label: 'Ready', color: '#2E7D5E', bg: '#DCEBE2' },
      'Delivered':    { label: 'Delivered', color: '#6B6255', bg: '#E8E0D5' },
    }
    return map[status] || { label: status || 'Placed', color: '#6B6255', bg: '#F0EDE8' }
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid var(--color-border)', borderTop: '4px solid var(--color-accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error || !group) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-danger)' }}>
        {error || 'Group not found.'}
        <button onClick={() => router.back()} style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Go Back</button>
      </div>
    )
  }

  const totalMembers = members.length
  const totalBalance = members.reduce((sum, m) => sum + ((m.price || 0) - (m.amount_paid || 0)), 0)
  const delivered = members.filter(m => m.current_status === 'Delivered').length
  const progress = totalMembers > 0 ? Math.round((delivered / totalMembers) * 100) : 0

  return (
    <div style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto', color: 'var(--color-text)' }}>
      {/* ─── Header ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>{group.group_name}</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            {group.coordinator?.name ? `Coordinator: ${group.coordinator.name}` : 'No coordinator'}
            {group.due_date && ` · Due: ${new Date(group.due_date).toLocaleDateString('en-GB')}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <a href={`/dashboard/groups/${groupId}/edit?business_id=${businessId}`} style={{ padding: '0.3rem 1rem', background: 'var(--color-accent)', color: '#0F2B4A', borderRadius: '6px', fontSize: '0.85rem', textDecoration: 'none' }}>
            <Icon name="edit-2" size={14} stroke="#0F2B4A" /> Edit
          </a>
          <button onClick={() => router.back()} style={{ padding: '0.3rem 1rem', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--color-text)' }}>Back</button>
        </div>
      </div>

      {/* ─── Stats ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'var(--color-card)', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Members</div>
          <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{totalMembers}</div>
        </div>
        <div style={{ background: 'var(--color-card)', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Balance</div>
          <div style={{ fontWeight: '700', fontSize: '1.1rem', color: totalBalance > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
            {totalBalance > 0 ? `₦${totalBalance.toLocaleString()}` : '✓'}
          </div>
        </div>
        <div style={{ background: 'var(--color-card)', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Progress</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <div style={{ flex: 1, height: '6px', background: 'var(--color-bg)', borderRadius: '4px' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: 'var(--color-success)', borderRadius: '4px' }} />
            </div>
            <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{progress}%</span>
          </div>
        </div>
      </div>

      {/* ─── Members Table ─── */}
      <div style={{ background: 'var(--color-card)', borderRadius: '12px', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
        <div style={{ padding: '0.8rem 1rem', background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Members</span>
          {canManage && (
            <button onClick={openAddMember} style={{ padding: '0.2rem 0.8rem', background: 'var(--color-accent)', color: '#0F2B4A', border: 'none', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
              + Add Member
            </button>
          )}
        </div>
        {members.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            No members in this group yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.4rem 0.6rem' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '0.4rem 0.6rem' }}>Item</th>
                  <th style={{ textAlign: 'right', padding: '0.4rem 0.6rem' }}>Price</th>
                  <th style={{ textAlign: 'right', padding: '0.4rem 0.6rem' }}>Paid</th>
                  <th style={{ textAlign: 'center', padding: '0.4rem 0.6rem' }}>Status</th>
                  {canManage && <th style={{ textAlign: 'center', padding: '0.4rem 0.6rem' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {members.map(m => {
                  const status = getStatusInfo(m.current_status)
                  const balance = (m.price || 0) - (m.amount_paid || 0)
                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.4rem 0.6rem' }}>{m.customer?.name || 'Unknown'}</td>
                      <td style={{ padding: '0.4rem 0.6rem' }}>{m.title || '—'}</td>
                      <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>₦{m.price?.toLocaleString() || 0}</td>
                      <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>₦{m.amount_paid?.toLocaleString() || 0}</td>
                      <td style={{ padding: '0.4rem 0.6rem', textAlign: 'center' }}>
                        <span style={{ background: status.bg, color: status.color, padding: '0.1rem 0.4rem', borderRadius: '12px', fontSize: '0.7rem' }}>
                          {status.label}
                        </span>
                      </td>
                      {canManage && (
                        <td style={{ padding: '0.4rem 0.6rem', textAlign: 'center' }}>
                          <button onClick={() => handleDeleteMember(m.id)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}>
                            <Icon name="trash-2" size={14} stroke="var(--color-danger)" />
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Member Modal ─── */}
      {showMemberModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowMemberModal(false)}>
          <div style={{ background: 'var(--color-bg)', borderRadius: '16px', padding: '1.5rem', maxWidth: '500px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 0.5rem' }}>Add Member</h2>
            <form onSubmit={(e) => { e.preventDefault(); saveMember(); }}>
              <div style={{ marginBottom: '0.8rem' }}>
                <label style={{ display: 'block', fontWeight: '500', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Customer Name *</label>
                <input type="text" name="customer_name" value={memberForm.customer_name} onChange={handleMemberChange} required style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text)', fontSize: '0.9rem' }} />
              </div>
              <div style={{ marginBottom: '0.8rem' }}>
                <label style={{ display: 'block', fontWeight: '500', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Item / Garment *</label>
                <input type="text" name="item" value={memberForm.item} onChange={handleMemberChange} required style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text)', fontSize: '0.9rem' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '0.8rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '500', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Price (₦) *</label>
                  <input type="number" name="price" value={memberForm.price} onChange={handleMemberChange} required style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text)', fontSize: '0.9rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '500', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Deposit (₦)</label>
                  <input type="number" name="deposit" value={memberForm.deposit} onChange={handleMemberChange} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text)', fontSize: '0.9rem' }} />
                </div>
              </div>
              <div style={{ marginBottom: '0.8rem' }}>
                <label style={{ display: 'block', fontWeight: '500', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Measurements (optional)</label>
                <input type="text" name="measurements" value={memberForm.measurements} onChange={handleMemberChange} placeholder="e.g. Bust 34, Waist 28" style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text)', fontSize: '0.9rem' }} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: '500', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Due Date (optional)</label>
                <input type="date" name="due_date" value={memberForm.due_date} onChange={handleMemberChange} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text)', fontSize: '0.9rem' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.8rem' }}>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: '0.6rem', background: 'var(--color-accent)', color: '#0F2B4A', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Add Member</button>
                <button type="button" onClick={() => setShowMemberModal(false)} style={{ padding: '0.6rem 1rem', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--color-text)' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
              }
