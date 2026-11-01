'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import { compressImage } from '../../../../lib/compressImage'
import { getSectorOnboardingFields } from '../../../../lib/sector-config'
import { templates, getTemplate } from '../../../../lib/templateRegistry' // <-- Imported your registry
import '../my-website.css'

// ─── EMBEDDED ICONS ───
const SvgIcons = {
  Save: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>,
  Eye: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
  Plus: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  Image: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>,
  Copy: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>,
  Share: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>,
  Check: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  X: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  Google: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>,
  Trash: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
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
  const [businessName, setBusinessName] = useState('')
  
  // Dynamic Data
  const [sectorData, setSectorData] = useState({})
  const [gallery, setGallery] = useState([])
  
  // Structured Data
  const [services, setServices] = useState([])
  const [testimonials, setTestimonials] = useState([])
  const [faqs, setFaqs] = useState([])
  const [businessHours, setBusinessHours] = useState('')

  // Input states for adding new items
  const [newService, setNewService] = useState({ name: '', price: '', desc: '' })
  const [showAddService, setShowAddService] = useState(false)
  
  const [newTestimonial, setNewTestimonial] = useState({ name: '', text: '' })
  const [showAddTestimonial, setShowAddTestimonial] = useState(false)

  const [newFaq, setNewFaq] = useState({ q: '', a: '' })
  const [showAddFaq, setShowAddFaq] = useState(false)

  // Contact Info
  const [businessPhone, setBusinessPhone] = useState('')
  const [businessWhatsapp, setBusinessWhatsapp] = useState('')
  const [businessEmail, setBusinessEmail] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')

  // SEO State
  const [seoRequested, setSeoRequested] = useState(false)
  const [requestingSeo, setRequestingSeo] = useState(false)

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
          setBusinessName(biz.name || 'My Business')
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
          
          const data = page.sector_data || {}
          setSectorData(data)
          setGallery(page.gallery_urls || [])
          setServices(data.services || [])
          setTestimonials(data.testimonials || [])
          setFaqs(data.faqs || [])
          setBusinessHours(data.business_hours || '')

          setPublicUrl(`${window.location.origin}/${page.slug}`)
        }

        const { data: seo } = await supabase.from('seo_requests').select('id').eq('business_id', businessId).eq('status', 'pending').maybeSingle()
        if (seo) setSeoRequested(true)

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

      const updatedSectorData = {
        ...sectorData,
        services,
        testimonials,
        faqs,
        business_hours: businessHours
      }

      const { error } = await supabase.from('business_public_pages').upsert({
        business_id: businessId,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ''),
        template_id: templateId,
        about_text: aboutText,
        cover_image_url: heroImage,
        is_enabled: isEnabled,
        sector_data: updatedSectorData,
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

  const handleRequestSeo = async () => {
    setRequestingSeo(true)
    try {
      const { error } = await supabase.from('seo_requests').insert({ business_id: businessId })
      if (error) throw error
      setSeoRequested(true)
      showToast('Request submitted successfully. We will notify Google shortly.')
    } catch (err) {
      showToast('Failed to submit request.', 'error')
    } finally {
      setRequestingSeo(false)
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
        await navigator.share({ title: 'Check out my website', text: 'Visit my new business website on Cresoa', url: publicUrl })
      } catch (err) {}
    } else {
      window.open(`https://wa.me/?text=Check out my website: ${publicUrl}`, '_blank')
    }
  }

  // ── Dynamic List Handlers ──
  const handleAddService = () => {
    if (!newService.name) return
    setServices([...services, newService])
    setNewService({ name: '', price: '', desc: '' })
    setShowAddService(false)
  }

  const handleAddTestimonial = () => {
    if (!newTestimonial.name || !newTestimonial.text) return
    setTestimonials([...testimonials, newTestimonial])
    setNewTestimonial({ name: '', text: '' })
    setShowAddTestimonial(false)
  }

  const handleAddFaq = () => {
    if (!newFaq.q || !newFaq.a) return
    setFaqs([...faqs, newFaq])
    setNewFaq({ q: '', a: '' })
    setShowAddFaq(false)
  }

  if (loading) return <div className="order-page-loading"><div className="spinner" /></div>

  if (!hasWebsite) {
    return (
      <div className="website-card" style={{ padding: '3rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
  
  // Get the actual live template component for the preview
  const PreviewTemplateComponent = getTemplate(templateId)

  return (
    <div className="website-editor-page">
      
      {/* 1. BRAND & URL */}
      <div className="website-card">
        <h3 className="website-section-title">Brand & URL</h3>
        
        <div className="website-form-group">
          <label className="website-label">Your Website Link</label>
          
          {!isEditingUrl ? (
            <>
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
              <button type="button" onClick={() => setIsEditingUrl(true)} className="edit-url-btn">
                Edit Website Link
              </button>
            </>
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
        </div>

        <div className="form-grid-2">
          <div className="website-form-group" style={{ marginBottom: 0 }}>
            <label className="website-label">Business Logo</label>
            <label className="image-upload-card">
              {logoUrl ? (
                <>
                  <img src={logoUrl} alt="Logo" />
                  <div className="image-upload-overlay"><span style={{ color: 'white', fontWeight: 600, fontSize: '0.85rem' }}>Change</span></div>
                </>
              ) : (
                <div className="image-upload-label"><SvgIcons.Plus /><span>Upload Logo</span></div>
              )}
              <input type="file" accept="image/*" onChange={(e) => uploadImage(e.target.files[0], setLogoUrl)} style={{ display: 'none' }} />
            </label>
          </div>

          <div className="website-form-group" style={{ marginBottom: 0 }}>
            <label className="website-label">Hero Cover Image</label>
            <label className="image-upload-card">
              {heroImage ? (
                <>
                  <img src={heroImage} alt="Hero" />
                  <div className="image-upload-overlay"><span style={{ color: 'white', fontWeight: 600, fontSize: '0.85rem' }}>Change</span></div>
                </>
              ) : (
                <div className="image-upload-label"><SvgIcons.Image /><span>Upload Cover</span></div>
              )}
              <input type="file" accept="image/*" onChange={(e) => uploadImage(e.target.files[0], setHeroImage)} style={{ display: 'none' }} />
            </label>
          </div>
        </div>
      </div>

      {/* 2. TEMPLATE SELECTION (VISUAL) */}
      <div className="website-card">
        <h3 className="website-section-title">Website Style</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--cresoa-text-muted)', marginBottom: '1rem' }}>Choose the overall look and feel of your website.</p>
        <div className="template-grid">
          {templates.map(tpl => (
            <div
              key={tpl.id}
              className={`template-card ${templateId === tpl.id ? 'active' : ''}`}
              onClick={() => setTemplateId(tpl.id)}
            >
              <div className="template-preview" style={{ background: tpl.preview }} />
              <div className="template-info">
                <span className="template-name">{tpl.name}</span>
                <span className="template-desc">{tpl.description}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. ABOUT */}
      <div className="website-card">
        <h3 className="website-section-title">About Your Business</h3>
        <div className="website-form-group" style={{ marginBottom: 0 }}>
          <textarea 
            className="website-input"
            value={aboutText} 
            onChange={e => setAboutText(e.target.value)} 
            placeholder="Tell your customers your story, what makes you unique, and why they should choose you..." 
            rows={5} 
          />
        </div>
      </div>

      {/* 4. SERVICES & PRICING */}
      <div className="website-card">
        <h3 className="website-section-title">Services & Pricing</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--cresoa-text-muted)', marginBottom: '1rem' }}>What do you offer? Adding services helps customers know exactly what to ask you for.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '1rem' }}>
          {services.map((srv, idx) => (
            <div key={idx} style={{ background: 'var(--cresoa-surface-soft)', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{srv.name} {srv.price && <span style={{ color: 'var(--color-primary)' }}> - ₦{Number(srv.price).toLocaleString()}</span>}</div>
                {srv.desc && <div style={{ fontSize: '0.85rem', color: 'var(--cresoa-text-muted)', marginTop: '4px' }}>{srv.desc}</div>}
              </div>
              <button type="button" onClick={() => setServices(services.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '4px' }}>
                <SvgIcons.Trash />
              </button>
            </div>
          ))}
        </div>

             {showAddService ? (
          <div style={{ background: 'var(--cresoa-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--cresoa-border)' }}>
            <div className="website-form-group">
              <label className="website-label">Service Name</label>
              <input type="text" className="website-input" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} placeholder="e.g. Custom Senator" />
            </div>
            <div className="website-form-group">
              <label className="website-label">Starting Price (Optional)</label>
              <input type="number" className="website-input" value={newService.price} onChange={e => setNewService({...newService, price: e.target.value})} placeholder="e.g. 35000" />
            </div>
            <div className="website-form-group">
              <label className="website-label">Short Description (Optional)</label>
              <input type="text" className="website-input" value={newService.desc} onChange={e => setNewService({...newService, desc: e.target.value})} placeholder="e.g. Includes fabric and tailoring" />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={() => setShowAddService(false)} className="order-btn-secondary" style={{ flex: 1, padding: '10px' }}>Cancel</button>
              <button type="button" onClick={handleAddService} className="cresoa-primary-button" style={{ flex: 1, padding: '10px' }}>Save Service</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setShowAddService(true)} className="wizard-add-btn" style={{ padding: '16px', borderRadius: '12px' }}>
            <SvgIcons.Plus />
            <span>Add a Service</span>
          </button>
        )}
      </div>

      {/* 5. TESTIMONIALS */}
      <div className="website-card">
        <h3 className="website-section-title">Customer Testimonials</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--cresoa-text-muted)', marginBottom: '1rem' }}>Nothing builds trust like real reviews. Add what your happy customers have said.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '1rem' }}>
          {testimonials.map((t, idx) => (
            <div key={idx} style={{ background: 'var(--cresoa-surface-soft)', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>"{t.text}"</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--cresoa-text-muted)', marginTop: '4px' }}>- {t.name}</div>
              </div>
              <button type="button" onClick={() => setTestimonials(testimonials.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '4px' }}>
                <SvgIcons.Trash />
              </button>
            </div>
          ))}
        </div>

        {showAddTestimonial ? (
          <div style={{ background: 'var(--cresoa-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--cresoa-border)' }}>
            <div className="website-form-group">
              <label className="website-label">Customer Name</label>
              <input type="text" className="website-input" value={newTestimonial.name} onChange={e => setNewTestimonial({...newTestimonial, name: e.target.value})} placeholder="e.g. Amaka Okafor" />
            </div>
            <div className="website-form-group">
              <label className="website-label">Review</label>
              <textarea className="website-input" value={newTestimonial.text} onChange={e => setNewTestimonial({...newTestimonial, text: e.target.value})} placeholder="e.g. The best tailor in Lagos! My dress was perfect." rows={2} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={() => setShowAddTestimonial(false)} className="order-btn-secondary" style={{ flex: 1, padding: '10px' }}>Cancel</button>
              <button type="button" onClick={handleAddTestimonial} className="cresoa-primary-button" style={{ flex: 1, padding: '10px' }}>Save Review</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setShowAddTestimonial(true)} className="wizard-add-btn" style={{ padding: '16px', borderRadius: '12px' }}>
            <SvgIcons.Plus />
            <span>Add a Testimonial</span>
          </button>
        )}
      </div>

      {/* 6. FAQS */}
      <div className="website-card">
        <h3 className="website-section-title">Frequently Asked Questions</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--cresoa-text-muted)', marginBottom: '1rem' }}>Answer common questions so you don't have to repeat yourself on WhatsApp.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '1rem' }}>
          {faqs.map((faq, idx) => (
            <div key={idx} style={{ background: 'var(--cresoa-surface-soft)', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{faq.q}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--cresoa-text-muted)', marginTop: '4px' }}>{faq.a}</div>
              </div>
              <button type="button" onClick={() => setFaqs(faqs.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '4px' }}>
                <SvgIcons.Trash />
              </button>
            </div>
          ))}
        </div>

        {showAddFaq ? (
          <div style={{ background: 'var(--cresoa-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--cresoa-border)' }}>
            <div className="website-form-group">
              <label className="website-label">Question</label>
              <input type="text" className="website-input" value={newFaq.q} onChange={e => setNewFaq({...newFaq, q: e.target.value})} placeholder="e.g. Do you deliver nationwide?" />
            </div>
            <div className="website-form-group">
              <label className="website-label">Answer</label>
              <textarea className="website-input" value={newFaq.a} onChange={e => setNewFaq({...newFaq, a: e.target.value})} placeholder="e.g. Yes, we deliver via GIG Logistics." rows={2} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={() => setShowAddFaq(false)} className="order-btn-secondary" style={{ flex: 1, padding: '10px' }}>Cancel</button>
              <button type="button" onClick={handleAddFaq} className="cresoa-primary-button" style={{ flex: 1, padding: '10px' }}>Save FAQ</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setShowAddFaq(true)} className="wizard-add-btn" style={{ padding: '16px', borderRadius: '12px' }}>
            <SvgIcons.Plus />
            <span>Add an FAQ</span>
          </button>
        )}
      </div>

      {/* 7. SECTOR SPECIFICS */}
      {sectorFields.length > 0 && (
        <div className="website-card">
          <h3 className="website-section-title" style={{ textTransform: 'capitalize' }}>{sector} Portfolio</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {sectorFields.map(field => (
              <div key={field.id} className="website-form-group" style={{ marginBottom: 0 }}>
                <label className="website-label">{field.label}</label>
                
                {(field.type === 'text' || field.type === 'number') && (
                  <input type={field.type} className="website-input" value={sectorData[field.id] || ''} onChange={e => setSectorData({...sectorData, [field.id]: e.target.value})} placeholder={field.placeholder} />
                )}

                {field.type === 'boolean' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button type="button" onClick={() => setSectorData({...sectorData, [field.id]: !sectorData[field.id]})} style={{ width: '50px', height: '28px', borderRadius: '14px', border: 'none', background: sectorData[field.id] ? 'var(--color-secondary)' : 'var(--cresoa-border)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                      <span style={{ position: 'absolute', top: '2px', left: sectorData[field.id] ? '24px' : '2px', width: '24px', height: '24px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
                    </button>
                    <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--cresoa-text)' }}>{sectorData[field.id] ? 'Enabled' : 'Disabled'}</span>
                  </div>
                )}

                {field.type === 'image' && (
                  <label className="image-upload-card" style={{ minHeight: '160px' }}>
                    {sectorData[field.id] ? (
                      <>
                        <img src={sectorData[field.id]} alt={field.label} />
                        <div className="image-upload-overlay"><span style={{ color: 'white', fontWeight: 600, fontSize: '0.85rem' }}>Change Image</span></div>
                      </>
                    ) : (
                      <div className="image-upload-label"><SvgIcons.Image /><span>Click to upload</span></div>
                    )}
                    <input type="file" accept="image/*" onChange={(e) => uploadImage(e.target.files[0], (url) => setSectorData({...sectorData, [field.id]: url}))} style={{ display: 'none' }} />
                  </label>
                )}

                {field.type === 'gallery' && (
                  <div className="gallery-grid">
                    {gallery.map((img, i) => (
                      <div key={i} className="gallery-item">
                        <img src={img} alt={`Gallery ${i}`} />
                        <button type="button" className="gallery-remove" onClick={() => removeGalleryImage(i)}><SvgIcons.X size={14} /></button>
                      </div>
                    ))}
                    <label className="image-upload-card" style={{ minHeight: '100px', padding: '10px' }}>
                      <div className="image-upload-label"><SvgIcons.Plus size={20} /><span style={{ fontSize: '0.75rem' }}>Add Photo</span></div>
                      <input type="file" accept="image/*" onChange={(e) => uploadImage(e.target.files[0], setGallery, true)} style={{ display: 'none' }} />
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. CONTACT & HOURS */}
      <div className="website-card">
        <h3 className="website-section-title">Contact & Hours</h3>
        <div className="form-grid-2">
          <div className="website-form-group">
            <label className="website-label">Phone Number</label>
            <input type="text" className="website-input" value={businessPhone} onChange={e => setBusinessPhone(e.target.value)} placeholder="Enter phone number" />
          </div>
          <div className="website-form-group">
            <label className="website-label">WhatsApp Number</label>
            <input type="text" className="website-input" value={businessWhatsapp} onChange={e => setBusinessWhatsapp(e.target.value)} placeholder="Enter WhatsApp number" />
          </div>
          <div className="website-form-group">
            <label className="website-label">Email Address</label>
            <input type="email" className="website-input" value={businessEmail} onChange={e => setBusinessEmail(e.target.value)} placeholder="Enter email address" />
          </div>
          <div className="website-form-group">
            <label className="website-label">Physical Address</label>
            <input type="text" className="website-input" value={businessAddress} onChange={e => setBusinessAddress(e.target.value)} placeholder="Enter physical address" />
          </div>
        </div>
        <div className="website-form-group" style={{ marginTop: '16px', marginBottom: 0 }}>
          <label className="website-label">Business Hours</label>
          <input type="text" className="website-input" value={businessHours} onChange={e => setBusinessHours(e.target.value)} placeholder="e.g. Mon-Fri: 9am - 6pm, Sat: 10am - 4pm" />
        </div>
      </div>

      {/* 9. SEO BOOST */}
      <div className="website-card">
        <h3 className="website-section-title">Search Engine Visibility</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--cresoa-text-muted)', marginBottom: '1rem', lineHeight: 1.5 }}>
          Want your website to appear when customers search for you on Google? Request an index update.
        </p>
        
        <div style={{ background: 'var(--cresoa-surface-soft)', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--cresoa-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <SvgIcons.Google /> Search
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--cresoa-text-muted)' }}>
              {seoRequested ? 'Request pending. We are on it.' : 'Not yet requested'}
            </div>
          </div>
          <button 
            type="button"
            onClick={handleRequestSeo}
            disabled={requestingSeo || seoRequested}
            className={seoRequested ? "order-btn-secondary" : "cresoa-primary-button"}
            style={{ padding: '10px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
          >
            {requestingSeo ? 'Submitting...' : seoRequested ? 'Requested' : 'Boost Visibility'}
          </button>
        </div>
      </div>

      {/* 10. STATUS */}
      <div className="website-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 className="website-section-title" style={{ marginBottom: '4px' }}>Website Status</h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--cresoa-text-muted)' }}>
            {isEnabled ? 'Your website is live and visible to customers.' : 'Your website is currently hidden from the public.'}
          </p>
        </div>
        <button type="button" onClick={() => setIsEnabled(!isEnabled)} style={{ width: '56px', height: '28px', borderRadius: '14px', border: 'none', background: isEnabled ? 'var(--color-secondary)' : 'var(--cresoa-border)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
          <span style={{ position: 'absolute', top: '2px', left: isEnabled ? '30px' : '2px', width: '24px', height: '24px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
        </button>
      </div>

      {/* PREVIEW MODAL */}
      {previewOpen && (
        <div className="app-modal-overlay" onClick={() => setPreviewOpen(false)} style={{ zIndex: 9999 }}>
          <div className="app-modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px', padding: '16px', background: 'var(--cresoa-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Live Preview</h3>
              <button type="button" onClick={() => setPreviewOpen(false)} style={{ background: 'var(--cresoa-surface-soft)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cresoa-text)' }}>
                <SvgIcons.X />
              </button>
            </div>
            
            <div className="phone-mockup" style={{ overflow: 'hidden', background: '#fff' }}>
              <div style={{ width: '100%', height: '100%', overflowY: 'auto' }}>
                {/* 
                  RENDER THE ACTUAL TEMPLATE COMPONENT FROM REGISTRY 
                  We pass all the dynamic data the template needs to render
                */}
                <PreviewTemplateComponent 
                  business={{ name: businessName, logo_url: logoUrl, phone: businessPhone, whatsapp: businessWhatsapp, email: businessEmail, location: businessAddress }}
                  page={{ about_text: aboutText, cover_image_url: heroImage, gallery_urls: gallery, sector_data: { ...sectorData, services, testimonials, faqs, business_hours: businessHours } }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FIXED FOOTER */}
      <div className="website-fixed-footer">
        <button type="button" onClick={() => setPreviewOpen(true)} className="order-btn-secondary" style={{ flex: 1, padding: '14px' }}>
          <SvgIcons.Eye /> Preview
        </button>
        <button type="button" onClick={handleSave} disabled={saving} className="cresoa-primary-button" style={{ flex: 2, padding: '14px' }}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* TOAST */}
      {toastMessage && (
        <div className={`app-toast ${toastType}`}>
          {toastMessage}
        </div>
      )}
    </div>
  )
                                                                                                                   }
