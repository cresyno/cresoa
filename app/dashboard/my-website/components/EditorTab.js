'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import { compressImage } from '../../../../lib/compressImage'
import { getSectorOnboardingFields } from '../../../../lib/sector-config'
import { templates, getTemplate } from '../../../../lib/templateRegistry'
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

const NIGERIAN_STATES = ['Lagos', 'Abuja', 'Rivers', 'Oyo', 'Kano', 'Enugu', 'Anambra', 'Ogun', 'Kaduna', 'Delta']

export default function EditorTab({ businessId }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasWebsite, setHasWebsite] = useState(false)
  const [isEditingUrl, setIsEditingUrl] = useState(false)

  // Core Data
  const [sector, setSector] = useState('fashion')
  const [slug, setSlug] = useState('')
  const [templateId, setTemplateId] = useState('classic-gold')
  const [aboutText, setAboutText] = useState('')
  const [heroImage, setHeroImage] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [isEnabled, setIsEnabled] = useState(false)
  const [businessName, setBusinessName] = useState('')
  
  // Dynamic Data
  const [sectorData, setSectorData] = useState({})
  const [portfolio, setPortfolio] = useState([]) // Upgraded from gallery
  
  // Structured Data
  const [services, setServices] = useState([])
  const [testimonials, setTestimonials] = useState([])
  const [faqs, setFaqs] = useState([])
  const [businessHours, setBusinessHours] = useState('')

  // Delivery Data
  const [freeDelivery, setFreeDelivery] = useState(false)
  const [deliveryRates, setDeliveryRates] = useState({})
  const [newDeliveryState, setNewDeliveryState] = useState('')
  const [newDeliveryPrice, setNewDeliveryPrice] = useState('')

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
          setSector(biz.sector || 'fashion')
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
          setTemplateId(page.template_id || 'classic-gold')
          setAboutText(page.about_text || '')
          setHeroImage(page.cover_image_url || '')
          setIsEnabled(page.is_enabled || false)
          
          const data = page.sector_data || {}
          setSectorData(data)
          setPortfolio(Array.isArray(data.portfolio) ? data.portfolio : [])
          setServices(data.services || [])
          setTestimonials(data.testimonials || [])
          setFaqs(data.faqs || [])
          setBusinessHours(data.business_hours || '')
          
          // Delivery
          setFreeDelivery(data.free_delivery || false)
          setDeliveryRates(data.delivery_rates || {})

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
        portfolio,
        services,
        testimonials,
        faqs,
        business_hours: businessHours,
        free_delivery: freeDelivery,
        delivery_rates: deliveryRates
      }

      const { error } = await supabase.from('business_public_pages').upsert({
        business_id: businessId,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ''),
        template_id: templateId,
        about_text: aboutText,
        cover_image_url: heroImage,
        is_enabled: isEnabled,
        sector_data: updatedSectorData,
        gallery_urls: [] // Deprecated in favor of portfolio
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

  const uploadImage = async (file, callback) => {
    if (!file) return
    setSaving(true)
    try {
      const compressedBlob = await compressImage(file, 200)
      const filePath = `${businessId}/portfolio-${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage.from('business-assets').upload(filePath, compressedBlob, { contentType: 'image/jpeg' })
      
      if (uploadError) throw uploadError
      
      const { data: urlData } = supabase.storage.from('business-assets').getPublicUrl(filePath)
      callback(urlData.publicUrl)
      showToast('Image uploaded successfully')
    } catch (err) {
      showToast('Upload failed. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Handlers ──
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

  const handleAddPortfolio = (url, title, desc) => {
    setPortfolio([...portfolio, { url, title, desc }])
  }

  const handleAddDeliveryRate = () => {
    if (!newDeliveryState || !newDeliveryPrice) return
    setDeliveryRates({ ...deliveryRates, [newDeliveryState]: Number(newDeliveryPrice) })
    setNewDeliveryState('')
    setNewDeliveryPrice('')
  }

  if (loading) return <div className="order-page-loading"><div className="spinner" /></div>

  if (!hasWebsite) {
    return (
      <div className="website-card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem' }}>Build Your Website</h2>
        <p style={{ color: 'var(--cresoa-text-muted)', marginBottom: '2rem' }}>Create a beautiful website for your fashion brand.</p>
        <button onClick={() => router.push(`/dashboard/website-onboarding?business_id=${businessId}`)} className="cresoa-primary-button">Start Setup Wizard</button>
      </div>
    )
  }

  const PreviewTemplateComponent = getTemplate(templateId)

  const safePreviewProps = {
    business: { name: businessName, logo_url: logoUrl, phone: businessPhone, whatsapp: businessWhatsapp, email: businessEmail, location: businessAddress },
    page: { 
      about_text: aboutText, cover_image_url: heroImage, 
      sector_data: { ...(sectorData || {}), portfolio, services, testimonials, faqs, business_hours: businessHours, free_delivery: freeDelivery, delivery_rates: deliveryRates } 
    },
    products: [] // Pass products here if you want them in the preview
  }

  return (
    <div className="website-editor-page">
      
      {/* 1. BRAND & URL (Kept as is) */}
      <div className="website-card">
        <h3 className="website-section-title">Brand & URL</h3>
        <div className="website-form-group">
          <label className="website-label">Your Website Link</label>
          {!isEditingUrl ? (
            <>
              <div className="website-url-card">
                <span className="website-url-text">{publicUrl}</span>
                <div className="website-url-actions">
                  <button type="button" className="url-btn" onClick={() => { navigator.clipboard.writeText(publicUrl); showToast('Copied!') }}><SvgIcons.Copy /></button>
                  <button type="button" className="url-btn" onClick={async () => { if (navigator.share) await navigator.share({ url: publicUrl }) }}><SvgIcons.Share /></button>
                </div>
              </div>
              <button type="button" onClick={() => setIsEditingUrl(true)} className="edit-url-btn">Edit Website Link</button>
            </>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="text" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} className="website-input" style={{ height: '52px' }} />
              <button type="button" onClick={() => setIsEditingUrl(false)} className="url-btn" style={{ height: '52px', width: '52px', background: 'var(--color-primary)', color: 'white' }}><SvgIcons.Check /></button>
            </div>
          )}
        </div>
        <div className="form-grid-2">
          <div className="website-form-group" style={{ marginBottom: 0 }}>
            <label className="website-label">Business Logo</label>
            <label className="image-upload-card">
              {logoUrl ? <><img src={logoUrl} /><div className="image-upload-overlay"><span>Change</span></div></> : <div className="image-upload-label"><SvgIcons.Plus /><span>Upload Logo</span></div>}
              <input type="file" accept="image/*" onChange={(e) => uploadImage(e.target.files[0], setLogoUrl)} style={{ display: 'none' }} />
            </label>
          </div>
          <div className="website-form-group" style={{ marginBottom: 0 }}>
            <label className="website-label">Hero Cover Image</label>
            <label className="image-upload-card">
              {heroImage ? <><img src={heroImage} /><div className="image-upload-overlay"><span>Change</span></div></> : <div className="image-upload-label"><SvgIcons.Image /><span>Upload Cover</span></div>}
              <input type="file" accept="image/*" onChange={(e) => uploadImage(e.target.files[0], setHeroImage)} style={{ display: 'none' }} />
            </label>
          </div>
        </div>
      </div>

      {/* 2. TEMPLATE SELECTION */}
      <div className="website-card">
        <h3 className="website-section-title">Website Style</h3>
        <div className="template-grid">
          {templates.map(tpl => (
            <div key={tpl.id} className={`template-card ${templateId === tpl.id ? 'active' : ''}`} onClick={() => setTemplateId(tpl.id)}>
              <div className="template-preview" style={{ background: tpl.preview }} />
              <div className="template-info"><span className="template-name">{tpl.name}</span><span className="template-desc">{tpl.description}</span></div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. ABOUT */}
      <div className="website-card">
        <h3 className="website-section-title">About Your Business</h3>
        <textarea className="website-input" value={aboutText} onChange={e => setAboutText(e.target.value)} placeholder="Tell your customers your story..." rows={5} />
      </div>

      {/* 4. DELIVERY SETTINGS (NEW) */}
      <div className="website-card">
        <h3 className="website-section-title">Delivery Settings</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--cresoa-text-muted)', marginBottom: '1rem' }}>Set up how you deliver to your customers.</p>
        
        <div className="website-form-group">
          <label className="website-label">Free Delivery</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button type="button" onClick={() => setFreeDelivery(!freeDelivery)} style={{ width: '50px', height: '28px', borderRadius: '14px', border: 'none', background: freeDelivery ? 'var(--color-secondary)' : 'var(--cresoa-border)', position: 'relative' }}>
              <span style={{ position: 'absolute', top: '2px', left: freeDelivery ? '24px' : '2px', width: '24px', height: '24px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
            </button>
            <span style={{ fontSize: '0.9rem', color: 'var(--cresoa-text)' }}>{freeDelivery ? 'Yes, offer free delivery' : 'No, charge for delivery'}</span>
          </div>
        </div>

        {!freeDelivery && (
          <div style={{ marginTop: '1rem' }}>
            <label className="website-label">Delivery Rates per State</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1rem' }}>
              {Object.entries(deliveryRates).map(([state, price]) => (
                <div key={state} style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--cresoa-surface-soft)', padding: '10px', borderRadius: '8px' }}>
                  <span style={{ fontWeight: 600 }}>{state}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>₦{Number(price).toLocaleString()}</span>
                    <button type="button" onClick={() => { const newRates = { ...deliveryRates }; delete newRates[state]; setDeliveryRates(newRates); }} style={{ background: 'none', border: 'none', color: 'var(--color-danger)' }}><SvgIcons.Trash /></button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select value={newDeliveryState} onChange={e => setNewDeliveryState(e.target.value)} className="website-input" style={{ flex: 1 }}>
                <option value="">Select State</option>
                {NIGERIAN_STATES.filter(s => !deliveryRates[s]).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input type="number" value={newDeliveryPrice} onChange={e => setNewDeliveryPrice(e.target.value)} placeholder="Price (₦)" className="website-input" style={{ width: '120px' }} />
              <button type="button" onClick={handleAddDeliveryRate} className="cresoa-primary-button" style={{ padding: '0 16px' }}><SvgIcons.Plus /></button>
            </div>
          </div>
        )}
      </div>

      {/* 5. PORTFOLIO (NEW) */}
      <div className="website-card">
        <h3 className="website-section-title">Portfolio / Lookbook</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--cresoa-text-muted)', marginBottom: '1rem' }}>Showcase your best work with a title and description.</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px', marginBottom: '1rem' }}>
          {portfolio.map((item, i) => (
            <div key={i} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', height: '150px', border: '1px solid var(--cresoa-border)' }}>
              <img src={item.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px', background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }}>
                <div style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title || 'Untitled'}</div>
              </div>
              <button type="button" onClick={() => setPortfolio(portfolio.filter((_, idx) => idx !== i))} style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '24px', height: '24px' }}><SvgIcons.X size={14} /></button>
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--cresoa-bg)', padding: '16px', borderRadius: '12px', border: '1px dashed var(--cresoa-border)' }}>
          <p style={{ margin: '0 0 10px 0', fontWeight: 600, fontSize: '0.9rem' }}>Add new item</p>
          <input type="file" accept="image/*" id="portfolio-upload" style={{ display: 'none' }} onChange={(e) => {
            const file = e.target.files[0];
            if (file) {
              const title = prompt("Enter a title for this work (e.g. Wedding Senator):");
              const desc = prompt("Enter a short description:");
              if (title !== null) {
                uploadImage(file, (url) => handleAddPortfolio(url, title, desc));
              }
            }
          }} />
          <button type="button" onClick={() => document.getElementById('portfolio-upload').click()} className="wizard-add-btn" style={{ padding: '12px', borderRadius: '8px', width: '100%', border: 'none' }}>
            <SvgIcons.Plus /> Upload Portfolio Item
          </button>
        </div>
      </div>

      {/* 6. SERVICES */}
      <div className="website-card">
        <h3 className="website-section-title">Services & Pricing</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '1rem' }}>
          {services.map((srv, idx) => (
            <div key={idx} style={{ background: 'var(--cresoa-surface-soft)', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{srv.name} {srv.price && <span style={{ color: 'var(--color-primary)' }}> - ₦{Number(srv.price).toLocaleString()}</span>}</div>
                {srv.desc && <div style={{ fontSize: '0.85rem', color: 'var(--cresoa-text-muted)' }}>{srv.desc}</div>}
              </div>
              <button type="button" onClick={() => setServices(services.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: 'var(--color-danger)' }}><SvgIcons.Trash /></button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setShowAddService(true)} className="wizard-add-btn" style={{ padding: '16px', borderRadius: '12px' }}><SvgIcons.Plus /> Add a Service</button>
      </div>

      {/* 7. TESTIMONIALS */}
      <div className="website-card">
        <h3 className="website-section-title">Testimonials</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '1rem' }}>
          {testimonials.map((t, idx) => (
            <div key={idx} style={{ background: 'var(--cresoa-surface-soft)', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <div><div style={{ fontWeight: 700 }}>"{t.text}"</div><div style={{ fontSize: '0.8rem', color: 'var(--cresoa-text-muted)' }}>- {t.name}</div></div>
              <button type="button" onClick={() => setTestimonials(testimonials.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: 'var(--color-danger)' }}><SvgIcons.Trash /></button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setShowAddTestimonial(true)} className="wizard-add-btn" style={{ padding: '16px', borderRadius: '12px' }}><SvgIcons.Plus /> Add a Testimonial</button>
      </div>

      {/* 8. FAQS */}
      <div className="website-card">
        <h3 className="website-section-title">FAQs</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '1rem' }}>
          {faqs.map((faq, idx) => (
            <div key={idx} style={{ background: 'var(--cresoa-surface-soft)', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <div><div style={{ fontWeight: 700 }}>{faq.q}</div><div style={{ fontSize: '0.85rem', color: 'var(--cresoa-text-muted)' }}>{faq.a}</div></div>
              <button type="button" onClick={() => setFaqs(faqs.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: 'var(--color-danger)' }}><SvgIcons.Trash /></button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setShowAddFaq(true)} className="wizard-add-btn" style={{ padding: '16px', borderRadius: '12px' }}><SvgIcons.Plus /> Add an FAQ</button>
      </div>

      {/* 9. CONTACT & HOURS */}
      <div className="website-card">
        <h3 className="website-section-title">Contact & Hours</h3>
        <div className="form-grid-2">
          <div className="website-form-group"><label className="website-label">Phone</label><input type="text" className="website-input" value={businessPhone} onChange={e => setBusinessPhone(e.target.value)} /></div>
          <div className="website-form-group"><label className="website-label">WhatsApp</label><input type="text" className="website-input" value={businessWhatsapp} onChange={e => setBusinessWhatsapp(e.target.value)} /></div>
          <div className="website-form-group"><label className="website-label">Email</label><input type="email" className="website-input" value={businessEmail} onChange={e => setBusinessEmail(e.target.value)} /></div>
          <div className="website-form-group"><label className="website-label">Address</label><input type="text" className="website-input" value={businessAddress} onChange={e => setBusinessAddress(e.target.value)} /></div>
        </div>
        <div className="website-form-group" style={{ marginTop: '16px' }}><label className="website-label">Business Hours</label><input type="text" className="website-input" value={businessHours} onChange={e => setBusinessHours(e.target.value)} placeholder="Mon-Fri: 9am - 6pm" /></div>
      </div>

      {/* 10. STATUS & SEO */}
      <div className="website-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><h3 className="website-section-title" style={{ marginBottom: '4px' }}>Website Status</h3><p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--cresoa-text-muted)' }}>{isEnabled ? 'Live' : 'Hidden'}</p></div>
        <button type="button" onClick={() => setIsEnabled(!isEnabled)} style={{ width: '56px', height: '28px', borderRadius: '14px', border: 'none', background: isEnabled ? 'var(--color-secondary)' : 'var(--cresoa-border)', position: 'relative' }}><span style={{ position: 'absolute', top: '2px', left: isEnabled ? '30px' : '2px', width: '24px', height: '24px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} /></button>
      </div>

      <div className="website-card">
        <h3 className="website-section-title">Google Search</h3>
        <div style={{ background: 'var(--cresoa-surface-soft)', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}><SvgIcons.Google /> Search</div>
          <button type="button" onClick={() => {}} disabled={seoRequested} className="cresoa-primary-button" style={{ padding: '8px 12px', fontSize: '0.8rem' }}>{seoRequested ? 'Requested' : 'Boost'}</button>
        </div>
      </div>

      {/* MODALS (Add Service, Testimonial, FAQ) */}
      {showAddService && (
        <div className="app-modal-overlay" onClick={() => setShowAddService(false)}>
          <div className="app-modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px' }}>Add Service</h3>
            <input type="text" className="website-input" placeholder="Service Name" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} style={{ marginBottom: '10px' }} />
            <input type="number" className="website-input" placeholder="Price" value={newService.price} onChange={e => setNewService({...newService, price: e.target.value})} style={{ marginBottom: '10px' }} />
            <input type="text" className="website-input" placeholder="Description" value={newService.desc} onChange={e => setNewService({...newService, desc: e.target.value})} style={{ marginBottom: '16px' }} />
            <div style={{ display: 'flex', gap: '10px' }}><button onClick={() => setShowAddService(false)} className="order-btn-secondary" style={{ flex: 1 }}>Cancel</button><button onClick={handleAddService} className="cresoa-primary-button" style={{ flex: 1 }}>Save</button></div>
          </div>
        </div>
      )}

      {showAddTestimonial && (
        <div className="app-modal-overlay" onClick={() => setShowAddTestimonial(false)}>
          <div className="app-modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px' }}>Add Testimonial</h3>
            <input type="text" className="website-input" placeholder="Customer Name" value={newTestimonial.name} onChange={e => setNewTestimonial({...newTestimonial, name: e.target.value})} style={{ marginBottom: '10px' }} />
            <textarea className="website-input" placeholder="Review" value={newTestimonial.text} onChange={e => setNewTestimonial({...newTestimonial, text: e.target.value})} style={{ marginBottom: '16px' }} />
            <div style={{ display: 'flex', gap: '10px' }}><button onClick={() => setShowAddTestimonial(false)} className="order-btn-secondary" style={{ flex: 1 }}>Cancel</button><button onClick={handleAddTestimonial} className="cresoa-primary-button" style={{ flex: 1 }}>Save</button></div>
          </div>
        </div>
      )}

      {showAddFaq && (
        <div className="app-modal-overlay" onClick={() => setShowAddFaq(false)}>
          <div className="app-modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px' }}>Add FAQ</h3>
            <input type="text" className="website-input" placeholder="Question" value={newFaq.q} onChange={e => setNewFaq({...newFaq, q: e.target.value})} style={{ marginBottom: '10px' }} />
            <textarea className="website-input" placeholder="Answer" value={newFaq.a} onChange={e => setNewFaq({...newFaq, a: e.target.value})} style={{ marginBottom: '16px' }} />
            <div style={{ display: 'flex', gap: '10px' }}><button onClick={() => setShowAddFaq(false)} className="order-btn-secondary" style={{ flex: 1 }}>Cancel</button><button onClick={handleAddFaq} className="cresoa-primary-button" style={{ flex: 1 }}>Save</button></div>
          </div>
        </div>
      )}

      {/* FIXED FOOTER */}
      <div className="website-fixed-footer">
        <button type="button" onClick={() => setPreviewOpen(true)} className="order-btn-secondary" style={{ flex: 1, padding: '14px' }}><SvgIcons.Eye /> Preview</button>
        <button type="button" onClick={handleSave} disabled={saving} className="cresoa-primary-button" style={{ flex: 2, padding: '14px' }}>{saving ? 'Saving...' : 'Save Changes'}</button>
      </div>

      {/* PREVIEW MODAL (Just showing a snippet for brevity, use the full one from before) */}
      {previewOpen && (
        <div className="app-modal-overlay" onClick={() => setPreviewOpen(false)}>
          <div className="app-modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px', padding: 0, background: '#fff', overflow: 'hidden', height: '80vh' }}>
            <PreviewTemplateComponent {...safePreviewProps} />
          </div>
        </div>
      )}

      {toastMessage && <div className={`app-toast ${toastType}`}>{toastMessage}</div>}
    </div>
  )
}
