'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabaseClient'

export default function ProductsTab({ businessId }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchItems = async () => {
    const { data } = await supabase
      .from('inventory_items')
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

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading storefront items...</div>

  const listedItems = items.filter(i => i.is_listed_on_website)

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--cresoa-border)' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Storefront Products</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--cresoa-text-muted)', marginTop: '0.2rem', marginBottom: '1.5rem' }}>
          Toggle items to show or hide them on your website. To add a new product, go to the Inventory page.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {items.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--cresoa-border)', borderRadius: '10px', background: 'var(--cresoa-bg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {item.image_url ? (
                  <img src={item.image_url} style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'var(--cresoa-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>📦</div>
                )}
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--cresoa-text)' }}>{item.item_name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--cresoa-text-muted)' }}>₦{Number(item.selling_price).toLocaleString()}</div>
                </div>
              </div>
              
              <button 
                onClick={() => toggleWebsiteListing(item.id, item.is_listed_on_website)}
                style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: item.is_listed_on_website ? 'var(--cresoa-success)' : 'var(--cresoa-border)', color: item.is_listed_on_website ? '#fff' : 'var(--cresoa-text)', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', transition: 'all 0.2s' }}
              >
                {item.is_listed_on_website ? '✅ Listed on Store' : 'Hidden'}
              </button>
            </div>
          ))}
          
          {items.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--cresoa-text-muted)' }}>
              You don't have any inventory items yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
    }
