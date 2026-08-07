'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../../../lib/getBusinessId'
import { Icon } from '../../../../../components/Icon'

export default function EditGroupPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const groupId = params.id

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [businessId, setBusinessId] = useState(null)
  const [customers, setCustomers] = useState([])
  const [formData, setFormData] = useState({
    group_name: '',
    coordinator_customer_id: '',
    due_date: '',
  })

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

        // Fetch group
        const { data: group, error: groupError } = await supabase
          .from('group_orders')
          .select('*')
          .eq('id', groupId)
          .eq('business_id', bizId)
          .single()

        if (groupError) throw groupError
        setFormData({
          group_name: group.group_name || '',
          coordinator_customer_id: group.coordinator_customer_id || '',
          due_date: group.due_date || '',
        })

        // Fetch customers for coordinator dropdown
        const { data: customersData } = await supabase
          .from('customers')
          .select('id, name')
          .eq('business_id', bizId)
          .order('name')
        setCustomers(customersData || [])
      } catch (err) {
        console.error(err)
        setError('Failed to load group.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [groupId, router])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('group_orders')
        .update({
          group_name: formData.group_name,
          coordinator_customer_id: formData.coordinator_customer_id || null,
          due_date: formData.due_date || null,
        })
        .eq('id', groupId)
        .eq('business_id', businessId)

      if (error) throw error

      await supabase.from('business_activity_logs').insert({
        business_id: businessId,
        performed_by: user.id,
        action: 'group_updated',
        details: { group_name: formData.group_name }
      })

      router.push(`/dashboard/groups?business_id=${businessId}`)
    } catch (err) {
      console.error(err)
      setError('Failed to update group.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this group? All linked orders will be unassigned.')) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      // First, unlink orders from this group (set group_order_id to null)
      await supabase
        .from('orders')
        .update({ group_order_id: null })
        .eq('group_order_id', groupId)

      // Then delete the group
      const { error } = await supabase
        .from('group_orders')
        .delete()
        .eq('id', groupId)
        .eq('business_id', businessId)

      if (error) throw error

      await supabase.from('business_activity_logs').insert({
        business_id: businessId,
        performed_by: user.id,
        action: 'group_deleted',
        details: { id: groupId }
      })

      router.push(`/dashboard/groups?business_id=${businessId}`)
    } catch (err) {
      console.error(err)
      alert('Failed to delete group.')
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ width: '140px', height: '24px', background: 'var(--color-border)', borderRadius: '6px' }} />
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ width: '100%', height: '40px', background: 'var(--color-border)', borderRadius: '6px', marginBottom: '1rem' }} />
          <div style={{ width: '100%', height: '40px', background: 'var(--color-border)', borderRadius: '6px', marginBottom: '1rem' }} />
          <div style={{ width: '100%', height: '40px', background: 'var(--color-border)', borderRadius: '6px' }} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-danger)' }}>
        {error}
        <button onClick={() => window.location.reload()} style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Retry</button>
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', color: 'var(--color-text)' }}>
      <h1 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>Edit Group Order</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>Update the group details below.</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.3rem' }}>Group Name *</label>
          <input
            type="text"
            name="group_name"
            value={formData.group_name}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '0.6rem',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg)',
              color: 'var(--color-text)',
              fontSize: '0.9rem'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.3rem' }}>Coordinator (optional)</label>
          <select
            name="coordinator_customer_id"
            value={formData.coordinator_customer_id}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '0.6rem',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg)',
              color: 'var(--color-text)',
              fontSize: '0.9rem'
            }}
          >
            <option value="">No coordinator</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.3rem' }}>Due Date (optional)</label>
          <input
            type="date"
            name="due_date"
            value={formData.due_date}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '0.6rem',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg)',
              color: 'var(--color-text)',
              fontSize: '0.9rem'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '0.6rem 1.5rem',
              background: 'var(--color-accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.6 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            <Icon name="check" size={16} stroke="#fff" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              padding: '0.6rem 1.5rem',
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              cursor: 'pointer',
              color: 'var(--color-text)'
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            style={{
              padding: '0.6rem 1.5rem',
              background: 'transparent',
              border: '1px solid var(--color-danger)',
              borderRadius: '6px',
              cursor: 'pointer',
              color: 'var(--color-danger)',
              marginLeft: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            <Icon name="alert" size={16} stroke="var(--color-danger)" />
            Delete Group
          </button>
        </div>

        {error && <div style={{ color: 'var(--color-danger)', marginTop: '0.5rem' }}>{error}</div>}
      </form>
    </div>
  )
          }
