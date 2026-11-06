'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabaseClient'

export default function ProductsTab({ businessId }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Modal State
  const [editingItem, setEditingItem] = useState(null)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

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

  const toggleWebsiteListing = async (item) => {
    // If trying to go LIVE, run quality checks
    if (!item.is_listed_on_website) {
      const issues = []
      if (!item.image_url) issues.push("Add a high-quality product image")
      if (!item.web_description || item.web_description.trim().length < 50) issues.push("Write a description (min 50 characters)")
      if (!item.selling_price || item.selling_price <= 0) issues.push("Set a valid price")

      if (issues.length > 0) {
        setEditingItem(item)
        setErrorMsg(`Cannot go live yet. ${issues[0]}.`)
        return
      }
    }

    // Optimistic UI update
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_listed_on_website: !item.is_listed_on_website } : i))
    await supabase.from('inventory_items').update({ is_listed_on_website: !item.is_listed_on_website }).eq('id', item.id)
  }

  const saveProduct = async () => {
    if (!editingItem) return
    
    // Validation
    if (!editingItem.item_name?.trim()) {
      setErrorMsg("Product name is required.")
      return
    }
    if (editingItem.web_description && editingItem.web_description.trim().length > 0 && editingItem.web_description.trim().length < 50) {
      setErrorMsg("Description must be at least 50 characters to ensure customer trust.")
      return
    }

    setSaving(true)
    setErrorMsg('')
    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({
          item_name: editingItem.item_name,
          selling_price: editingItem.selling_price,
          web_description: editingItem.web_description,
          category: editingItem.category,
          is_featured: editingItem.is_featured
        })
        .eq('id', editingItem.id)
      
      if (error) throw error
      
      await fetchItems()
      setEditingItem(null)
    } catch (err) {
      setErrorMsg('Error saving: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: '#0F2B4A', fontWeight: 600 }}>Loading your collection...</div>

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '100px', fontFamily: "'Inter', sans-serif" }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', borderBottom: '2px solid #0F2B4A', paddingBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#0F2B4A', letterSpacing: '-0.5px' }}>Storefront Collection</h2>
          <p style={{ fontSize: '0.95rem', color: '#555', marginTop: '0.5rem', maxWidth: '500px' }}>
            Curate your public store. Ensure all products have high-quality images and rich descriptions to maintain a premium brand experience.
          </p>
        </div>
        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', background: '#0F2B4A', padding: '10px 20px', borderRadius: '30px', boxShadow: '0 4px 15px rgba(15,43,74,0.2)' }}>
          {items.filter(i => i.is_listed_on_website).length} Items Live
        </div>
      </div>

      {/* PRODUCTS LIST */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {items.map(item => {
          // Calculate completeness
          const hasImage = !!item.image_url
          const hasDesc = item.web_description && item.web_description.trim().length >= 50
          const hasPrice = item.selling_price > 0
          const isReady = hasImage && hasDesc && hasPrice

          return (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', border: '1px solid #EAEAEA', borderRadius: '16px', background: '#FFFFFF', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', transition: 'all 0.2s' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
                {/* IMAGE */}
                {item.image_url ? (
                  <img src={item.image_url} style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover', border: '1px solid #f0f0f0' }} />
                ) : (
                  <div style={{ width: '80px', height: '80px', borderRadius: '12px', background: '#FFF0F0', border: '1px dashed #FF3B30', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#FF3B30', fontWeight: 700, textAlign: 'center', padding: '5px' }}>
                    Missing Image
                  </div>
                )}
                
                {/* DETAILS */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0F2B4A' }}>{item.item_name}</h4>
                    {item.is_featured && <span style={{ background: '#D4AF37', color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '3px 10px', borderRadius: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Featured</span>}
                    {!isReady && <span style={{ background: '#FFF0F0', color: '#FF3B30', fontSize: '0.65rem', fontWeight: 800, padding: '3px 10px', borderRadius: '10px', textTransform: 'uppercase' }}>Needs Attention</span>}
                  </div>
                  
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#D4AF37', marginTop: '6px' }}>
                    ₦{Number(item.selling_price).toLocaleString()}
                  </div>
                  
                  <div style={{ fontSize: '0.85rem', color: hasDesc ? '#666' : '#FF3B30', marginTop: '6px', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontStyle: hasDesc ? 'normal' : 'italic' }}>
                    {item.web_description ? item.web_description : 'Description is too short or missing...'}
                  </div>
                </div>
              </div>
              
              {/* ACTIONS */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button 
                  onClick={() => { setEditingItem(item); setErrorMsg(''); }}
                  style={{ padding: '0.7rem 1.2rem', borderRadius: '10px', background: '#F4F6F8', color: '#0F2B4A', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', transition: 'all 0.2s' }}
                >
                  Edit
                </button>

                <button 
                  onClick={() => toggleWebsiteListing(item)}
                  style={{ 
                    padding: '0.7rem 1.2rem', borderRadius: '10px', 
                    background: item.is_listed_on_website ? '#0F2B4A' : '#FFFFFF', 
                    color: item.is_listed_on_website ? '#FFFFFF' : '#0F2B4A', 
                    border: item.is_listed_on_website ? '1px solid #0F2B4A' : '1px solid #0F2B4A', 
                    cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', 
                    display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
                  }}
                >
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.is_listed_on_website ? '#D4AF37' : '#ccc' }} />
                  {item.is_listed_on_website ? 'Live' : 'Go Live'}
                </button>
              </div>
            </div>
          )
        })}
        
        {items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '5rem 2rem', background: '#FFFFFF', borderRadius: '16px', border: '2px dashed #EAEAEA' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#0F2B4A', fontSize: '1.4rem' }}>Your collection is empty</h3>
            <p style={{ color: '#666' }}>Go to your Inventory page to add your first product.</p>
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      {editingItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,43,74,0.7)', backdropFilter: 'blur(5px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setEditingItem(null)}>
          <div style={{ background: '#FFFFFF', width: '100%', maxWidth: '650px', borderRadius: '24px', padding: '2.5rem', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#0F2B4A', fontWeight: 800 }}>Curate Product</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#666' }}>Make it look like a premium fashion piece.</p>
              </div>
              <button onClick={() => setEditingItem(null)} style={{ background: '#F4F6F8', border: 'none', width: '36px', height: '36px', borderRadius: '50%', fontSize: '1.2rem', cursor: 'pointer', color: '#0F2B4A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>

            {errorMsg && (
              <div style={{ padding: '12px', background: '#FFF0F0', color: '#FF3B30', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 600, marginBottom: '1.5rem', border: '1px solid #FFD6D6' }}>
                {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#0F2B4A', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Product Name</label>
                <input 
                  type="text" 
                  value={editingItem.item_name} 
                  onChange={e => setEditingItem({...editingItem, item_name: e.target.value})}
                  style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid #EAEAEA', fontSize: '1rem', outline: 'none', transition: 'border 0.2s' }}
                  onFocus={(e) => e.target.style.borderColor = '#0F2B4A'}
                  onBlur={(e) => e.target.style.borderColor = '#EAEAEA'}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#0F2B4A', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Price (₦)</label>
                  <input 
                    type="number" 
                    value={editingItem.selling_price} 
                    onChange={e => setEditingItem({...editingItem, selling_price: e.target.value})}
                    style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid #EAEAEA', fontSize: '1rem', outline: 'none' }}
                    onFocus={(e) => e.target.style.borderColor = '#0F2B4A'}
                    onBlur={(e) => e.target.style.borderColor = '#EAEAEA'}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#0F2B4A', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Bespoke, Ready-to-Wear"
                    value={editingItem.category || ''} 
                    onChange={e => setEditingItem({...editingItem, category: e.target.value})}
                    style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid #EAEAEA', fontSize: '1rem', outline: 'none' }}
                    onFocus={(e) => e.target.style.borderColor = '#0F2B4A'}
                    onBlur={(e) => e.target.style.borderColor = '#EAEAEA'}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F2B4A', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Website Description</label>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: (editingItem.web_description?.length || 0) >= 50 ? '#137333' : '#FF3B30' }}>
                    {editingItem.web_description?.length || 0} / 50 min chars
                  </span>
                </div>
                <textarea 
                  rows={5}
                  placeholder="Describe the fabric, the fit, the inspiration. A premium description builds customer trust..."
                  value={editingItem.web_description || ''} 
                  onChange={e => setEditingItem({...editingItem, web_description: e.target.value})}
                  style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid #EAEAEA', fontSize: '1rem', fontFamily: 'inherit', resize: 'vertical', outline: 'none', lineHeight: 1.6 }}
                  onFocus={(e) => e.target.style.borderColor = '#0F2B4A'}
                  onBlur={(e) => e.target.style.borderColor = '#EAEAEA'}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8F9FA', padding: '1.2rem', borderRadius: '16px', border: '1px solid #EAEAEA' }}>
                <div>
                  <div style={{ fontWeight: 800, color: '#0F2B4A', fontSize: '1rem' }}>Feature on Homepage</div>
                  <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>Highlight this piece in your main hero collection.</div>
                </div>
                <button 
                  onClick={() => setEditingItem({...editingItem, is_featured: !editingItem.is_featured})}
                  style={{ width: '54px', height: '30px', borderRadius: '15px', border: 'none', background: editingItem.is_featured ? '#D4AF37' : '#D1D5DB', position: 'relative', cursor: 'pointer', transition: 'all 0.3s' }}
                >
                  <span style={{ position: 'absolute', top: '2px', left: editingItem.is_featured ? '26px' : '2px', width: '26px', height: '26px', borderRadius: '50%', background: '#fff', transition: 'all 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
                </button>
              </div>

            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
              <button onClick={() => setEditingItem(null)} style={{ flex: 1, padding: '16px', borderRadius: '12px', border: '2px solid #EAEAEA', background: '#fff', fontWeight: 800, color: '#666', cursor: 'pointer', transition: 'all 0.2s' }}>
                Cancel
              </button>
              <button onClick={saveProduct} disabled={saving} style={{ flex: 2, padding: '16px', borderRadius: '12px', border: 'none', background: '#0F2B4A', color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: saving ? 'wait' : 'pointer', boxShadow: '0 4px 15px rgba(15,43,74,0.3)' }}>
                {saving ? 'Saving Changes...' : 'Save & Validate'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
        }
