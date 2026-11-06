'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import { compressImage } from '../../../../lib/compressImage'
import { templates, getTemplate } from '../../../../lib/templateRegistry'
import { parseSectorData } from '../../../../lib/publicPageData'
import '../my-website.css'

// ─── EMBEDDED ICONS ───
const SvgIcons = {
  Eye: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
  Plus: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  Image: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>,
  Copy: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>,
  Share: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>,
  Check: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  X: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  Trash: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>,
  Google: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
}

// Full Nigerian state list — matches lib/publicPageData.js
const NIGERIAN_STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
  'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo',
  'Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa',
  'Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba',
  'Yobe','Zamfara',
]

export default function EditorTab({ businessId }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasWebsite, setHasWebsite] = useState(false)
  const [isEditingUrl, setIsEditingUrl] = useState(false)
  const [activeTab, setActiveTab] = useState('home')

  // Core Data
  const [slug, setSlug] = useState('')
  const [templateId, setTemplateId] = useState('classic-gold')
  const [aboutText, setAboutText] = useState('')
  const [heroImage, setHeroImage] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [isEnabled, setIsEnabled] = useState(false)
  const [savedEnabled, setSavedEnabled] = useState(false) // ← what's actually in the DB
  const [businessName, setBusinessName] = useState('')

  // Content Data
  const [sectorData, setSectorData] = useState({})
  const [portfolio, setPortfolio] = useState([])
  const [services, setServices] = useState([])
  const [testimonials, setTestimonials] = useState([])
  const [faqs, setFaqs] = useState([])
  const [businessHours, setBusinessHours] = useState('')

  // Commerce Data
  const [freeDelivery, setFreeDelivery] = useState(false)
  const [deliveryRates, setDeliveryRates] = useState({})
  const [newDeliveryState, setNewDeliveryState] = useState('')
  const [newDeliveryPrice, setNewDeliveryPrice] = useState('')

  // Contact Info
  const [businessPhone, setBusinessPhone] = useState('')
  const [businessWhatsapp, setBusinessWhatsapp] = useState('')
  const [businessEmail, setBusinessEmail] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')

  // SEO State
  const [seoRequested, setSeoRequested] = useState(false)

  // Modals State
  const [modalType, setModalType] = useState(null)
  const [activeItemIndex, setActiveItemIndex] = useState(null)

  const [tempService, setTempService] = useState({ name: '', price: '', desc: '', image_url: '' })
  const [tempTestimonial, setTempTestimonial] = useState({ name: '', text: '' })
  const [tempFaq, setTempFaq] = useState({ q: '', a: '' })
  const [tempPortfolioItem, setTempPortfolioItem] = useState({ url: '', title: '', desc: '' })

  // Custom UI
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState('success')
  const [uploading, setUploading] = useState(false)

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg)
    setToastType(type)
    setTimeout(() => setToastMessage(''), 3000)
  }

  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/${slug}`

  useEffect(() => {
    const load = async () => {
      if (!businessId) return
      try {
        const { data: biz } = await supabase.from('businesses').select('*').eq('id', businessId).single()
        if (biz) {
          setBusinessName(biz.name || 'My Business')
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
          setIsEnabled(Boolean(page.is_enabled))
          setSavedEnabled(Boolean(page.is_enabled))

          // 🔑 Centralized parse — handles string OR object, never wipes data
          const data = parseSectorData(page.sector_data)
          setSectorData(data)
          setPortfolio(Array.isArray(data.portfolio) ? data.portfolio : [])
          setServices(Array.isArray(data.services) ? data.services : [])
          setTestimonials(Array.isArray(data.testimonials) ? data.testimonials : [])
          setFaqs(Array.isArray(data.faqs) ? data.faqs : [])
          setBusinessHours(typeof data.business_hours === 'string' ? data.business_hours : '')
          setFreeDelivery(Boolean(data.free_delivery))
          setDeliveryRates(
            data.delivery_rates && typeof data.delivery_rates === 'object' && !Array.isArray(data.delivery_rates)
              ? data.delivery_rates
              : {}
          )
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

    const normalizedSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '')

    // 🔒 Slug collision guard
    const { data: existingSlug, error: slugCheckErr } = await supabase
      .from('business_public_pages')
      .select('business_id')
      .eq('slug', normalizedSlug)
      .maybeSingle()

    if (slugCheckErr) {
      showToast('Could not verify URL. Please try again.', 'error')
      return
    }
    if (existingSlug && existingSlug.business_id !== businessId) {
      showToast('That URL is already taken. Please choose another.', 'error')
      return
    }

    setSaving(true)
    try {
      await supabase.from('businesses').update({
        phone: businessPhone,
        whatsapp: businessWhatsapp,
        email: businessEmail,
        location: businessAddress,
        logo_url: logoUrl,
      }).eq('id', businessId)

      const updatedSectorData = {
        ...sectorData,
        portfolio,
        services,
        testimonials,
        faqs,
        business_hours: businessHours,
        free_delivery: freeDelivery,
        delivery_rates: deliveryRates,
      }

      // NOTE: is_enabled is intentionally NOT in the upsert body —
      // the Site Status toggle owns that field and saves it on its own.
      const { error } = await supabase.from('business_public_pages').upsert({
        business_id: businessId,
        slug: normalizedSlug,
        template_id: templateId,
        about_text: aboutText,
        cover_image_url: heroImage,
        sector_data: updatedSectorData,
      }, { onConflict: 'business_id' })

      if (error) throw error

      setHasWebsite(true)
      setIsEditingUrl(false)
      setSlug(normalizedSlug)
      showToast('Website settings saved successfully')
    } catch (err) {
      showToast(err.message || 'Failed to save settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Site Status: saves immediately, decoupled from content save ──
  const toggleSiteStatus = async () => {
    const next = !savedEnabled
    setSaving(true)
    try {
      const { error } = await supabase
        .from('business_public_pages')
        .update({ is_enabled: next })
        .eq('business_id', businessId)
      if (error) throw error
      setSavedEnabled(next)
      setIsEnabled(next)
      showToast(next ? 'Website is now live' : 'Website is now hidden')
    } catch (err) {
      showToast(err.message || 'Could not update site status', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Image Upload Logic ──
  const uploadSingleImage = async (file, callback) => {
    if (!file) return
    setUploading(true)
    try {
      const compressedBlob = await compressImage(file, 300)
      const filePath = `${businessId}/assets-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`
      const { error: uploadError } = await supabase.storage.from('business-assets').upload(filePath, compressedBlob, { contentType: 'image/jpeg' })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('business-assets').getPublicUrl(filePath)
      callback(urlData.publicUrl)
    } catch (err) {
      showToast('Upload failed.', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleBulkPortfolioUpload = async (files) => {
    if (!files || files.length === 0) return
    setUploading(true)
    const newItems = []
    for (let i = 0; i < files.length; i++) {
      try {
        const compressedBlob = await compressImage(files[i], 300)
        const filePath = `${businessId}/portfolio-${Date.now()}-${i}.jpg`
        const { error } = await supabase.storage.from('business-assets').upload(filePath, compressedBlob, { contentType: 'image/jpeg' })
        if (error) throw error
        const { data } = supabase.storage.from('business-assets').getPublicUrl(filePath)
        newItems.push({ url: data.publicUrl, title: 'New Work', desc: '' })
      } catch (err) {
        console.error(err)
      }
    }
    setPortfolio(prev => [...prev, ...newItems])
    setUploading(false)
    if (newItems.length > 0) {
      // 🔔 Warn the user these are only in memory until Save
      showToast(`${newItems.length} image(s) uploaded — click "Save Website Settings" to publish`)
    }
  }

  // ── Modal Handlers ──
  const openServiceModal = (index = null) => {
    if (index !== null) { setTempService(services[index]); setActiveItemIndex(index) }
    else { setTempService({ name: '', price: '', desc: '', image_url: '' }); setActiveItemIndex(null) }
    setModalType('service')
  }

  const saveService = () => {
    if (!tempService.name) return
    if (activeItemIndex !== null) {
      const updated = [...services]; updated[activeItemIndex] = tempService; setServices(updated)
    } else {
      setServices([...services, tempService])
    }
    setModalType(null)
  }

  const openPortfolioModal = (index) => {
    setTempPortfolioItem(portfolio[index]); setActiveItemIndex(index); setModalType('portfolio_edit')
  }

  const savePortfolioItem = () => {
    const updated = [...portfolio]; updated[activeItemIndex] = tempPortfolioItem; setPortfolio(updated); setModalType(null)
  }

  const openTestimonialModal = (index = null) => {
    if (index !== null) { setTempTestimonial(testimonials[index]); setActiveItemIndex(index) }
    else { setTempTestimonial({ name: '', text: '' }); setActiveItemIndex(null) }
    setModalType('testimonial')
  }

  const saveTestimonial = () => {
    if (!tempTestimonial.name || !tempTestimonial.text) return
    if (activeItemIndex !== null) {
      const updated = [...testimonials]; updated[activeItemIndex] = tempTestimonial; setTestimonials(updated)
    } else {
      setTestimonials([...testimonials, tempTestimonial])
    }
    setModalType(null)
  }

  const openFaqModal = (index = null) => {
    if (index !== null) { setTempFaq(faqs[index]); setActiveItemIndex(index) }
    else { setTempFaq({ q: '', a: '' }); setActiveItemIndex(null) }
    setModalType('faq')
  }

  const saveFaq = () => {
    if (!tempFaq.q || !tempFaq.a) return
    if (activeItemIndex !== null) {
      const updated = [...faqs]; updated[activeItemIndex] = tempFaq; setFaqs(updated)
    } else {
      setFaqs([...faqs, tempFaq])
    }
    setModalType(null)
  }

  const handleAddDeliveryRate = () => {
    if (!newDeliveryState || !newDeliveryPrice) return
    setDeliveryRates({ ...deliveryRates, [newDeliveryState]: Number(newDeliveryPrice) })
    setNewDeliveryState(''); setNewDeliveryPrice('')
  }

  if (loading) return <div className="order-page-loading"><div className="spinner" /></div>

  if (!hasWebsite) {
    return (
      <div className="website-card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem' }}>Build Your Website</h2>
        <button onClick={() => router.push(`/dashboard/website-onboarding?business_id=${businessId}`)} className="cresoa-primary-button">Start Setup Wizard</button>
      </div>
    )
  }

  return (
    <div className="website-editor-page">

      {/* ── TABS ── */}
      <div className="smart-tabs-container" style={{ marginBottom: '1.5rem', paddingBottom: '5px' }}>
        <button className={`smart-tab ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>Home</button>
        <button className={`smart-tab ${activeTab === 'design' ? 'active' : ''}`} onClick={() => setActiveTab('design')}>Design</button>
        <button className={`smart-tab ${activeTab === 'content' ? 'active' : ''}`} onClick={() => setActiveTab('content')}>Content</button>
        <button className={`smart-tab ${activeTab === 'commerce' ? 'active' : ''}`} onClick={() => setActiveTab('commerce')}>Commerce</button>
        <button className={`smart-tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>Settings</button>
      </div>

      {/* ── TAB: HOME ── */}
      {activeTab === 'home' && (
        <>
          <div className="website-card" style={{ background: 'linear-gradient(135deg, var(--color-primary), #1A4685)', color: '#fff', border: 'none' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', fontWeight: 800 }}>
              {savedEnabled ? 'Your Website is Live' : 'Your Website is in Draft'}
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '0.9rem', opacity: 0.9 }}>
              {savedEnabled
                ? 'Share this link with your customers so they can shop and contact you.'
                : 'Toggle "Site Status" below to make your website visible to customers.'}
            </p>
            {savedEnabled && (
              <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{publicUrl}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" onClick={() => { navigator.clipboard.writeText(publicUrl); showToast('Copied!') }} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '8px', color: '#fff', cursor: 'pointer' }}><SvgIcons.Copy /></button>
                  <a href={`/${slug}`} target="_blank" rel="noreferrer" style={{ background: 'var(--color-accent)', border: 'none', borderRadius: '8px', padding: '8px 16px', color: '#000', fontWeight: 700, textDecoration: 'none', fontSize: '0.85rem' }}>Preview</a>
                </div>
              </div>
            )}
          </div>

          <div className="website-card">
            <h3 className="website-section-title">Website URL</h3>
            {!isEditingUrl ? (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>cresoa.com.ng/{slug}</span>
                <button onClick={() => setIsEditingUrl(true)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}>Edit</button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="text" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} className="website-input" style={{ height: '52px' }} />
                <button type="button" onClick={() => setIsEditingUrl(false)} className="url-btn" style={{ height: '52px', width: '52px', background: 'var(--color-primary)', color: 'white' }}><SvgIcons.Check /></button>
              </div>
            )}
          </div>

          <div className="website-card">
            <h3 className="website-section-title">Hero & Branding</h3>
            <div className="form-grid-2">
              <div className="website-form-group" style={{ marginBottom: 0 }}>
                <label className="website-label">Logo</label>
                <label className="image-upload-card">
                  {logoUrl ? <><img src={logoUrl} alt="Logo" /><div className="image-upload-overlay"><span>Change</span></div></> : <div className="image-upload-label"><SvgIcons.Plus /><span>Upload Logo</span></div>}
                  <input type="file" accept="image/*" onChange={(e) => uploadSingleImage(e.target.files[0], setLogoUrl)} style={{ display: 'none' }} />
                </label>
              </div>
              <div className="website-form-group" style={{ marginBottom: 0 }}>
                <label className="website-label">Cover Image</label>
                <label className="image-upload-card">
                  {heroImage ? <><img src={heroImage} alt="Cover" /><div className="image-upload-overlay"><span>Change</span></div></> : <div className="image-upload-label"><SvgIcons.Image /><span>Upload Cover</span></div>}
                  <input type="file" accept="image/*" onChange={(e) => uploadSingleImage(e.target.files[0], setHeroImage)} style={{ display: 'none' }} />
                </label>
              </div>
            </div>
          </div>

          <div className="website-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="website-section-title" style={{ marginBottom: '4px' }}>Site Status</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--cresoa-text-muted)' }}>
                {savedEnabled ? 'Live & visible to customers' : 'Hidden (draft mode)'}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleSiteStatus}
              disabled={saving}
              style={{
                width: '56px', height: '28px', borderRadius: '14px', border: 'none',
                background: savedEnabled ? 'var(--color-secondary)' : 'var(--cresoa-border)',
                position: 'relative', cursor: saving ? 'wait' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              <span style={{
                position: 'absolute', top: '2px', left: savedEnabled ? '30px' : '2px',
                width: '24px', height: '24px', borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s',
              }} />
            </button>
          </div>
        </>
      )}

      {/* ── TAB: DESIGN ── */}
      {activeTab === 'design' && (
        <div className="website-card">
          <h3 className="website-section-title">Choose a Theme</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--cresoa-text-muted)', marginBottom: '1.5rem' }}>Select the look and feel of your storefront.</p>
          <div className="template-grid">
            {templates.map(tpl => (
              <div key={tpl.id} className={`template-card ${templateId === tpl.id ? 'active' : ''}`} onClick={() => setTemplateId(tpl.id)}>
                <div className="template-preview" style={{ background: tpl.preview }} />
                <div className="template-info"><span className="template-name">{tpl.name}</span><span className="template-desc">{tpl.description}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB: CONTENT ── */}
      {activeTab === 'content' && (
        <>
          <div className="website-card">
            <h3 className="website-section-title">About Your Business</h3>
            <textarea className="website-input" value={aboutText} onChange={e => setAboutText(e.target.value)} placeholder="Tell your customers your story..." rows={4} />
          </div>

          <div className="website-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 className="website-section-title" style={{ margin: 0 }}>Services & Pricing</h3>
              <button type="button" onClick={() => openServiceModal()} className="cresoa-primary-button" style={{ padding: '6px 12px', fontSize: '0.8rem' }}><SvgIcons.Plus size={14}/> Add</button>
            </div>
            {services.length === 0 ? <p style={{ fontSize: '0.85rem', color: 'var(--cresoa-text-muted)' }}>No services added yet.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {services.map((srv, idx) => (
                  <div key={idx} onClick={() => openServiceModal(idx)} style={{ display: 'flex', gap: '12px', background: 'var(--cresoa-surface-soft)', padding: '12px', borderRadius: '12px', cursor: 'pointer', alignItems: 'center' }}>
                    {srv.image_url ? <img src={srv.image_url} alt="" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} /> : <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--cresoa-border)' }} />}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{srv.name} {srv.price && `- ₦${Number(srv.price).toLocaleString()}`}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--cresoa-text-muted)' }}>{srv.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="website-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 className="website-section-title" style={{ margin: 0 }}>Portfolio</h3>
              <label className="cresoa-primary-button" style={{ padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer' }}>
                <SvgIcons.Plus size={14}/> Upload Images
                <input type="file" multiple accept="image/*" onChange={(e) => handleBulkPortfolioUpload(e.target.files)} style={{ display: 'none' }} />
              </label>
            </div>
            {uploading && <p style={{ fontSize: '0.8rem', color: 'var(--color-accent)' }}>Uploading images...</p>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
              {portfolio.map((item, idx) => (
                <div key={idx} onClick={() => openPortfolioModal(idx)} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', aspectRatio: '1', cursor: 'pointer', border: '1px solid var(--cresoa-border)' }}>
                  <img src={item.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', padding: '4px' }}>
                    <div style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── TAB: COMMERCE ── */}
      {activeTab === 'commerce' && (
        <div className="website-card">
          <h3 className="website-section-title">Delivery Settings</h3>
          <div className="website-form-group">
            <label className="website-label">Free Delivery</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button type="button" onClick={() => setFreeDelivery(!freeDelivery)} style={{ width: '50px', height: '28px', borderRadius: '14px', border: 'none', background: freeDelivery ? 'var(--color-secondary)' : 'var(--cresoa-border)', position: 'relative' }}>
                <span style={{ position: 'absolute', top: '2px', left: freeDelivery ? '24px' : '2px', width: '24px', height: '24px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
              </button>
              <span style={{ fontSize: '0.9rem' }}>{freeDelivery ? 'Yes' : 'No, charge per state'}</span>
            </div>
          </div>

          {!freeDelivery && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1rem' }}>
                {Object.entries(deliveryRates).map(([state, price]) => (
                  <div key={state} style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--cresoa-surface-soft)', padding: '12px', borderRadius: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{state}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 700 }}>₦{Number(price).toLocaleString()}</span>
                      <button type="button" onClick={() => { const newRates = { ...deliveryRates }; delete newRates[state]; setDeliveryRates(newRates); }} style={{ background: 'none', border: 'none', color: 'var(--color-danger)' }}><SvgIcons.Trash size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select value={newDeliveryState} onChange={e => setNewDeliveryState(e.target.value)} className="website-input" style={{ flex: 1 }}>
                  <option value="">Select State</option>
                  {NIGERIAN_STATES.filter(s => !deliveryRates[s]).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input type="number" value={newDeliveryPrice} onChange={e => setNewDeliveryPrice(e.target.value)} placeholder="Price (₦)" className="website-input" style={{ width: '100px' }} />
                <button type="button" onClick={handleAddDeliveryRate} className="cresoa-primary-button" style={{ padding: '0 16px' }}><SvgIcons.Plus size={16}/></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: SETTINGS ── */}
      {activeTab === 'settings' && (
        <>
          <div className="website-card">
            <h3 className="website-section-title">Contact Information</h3>
            <div className="form-grid-2">
              <div className="website-form-group"><label className="website-label">Phone</label><input type="text" className="website-input" value={businessPhone} onChange={e => setBusinessPhone(e.target.value)} /></div>
              <div className="website-form-group"><label className="website-label">WhatsApp</label><input type="text" className="website-input" value={businessWhatsapp} onChange={e => setBusinessWhatsapp(e.target.value)} /></div>
              <div className="website-form-group"><label className="website-label">Email</label><input type="email" className="website-input" value={businessEmail} onChange={e => setBusinessEmail(e.target.value)} /></div>
              <div className="website-form-group"><label className="website-label">Address</label><input type="text" className="website-input" value={businessAddress} onChange={e => setBusinessAddress(e.target.value)} /></div>
            </div>
            <div className="website-form-group" style={{ marginTop: '16px' }}><label className="website-label">Business Hours</label><input type="text" className="website-input" value={businessHours} onChange={e => setBusinessHours(e.target.value)} placeholder="Mon-Fri: 9am - 6pm" /></div>
          </div>

          <div className="website-card">
            <h3 className="website-section-title">Google Search</h3>
            <div style={{ background: 'var(--cresoa-surface-soft)', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}><SvgIcons.Google /> Search Index</div>
              <button type="button" onClick={() => {}} disabled={seoRequested} className="cresoa-primary-button" style={{ padding: '8px 12px', fontSize: '0.8rem' }}>{seoRequested ? 'Requested' : 'Boost'}</button>
            </div>
          </div>
        </>
      )}

      {/* ── MODALS ── */}
      {modalType === 'service' && (
        <div className="app-modal-overlay" onClick={() => setModalType(null)}>
          <div className="app-modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px' }}>{activeItemIndex !== null ? 'Edit Service' : 'Add Service'}</h3>
            <label className="website-label">Service Image</label>
            <label className="image-upload-card" style={{ minHeight: '100px', marginBottom: '16px' }}>
              {tempService.image_url ? <img src={tempService.image_url} alt="" style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px' }} /> : <div className="image-upload-label"><SvgIcons.Image size={20} /><span>Upload Image</span></div>}
              <input type="file" accept="image/*" onChange={(e) => uploadSingleImage(e.target.files[0], (url) => setTempService({...tempService, image_url: url}))} style={{ display: 'none' }} />
            </label>
            <input type="text" className="website-input" placeholder="Service Name (e.g. Custom Senator)" value={tempService.name} onChange={e => setTempService({...tempService, name: e.target.value})} style={{ marginBottom: '10px' }} />
            <input type="number" className="website-input" placeholder="Price (₦)" value={tempService.price} onChange={e => setTempService({...tempService, price: e.target.value})} style={{ marginBottom: '10px' }} />
            <textarea className="website-input" placeholder="Description" value={tempService.desc} onChange={e => setTempService({...tempService, desc: e.target.value})} style={{ marginBottom: '16px', height: '80px' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setModalType(null)} className="order-btn-secondary" style={{ flex: 1 }}>Cancel</button>
              <button onClick={saveService} className="cresoa-primary-button" style={{ flex: 1 }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {modalType === 'portfolio_edit' && (
        <div className="app-modal-overlay" onClick={() => setModalType(null)}>
          <div className="app-modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px' }}>Edit Portfolio Item</h3>
            <img src={tempPortfolioItem.url} alt="" style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '12px', marginBottom: '16px' }} />
            <input type="text" className="website-input" placeholder="Title (e.g. Aso Ebi Wedding)" value={tempPortfolioItem.title} onChange={e => setTempPortfolioItem({...tempPortfolioItem, title: e.target.value})} style={{ marginBottom: '10px' }} />
            <textarea className="website-input" placeholder="Description (Optional)" value={tempPortfolioItem.desc} onChange={e => setTempPortfolioItem({...tempPortfolioItem, desc: e.target.value})} style={{ marginBottom: '16px', height: '80px' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setPortfolio(portfolio.filter((_, i) => i !== activeItemIndex)); setModalType(null) }} className="order-btn-secondary" style={{ color: 'var(--color-danger)' }}><SvgIcons.Trash size={16}/></button>
              <button onClick={() => setModalType(null)} className="order-btn-secondary" style={{ flex: 1 }}>Cancel</button>
              <button onClick={savePortfolioItem} className="cresoa-primary-button" style={{ flex: 1 }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* FIXED FOOTER */}
      <div className="website-fixed-footer">
        <button type="button" onClick={handleSave} disabled={saving} className="cresoa-primary-button" style={{ width: '100%', padding: '16px', fontSize: '1rem' }}>
          {saving ? 'Saving Changes...' : 'Save Website Settings'}
        </button>
      </div>

      {/* TOAST */}
      {toastMessage && <div className={`app-toast ${toastType}`}>{toastMessage}</div>}
    </div>
  )
            }
