'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import { compressImage } from '../../../../lib/compressImage'
import { getSectorOnboardingFields } from '../../../../lib/sector-config'
import '../my-website.css'

// ─── EMBEDDED ICONS ───
const SvgIcons = {
  Save: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>,
  Eye: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
  Plus: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  Trash: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>,
  Image: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>,
  Copy: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>,
  Share: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>,
  Check: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  X: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
}

export default function EditorTab({ businessId }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasWebsite, setHasWebsite] = useState(false)
  const [isEditingUrl, setIsEditingUrl] = useState(false)

  // Core Data
  const [sector, setSector] = useState('fashion')
  const [slug, setSlug] = useState('')
  const [templateId, setTemplateId] = useState('elegant')
  const [aboutText, setAboutText] = useState('')
  const [heroImage, setHeroImage] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [isEnabled, setIsEnabled] = useState(false)
  
  // Dynamic Sector Data & Gallery
  const [sectorData, setSectorData] = useState({})
  const [gallery, setGallery] = useState([])
  
  // Contact Info
  const [businessPhone, setBusinessPhone] = useState('')
  const [businessWhatsapp, setBusinessWhatsapp] = useState('')
  const [businessEmail, setBusinessEmail] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')

  const [previewOpen, setPreviewOpen] = useState(false)
  const [publicUrl, setPublicUrl] = useState('')

  // Custom UI
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState('success')

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg)
    setToastType(type)
    setTimeout(() => setToastMessage(''), 3000)
  }

  useEffect(() => {
    const load = async () => {
      if (!businessId) return
      try {
        const { data: biz } = await supabase.from('businesses').select('*').eq('id', businessId).single()
        if (biz) {
          setSector(biz.sector || biz.business_type || 'fashion')
          setLogoUrl(biz.logo_url || '')
          setBusinessPhone(biz.phone || '')
          setBusinessWhatsapp(biz.whatsapp || '')
          setBusinessEmail(biz.email || '')
          setBusinessAddress(biz.location || '')
        }

        const { data: page } = await supabase.from('business_public_pages').select('*').eq('business_id', businessId).maybeSingle()
        if (page) {
          setHasWebsite(true)
          setSlug(page.slug || '')
          setTemplateId(page.template_id || 'elegant')
          setAboutText(page.about_text || '')
          setHeroImage(page.cover_image_url || '')
          setIsEnabled(page.is_enabled || false)
          setSectorData(page.sector_data || {})
          setGallery(page.gallery_urls || [])
          setPublicUrl(`${window.location.origin}/${page.slug}`)
        }
      } catch (err) {
        console.error('Load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [businessId])

  const handleSave = async () => {
    if (!slug.trim()) { showToast('Website URL is required.', 'error'); return }
    setSaving(true)
    try {
      await supabase.from('businesses').update({
        phone: businessPhone,
        whatsapp: businessWhatsapp,
        email: businessEmail,
        location: businessAddress,
        logo_url: logoUrl
      }).eq('id', businessId)

      const { error } = await supabase.from('business_public_pages').upsert({
        business_id: businessId,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ''),
        template_id: templateId,
        about_text: aboutText,
        cover_image_url: heroImage,
        is_enabled: isEnabled,
        sector_data: sectorData,
        gallery_urls: gallery
      }, { onConflict: 'business_id' })
      
      if (error) throw error
      
      setHasWebsite(true)
      setPublicUrl(`${window.location.origin}/${slug}`)
      setIsEditingUrl(false)
      showToast('Website settings saved successfully')
    } catch (err) {
      showToast(err.message || 'Failed to save settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  const uploadImage = async (file, callback, isGallery = false) => {
    if (!file) return
    setSaving(true)
    try {
      const compressedBlob = await compressImage(file, 200)
      const filePath = `${businessId}/${isGallery ? 'gallery' : 'assets'}-${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage.from('business-assets').upload(filePath, compressedBlob, { contentType: 'image/jpeg' })
      
      if (uploadError) throw uploadError
      
      const { data: urlData } = supabase.storage.from('business-assets').getPublicUrl(filePath)
      
      if (isGallery) {
        callback([...gallery, urlData.publicUrl])
      } else {
        callback(urlData.publicUrl)
      }
      showToast('Image uploaded successfully')
    } catch (err) {
      showToast('Upload failed. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const removeGalleryImage = (indexToRemove) => {
    setGallery(gallery.filter((_, index) => index !== indexToRemove))
  }

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(publicUrl)
    showToast('Website link copied to clipboard')
  }

  const handleShareUrl = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out my website',
          text: 'Visit my new business website on Cresoa',
          url: publicUrl,
        })
      } catch (err) {
        // User cancelled share
      }
    } else {
      // Fallback to WhatsApp
      window.open(`https://wa.me/?text=Check out my website: ${publicUrl}`, '_blank')
    }
  }

  if (loading) return <div className="order-page-loading"><div className="spinner" /></div>

  // ── EMPTY STATE ──
  if (!hasWebsite) {
    return (
      <div className="order-card" style={{ padding: '3rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '80px', height: '80px', marginBottom: '1.5rem', borderRadius: '24px', background: 'rgba(253, 181, 21, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)' }}>
          <SvgIcons.Eye size={36} />
        </div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--cresoa-text)' }}>Build Your Website</h2>
        <p style={{ color: 'var(--cresoa-text-muted)', marginBottom: '2rem', maxWidth: '400px', lineHeight: 1.6 }}>
          Create a beautiful, high-converting website for your business in minutes. No coding required.
        </p>
        <button onClick={() => router.push(`/dashboard/website-onboarding?business_id=${businessId}`)} className="cresoa-primary-button" style={{ padding: '16px 32px', fontSize: '1rem', width: '100%', maxWidth: '300px' }}>
          Start Setup Wizard
        </button>
      </div>
    )
  }

  const sectorFields = getSectorOnboardingFields(sector) || []

  return (
    <div className="edit-order-page" style={{ paddingBottom: '120px' }}>
      
      {/* ── SECTION 1: BRAND & URL ── */}
      <div className="edit-card">
        <h3 className="edit-section-title">Brand & URL</h3>
        
        <div className="form-group">
          <label className="edit-label">Your Website Link</label>
          
          {!isEditingUrl ? (
            <div className="website-url-card">
              <span className="website-url-text">{publicUrl || 'Not set up yet'}</span>
              <div className="website-url-actions">
                <button type="button" className="url-btn" onClick={handleCopyUrl} title="Copy URL">
                  <SvgIcons.Copy />
                </button>
                <button type="button" className="url-btn" onClick={handleShareUrl} title="Share URL">
                  <SvgIcons.Share />
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
               <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--cresoa-surface)', borderRadius: '12px', border: '1.5px solid var(--color-primary)', padding: '0 16px', height: '52px' }}>
                <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>cresoa.com.ng/</span>
                <input 
                  type="text" 
                  value={slug} 
                  onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} 
                  style={{ border: 'none', background: 'transparent', paddingLeft: '4px', fontWeight: 700, fontSize: '1rem', outline: 'none', width: '100%', color: 'var(--cresoa-text)' }} 
                  placeholder="your-business"
                  autoFocus
                />
              </div>
              <button type="button" onClick={() => setIsEditingUrl(false)} className="url-btn" style={{ height: '52px', width: '52px', background: 'var(--color-primary)', color: 'white', border: 'none' }}>
                <SvgIcons.Check />
              </button>
            </div>
          )}
          {!isEditingUrl && (
            <button type="button" onClick={() => setIsEditingUrl(true)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '0.8rem', fontWeight: 600, padding: 0, marginTop: '8px', cursor: 'pointer', textAlign: 'left' }}>
              Edit Website Link
            </button>
          )}
        </div>

        <div className="form-grid-2">
          <div className="form-group">
            <label className="edit-label">Business Logo</label>
            <label className="image-upload-card">
              {logoUrl ? (
                <>
                  <img src={logoUrl} alt="Logo" />
                  <div className="image-upload-overlay">
                    <span style={{ color: 'white', fontWeight: 600, fontSize: '0.85rem' }}>Change</span>
                  </div>
                </>
              ) : (
                <div className="image-upload-label">
                  <SvgIcons.Plus />
                  <span>Upload Logo</span>
                </div>
              )}
              <input type="file" accept="image/*" onChange={(e) => uploadImage(e.target.files[0], setLogoUrl)} style={{ display: 'none' }} />
            </label>
          </div>

          <div className="form-group">
            <label className="edit-label">Hero Cover Image</label>
            <label className="image-upload-card">
              {heroImage ? (
                <>
                  <img src={heroImage} alt="Hero" />
                  <div className="image-upload-overlay">
                    <span style={{ color: 'white', fontWeight: 600, fontSize: '0.85rem' }}>Change</span>
                  </div>
                </>
              ) : (
                <div className="image-upload-label">
                  <SvgIcons.Image />
                  <span>Upload Cover</span>
                </div>
              )}
              <input type="file" accept="image/*" onChange={(e) => uploadImage(e.target.files[0], setHeroImage)} style={{ display: 'none' }} />
            </label>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: ABOUT ── */}
      <div className="edit-card">
        <h3 className="edit-section-title">About Your Business</h3>
        <div className="form-group">
          <textarea 
            className="edit-input"
            value={aboutText} 
            onChange={e => setAboutText(e.target.value)} 
            placeholder="Tell your customers your story, what makes you unique, and why they should choose you..." 
            rows={5} 
            style={{ resize: 'vertical', lineHeight: 1.6 }}
          />
        </div>
      </div>

      {/* ── SECTION 3: SECTOR SPECIFICS ── */}
      {sectorFields.length > 0 && (
        <div className="edit-card">
          <h3 className="edit-section-title" style={{ textTransform: 'capitalize' }}>{sector} Features</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {sectorFields.map(field => (
              <div key={field.id} className="form-group">
                <label className="edit-label">{field.label}</label>
                
                {/* Text / Number */}
                {(field.type === 'text' || field.type === 'number') && (
                  <input 
                    type={field.type} 
                    className="edit-input"
                    value={sectorData[field.id] || ''} 
                    onChange={e => setSectorData({...sectorData, [field.id]: e.target.value})} 
                    placeholder={field.placeholder}
                  />
                )}

                {/* Boolean Toggle */}
                {field.type === 'boolean' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button 
                      type="button"
                      onClick={() => setSectorData({...sectorData, [field.id]: !sectorData[field.id]})}
                      style={{ width: '50px', height: '28px', borderRadius: '14px', border: 'none', background: sectorData[field.id] ? 'var(--color-secondary)' : 'var(--cresoa-border)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}
                    >
                      <span style={{ position: 'absolute', top: '2px', left: sectorData[field.id] ? '24px' : '2px', width: '24px', height: '24px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
                    </button>
                    <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--cresoa-text)' }}>{sectorData[field.id] ? 'Enabled' : 'Disabled'}</span>
                  </div>
                )}

                {/* Single Image Upload */}
                {field.type === 'image' && (
                  <label className="image-upload-card" style={{ minHeight: '160px' }}>
                    {sectorData[field.id] ? (
                      <>
                        <img src={sectorData[field.id]} alt={field.label} />
                        <div className="image-upload-overlay">
                           <span style={{ color: 'white', fontWeight: 600, fontSize: '0.85rem' }}>Change Image</span>
                        </div>
                      </>
                    ) : (
                      <div className="image-upload-label">
                        <SvgIcons.Image />
                        <span>Click to upload</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" onChange={(e) => uploadImage(e.target.files[0], (url) => setSectorData({...sectorData, [field.id]: url}))} style={{ display: 'none' }} />
                  </label>
                )}

                {/* Gallery Upload */}
                {field.type === 'gallery' && (
                  <div className="gallery-grid">
                    {gallery.map((img, i) => (
                      <div key={i} className="gallery-item">
                        <img src={img} alt={`Gallery ${i}`} />
                        <button type="button" className="gallery-remove" onClick={() => removeGalleryImage(i)}>
                          <SvgIcons.X size={14} />
                        </button>
                      </div>
                    ))}
                    <label className="image-upload-card" style={{ minHeight: '100px', padding: '10px' }}>
                      <div className="image-upload-label">
                        <SvgIcons.Plus size={20} />
                        <span style={{ fontSize: '0.75rem' }}>Add Photo</span>
                      </div>
                      <input type="file" accept="image/*" onChange={(e) => uploadImage(e.target.files[0], setGallery, true)} style={{ display: 'none' }} />
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SECTION 4: CONTACT ── */}
       <div className="edit-card">
        <h3 className="edit-section-title">Contact Information</h3>
        <div className="form-grid-2">
          <div className="form-group">
            <label className="edit-label">Phone Number</label>
            <input type="text" className="edit-input" value={businessPhone} onChange={e => setBusinessPhone(e.target.value)} placeholder="Enter phone number" />
          </div>
          <div className="form-group">
            <label className="edit-label">WhatsApp Number</label>
            <input type="text" className="edit-input" value={businessWhatsapp} onChange={e => setBusinessWhatsapp(e.target.value)} placeholder="Enter WhatsApp number" />
          </div>
          <div className="form-group">
            <label className="edit-label">Email Address</label>
            <input type="email" className="edit-input" value={businessEmail} onChange={e => setBusinessEmail(e.target.value)} placeholder="Enter email address" />
          </div>
          <div className="form-group">
            <label className="edit-label">Physical Address</label>
            <input type="text" className="edit-input" value={businessAddress} onChange={e => setBusinessAddress(e.target.value)} placeholder="Enter physical address" />
          </div>
        </div>
      </div>

      {/* ── SECTION 5: STATUS ── */}
      <div className="edit-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 className="edit-section-title" style={{ marginBottom: '4px' }}>Website Status</h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--cresoa-text-muted)' }}>
            {isEnabled ? 'Your website is live and visible to customers.' : 'Your website is currently hidden from the public.'}
          </p>
        </div>
        <button 
          type="button"
          onClick={() => setIsEnabled(!isEnabled)} 
          style={{ width: '56px', height: '28px', borderRadius: '14px', border: 'none', background: isEnabled ? 'var(--color-secondary)' : 'var(--cresoa-border)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}
        >
          <span style={{ position: 'absolute', top: '2px', left: isEnabled ? '30px' : '2px', width: '24px', height: '24px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
        </button>
      </div>

      {/* ── PREVIEW MODAL ── */}
      {previewOpen && (
        <div className="app-modal-overlay" onClick={() => setPreviewOpen(false)} style={{ zIndex: 9999 }}>
          <div className="app-modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px', padding: '16px', background: 'var(--cresoa-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Live Preview</h3>
              <button type="button" onClick={() => setPreviewOpen(false)} style={{ background: 'var(--cresoa-surface-soft)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cresoa-text)' }}>
                <SvgIcons.X />
              </button>
            </div>
            
            <div className="phone-mockup">
              <div style={{ width: '100%', height: '100%', overflowY: 'auto' }}>
                <div style={{ padding: '4rem 2rem', textAlign: 'center', background: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.8)), url(${heroImage || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80'}) center/cover`, color: '#fff', minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  {logoUrl && <img src={logoUrl} style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 1rem', border: '2px solid #fff' }} alt="Logo" />}
                  <h1 style={{ margin: 0, fontSize: '2rem', fontFamily: 'serif' }}>{aboutText.split('.')[0] || 'Your Business'}</h1>
                  <p style={{ opacity: 0.9, marginTop: '0.5rem', fontSize: '0.85rem' }}>{businessAddress}</p>
                </div>
                <div style={{ padding: '2rem', textAlign: 'center', color: '#333' }}>
                  <p style={{ lineHeight: 1.6, fontSize: '0.9rem' }}>{aboutText || 'Your business story will appear here.'}</p>
                  <div style={{ marginTop: '1.5rem' }}>
                    <span style={{ background: '#25D366', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: '24px', fontSize: '0.85rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      Chat on WhatsApp
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FIXED BOTTOM FOOTER ── */}
      <div className="edit-fixed-footer">
        <button type="button" onClick={() => setPreviewOpen(true)} className="order-btn-secondary" style={{ flex: 1, padding: '14px' }}>
          <SvgIcons.Eye /> Preview
        </button>
        <button type="button" onClick={handleSave} disabled={saving} className="cresoa-primary-button" style={{ flex: 2, padding: '14px' }}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* ── TOAST ── */}
      {toastMessage && (
        <div className={`app-toast ${toastType}`}>
          {toastMessage}
        </div>
      )}

    </div>
  )
}
