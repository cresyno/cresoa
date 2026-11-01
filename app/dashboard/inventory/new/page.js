'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../../lib/getBusinessId'
import { compressImage } from '../../../../lib/compressImage'
import '../../../globals.css'

const STEPS = [
  { id: 1, label: 'Basics' },
  { id: 2, label: 'Pricing & Stock' },
  { id: 3, label: 'Website' },
  { id: 4, label: 'Review' },
]

const INITIAL_FORM = {
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
}

// ─── EMBEDDED ICONS ───
const SvgIcons = {
  ArrowLeft: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>,
  ChevronDown: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>,
  X: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  Image: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
}

export default function NewInventoryItemPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = getCurrentBusinessId() || searchParams.get('business_id')

  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState(INITIAL_FORM)
  const [categories, setCategories] = useState([])
  
  // UI State
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [showCategoryMenu, setShowCategoryMenu] = useState(false)
  const categoryMenuRef = useRef(null)

  // Custom UI
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
    if (!businessId) { router.push('/dashboard'); return }
    
    // Fetch existing categories for suggestions
    const fetchCategories = async () => {
      try {
        const { data } = await supabase
          .from('inventory_items')
          .select('category')
          .eq('business_id', businessId)
          .not('category', 'is', null)
        
        const uniqueCats = [...new Set((data || []).map(item => item.category))]
        setCategories(uniqueCats)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchCategories()
  }, [businessId, router])

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

  const validateStep = () => {
    if (step === 1 && !formData.item_name.trim()) {
      showToast('Item name is required.', 'error'); return false
    }
    if (step === 2) {
      if (!formData.selling_price) { showToast('Selling price is required.', 'error'); return false }
      if (!formData.quantity_on_hand) { showToast('Quantity is required.', 'error'); return false }
    }
    return true
  }

  const handleNext = () => {
    if (validateStep()) setStep(prev => Math.min(prev + 1, STEPS.length))
  }

  const handleBack = () => setStep(prev => Math.max(prev - 1, 1))

  const handleSubmit = async () => {
    if (!validateStep()) return
    setSaving(true)

    try {
      const { error } = await supabase.from('inventory_items').insert({
        business_id: businessId,
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (error) throw error

      showToast('Item added successfully')
      router.push(`/dashboard/inventory?business_id=${businessId}`)
    } catch (err) {
      showToast(err.message || 'Failed to save item.', 'error')
      setSaving(false)
    }
  }

  if (loading) return <div className="order-page-loading"><div className="spinner" /></div>

  return (
    <div className="wizard-page">
      {/* ─── HEADER & PROGRESS ─── */}
      <div className="wizard-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <button onClick={() => router.back()} className="order-back-btn" style={{ margin: 0 }}>
            <SvgIcons.ArrowLeft /> Cancel
          </button>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)' }}>Step {step} of {STEPS.length}</span>
        </div>
        
        <div className="wizard-progress-bar">
          {STEPS.map((s, idx) => (
            <div key={s.id} className={`wizard-progress-segment ${idx + 1 <= step ? 'active' : ''}`} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--cresoa-text-muted)' }}>
          <span>{STEPS[step - 1].label}</span>
          <span>{Math.round(((step - 1) / (STEPS.length - 1)) * 100)}% Complete</span>
        </div>
      </div>

      {/* ─── SCROLLABLE CONTENT ─── */}
      <div className="wizard-content">
        
        {/* STEP 1: BASICS */}
        {step === 1 && (
          <div className="wizard-step">
            <h2 className="wizard-title">Basic Details</h2>
            <p className="wizard-subtitle">What item are you adding to your inventory?</p>

            <div className="form-group">
              <label className="order-label">Item Name *</label>
              <input type="text" className="order-input" value={formData.item_name} onChange={e => updateField('item_name', e.target.value)} placeholder="Enter item name" autoFocus />
            </div>

            <div className="form-group" style={{ position: 'relative' }} ref={categoryMenuRef}>
              <label className="order-label">Category</label>
              <div className="custom-dropdown-wrapper">
                <input 
                  type="text" 
                  className="order-input" 
                  value={formData.category} 
                  onChange={e => { updateField('category', e.target.value); setShowCategoryMenu(true); }} 
                  onFocus={() => setShowCategoryMenu(true)}
                  placeholder="Enter or select a category" 
                />
                {showCategoryMenu && categories.length > 0 && (
                  <div className="custom-dropdown-menu" style={{ top: '100%', marginTop: '4px', zIndex: 100 }}>
                    {categories.filter(c => c.toLowerCase().includes(formData.category.toLowerCase())).map(cat => (
                      <button key={cat} className="custom-dropdown-item" onClick={() => { updateField('category', cat); setShowCategoryMenu(false); }}>
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="order-label">Internal Description</label>
              <textarea className="order-input" rows={3} value={formData.description} onChange={e => updateField('description', e.target.value)} placeholder="Enter notes for your staff (not visible to customers)" />
            </div>
          </div>
        )}

        {/* STEP 2: PRICING & STOCK */}
        {step === 2 && (
          <div className="wizard-step">
            <h2 className="wizard-title">Pricing & Stock</h2>
            <p className="wizard-subtitle">Set the price and current stock levels.</p>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="order-label">Selling Price (₦) *</label>
                <input type="number" className="order-input" value={formData.selling_price} onChange={e => updateField('selling_price', e.target.value)} placeholder="Enter selling price" min="0" />
              </div>
              <div className="form-group">
                <label className="order-label">Cost Price (₦)</label>
                <input type="number" className="order-input" value={formData.cost_price} onChange={e => updateField('cost_price', e.target.value)} placeholder="Enter cost price" min="0" />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="order-label">Quantity in Stock *</label>
                <input type="number" className="order-input" value={formData.quantity_on_hand} onChange={e => updateField('quantity_on_hand', e.target.value)} placeholder="Enter quantity" min="0" />
              </div>
              <div className="form-group">
                <label className="order-label">Reorder Level</label>
                <input type="number" className="order-input" value={formData.reorder_level} onChange={e => updateField('reorder_level', e.target.value)} placeholder="Enter reorder level" min="0" />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: WEBSITE */}
        {step === 3 && (
          <div className="wizard-step">
            <h2 className="wizard-title">Website Storefront</h2>
            <p className="wizard-subtitle">Optional: List this item on your public store.</p>

            <div className="form-group">
              <label className="order-label">Product Photo</label>
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
              <label className="order-label">Public Web Description</label>
              <textarea className="order-input" rows={3} value={formData.web_description} onChange={e => updateField('web_description', e.target.value)} placeholder="Enter a description for customers (visible on your website)" />
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', background: 'var(--cresoa-surface-soft)', padding: '16px', borderRadius: '12px' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--cresoa-text)' }}>List on Website</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--cresoa-text-muted)' }}>Show this product in your store.</div>
              </div>
              <button 
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
        )}

        {/* STEP 4: REVIEW */}
        {step === 4 && (
          <div className="wizard-step">
            <h2 className="wizard-title">Review Item</h2>
            <p className="wizard-subtitle">Confirm the details before adding to inventory.</p>

            <div className="order-card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--cresoa-border)', paddingBottom: '16px', marginBottom: '16px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: 'var(--cresoa-surface-soft)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   {formData.image_url ? <img src={formData.image_url} alt="Product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <SvgIcons.Image />}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{formData.item_name}</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: 'var(--cresoa-text-muted)' }}>{formData.category || 'Uncategorized'}</p>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.9rem' }}>
                <div><span style={{ color: 'var(--cresoa-text-muted)' }}>Selling Price:</span> <br/><strong>₦{Number(formData.selling_price).toLocaleString('en-NG')}</strong></div>
                <div><span style={{ color: 'var(--cresoa-text-muted)' }}>Cost Price:</span> <br/><strong>₦{Number(formData.cost_price || 0).toLocaleString('en-NG')}</strong></div>
                <div><span style={{ color: 'var(--cresoa-text-muted)' }}>Initial Stock:</span> <br/><strong>{formData.quantity_on_hand}</strong></div>
                <div><span style={{ color: 'var(--cresoa-text-muted)' }}>Reorder Level:</span> <br/><strong>{formData.reorder_level || '0'}</strong></div>
                <div style={{ gridColumn: '1 / -1', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid var(--cresoa-border)' }}>
                   <span style={{ color: 'var(--cresoa-text-muted)' }}>Website Status:</span> <br/>
                   <strong style={{ color: formData.is_listed_on_website ? 'var(--color-secondary)' : 'var(--cresoa-text-muted)' }}>
                     {formData.is_listed_on_website ? 'Listed on Website' : 'Not Listed'}
                   </strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── FIXED BOTTOM NAVIGATION ─── */}
      <div className="wizard-footer">
        {step > 1 ? (
          <button onClick={handleBack} className="order-btn-secondary" style={{ flex: 1, padding: '14px' }}>Back</button>
        ) : <div style={{ flex: 1 }} />}
        
        {step < STEPS.length ? (
          <button onClick={handleNext} className="cresoa-primary-button" style={{ flex: 2, padding: '14px' }}>
            Continue
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={saving} className="cresoa-primary-button" style={{ flex: 2, padding: '14px' }}>
            {saving ? 'Saving...' : 'Save Item'}
          </button>
        )}
      </div>

      {/* ─── TOAST ─── */}
      {toastMessage && (
        <div className={`app-toast ${toastType}`}>
          {toastMessage}
        </div>
      )}

    </div>
  )
    }
