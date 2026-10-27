'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabaseClient'

export default function ProductsTab({ businessId }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchItems = async () => {
    const { data } = await supabase
      .from('inventory_items') // ✅ Master table
      .select('*')
      .eq('business_id', businessId)
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [businessId])

  const toggleWebsiteListing = async (id, currentStatus) => {
    await supabase.from('inventory_items').update({ is_listed_on_website: !currentStatus }).eq('id', id)
    fetchItems()
  }

  if (loading) return <div>Loading storefront items...</div>

  return (
    <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1.2rem', border: '1px solid var(--cresoa-border)' }}>
      <h3>Select items to show on your website</h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--cresoa-text-muted)', marginBottom: '1.5rem' }}>
        These products are pulled directly from your main inventory.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {items.map(item => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--cresoa-border)', borderRadius: '8px' }}>
            <div>
              <strong>{item.name}</strong>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--cresoa-text-muted)' }}>₦{item.price}</p>
            </div>
            <button 
              onClick={() => toggleWebsiteListing(item.id, item.is_listed_on_website)}
              style={{ padding: '0.5rem 1rem', borderRadius: '6px', background: item.is_listed_on_website ? 'var(--cresoa-success)' : 'var(--cresoa-border)', color: item.is_listed_on_website ? '#fff' : 'inherit', border: 'none', cursor: 'pointer' }}
            >
              {item.is_listed_on_website ? 'Listed on Store' : 'Hidden'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
