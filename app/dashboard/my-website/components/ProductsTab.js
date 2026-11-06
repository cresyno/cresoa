'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabaseClient'

export default function ProductsTab({ businessId }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Modal State
  const [editingItem, setEditingItem] = useState(null)
  const [saving, setSaving] = useState(false)

  const fetchItems = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [businessId])

  const toggleWebsiteListing = async (id, currentStatus) => {
    // Optimistic UI update
    setItems(prev => prev.map(item => item.id === id ? { ...item, is_listed_on_website: !currentStatus } : item))
    await supabase.from('inventory_items').update({ is_listed_on_website: !currentStatus }).eq('id', id)
  }

  const toggleFeatured = async (id, currentStatus) => {
    // Optimistic UI update
    setItems(prev => prev.map(item => item.id === id ? { ...item, is_featured: !currentStatus } : item))
    await supabase.from('inventory_items').update({ is_featured: !currentStatus }).eq('id', id)
  }

  const saveProduct = async () => {
    if (!editingItem) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({
          item_name: editingItem.item_name,
          selling_price: editingItem.selling_price,
          web_description: editingItem.web_description,
          category: editingItem.category,
          quantity_on_hand: editingItem.quantity_on_hand
        })
        .eq('id', editingItem.id)
      
      if (error) throw error
      
      await fetchItems()
      setEditingItem(null)
    } catch (err) {
      alert('Error saving product: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>Loading collection...</div>

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '80px' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#0F2B4A' }}>Storefront Collection</h2>
          <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.4rem' }}>
            Manage your products, write descriptions, and feature items on your homepage.
          </p>
        </div>
        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#D4AF37', background: '#FEF8E8', padding: '8px 16px', borderRadius: '20px' }}>
          {items.filter(i => i.is_listed_on_website).length} Products Live
        </div>
      </div>

      {/* PRODUCTS LIST */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {items.map(item => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem', border: '1px solid #EAEAEA', borderRadius: '16px', background: '#fff', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', flex: 1 }}>
              {item.image_url ? (
                <img src={item.image_url} style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover', background: '#f5f5f5' }} />
              ) : (
                <div style={{ width: '64px', height: '64px', borderRadius: '12px', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>📦</div>
              )}
              
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0F2B4A' }}>{item.item_name}</h4>
                  {item.is_featured && <span style={{ background: '#D4AF37', color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase' }}>Featured</span>}
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#D4AF37', marginTop: '4px' }}>
                  ₦{Number(item.selling_price).toLocaleString()}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '4px', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {item.web_description || item.description || 'No description written yet.'}
                </div>
              </div>
            </div>
            
            {/* ACTIONS */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button 
                onClick={() => setEditingItem(item)}
                style={{ padding: '0.6rem 1rem', borderRadius: '8px', background: '#F0F4F8', color: '#0F2B4A', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
              >
                Edit Details
              </button>

              <button 
                onClick={() => toggleWebsiteListing(item.id, item.is_listed_on_website)}
                style={{ padding: '0.6rem 1rem', borderRadius: '8px', background: item.is_listed_on_website ? '#E6F4EA' : '#F3F4F6', color: item.is_listed_on_website ? '#137333' : '#666', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.is_listed_on_website ? '#137333' : '#999' }} />
                {item.is_listed_on_website ? 'Live' : 'Hidden'}
              </button>
            </div>
          </div>
        ))}
        
        {items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#fff', borderRadius: '16px', border: '1px dashed #ccc' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#0F2B4A' }}>Your collection is empty</h3>
            <p style={{ color: '#666', marginBottom: '20px' }}>Go to your Inventory page to add your first product.</p>
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      {editingItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,43,74,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setEditingItem(null)}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '600px', borderRadius: '20px', padding: '2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#0F2B4A', fontWeight: 800 }}>Edit Product</h3>
              <button onClick={() => setEditingItem(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#999' }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#333', marginBottom: '6px' }}>Product Name</label>
                <input 
                  type="text" 
                  value={editingItem.item_name} 
                  onChange={e => setEditingItem({...editingItem, item_name: e.target.value})}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '1rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#333', marginBottom: '6px' }}>Price (₦)</label>
                  <input 
                    type="number" 
                    value={editingItem.selling_price} 
                    onChange={e => setEditingItem({...editingItem, selling_price: e.target.value})}
                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '1rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#333', marginBottom: '6px' }}>Category</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Bespoke, Ready-to-Wear"
                    value={editingItem.category || ''} 
                    onChange={e => setEditingItem({...editingItem, category: e.target.value})}
                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '1rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#333', marginBottom: '6px' }}>Website Description</label>
                <textarea 
                  rows={4}
                  placeholder="Describe the fabric, the fit, and the style..."
                  value={editingItem.web_description || ''} 
                  onChange={e => setEditingItem({...editingItem, web_description: e.target.value})}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '1rem', fontFamily: 'inherit', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8F9FA', padding: '1rem', borderRadius: '12px' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#0F2B4A' }}>Feature on Homepage</div>
                  <div style={{ fontSize: '0.8rem', color: '#666' }}>Show this in the "Featured Collection" section.</div>
                </div>
                <button 
                  onClick={() => setEditingItem({...editingItem, is_featured: !editingItem.is_featured})}
                  style={{ width: '48px', height: '28px', borderRadius: '14px', border: 'none', background: editingItem.is_featured ? '#D4AF37' : '#ccc', position: 'relative', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  <span style={{ position: 'absolute', top: '2px', left: editingItem.is_featured ? '22px' : '2px', width: '24px', height: '24px', borderRadius: '50%', background: '#fff', transition: 'all 0.2s' }} />
                </button>
              </div>

            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button onClick={() => setEditingItem(null)} style={{ flex: 1, padding: '14px', borderRadius: '10px', border: '1px solid #ddd', background: '#fff', fontWeight: 700, color: '#666', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={saveProduct} disabled={saving} style={{ flex: 2, padding: '14px', borderRadius: '10px', border: 'none', background: '#0F2B4A', color: '#fff', fontWeight: 700, cursor: saving ? 'wait' : 'pointer' }}>
                {saving ? 'Saving...' : 'Save Product Details'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
              }
