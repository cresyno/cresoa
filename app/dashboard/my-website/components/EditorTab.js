'use client';
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation';
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
  Check: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  Trash: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>,
  ChevronDown: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>,
  Google: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
}

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
  const [savedEnabled, setSavedEnabled] = useState(false)
  
  // Content Data
  const [sectorData, setSectorData] = useState({})
  const [portfolio, setPortfolio] = useState([])
  const [services, setServices] = useState([])
  const [businessHours, setBusinessHours] = useState('')

  // Commerce Data
  const [freeDelivery, setFreeDelivery] = useState(false)
  const [deliveryRates, setDeliveryRates] = useState({})
  const [newDeliveryState, setNewDeliveryState] = useState('')
  const [newDeliveryPrice, setNewDeliveryPrice] = useState('')
  const [showStateDropdown, setShowStateDropdown] = useState(false)
  const stateDropdownRef = useRef(null)

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
    function handleClickOutside(event) {
      if (stateDropdownRef.current && !stateDropdownRef.current.contains(event.target)) {
        setShowStateDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const load = async () => {
      if (!businessId) return
      try {
        const { data: biz } = await supabase.from('businesses').select('*').eq('id', businessId).single()
        if (biz) {
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

          const data = parseSectorData(page.sector_data)
          setSectorData(data)
          setPortfolio(Array.isArray(data.portfolio) ? data.portfolio : [])
          setServices(Array.isArray(data.services) ? data.services : [])
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
        business_hours: businessHours,
        free_delivery: freeDelivery,
        delivery_rates: deliveryRates,
      }

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
      showToast(`${newItems.length} image(s) uploaded — click "Save Website Settings" to publish`)
    }
  }

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

  const handleAddDeliveryRate = () => {
    if (!newDeliveryState || !newDeliveryPrice) return
    setDeliveryRates({ ...deliveryRates, [newDeliveryState]: Number(newDeliveryPrice) })
    setNewDeliveryState(''); setNewDeliveryPrice('')
  }

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: '#0F2B4A', fontWeight: 600 }}>Loading editor...</div>

  if (!hasWebsite) {
    return (
      <div style={{ background: '#FFFFFF', padding: '3rem 2rem', textAlign: 'center', borderRadius: '16px', border: '1px solid #EAEAEA', maxWidth: '600px', margin: '2rem auto' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem', color: '#0F2B4A' }}>Build Your Website</h2>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>Get your fashion brand online in minutes.</p>
        <button onClick={() => router.push(`/dashboard/website-onboarding?business_id=${businessId}`)} style={{ background: '#0F2B4A', color: '#FFF', border: 'none', padding: '14px 28px', borderRadius: '8px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>Start Setup Wizard</button>
      </div>
    )
  }

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh', color: '#0F2B4A', fontFamily: "'Inter', sans-serif", paddingBottom: '100px' }}>
      
      {/* TABS (Scrollable App-Style Menu) */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '0 1rem 1rem 1rem', borderBottom: '1px solid #EAEAEA', marginBottom: '1.5rem', scrollbarWidth: 'none' }}>
        {['home', 'design', 'content', 'commerce', 'settings'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{ 
              padding: '10px 20px', 
              borderRadius: '20px', 
              border: 'none', 
              background: activeTab === tab ? '#0F2B4A' : '#F4F6F8', 
              color: activeTab === tab ? '#FFF' : '#666', 
              fontWeight: 600, 
              fontSize: '0.9rem', 
              cursor: 'pointer', 
              textTransform: 'capitalize',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 1rem' }}>
        
        {/* ── TAB: HOME ── */}
        {activeTab === 'home' && (
          <>
            <div style={{ background: 'linear-gradient(135deg, #0F2B4A, #1A4685)', color: '#fff', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', fontWeight: 800 }}>
                {savedEnabled ? 'Your Website is Live' : 'Your Website is in Draft'}
              </h3>
              <p style={{ margin: '0 0 20px 0', fontSize: '0.9rem', opacity: 0.9 }}>
                {savedEnabled ? 'Share this link with your customers.' : 'Toggle "Site Status" below to make your website visible.'}
              </p>
              {savedEnabled && (
                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{publicUrl}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={() => { navigator.clipboard.writeText(publicUrl); showToast('Copied!') }} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '8px', color: '#fff', cursor: 'pointer' }}><SvgIcons.Copy /></button>
                    <a href={`/${slug}`} target="_blank" rel="noreferrer" style={{ background: '#D4AF37', border: 'none', borderRadius: '8px', padding: '8px 16px', color: '#0F2B4A', fontWeight: 700, textDecoration: 'none', fontSize: '0.85rem' }}>Preview</a>
                  </div>
                </div>
              )}
            </div>

            <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #EAEAEA', padding: '1.5rem', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 1rem 0' }}>Website URL</h3>
              {!isEditingUrl ? (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>cresoa.com.ng/{slug}</span>
                  <button onClick={() => setIsEditingUrl(true)} style={{ background: 'none', border: 'none', color: '#0F2B4A', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'underline' }}>Edit</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="text" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #EAEAEA', fontSize: '1rem', outline: 'none' }} />
                  <button type="button" onClick={() => setIsEditingUrl(false)} style={{ padding: '0 16px', borderRadius: '8px', background: '#0F2B4A', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700 }}><SvgIcons.Check /></button>
                </div>
              )}
            </div>

            <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #EAEAEA', padding: '1.5rem', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 1rem 0' }}>Hero & Branding</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#666', marginBottom: '8px', textTransform: 'uppercase' }}>Logo</label>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '120px', border: '2px dashed #EAEAEA', borderRadius: '12px', cursor: 'pointer', overflow: 'hidden', position: 'relative', background: logoUrl ? '#FFF' : '#F8F9FA' }}>
                    {logoUrl ? <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <div style={{ textAlign: 'center', color: '#999' }}><SvgIcons.Plus /><div style={{ fontSize: '0.75rem', marginTop: '4px', fontWeight: 600 }}>Upload</div></div>}
                    <input type="file" accept="image/*" onChange={(e) => uploadSingleImage(e.target.files[0], setLogoUrl)} style={{ display: 'none' }} />
                  </label>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#666', marginBottom: '8px', textTransform: 'uppercase' }}>Cover Image</label>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '120px', border: '2px dashed #EAEAEA', borderRadius: '12px', cursor: 'pointer', overflow: 'hidden', position: 'relative', background: heroImage ? '#FFF' : '#F8F9FA' }}>
                    {heroImage ? <img src={heroImage} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ textAlign: 'center', color: '#999' }}><SvgIcons.Image /><div style={{ fontSize: '0.75rem', marginTop: '4px', fontWeight: 600 }}>Upload</div></div>}
                    <input type="file" accept="image/*" onChange={(e) => uploadSingleImage(e.target.files[0], setHeroImage)} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>
            </div>

            <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #EAEAEA', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 4px 0' }}>Site Status</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>{savedEnabled ? 'Live & visible to customers' : 'Hidden (draft mode)'}</p>
              </div>
              <button
                type="button"
                onClick={toggleSiteStatus}
                disabled={saving}
                style={{ width: '56px', height: '30px', borderRadius: '15px', border: 'none', background: savedEnabled ? '#137333' : '#D1D5DB', position: 'relative', cursor: saving ? 'wait' : 'pointer', transition: 'all 0.2s' }}
              >
                <span style={{ position: 'absolute', top: '2px', left: savedEnabled ? '28px' : '2px', width: '26px', height: '26px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
              </button>
            </div>
          </>
        )}

        {/* ── TAB: DESIGN ── */}
        {activeTab === 'design' && (
          <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #EAEAEA', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 8px 0' }}>Choose a Theme</h3>
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1.5rem' }}>Select the look and feel of your storefront.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
              {templates.map(tpl => (
                <div key={tpl.id} onClick={() => setTemplateId(tpl.id)} style={{ border: templateId === tpl.id ? '2px solid #0F2B4A' : '1px solid #EAEAEA', borderRadius: '12px', padding: '1rem', cursor: 'pointer', display: 'flex', gap: '1rem', alignItems: 'center', background: templateId === tpl.id ? '#F8F9FA' : '#FFF' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '8px', background: tpl.preview, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 800, color: '#0F2B4A' }}>{tpl.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>{tpl.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB: CONTENT ── */}
        {activeTab === 'content' && (
          <>
            <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #EAEAEA', padding: '1.5rem', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 1rem 0' }}>About Your Business</h3>
              <textarea 
                value={aboutText} 
                onChange={e => setAboutText(e.target.value)} 
                placeholder="Tell your customers your story..." 
                rows={5} 
                style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '2px solid #EAEAEA', fontSize: '1rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                onFocus={(e) => e.target.style.borderColor = '#0F2B4A'}
                onBlur={(e) => e.target.style.borderColor = '#EAEAEA'}
              />
            </div>

            <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #EAEAEA', padding: '1.5rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Services & Pricing</h3>
                <button type="button" onClick={() => openServiceModal()} style={{ background: '#0F2B4A', color: '#FFF', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><SvgIcons.Plus size={14}/> Add</button>
              </div>
              {services.length === 0 ? <p style={{ fontSize: '0.85rem', color: '#888' }}>No services added yet.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {services.map((srv, idx) => (
                    <div key={idx} onClick={() => openServiceModal(idx)} style={{ display: 'flex', gap: '12px', background: '#F8F9FA', padding: '12px', borderRadius: '12px', cursor: 'pointer', alignItems: 'center' }}>
                      {srv.image_url ? <img src={srv.image_url} alt="" style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }} /> : <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#EAEAEA', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}><SvgIcons.Image size={16} /></div>}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F2B4A' }}>{srv.name} {srv.price && `- ₦${Number(srv.price).toLocaleString()}`}</div>
                        <div style={{ fontSize: '0.8rem', color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{srv.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #EAEAEA', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Portfolio Lookbook</h3>
                <label style={{ background: '#0F2B4A', color: '#FFF', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <SvgIcons.Plus size={14}/> Upload
                  <input type="file" multiple accept="image/*" onChange={(e) => handleBulkPortfolioUpload(e.target.files)} style={{ display: 'none' }} />
                </label>
              </div>
              {uploading && <p style={{ fontSize: '0.8rem', color: '#0F2B4A', fontWeight: 600 }}>Uploading images...</p>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '10px' }}>
                {portfolio.map((item, idx) => (
                  <div key={idx} onClick={() => openPortfolioModal(idx)} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', aspectRatio: '1', cursor: 'pointer', border: '1px solid #EAEAEA', background: '#F4F6F8' }}>
                    {item.url ? (
                      <img src={item.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}><SvgIcons.Image size={16} /></div>
                    )}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', padding: '8px 4px 4px 4px' }}>
                      <div style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title || 'Untitled'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── TAB: COMMERCE ── */}
        {activeTab === 'commerce' && (
          <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #EAEAEA', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 1rem 0' }}>Delivery Settings</h3>
            
            <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8F9FA', padding: '16px', borderRadius: '12px' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F2B4A' }}>Free Delivery</div>
                <div style={{ fontSize: '0.8rem', color: '#666' }}>Offer free delivery nationwide.</div>
              </div>
              <button type="button" onClick={() => setFreeDelivery(!freeDelivery)} style={{ width: '50px', height: '28px', borderRadius: '14px', border: 'none', background: freeDelivery ? '#137333' : '#D1D5DB', position: 'relative', cursor: 'pointer', transition: 'all 0.2s' }}>
                <span style={{ position: 'absolute', top: '2px', left: freeDelivery ? '24px' : '2px', width: '24px', height: '24px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
              </button>
            </div>

            {!freeDelivery && (
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1rem' }}>
                  {Object.entries(deliveryRates).map(([state, price]) => (
                    <div key={state} style={{ display: 'flex', justifyContent: 'space-between', background: '#F8F9FA', padding: '12px', borderRadius: '8px', border: '1px solid #EAEAEA' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F2B4A' }}>{state}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: 800, color: '#0F2B4A' }}>₦{Number(price).toLocaleString()}</span>
                        <button type="button" onClick={() => { const newRates = { ...deliveryRates }; delete newRates[state]; setDeliveryRates(newRates); }} style={{ background: '#FFF0F0', border: 'none', color: '#FF3B30', cursor: 'pointer', padding: '6px', borderRadius: '6px' }}><SvgIcons.Trash size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#F8F9FA', padding: '1rem', borderRadius: '12px', border: '2px dashed #EAEAEA' }}>
                  <div style={{ position: 'relative' }} ref={stateDropdownRef}>
                    <button 
                      type="button"
                      onClick={() => setShowStateDropdown(!showStateDropdown)}
                      style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #EAEAEA', background: '#FFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1rem', color: newDeliveryState ? '#0F2B4A' : '#999', fontWeight: 600, cursor: 'pointer' }}
                    >
                      {newDeliveryState || 'Select State'}
                      <SvgIcons.ChevronDown />
                    </button>
                    
                    {showStateDropdown && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: '#FFF', border: '1px solid #EAEAEA', borderRadius: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto', zIndex: 50 }}>
                        {NIGERIAN_STATES.filter(s => !deliveryRates[s]).map(s => (
                          <button 
                            key={s} 
                            type="button"
                            onClick={() => { setNewDeliveryState(s); setShowStateDropdown(false); }}
                            style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: '#FFF', border: 'none', borderBottom: '1px solid #F0F0F0', cursor: 'pointer', fontSize: '0.95rem', color: '#333' }}
                            onMouseEnter={(e) => e.target.style.background = '#F8F9FA'}
                            onMouseLeave={(e) => e.target.style.background = '#FFF'}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="number" 
                      value={newDeliveryPrice} 
                      onChange={e => setNewDeliveryPrice(e.target.value)} 
                      placeholder="Price (₦)" 
                      style={{ flex: 1, padding: '14px', borderRadius: '10px', border: '1px solid #EAEAEA', fontSize: '1rem', outline: 'none' }}
                    />
                    <button 
                      type="button" 
                      onClick={handleAddDeliveryRate} 
                      style={{ background: '#0F2B4A', color: '#FFF', border: 'none', padding: '0 20px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: SETTINGS ── */}
        {activeTab === 'settings' && (
          <>
            <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #EAEAEA', padding: '1.5rem', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 1rem 0' }}>Contact Information</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#666', marginBottom: '8px', textTransform: 'uppercase' }}>Phone</label>
                  <input type="text" value={businessPhone} onChange={e => setBusinessPhone(e.target.value)} style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #EAEAEA', fontSize: '1rem', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#666', marginBottom: '8px', textTransform: 'uppercase' }}>WhatsApp</label>
                  <input type="text" value={businessWhatsapp} onChange={e => setBusinessWhatsapp(e.target.value)} style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #EAEAEA', fontSize: '1rem', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#666', marginBottom: '8px', textTransform: 'uppercase' }}>Email</label>
                  <input type="email" value={businessEmail} onChange={e => setBusinessEmail(e.target.value)} style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #EAEAEA', fontSize: '1rem', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#666', marginBottom: '8px', textTransform: 'uppercase' }}>Address</label>
                  <input type="text" value={businessAddress} onChange={e => setBusinessAddress(e.target.value)} style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #EAEAEA', fontSize: '1rem', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#666', marginBottom: '8px', textTransform: 'uppercase' }}>Business Hours</label>
                  <input type="text" value={businessHours} onChange={e => setBusinessHours(e.target.value)} placeholder="Mon-Fri: 9am - 6pm" style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #EAEAEA', fontSize: '1rem', outline: 'none' }} />
                </div>
              </div>
            </div>

            <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #EAEAEA', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 1rem 0' }}>Google Search</h3>
              <div style={{ background: '#F8F9FA', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: '#0F2B4A' }}><SvgIcons.Google /> Search Index</div>
                <button type="button" onClick={() => {}} disabled={seoRequested} style={{ background: seoRequested ? '#EAEAEA' : '#0F2B4A', color: seoRequested ? '#999' : '#FFF', padding: '10px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: seoRequested ? 'not-allowed' : 'pointer' }}>{seoRequested ? 'Requested' : 'Boost'}</button>
              </div>
            </div>
          </>
        )}

      </div>

      {/* ── MODALS ── */}
   {modalType === 'service' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,43,74,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setModalType(null)}>
          <div style={{ background: '#FFFFFF', width: '100%', maxWidth: '500px', borderRadius: '20px', padding: '2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.3rem', fontWeight: 800, color: '#0F2B4A' }}>{activeItemIndex !== null ? 'Edit Service' : 'Add Service'}</h3>
            
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#666', marginBottom: '8px', textTransform: 'uppercase' }}>Service Image</label>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '140px', border: '2px dashed #EAEAEA', borderRadius: '12px', cursor: 'pointer', overflow: 'hidden', marginBottom: '1.5rem', background: tempService.image_url ? '#FFF' : '#F8F9FA' }}>
              {tempService.image_url ? <img src={tempService.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ textAlign: 'center', color: '#999' }}><SvgIcons.Image size={24} /><div style={{ fontSize: '0.8rem', marginTop: '8px', fontWeight: 600 }}>Upload Image</div></div>}
              <input type="file" accept="image/*" onChange={(e) => uploadSingleImage(e.target.files[0], (url) => setTempService({...tempService, image_url: url}))} style={{ display: 'none' }} />
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              <input type="text" placeholder="Service Name (e.g. Custom Senator)" value={tempService.name} onChange={e => setTempService({...tempService, name: e.target.value})} style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #EAEAEA', fontSize: '1rem', outline: 'none' }} />
              <input type="number" placeholder="Price (₦)" value={tempService.price} onChange={e => setTempService({...tempService, price: e.target.value})} style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #EAEAEA', fontSize: '1rem', outline: 'none' }} />
              <textarea placeholder="Description" value={tempService.desc} onChange={e => setTempService({...tempService, desc: e.target.value})} style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #EAEAEA', fontSize: '1rem', outline: 'none', height: '100px', resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setModalType(null)} style={{ flex: 1, padding: '14px', borderRadius: '10px', border: '1px solid #EAEAEA', background: '#FFF', fontWeight: 700, color: '#666', cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveService} style={{ flex: 1, padding: '14px', borderRadius: '10px', border: 'none', background: '#0F2B4A', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {modalType === 'portfolio_edit' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,43,74,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setModalType(null)}>
          <div style={{ background: '#FFFFFF', width: '100%', maxWidth: '500px', borderRadius: '20px', padding: '2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.3rem', fontWeight: 800, color: '#0F2B4A' }}>Edit Portfolio Item</h3>
            
            {tempPortfolioItem.url ? (
              <img src={tempPortfolioItem.url} alt="" style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '12px', marginBottom: '1.5rem' }} />
            ) : (
              <div style={{ width: '100%', height: '200px', background: '#F4F6F8', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                <SvgIcons.Image size={32} />
              </div>
            )}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              <input type="text" placeholder="Title (e.g. Aso Ebi Wedding)" value={tempPortfolioItem.title} onChange={e => setTempPortfolioItem({...tempPortfolioItem, title: e.target.value})} style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #EAEAEA', fontSize: '1rem', outline: 'none' }} />
              <textarea placeholder="Description (Optional)" value={tempPortfolioItem.desc} onChange={e => setTempPortfolioItem({...tempPortfolioItem, desc: e.target.value})} style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #EAEAEA', fontSize: '1rem', outline: 'none', height: '100px', resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setPortfolio(portfolio.filter((_, i) => i !== activeItemIndex)); setModalType(null) }} style={{ flex: 1, padding: '14px', borderRadius: '10px', border: '1px solid #FFD6D6', background: '#FFF0F0', fontWeight: 700, color: '#FF3B30', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><SvgIcons.Trash size={16}/></button>
              <button onClick={() => setModalType(null)} style={{ flex: 2, padding: '14px', borderRadius: '10px', border: '1px solid #EAEAEA', background: '#FFF', fontWeight: 700, color: '#666', cursor: 'pointer' }}>Cancel</button>
              <button onClick={savePortfolioItem} style={{ flex: 2, padding: '14px', borderRadius: '10px', border: 'none', background: '#0F2B4A', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* FIXED FOOTER */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '1rem', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', borderTop: '1px solid #EAEAEA', zIndex: 100 }}>
        <button type="button" onClick={handleSave} disabled={saving} style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', background: '#0F2B4A', color: '#FFF', fontWeight: 800, fontSize: '1rem', cursor: saving ? 'wait' : 'pointer', boxShadow: '0 4px 15px rgba(15,43,74,0.2)' }}>
          {saving ? 'Saving Changes...' : 'Save Website Settings'}
        </button>
      </div>

      {/* TOAST */}
      {toastMessage && (
        <div style={{ position: 'fixed', bottom: '90px', right: '20px', left: '20px', background: toastType === 'error' ? '#FF3B30' : '#0F2B4A', color: '#FFF', padding: '16px', borderRadius: '8px', fontWeight: 600, boxShadow: '0 10px 30px rgba(0,0,0,0.2)', zIndex: 9999, textAlign: 'center' }}>
          {toastMessage}
        </div>
      )}
    </div>
  )
                                                                                     }
