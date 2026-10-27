'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabaseClient'
import { compressImage } from '../../../../lib/compressImage'

const Icon = ({ name, size = 20, stroke = 'currentColor' }) => {
  const icons = {
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    trash: <><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></>,
    save: <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}

const inputStyle = { width: '100%', padding: '0.7rem 0.9rem', borderRadius: '10px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.95rem', boxSizing: 'border-box' }
const labelStyle = { display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--cresoa-text)' }

export default function ProductsTab({ businessId }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [products, setProducts] = useState([])

  useEffect(() => {
    const load = async () => {
      if (!businessId) return
      try {
        const { data: page } = await supabase.from('business_public_pages').select('shop_products').eq('business_id', businessId).maybeSingle()
        if (page && page.shop_products) {
          const parsed = typeof page.shop_products === 'string' ? JSON.parse(page.shop_products) : page.shop_products
          setProducts(Array.isArray(parsed) ? parsed : [])
        }
      } catch (err) { console.error(err) } finally { setLoading(false) }
    }
    load()
  }, [businessId])

  const uploadImage = async (file, callback) => {
    if (!file) return
    setSaving(true)
    try {
      const compressedBlob = await compressImage(file, 200)
      const filePath = `${businessId}/product-${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage.from('business-assets').upload(filePath, compressedBlob, { contentType: 'image/jpeg' })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('business-assets').getPublicUrl(filePath)
      callback(urlData.publicUrl)
    } catch (err) { setMessage('Upload failed: ' + err.message) } finally { setSaving(false) }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.from('business_public_pages').update({ shop_products: products }).eq('business_id', businessId)
      if (error) throw error
      setMessage('✅ Storefront products saved!')
    } catch (err) { setMessage('❌ ' + err.message) } finally { setSaving(false) }
  }

  const addProduct = () => setProducts([...products, { name: '', description: '', price: '', image_url: '', featured: false }])
  const updateProduct = (idx, field, val) => setProducts(prev => prev.map((p, i) => i === idx ? { ...p, [field]: val } : p))
  const removeProduct = (idx) => setProducts(prev => prev.filter((_, i) => i !== idx))
  const toggleFeaturedProduct = (idx) => setProducts(prev => prev.map((p, i) => i === idx ? { ...p, featured: !p.featured } : p))

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '30vh' }}><div className="cresoa-loading-spinner" /></div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>Storefront Products</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--cresoa-text-muted)', margin: '0.2rem 0 0 0' }}>Manage items visible on your public shop.</p>
        </div>
        <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'var(--cresoa-accent)', color: '#fff', padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
          <Icon name="save" size={16} stroke="#fff" /> {saving ? 'Saving...' : 'Save Products'}
        </button>
      </div>

      {message && <div style={{ padding: '0.6rem 1rem', borderRadius: '8px', marginBottom: '1rem', background: message.startsWith('✅') ? 'var(--cresoa-success-soft)' : 'var(--cresoa-danger-soft)', color: message.startsWith('✅') ? 'var(--cresoa-success)' : 'var(--cresoa-danger)' }}>{message}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
        {products.map((p, idx) => (
          <div key={idx} style={{ border: '1px solid var(--cresoa-border)', borderRadius: '12px', padding: '1rem', background: 'var(--cresoa-surface)' }}>
            <input type="text" placeholder="Product name" value={p.name} onChange={(e) => updateProduct(idx, 'name', e.target.value)} style={{ ...inputStyle, marginBottom: '0.5rem' }} />
            <input type="number" placeholder="Price (₦)" value={p.price} onChange={(e) => updateProduct(idx, 'price', e.target.value)} style={{ ...inputStyle, marginBottom: '0.5rem' }} />
            <textarea placeholder="Description" value={p.description} onChange={(e) => updateProduct(idx, 'description', e.target.value)} rows={2} style={{ ...inputStyle, marginBottom: '0.5rem' }} />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && uploadImage(e.target.files[0], (url) => updateProduct(idx, 'image_url', url))} style={{ fontSize: '0.8rem' }} />
              {p.image_url && <img src={p.image_url} alt="Product" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}>
                <input type="checkbox" checked={p.featured || false} onChange={() => toggleFeaturedProduct(idx)} />
                Featured
              </label>
              <button onClick={() => removeProduct(idx)} style={{ background: 'none', border: 'none', color: 'var(--cresoa-danger)', cursor: 'pointer' }}><Icon name="trash" size={16} /></button>
            </div>
          </div>
        ))}
        <button onClick={addProduct} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', borderRadius: '12px', border: '2px dashed var(--cresoa-border)', background: 'transparent', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}>
          <Icon name="plus" size={24} />
          <span style={{ marginTop: '0.5rem', fontWeight: 600 }}>Add Product</span>
        </button>
      </div>
    </div>
  )
}
