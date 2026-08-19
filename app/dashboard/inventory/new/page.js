'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/Card'
import { Icon } from '@/components/Icon'
import { Navigation } from '@/components/Navigation'

export default function NewInventoryItemPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')

  const navigateWithBusiness = (path) => {
    const separator = path.includes('?') ? '&' : '?'
    router.push(`${path}${separator}business_id=${businessId}`)
  }

  const [form, setForm] = useState({
    item_name: '',
    sku: '',
    category: '',
    quantity_on_hand: 0,
    reorder_level: 5,
    unit_cost: 0,
    selling_price: 0
  })
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.item_name || !form.category) return
    setIsSaving(true)

    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_id: businessId, ...form })
    })

    if (res.ok) {
      navigateWithBusiness('/dashboard/inventory')
    } else {
      alert('Failed to save item. Please try again.')
      setIsSaving(false)
    }
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '600px', margin: '0 auto', paddingBottom: '80px', background: 'var(--cresoa-bg)' }}>
      <Navigation businessId={businessId} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={() => navigateWithBusiness('/dashboard/inventory')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text)', fontSize: '1.2rem' }}>‹</button>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--cresoa-text)' }}>Add New Item</h1>
      </div>

      <Card style={{ padding: '1.5rem' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--cresoa-text-muted)', marginBottom: '0.25rem' }}>Item Name *</label>
            <input type="text" value={form.item_name} onChange={(e) => setForm({...form, item_name: e.target.value})} required style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)', fontSize: '0.95rem' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--cresoa-text-muted)', marginBottom: '0.25rem' }}>SKU (Optional)</label>
              <input type="text" value={form.sku} onChange={(e) => setForm({...form, sku: e.target.value})} style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)', fontSize: '0.95rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--cresoa-text-muted)', marginBottom: '0.25rem' }}>Category *</label>
              <select value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} required style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)', fontSize: '0.95rem' }}>
                <option value="">Select category</option>
                <option value="Fabric">Fabric (Fashion)</option>
                <option value="Spare Parts">Spare Parts (Repairs)</option>
                <option value="Raw Materials">Raw Materials</option>
                <option value="Finished Goods">Finished Goods</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--cresoa-text-muted)', marginBottom: '0.25rem' }}>Quantity on Hand *</label>
              <input type="number" min="0" value={form.quantity_on_hand} onChange={(e) => setForm({...form, quantity_on_hand: parseInt(e.target.value)})} required style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)', fontSize: '0.95rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--cresoa-text-muted)', marginBottom: '0.25rem' }}>Reorder Level *</label>
              <input type="number" min="0" value={form.reorder_level} onChange={(e) => setForm({...form, reorder_level: parseInt(e.target.value)})} required style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)', fontSize: '0.95rem' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--cresoa-text-muted)', marginBottom: '0.25rem' }}>Unit Cost (₦)</label>
              <input type="number" min="0" step="0.01" value={form.unit_cost} onChange={(e) => setForm({...form, unit_cost: parseFloat(e.target.value)})} style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)', fontSize: '0.95rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--cresoa-text-muted)', marginBottom: '0.25rem' }}>Selling Price (₦)</label>
              <input type="number" min="0" step="0.01" value={form.selling_price} onChange={(e) => setForm({...form, selling_price: parseFloat(e.target.value)})} style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)', fontSize: '0.95rem' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="button" onClick={() => navigateWithBusiness('/dashboard/inventory')} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'transparent', color: 'var(--cresoa-text)', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={isSaving} style={{ padding: '0.5rem 1.5rem', borderRadius: '8px', border: 'none', background: 'var(--cresoa-primary)', color: '#fff', fontWeight: 600, cursor: 'pointer', opacity: isSaving ? '0.7' : '1' }}>
              {isSaving ? 'Saving...' : 'Save Item'}
            </button>
          </div>
        </form>
      </Card>

      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={businessId} />
      </div>
    </div>
  )
    }
