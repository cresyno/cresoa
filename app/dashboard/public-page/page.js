'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { compressImage } from '../../../lib/compressImage'
import ClassicGold from '../../../components/public-templates/ClassicGold'
import ModernBold from '../../../components/public-templates/ModernBold'
import Elegant from '../../../components/public-templates/Elegant'
import FreshSerene from '../../../components/public-templates/FreshSerene'
import DynamicSunrise from '../../../components/public-templates/DynamicSunrise'

const TEMPLATES = [
  { id: 'classic-gold', name: 'Classic Gold', component: ClassicGold },
  { id: 'modern-bold', name: 'Modern Bold', component: ModernBold },
  { id: 'elegant', name: 'Elegant', component: Elegant },
  { id: 'fresh-serene', name: 'Fresh Serene', component: FreshSerene },
  { id: 'dynamic-sunrise', name: 'Dynamic Sunrise', component: DynamicSunrise },
]

const Icon = ({ name, size = 20, stroke = 'currentColor' }) => {
  const icons = {
    edit: <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />,
    save: <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></>,
    copy: <><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
    share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    trash: <><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>,
    info: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}

const inputStyle = { width: '100%', padding: '0.7rem 0.9rem', borderRadius: '10px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.95rem', boxSizing: 'border-box' }
const labelStyle = { display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--cresoa-text)' }

const safeParseArray = (input) => {
  try {
    if (Array.isArray(input)) return input
    if (typeof input === 'string') {
      const parsed = JSON.parse(input)
      if (Array.isArray(parsed)) return parsed
    }
  } catch (e) {}
  return []
}

export default function PublicPageSettings() {
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [publicUrl, setPublicUrl] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)

  // Section editing state (object with boolean per section)
  const [editing, setEditing] = useState({})
  const [anyEditing, setAnyEditing] = useState(false) // to show save button

  // Data state
  const [enabled, setEnabled] = useState(false)
  const [slug, setSlug] = useState('')
  const [slugStatus, setSlugStatus] = useState('idle')
  const [templateId, setTemplateId] = useState('elegant')
  const [logo, setLogo] = useState('')
  const [heroImage, setHeroImage] = useState('')
  const [heroFont, setHeroFont] = useState('Inter')
  const [heroLayout, setHeroLayout] = useState('center') // 'center' or 'left'
  const [description, setDescription] = useState('')
  const [about, setAbout] = useState('')
  const [whyUs, setWhyUs] = useState([]) // list of { text } or just strings
  const [services, setServices] = useState([])
  const [shopProducts, setShopProducts] = useState([])
  const [portfolio, setPortfolio] = useState([])
  const [showQuoteButton, setShowQuoteButton] = useState(true)
  const [showWhatsappButton, setShowWhatsappButton] = useState(true)
  const [hasServices, setHasServices] = useState(true)
  const [hasShop, setHasShop] = useState(false)
  const [footerText, setFooterText] = useState('')
  const [helpOpen, setHelpOpen] = useState({})

  const slugTimerRef = useRef(null)

  useEffect(() => {
    const load = async () => {
      if (!businessId) return
      try {
        const { data: biz } = await supabase.from('businesses').select('logo_url').eq('id', businessId).single()
        if (biz?.logo_url) setLogo(biz.logo_url)

        const { data, error } = await supabase
          .from('business_public_pages')
          .select('*')
          .eq('business_id', businessId)
          .maybeSingle()
        if (error) throw error
        if (data) {
          setEnabled(data.is_enabled || false)
          setSlug(data.slug || '')
          setTemplateId(data.template_id || 'elegant')
          setHeroImage(data.cover_image_url || '')
          setHeroFont(data.hero_font || 'Inter')
          setHeroLayout(data.hero_layout || 'center')
          setDescription(data.description || '')
          setAbout(data.about || '')
          setWhyUs(safeParseArray(data.why_us) || [])
          setServices(safeParseArray(data.services))
          setShopProducts(safeParseArray(data.shop_products))
          setPortfolio(safeParseArray(data.portfolio_images))
          setShowQuoteButton(data.show_quote_button ?? true)
          setShowWhatsappButton(data.show_whatsapp_button ?? true)
          setHasServices(data.has_services ?? true)
          setHasShop(data.has_shop ?? false)
          setFooterText(data.footer_text || '')
          setPublicUrl(`${window.location.origin}/${data.slug}`)
        }
      } catch (err) { console.error(err) } finally { setLoading(false) }
    }
    load()
  }, [businessId])

  const checkSlug = useCallback(async (value) => {
    if (slugTimerRef.current) clearTimeout(slugTimerRef.current)
    slugTimerRef.current = setTimeout(async () => {
      if (!value.trim()) { setSlugStatus('idle'); return }
      setSlugStatus('checking')
      const res = await fetch(`/api/public-page/check-slug?slug=${value}&business_id=${businessId}`)
      const data = await res.json()
      if (data.available) { setSlugStatus('available'); setSlug(data.normalized); setPublicUrl(`${window.location.origin}/${data.normalized}`) } else { setSlugStatus('taken') }
    }, 500)
  }, [businessId])

  const handleSlugChange = (e) => { const val = e.target.value; setSlug(val); checkSlug(val) }

  const autoSuggestSlug = async () => {
    const { data: biz } = await supabase.from('businesses').select('name').eq('id', businessId).single()
    if (biz?.name) { const s = biz.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); setSlug(s); checkSlug(s) }
  }

  const handleCopyLink = async () => {
    try { await navigator.clipboard.writeText(publicUrl); setMessage('Link copied!') } catch { setMessage('Could not copy link.') }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'My Business', url: publicUrl }) } catch {}
    } else { await handleCopyLink() }
  }

  const toggleEdit = (section) => {
    setEditing(prev => {
      const next = { ...prev, [section]: !prev[section] }
      const any = Object.values(next).some(v => v)
      setAnyEditing(any)
      return next
    })
  }

  const toggleHelp = (fieldId) => {
    setHelpOpen(prev => ({ ...prev, [fieldId]: !prev[fieldId] }))
  }

  const uploadImage = async (file, folder, callback) => {
    if (!file) return
    setSaving(true)
    try {
      const compressedBlob = await compressImage(file, 200)
      const filePath = `${businessId}/${folder}-${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('business-assets')
        .upload(filePath, compressedBlob, { contentType: 'image/jpeg' })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage
        .from('business-assets')
        .getPublicUrl(filePath)
      callback(urlData.publicUrl)
      setMessage('Image uploaded successfully')
    } catch (err) {
      setMessage('Upload failed: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    if (!slug.trim()) { setMessage('Slug is required.'); return }
    if (slugStatus === 'taken') { setMessage('Slug is taken.'); return }
    setSaving(true)
    try {
      if (logo) {
        const { error: logoError } = await supabase.from('businesses').update({ logo_url: logo }).eq('id', businessId)
        if (logoError) throw logoError
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/public-page/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          business_id: businessId,
          slug,
          is_enabled: enabled,
          template_id: templateId,
          cover_image_url: heroImage,
          hero_font: heroFont,
          hero_layout: heroLayout,
          description,
          about,
          why_us: whyUs,
          services,
          shop_products: shopProducts,
          portfolio_images: portfolio,
          show_quote_button: showQuoteButton,
          show_whatsapp_button: showWhatsappButton,
          has_services: hasServices,
          has_shop: hasShop,
          footer_text: footerText,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Save failed')
      setPublicUrl(`${window.location.origin}/${slug}`)
      setMessage('✅ Saved!')
      setEditing({}) // reset editing
      setAnyEditing(false)
    } catch (err) { setMessage('❌ ' + err.message) } finally { setSaving(false) }
  }

  // CRUD for services, products, portfolio, whyUs
  const addService = () => setServices(prev => [...prev, { name: '', description: '', image_url: '' }])
  const updateService = (idx, field, val) => setServices(prev => prev.map((s, i) => i === idx ? { ...s, [field]: val } : s))
  const removeService = (idx) => setServices(prev => prev.filter((_, i) => i !== idx))

  const addProduct = () => setShopProducts(prev => [...prev, { name: '', description: '', price: '', image_url: '' }])
  const updateProduct = (idx, field, val) => setShopProducts(prev => prev.map((p, i) => i === idx ? { ...p, [field]: val } : p))
  const removeProduct = (idx) => setShopProducts(prev => prev.filter((_, i) => i !== idx))

  const addWhyUs = () => setWhyUs(prev => [...prev, { text: '' }])
  const updateWhyUs = (idx, val) => setWhyUs(prev => prev.map((w, i) => i === idx ? { ...w, text: val } : w))
  const removeWhyUs = (idx) => setWhyUs(prev => prev.filter((_, i) => i !== idx))

  const handlePortfolioUpload = (url) => {
    if (portfolio.length >= 10) { setMessage('Maximum 10 images'); return }
    setPortfolio(prev => [...prev, { url, description: '' }])
  }
  const updatePortfolioDescription = (idx, val) => setPortfolio(prev => prev.map((p, i) => i === idx ? { ...p, description: val } : p))
  const removePortfolio = (idx) => setPortfolio(prev => prev.filter((_, i) => i !== idx))

  // Preview data
  const previewBusiness = { name: 'Your Business Name', logo_url: logo || null, phone: '08012345678', email: 'contact@business.com', location: 'Ibadan, Nigeria' }
  const previewPage = { description: description || 'Welcome to our business.', about: about || '', why_us: whyUs, show_quote_button: showQuoteButton, show_whatsapp_button: showWhatsappButton, has_services: hasServices, has_shop: hasShop, hero_font: heroFont, hero_layout: heroLayout }
  const previewServices = services.length > 0 ? services : [{ name: 'Service 1', description: 'Description', image_url: '' }]
  const previewShop = shopProducts.length > 0 ? shopProducts : [{ name: 'Product 1', description: 'Description', price: '₦5,000', image_url: '' }]
  const previewPortfolio = portfolio.length > 0 ? portfolio.map(p => ({ url: p.url, description: p.description })) : []
  const previewReviews = []

  const ActiveTemplate = TEMPLATES.find(t => t.id === templateId)?.component || Elegant

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--cresoa-bg)' }}><div className="cresoa-loading-spinner" /></div>

  return (
    <div style={{ padding: '1rem', maxWidth: '900px', margin: '0 auto', background: 'var(--cresoa-bg)', minHeight: '100vh', paddingBottom: '100px' }}>
      {/* Top Bar: only save appears when editing */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>Public Page</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.2rem 0' }}>Your Business Website</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setPreviewOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', cursor: 'pointer', fontWeight: 600 }}>
            <Icon name="eye" size={16} /> Preview Page
          </button>
          {publicUrl && enabled && (
            <a href={publicUrl} target="_blank" rel="noopener" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'inherit', textDecoration: 'none', fontWeight: 600 }}>
              View Live Website
            </a>
          )}
          {anyEditing && (
            <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'var(--cresoa-accent)', color: '#fff', padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', fontWeight: 700 }}>
              <Icon name="save" size={16} stroke="#fff" /> {saving ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      </div>

      {message && <div style={{ padding: '0.6rem 1rem', borderRadius: '8px', marginBottom: '1rem', background: message.startsWith('✅') ? 'var(--cresoa-success-soft)' : 'var(--cresoa-danger-soft)', color: message.startsWith('✅') ? 'var(--cresoa-success)' : 'var(--cresoa-danger)' }}>{message}</div>}

      {/* ========== SECTION: Website URL ========== */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Website URL</h3>
          <button onClick={() => toggleEdit('url')} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', cursor: 'pointer' }}>
            <Icon name="edit" size={14} /> Edit
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <span style={{ color: 'var(--cresoa-text-muted)' }}>cresoa.com.ng/</span>
          {editing.url ? (
            <input type="text" value={slug} onChange={handleSlugChange} style={{ ...inputStyle, flex: 1 }} />
          ) : (
            <span style={{ fontWeight: 600, fontSize: '1rem' }}>{slug || 'your-business-name'}</span>
          )}
          {editing.url && <button onClick={autoSuggestSlug} style={{ background: 'none', border: 'none', color: 'var(--cresoa-accent)', cursor: 'pointer', fontSize: '0.8rem' }}>Auto-suggest</button>}
        </div>
        {editing.url && (
          <div style={{ marginTop: '0.4rem' }}>
            <span style={{ color: slugStatus === 'available' ? 'green' : slugStatus === 'taken' ? 'red' : 'gray', fontSize: '0.8rem' }}>{slugStatus === 'checking' ? 'Checking...' : slugStatus === 'available' ? '✅ Available' : slugStatus === 'taken' ? '❌ Taken' : ''}</span>
            <button onClick={() => toggleHelp('url')} style={{ marginLeft: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', verticalAlign: 'middle' }}><Icon name="info" size={14} /></button>
            {helpOpen.url && (
              <div style={{ background: 'var(--cresoa-bg)', border: '1px solid var(--cresoa-border)', borderRadius: '8px', padding: '0.5rem', fontSize: '0.8rem', marginTop: '0.3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Your page URL is what customers will use to visit your website. It must be unique and easy to remember.</span>
                <button onClick={() => toggleHelp('url')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
              </div>
            )}
          </div>
        )}
        {publicUrl && enabled && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem' }}>
            <button onClick={handleCopyLink} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', cursor: 'pointer', fontSize: '0.8rem' }}><Icon name="copy" size={14} /> Copy Link</button>
            <button onClick={handleShare} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', cursor: 'pointer', fontSize: '0.8rem' }}><Icon name="share" size={14} /> Share</button>
          </div>
        )}
      </div>

      {/* ========== SECTION: Templates ========== */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Templates</h3>
          <button onClick={() => toggleEdit('template')} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', cursor: 'pointer' }}>
            <Icon name="edit" size={14} /> Edit
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.6rem' }}>
          {TEMPLATES.map(t => (
            <button key={t.id} onClick={() => editing.template && setTemplateId(t.id)} disabled={!editing.template} style={{ background: templateId === t.id ? 'var(--cresoa-accent-soft)' : 'var(--cresoa-surface-soft)', border: `2px solid ${templateId === t.id ? 'var(--cresoa-accent)' : 'var(--cresoa-border)'}`, borderRadius: '10px', padding: '0.8rem', cursor: editing.template ? 'pointer' : 'not-allowed' }}>
              <strong>{t.name}</strong>
            </button>
          ))}
        </div>
      </div>

        {/* ========== SECTION: Hero ========== */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Hero Section</h3>
          <button onClick={() => toggleEdit('hero')} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', cursor: 'pointer' }}>
            <Icon name="edit" size={14} /> Edit
          </button>
        </div>
        <div style={{ marginBottom: '0.8rem' }}>
          <label style={labelStyle}>Hero Photo</label>
          {editing.hero && <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && uploadImage(e.target.files[0], 'cover', setHeroImage)} />}
          {heroImage && <img src={heroImage} alt="Hero" style={{ marginTop: '0.5rem', width: '100%', maxHeight: '250px', objectFit: 'cover', borderRadius: '8px' }} />}
        </div>
        <div style={{ marginBottom: '0.8rem' }}>
          <label style={labelStyle}>Hero Font</label>
          {editing.hero && (
            <select value={heroFont} onChange={(e) => setHeroFont(e.target.value)} style={inputStyle}>
              <option value="Inter">Inter</option>
              <option value="Playfair Display">Playfair Display</option>
              <option value="Montserrat">Montserrat</option>
              <option value="Lora">Lora</option>
            </select>
          )}
          {!editing.hero && <span>{heroFont}</span>}
        </div>
        <div style={{ marginBottom: '0.8rem' }}>
          <label style={labelStyle}>Layout Position</label>
          {editing.hero && (
            <select value={heroLayout} onChange={(e) => setHeroLayout(e.target.value)} style={inputStyle}>
              <option value="center">Centered</option>
              <option value="left">Left Aligned</option>
            </select>
          )}
          {!editing.hero && <span>{heroLayout === 'center' ? 'Centered' : 'Left Aligned'}</span>}
        </div>
        <div>
          <label style={labelStyle}>Short Description <Icon name="info" size={14} onClick={() => toggleHelp('heroDesc')} /></label>
          {helpOpen.heroDesc && (
            <div style={{ background: 'var(--cresoa-bg)', border: '1px solid var(--cresoa-border)', borderRadius: '8px', padding: '0.5rem', fontSize: '0.8rem', marginBottom: '0.5rem' }}>This is a brief sentence describing your business. It appears at the top of your page.</div>
          )}
          <textarea value={description} onChange={(e) => editing.hero && setDescription(e.target.value)} disabled={!editing.hero} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>
      </div>

      {/* ========== SECTION: About ========== */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>About Section</h3>
          <button onClick={() => toggleEdit('about')} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', cursor: 'pointer' }}>
            <Icon name="edit" size={14} /> Edit
          </button>
        </div>
        <textarea value={about} onChange={(e) => editing.about && setAbout(e.target.value)} disabled={!editing.about} rows={5} style={{ ...inputStyle, resize: 'vertical' }} />
      </div>

      {/* ========== SECTION: Why Us ========== */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Why Choose Us</h3>
          <button onClick={() => toggleEdit('whyUs')} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', cursor: 'pointer' }}>
            <Icon name="edit" size={14} /> Edit
          </button>
        </div>
        {whyUs.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '1.2rem' }}>✓</span>
            <input
              type="text"
              placeholder="Why customers should choose you"
              value={item.text}
              onChange={(e) => editing.whyUs && updateWhyUs(idx, e.target.value)}
              disabled={!editing.whyUs}
              style={inputStyle}
            />
            {editing.whyUs && <button onClick={() => removeWhyUs(idx)} style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer' }}><Icon name="trash" size={16} /></button>}
          </div>
        ))}
        {editing.whyUs && <button onClick={addWhyUs} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px dashed var(--cresoa-border)', background: 'transparent', cursor: 'pointer' }}><Icon name="plus" size={14} /> Add Reason</button>}
      </div>

      {/* ========== SECTION: Services (Grid) ========== */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Services</h3>
          <button onClick={() => toggleEdit('services')} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', cursor: 'pointer' }}>
            <Icon name="edit" size={14} /> Edit
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {services.map((s, idx) => (
            <div key={idx} style={{ border: '1px solid var(--cresoa-border)', borderRadius: '8px', padding: '0.8rem' }}>
              <input
                type="text"
                placeholder="Service name"
                value={s.name}
                onChange={(e) => editing.services && updateService(idx, 'name', e.target.value)}
                disabled={!editing.services}
                style={{ ...inputStyle, marginBottom: '0.4rem' }}
              />
              <textarea
                placeholder="Description"
                value={s.description}
                onChange={(e) => editing.services && updateService(idx, 'description', e.target.value)}
                disabled={!editing.services}
                rows={2}
                style={{ ...inputStyle, marginBottom: '0.4rem' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {editing.services && <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && uploadImage(e.target.files[0], 'service', (url) => updateService(idx, 'image_url', url))} />}
                {s.image_url && <img src={s.image_url} alt="Service" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />}
                {editing.services && <button onClick={() => removeService(idx)} style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer' }}><Icon name="trash" size={16} /></button>}
              </div>
            </div>
          ))}
        </div>
        {editing.services && <button onClick={addService} style={{ marginTop: '0.8rem', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px dashed var(--cresoa-border)', background: 'transparent', cursor: 'pointer' }}><Icon name="plus" size={14} /> Add Service</button>}
      </div>

      {/* ========== SECTION: Products (Grid) ========== */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Shop Products</h3>
          <button onClick={() => toggleEdit('products')} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', cursor: 'pointer' }}>
            <Icon name="edit" size={14} /> Edit
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {shopProducts.map((p, idx) => (
            <div key={idx} style={{ border: '1px solid var(--cresoa-border)', borderRadius: '8px', padding: '0.8rem' }}>
              <input
                type="text"
                placeholder="Product name"
                value={p.name}
                onChange={(e) => editing.products && updateProduct(idx, 'name', e.target.value)}
                disabled={!editing.products}
                style={{ ...inputStyle, marginBottom: '0.4rem' }}
              />
              <input
                type="number"
                placeholder="Price (₦)"
                value={p.price}
                onChange={(e) => editing.products && updateProduct(idx, 'price', e.target.value)}
                disabled={!editing.products}
                style={{ ...inputStyle, marginBottom: '0.4rem' }}
              />
              <textarea
                placeholder="Description"
                value={p.description}
                onChange={(e) => editing.products && updateProduct(idx, 'description', e.target.value)}
                disabled={!editing.products}
                rows={2}
                style={{ ...inputStyle, marginBottom: '0.4rem' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {editing.products && <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && uploadImage(e.target.files[0], 'product', (url) => updateProduct(idx, 'image_url', url))} />}
                {p.image_url && <img src={p.image_url} alt="Product" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />}
                {editing.products && <button onClick={() => removeProduct(idx)} style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer' }}><Icon name="trash" size={16} /></button>}
              </div>
            </div>
          ))}
        </div>
        {editing.products && <button onClick={addProduct} style={{ marginTop: '0.8rem', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px dashed var(--cresoa-border)', background: 'transparent', cursor: 'pointer' }}><Icon name="plus" size={14} /> Add Product</button>}
      </div>

      {/* ========== SECTION: Portfolio ========== */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Portfolio</h3>
          <button onClick={() => toggleEdit('portfolio')} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', cursor: 'pointer' }}>
            <Icon name="edit" size={14} /> Edit
          </button>
        </div>
        {portfolio.map((p, idx) => (
          <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.6rem' }}>
            {p.url && <img src={p.url} alt="Portfolio" style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '8px' }} />}
            <input
              type="text"
              placeholder="Description (required)"
              value={p.description}
              onChange={(e) => editing.portfolio && updatePortfolioDescription(idx, e.target.value)}
              disabled={!editing.portfolio}
              style={{ flex: 1, ...inputStyle }}
            />
            {editing.portfolio && <button onClick={() => removePortfolio(idx)} style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer' }}><Icon name="trash" size={16} /></button>}
          </div>
        ))}
        {editing.portfolio && <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && uploadImage(e.target.files[0], 'portfolio', handlePortfolioUpload)} />}
      </div>

      {/* ========== SECTION: Footer ========== */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Footer & Buttons</h3>
          <button onClick={() => toggleEdit('footer')} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', cursor: 'pointer' }}>
            <Icon name="edit" size={14} /> Edit
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <div>
            <label style={labelStyle}>Footer Text</label>
            <input type="text" value={footerText} onChange={(e) => editing.footer && setFooterText(e.target.value)} disabled={!editing.footer} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Show Quote Button</span>
            <button onClick={() => editing.footer && setShowQuoteButton(!showQuoteButton)} disabled={!editing.footer} style={{ width: '48px', height: '24px', borderRadius: '12px', border: 'none', background: showQuoteButton ? 'var(--cresoa-success)' : 'var(--cresoa-border)', position: 'relative' }}>
              <span style={{ position: 'absolute', top: '2px', left: showQuoteButton ? '26px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Show WhatsApp Button</span>
            <button onClick={() => editing.footer && setShowWhatsappButton(!showWhatsappButton)} disabled={!editing.footer} style={{ width: '48px', height: '24px', borderRadius: '12px', border: 'none', background: showWhatsappButton ? 'var(--cresoa-success)' : 'var(--cresoa-border)', position: 'relative' }}>
              <span style={{ position: 'absolute', top: '2px', left: showWhatsappButton ? '26px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
            </button>
          </div>
        </div>
      </div>

      {/* ========== SECTION: Enable Page ========== */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Enable your public page</span>
        <button onClick={() => editing.footer && setEnabled(!enabled)} disabled={!editing.footer} style={{ width: '48px', height: '24px', borderRadius: '12px', border: 'none', cursor: editing.footer ? 'pointer' : 'not-allowed', background: enabled ? 'var(--cresoa-success)' : 'var(--cresoa-border)', position: 'relative' }}>
          <span style={{ position: 'absolute', top: '2px', left: enabled ? '26px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
        </button>
      </div>

      {/* ========== PREVIEW MODAL ========== */}
      {previewOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ background: 'var(--cresoa-surface)', borderRadius: '16px', padding: '1.5rem', maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Live Preview</h3>
              <button onClick={() => setPreviewOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ border: '1px solid var(--cresoa-border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
              <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                <ActiveTemplate business={previewBusiness} page={previewPage} services={previewServices} shop={previewShop} portfolio={previewPortfolio} reviews={previewReviews} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
                                                            }
