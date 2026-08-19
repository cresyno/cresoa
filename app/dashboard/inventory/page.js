'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Card } from '@/components/Card'
import { SectionHeader } from '@/components/SectionHeader'
import { Icon } from '@/components/Icon'
import { Navigation } from '@/components/Navigation'

export default function InventoryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')

  const navigateWithBusiness = (path) => {
    const separator = path.includes('?') ? '&' : '?'
    router.push(`${path}${separator}business_id=${businessId}`)
  }

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetchInventory = async () => {
      if (!businessId) return
      setLoading(true)
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('business_id', businessId)
        .order('item_name', { ascending: true })

      if (!error) setItems(data || [])
      setLoading(false)
    }
    fetchInventory()
  }, [businessId])

  // Filter logic
  const filteredItems = items.filter(item => 
    item.item_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalItems = items.length
  const lowStockItems = items.filter(i => i.quantity_on_hand <= i.reorder_level).length

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px', background: 'var(--cresoa-bg)' }}>
      <Navigation businessId={businessId} />

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Inventory</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0', color: 'var(--cresoa-text)' }}>Stock & Supplies</h1>
        </div>
        <button 
          onClick={() => navigateWithBusiness('/dashboard/inventory/new')}
          style={{ background: 'var(--cresoa-primary)', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <Icon name="plus" size={16} stroke="#fff" /> Add Item
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <Card style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Total Items</div>
          <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--cresoa-text)' }}>{totalItems}</div>
        </Card>
        <Card style={{ padding: '0.75rem 1rem', textAlign: 'center', borderColor: lowStockItems > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-border)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Low Stock</div>
          <div style={{ fontWeight: 700, fontSize: '1.2rem', color: lowStockItems > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-text)' }}>{lowStockItems}</div>
        </Card>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1.5rem' }}>
        <input 
          type="text" 
          placeholder="Search items..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', maxWidth: '400px', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)', fontSize: '0.9rem' }}
        />
      </div>

      {/* Inventory List */}
      {loading ? (
        <p style={{ color: 'var(--cresoa-text-muted)' }}>Loading stock...</p>
      ) : filteredItems.length === 0 ? (
        <Card style={{ padding: '2rem', textAlign: 'center', color: 'var(--cresoa-text-muted)' }}>
          No items found. Start by adding your first product or raw material.
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredItems.map((item) => {
            const isLowStock = item.quantity_on_hand <= item.reorder_level
            return (
              <Card key={item.id} style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--cresoa-text)' }}>{item.item_name}</div>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--cresoa-text-muted)', marginTop: '0.25rem' }}>
                    <span>Category: {item.category}</span>
                    <span>Qty: <strong style={{ color: isLowStock ? 'var(--cresoa-danger)' : 'var(--cresoa-success)' }}>{item.quantity_on_hand}</strong></span>
                    <span>Price: ₦{item.selling_price?.toLocaleString() || '0'}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {isLowStock && (
                    <span style={{ background: 'var(--cresoa-danger)', color: '#fff', fontSize: '0.65rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase' }}>
                      Low Stock
                    </span>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={businessId} />
      </div>
    </div>
  )
    }
