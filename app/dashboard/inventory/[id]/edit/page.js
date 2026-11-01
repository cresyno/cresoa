'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../../../lib/getBusinessId'
import { compressImage } from '../../../../../lib/compressImage'
// Reusing the edit-order CSS for consistent layout and form styling
import '../../../orders/[id]/edit/edit-order.css' 
import '../../../../globals.css'

// ─── EMBEDDED ICONS ───
const SvgIcons = {
  ArrowLeft: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>,
  ChevronDown: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>,
  X: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
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
    description: '',
    selling_price: '',
    cost_price: '',
    quantity_on_hand: '',
    reorder_level: '',
    image_url: '',
    web_description: '',
    is_listed_on_website: false,
  })

  const [categories, setCategories] = useState([])
  const [showCategoryMenu, setShowCategoryMenu] = useState(false)
  const categoryMenuRef = useRef(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Custom UI
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
        // Load Item
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
          web_description: item.web_description || '',
          is_listed_on_website: item.is_listed_on_website || false,
        })

        // Load Categories for smart dropdown
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
          web_description: formData.web_description.trim() || null,
          is_listed_on_website: formData.is_listed_on_website,
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
      message: 'Are you sure you want to permanently delete this item from your inventory? This action cannot be undone.',
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

  if (loading) return <div className="order-page-loading"><div className="spinner" /></div>
  if (error) return <div className="order-page-error"><h2>Error</h2><p>{error}</p><button onClick={() => window.location.reload()} className="cresoa-primary-button">Retry</button></div>

  return (
    <div className="edit-order-page">
      <div className="edit-header">
        <div>
          <button onClick={() => router.back()} className="order-back-btn" style={{ margin: 0, marginBottom: '8px' }}>
            <SvgIcons.ArrowLeft /> Back to Inventory
          </button>
          <h1 className="edit-title">Edit Item</h1>
          <p className="edit-subtitle">Update details for {formData.item_name || 'this item'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        
        {/* BASIC DETAILS */}
        <div className="edit-card">
          <h3 className="edit-section-title">Basic Details</h3>
          
          <div className="form-group">
            <label className="edit-label">Item Name *</label>
            <input 
              type="text" 
              className="edit-input" 
              value={formData.item_name} 
              onChange={e => updateField('item_name', e.target.value)} 
              placeholder="Enter item name" 
              required
            />
          </div>

          <div className="form-group" ref={categoryMenuRef} style={{ position: 'relative' }}>
            <label className="edit-label">Category</label>
            <input 
              type="text" 
              className="edit-input" 
              value={formData.category} 
              onChange={e => { updateField('category', e.target.value); setShowCategoryMenu(true); }} 
              onFocus={() => setShowCategoryMenu(true)}
              placeholder="Enter or select a category" 
            />
            {showCategoryMenu && categories.length > 0 && (
              <div className="custom-dropdown-menu" style={{ top: '100%', marginTop: '4px', zIndex: 100 }}>
                {categories.filter(c => c.toLowerCase().includes(formData.category.toLowerCase())).map(cat => (
                  <button key={cat} type="button" className="custom-dropdown-item" onClick={() => { updateField('category', cat); setShowCategoryMenu(false); }}>
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="edit-label">Internal Description</label>
            <textarea 
              className="edit-input" 
              rows={3} 
              value={formData.description} 
              onChange={e => updateField('description', e.target.value)} 
              placeholder="Enter notes for your staff" 
            />
          </div>
        </div>

        {/* PRICING & STOCK */}
        <div className="edit-card">
          <h3 className="edit-section-title">Pricing & Stock</h3>
          
          <div className="edit-finance-grid">
            <div className="form-group">
              <label className="edit-label">Selling Price (₦) *</label>
              <input type="number" className="edit-input" value={formData.selling_price} onChange={e => updateField('selling_price', e.target.value)} placeholder="Enter selling price" min="0" required />
            </div>
            <div className="form-group">
              <label className="edit-label">Cost Price (₦)</label>
              <input type="number" className="edit-input" value={formData.cost_price} onChange={e => updateField('cost_price', e.target.value)} placeholder="Enter cost price" min="0" />
            </div>
          </div>

          <div className="edit-finance-grid" style={{ marginBottom: 0 }}>
            <div className="form-group">
              <label className="edit-label">Quantity in Stock *</label>
              <input type="number" className="edit-input" value={formData.quantity_on_hand} onChange={e => updateField('quantity_on_hand', e.target.value)} placeholder="Enter quantity" min="0" required />
            </div>
            <div className="form-group">
              <label className="edit-label">Reorder Level</label>
              <input type="number" className="edit-input" value={formData.reorder_level} onChange={e => updateField('reorder_level', e.target.value)} placeholder="Enter reorder level" min="0" />
            </div>
          </div>
        </div>

        {/* WEBSITE STOREFRONT */}
        <div className="edit-card">
          <h3 className="edit-section-title">Website Storefront</h3>
          
          <div className="form-group">
            <label className="edit-label">Product Photo</label>
            <div style={{ border: '2px dashed var(--cresoa-border)', borderRadius: '12px', padding: '1rem', textAlign: 'center', background: 'var(--cresoa-surface)' }}>
              {formData.image_url ? (
                <div style={{ position: 'relative' }}>
                  <img src={formData.image_url} alt="Product" style={{ maxWidth: '100%', maxHeight: '160px', borderRadius: '8px', objectFit: 'cover' }} />
                  <label style={{ display: 'block', marginTop: '12px', color: 'var(--color-primary)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                    Change Photo
                    <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                  </label>
                </div>
              ) : (
                <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--cresoa-text-muted)' }}>
                  {uploadingImage ? <span>Uploading...</span> : (
                    <>
                      <SvgIcons.Image />
                      <span style={{ fontSize: '0.9rem', marginTop: '8px', fontWeight: 600 }}>Tap to upload photo</span>
                    </>
                  )}
                  <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                </label>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="edit-label">Public Web Description</label>
            <textarea className="edit-input" rows={3} value={formData.web_description} onChange={e => updateField('web_description', e.target.value)} placeholder="Enter a description for customers" />
          </div>

          <div className="form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', background: 'var(--cresoa-surface-soft)', padding: '16px', borderRadius: '12px', marginBottom: 0 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--cresoa-text)' }}>List on Website</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--cresoa-text-muted)' }}>Show this product in your store.</div>
            </div>
            <button 
              type="button"
              onClick={() => updateField('is_listed_on_website', !formData.is_listed_on_website)} 
              style={{ 
                width: '50px', height: '28px', borderRadius: '14px', border: 'none', 
                background: formData.is_listed_on_website ? 'var(--color-secondary)' : 'var(--cresoa-border)', 
                position: 'relative', cursor: 'pointer', transition: 'background 0.2s' 
              }}
            >
              <span style={{ position: 'absolute', top: '2px', left: formData.is_listed_on_website ? '24px' : '2px', width: '24px', height: '24px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
            </button>
          </div>
        </div>

      </form>

      {/* FIXED FOOTER */}
      <div className="edit-fixed-footer">
        <button type="button" onClick={promptDelete} disabled={deleting} className="btn-delete-edit">
          <SvgIcons.Trash />
        </button>
        <button type="button" onClick={handleSubmit} disabled={saving} className="cresoa-primary-button btn-save-edit">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* CUSTOM DELETE MODAL */}
      {modalConfig.isOpen && (
        <div className="app-modal-overlay" onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}>
          <div className="app-modal-box" onClick={e => e.stopPropagation()}>
            <h3 className="app-modal-title">{modalConfig.title}</h3>
            <p className="app-modal-message">{modalConfig.message}</p>
            <div className="app-modal-actions">
              <button className="app-modal-btn cancel" onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}>Cancel</button>
              <button className={`app-modal-btn confirm ${modalConfig.isDestructive ? 'destructive' : ''}`} onClick={modalConfig.onConfirm}>{modalConfig.confirmText}</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toastMessage && (
        <div className={`app-toast ${toastType}`}>
          {toastMessage}
        </div>
      )}

    </div>
  )
  }
