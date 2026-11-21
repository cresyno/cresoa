'use client';
import { useClientSearchParams as useSearchParams } from '../../../../lib/useClientSearchParams';

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../../../lib/getBusinessId'
import { compressImage } from '../../../../../lib/compressImage'
import '../../../orders/[id]/edit/edit-order.css' 
import '../../../../globals.css'

const SvgIcons = {
  ArrowLeft: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>,
  Image: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>,
  Trash: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
}

export default function EditInventoryItemPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const itemId = params.id
  const businessId = getCurrentBusinessId() || searchParams.get('business_id')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)
  
  const [formData, setFormData] = useState({
    item_name: '',
    category: '',
    description: '', // Internal notes for staff
    selling_price: '',
    cost_price: '',
    quantity_on_hand: '',
    reorder_level: '',
    image_url: '',
  })

  const [categories, setCategories] = useState([])
  const [showCategoryMenu, setShowCategoryMenu] = useState(false)
  const categoryMenuRef = useRef(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', confirmText: '', isDestructive: false, onConfirm: null })
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState('success')

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg)
    setToastType(type)
    setTimeout(() => setToastMessage(''), 3000)
  }

  useEffect(() => {
    function handleClickOutside(event) {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(event.target)) {
        setShowCategoryMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!businessId || !itemId) { router.push('/dashboard'); return }
    
    const loadItem = async () => {
      try {
        const { data: item, error: itemError } = await supabase
          .from('inventory_items')
          .select('*')
          .eq('id', itemId)
          .eq('business_id', businessId)
          .single()

        if (itemError) throw itemError
        
        setFormData({
          item_name: item.item_name || '',
          category: item.category || '',
          description: item.description || '',
          selling_price: item.selling_price || '',
          cost_price: item.cost_price || '',
          quantity_on_hand: item.quantity_on_hand || '',
          reorder_level: item.reorder_level || '',
          image_url: item.image_url || '',
        })

        const { data: catData } = await supabase
          .from('inventory_items')
          .select('category')
          .eq('business_id', businessId)
          .not('category', 'is', null)
        
        const uniqueCats = [...new Set((catData || []).map(i => i.category))]
        setCategories(uniqueCats)

      } catch (err) {
        setError('Could not load item details.')
      } finally {
        setLoading(false)
      }
    }
    loadItem()
  }, [businessId, itemId, router])

  const updateField = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadingImage(true)
    try {
      const compressedBlob = await compressImage(file, 200)
      const filePath = `${businessId}/product-${Date.now()}.jpg`
      const { error } = await supabase.storage.from('business-assets').upload(filePath, compressedBlob)
      if (error) throw error
      const { data } = supabase.storage.from('business-assets').getPublicUrl(filePath)
      updateField('image_url', data.publicUrl)
      showToast('Image uploaded successfully')
    } catch (err) {
      showToast('Image upload failed.', 'error')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!formData.item_name.trim()) { showToast('Item name is required.', 'error'); return }
    if (!formData.selling_price) { showToast('Selling price is required.', 'error'); return }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({
          item_name: formData.item_name.trim(),
          category: formData.category.trim() || null,
          description: formData.description.trim() || null,
          selling_price: Number(formData.selling_price) || 0,
          cost_price: Number(formData.cost_price) || 0,
          quantity_on_hand: Number(formData.quantity_on_hand) || 0,
          reorder_level: Number(formData.reorder_level) || 0,
          image_url: formData.image_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId)

      if (error) throw error

      showToast('Item updated successfully')
      router.push(`/dashboard/inventory?business_id=${businessId}`)
    } catch (err) {
      showToast(err.message || 'Failed to update item.', 'error')
      setSaving(false)
    }
  }

  const promptDelete = () => {
    setModalConfig({
      isOpen: true,
      title: 'Delete Item',
      message: 'Are you sure you want to permanently delete this item? This action cannot be undone.',
      confirmText: 'Delete Item',
      isDestructive: true,
      onConfirm: async () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }))
        setDeleting(true)
        try {
          const { error } = await supabase.from('inventory_items').delete().eq('id', itemId)
          if (error) throw error
          showToast('Item deleted')
          router.push(`/dashboard/inventory?business_id=${businessId}`)
        } catch (err) {
          showToast('Failed to delete item.', 'error')
          setDeleting(false)
        }
      }
    })
  }

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: '#0F2B4A', fontWeight: 600 }}>Loading item...</div>
  if (error) return <div style={{ padding: '4rem', textAlign: 'center', color: '#FF3B30', fontWeight: 600 }}>{error}</div>

  // Calculate Margin for the UI
  const cost = Number(formData.cost_price) || 0
  const selling = Number(formData.selling_price) || 0
  const margin = selling > 0 ? Math.round(((selling - cost) / selling) * 100) : 0

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh', fontFamily: "'Inter', sans-serif", color: '#0F2B4A', paddingBottom: '100px' }}>
      
      {/* MOBILE-FIRST FORM STYLES */}
      <style dangerouslySetInnerHTML={{__html: `
        .edit-container { max-width: 700px; margin: 0 auto; padding: 1.5rem; }
        .edit-card { background: #FFFFFF; border-radius: 16px; border: 1px solid #EAEAEA; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 4px 15px rgba(0,0,0,0.02); }
        .edit-label { display: block; font-size: 0.8rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #555; margin-bottom: 8px; }
        .edit-input { width: 100%; padding: 14px; border-radius: 10px; border: 2px solid #EAEAEA; font-size: 1rem; outline: none; transition: border 0.2s; font-family: inherit; }
        .edit-input:focus { border-color: #0F2B4A; }
        .edit-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        
        @media (max-width: 600px) {
          .edit-grid-2 { grid-template-columns: 1fr; }
        }
      `}} />

      <div className="edit-container">
        
        {/* HEADER */}
        <div style={{ marginBottom: '2rem' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#888', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: 0, fontSize: '0.9rem', fontWeight: 600, marginBottom: '1rem' }}>
            <SvgIcons.ArrowLeft /> Back to Inventory
          </button>
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.5px' }}>Edit Item</h1>
          <p style={{ margin: '0.2rem 0 0 0', color: '#666', fontSize: '0.95rem' }}>{formData.item_name}</p>
        </div>

        <form onSubmit={handleSubmit}>
          
          {/* CARD 1: BASIC DETAILS */}
          <div className="edit-card">
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem', fontWeight: 800, borderBottom: '1px solid #EAEAEA', paddingBottom: '10px' }}>Basic Details</h3>
            
            <div style={{ marginBottom: '1.2rem' }}>
              <label className="edit-label">Item Name *</label>
              <input 
                type="text" 
                className="edit-input" 
                value={formData.item_name} 
                onChange={e => updateField('item_name', e.target.value)} 
                required
              />
            </div>

            <div style={{ marginBottom: '1.2rem' }} ref={categoryMenuRef}>
              <label className="edit-label">Category</label>
              <input 
                type="text" 
                className="edit-input" 
                value={formData.category} 
                onChange={e => { updateField('category', e.target.value); setShowCategoryMenu(true); }} 
                onFocus={() => setShowCategoryMenu(true)}
                placeholder="e.g. Bespoke, Ready-to-Wear" 
              />
              {showCategoryMenu && categories.length > 0 && (
                <div style={{ position: 'absolute', background: '#FFF', border: '1px solid #EAEAEA', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', minWidth: '200px', zIndex: 10, marginTop: '4px' }}>
                  {categories.filter(c => c.toLowerCase().includes(formData.category.toLowerCase())).map(cat => (
                    <button key={cat} type="button" onClick={() => { updateField('category', cat); setShowCategoryMenu(false); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="edit-label">Staff Notes (Internal Only)</label>
              <textarea 
                className="edit-input" 
                rows={2} 
                value={formData.description} 
                onChange={e => updateField('description', e.target.value)} 
                placeholder="Notes for your team (e.g. fabric supplier, style code)" 
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>

          {/* CARD 2: FINANCIALS & STOCK */}
          <div className="edit-card">
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem', fontWeight: 800, borderBottom: '1px solid #EAEAEA', paddingBottom: '10px' }}>Financials & Stock</h3>
            
            <div className="edit-grid-2" style={{ marginBottom: '1.2rem' }}>
              <div>
                <label className="edit-label">Selling Price (₦) *</label>
                <input type="number" className="edit-input" value={formData.selling_price} onChange={e => updateField('selling_price', e.target.value)} min="0" required />
              </div>
              <div>
                <label className="edit-label">Cost Price (₦)</label>
                <input type="number" className="edit-input" value={formData.cost_price} onChange={e => updateField('cost_price', e.target.value)} min="0" />
              </div>
            </div>

            {/* MARGIN PREVIEW */}
            <div style={{ background: '#F8F9FA', padding: '12px 16px', borderRadius: '10px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#666' }}>Profit Margin</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: margin > 0 ? '#137333' : '#FF3B30' }}>{margin}%</span>
            </div>

            <div className="edit-grid-2">
              <div>
                <label className="edit-label">Quantity in Stock *</label>
                <input type="number" className="edit-input" value={formData.quantity_on_hand} onChange={e => updateField('quantity_on_hand', e.target.value)} min="0" required />
              </div>
              <div>
                <label className="edit-label">Low Stock Alert At</label>
                <input type="number" className="edit-input" value={formData.reorder_level} onChange={e => updateField('reorder_level', e.target.value)} min="0" />
              </div>
            </div>
          </div>

          {/* CARD 3: MEDIA */}
          <div className="edit-card">
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem', fontWeight: 800, borderBottom: '1px solid #EAEAEA', paddingBottom: '10px' }}>Product Media</h3>
            
            <div style={{ border: '2px dashed #EAEAEA', borderRadius: '12px', padding: '2rem 1rem', textAlign: 'center', background: '#F8F9FA' }}>
              {formData.image_url ? (
                <div>
                  <img src={formData.image_url} alt="Product" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', objectFit: 'cover', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} />
                  <div style={{ marginTop: '1rem' }}>
                    <label style={{ display: 'inline-block', background: '#FFFFFF', border: '1px solid #EAEAEA', padding: '10px 20px', borderRadius: '8px', color: '#0F2B4A', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 700 }}>
                      Replace Photo
                      <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                    </label>
                  </div>
                </div>
              ) : (
                <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#888' }}>
                  {uploadingImage ? <span style={{ fontWeight: 600 }}>Uploading...</span> : (
                    <>
                      <div style={{ color: '#0F2B4A', marginBottom: '10px' }}><SvgIcons.Image /></div>
                      <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0F2B4A' }}>Click to upload raw photo</span>
                      <span style={{ fontSize: '0.8rem', color: '#999', marginTop: '4px' }}>JPG, PNG up to 5MB</span>
                    </>
                  )}
                  <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                </label>
              )}
            </div>
            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#888', marginTop: '1rem' }}>
              Need to write a web description or feature this on the homepage? Go to the <strong>Products Tab</strong> in your Website Editor.
            </p>
          </div>

        </form>
      </div>

      {/* FIXED FOOTER (Mobile-First) */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#FFFFFF', borderTop: '1px solid #EAEAEA', padding: '1rem', display: 'flex', gap: '1rem', zIndex: 100, boxShadow: '0 -4px 15px rgba(0,0,0,0.05)' }}>
        <button type="button" onClick={promptDelete} disabled={deleting} style={{ width: '60px', height: '52px', borderRadius: '10px', border: '2px solid #FFD6D6', background: '#FFF0F0', color: '#FF3B30', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <SvgIcons.Trash />
        </button>
        <button type="button" onClick={handleSubmit} disabled={saving} style={{ flex: 1, height: '52px', borderRadius: '10px', border: 'none', background: '#0F2B4A', color: '#FFF', fontWeight: 800, fontSize: '1rem', cursor: saving ? 'wait' : 'pointer', boxShadow: '0 4px 15px rgba(15,43,74,0.2)' }}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* CUSTOM DELETE MODAL */}
      {modalConfig.isOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,43,74,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '2rem', maxWidth: '400px', width: '100%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.3rem', color: '#FF3B30' }}>{modalConfig.title}</h3>
            <p style={{ margin: '0 0 20px 0', color: '#666', fontSize: '0.95rem', lineHeight: 1.5 }}>{modalConfig.message}</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #EAEAEA', background: '#FFF', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button onClick={modalConfig.onConfirm} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: '#FF3B30', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}>{modalConfig.confirmText}</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toastMessage && (
        <div style={{ position: 'fixed', bottom: '80px', right: '20px', left: '20px', background: toastType === 'error' ? '#FF3B30' : '#0F2B4A', color: '#FFF', padding: '16px', borderRadius: '8px', fontWeight: 600, boxShadow: '0 10px 30px rgba(0,0,0,0.2)', zIndex: 9999, textAlign: 'center' }}>
          {toastMessage}
        </div>
      )}

    </div>
  )
    }
