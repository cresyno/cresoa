'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../../../lib/getBusinessId'
import { Icon } from '../../../../../components/Icon'

export default function EditCustomerPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const customerId = params.id

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [businessId, setBusinessId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    notes: '',
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

        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .eq('business_id', bizId)
          .single()

        if (customerError) throw customerError
        setFormData({
          name: customer.name || '',
          phone: customer.phone || '',
          notes: customer.notes || '',
        })
      } catch (err) {
        console.error(err)
        setError('Failed to load customer.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [customerId, router])

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
        .from('customers')
        .update({
          name: formData.name,
          phone: formData.phone || null,
          notes: formData.notes || null,
        })
        .eq('id', customerId)
        .eq('business_id', businessId)

      if (error) throw error

      // Log activity
      await supabase.from('business_activity_logs').insert({
        business_id: businessId,
        performed_by: user.id,
        action: 'customer_updated',
        details: { name: formData.name }
      })

      router.push(`/dashboard/customers?business_id=${businessId}`)
    } catch (err) {
      console.error(err)
      setError('Failed to update customer.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this customer? This will also remove their orders.')) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId)
        .eq('business_id', businessId)

      if (error) throw error

      await supabase.from('business_activity_logs').insert({
        business_id: businessId,
        performed_by: user.id,
        action: 'customer_deleted',
        details: { id: customerId }
      })

      router.push(`/dashboard/customers?business_id=${businessId}`)
    } catch (err) {
      console.error(err)
      alert('Failed to delete customer.')
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
      <h1 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>Edit Customer</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>Update the customer's details below.</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.3rem' }}>Name *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
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
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.3rem' }}>Phone (optional)</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
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

        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.3rem' }}>Notes (optional)</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            style={{
              width: '100%',
              padding: '0.6rem',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg)',
              color: 'var(--color-text)',
              fontSize: '0.9rem',
              resize: 'vertical'
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
            Delete Customer
          </button>
        </div>

        {error && <div style={{ color: 'var(--color-danger)', marginTop: '0.5rem' }}>{error}</div>}
      </form>
    </div>
  )
      }
