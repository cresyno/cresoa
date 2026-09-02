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
    up: <><polyline points="18 15 12 9 6 15" /></>,
    down: <><polyline points="6 9 12 15 18 9" /></>,
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

// Helper for help tooltip
const Help = ({ field, helpOpen, toggleHelp }) => (
  <>
    <button onClick={() => toggleHelp(field)} style={{ background: 'none', border: 'none', cursor: 'pointer', verticalAlign: 'middle', marginLeft: '0.3rem' }}>
      <Icon name="info" size={14} />
    </button>
    {helpOpen[field] && (
      <div style={{ background: 'var(--cresoa-bg)', border: '1px solid var(--cresoa-border)', borderRadius: '8px', padding: '0.5rem', fontSize: '0.8rem', marginTop: '0.3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{HELP_TEXT[field] || 'No instruction.'}</span>
        <button onClick={() => toggleHelp(field)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
      </div>
    )}
  </>
)

// Instructions for fields
const HELP_TEXT = {
  slug: 'This is the URL customers will use to visit your site. Must be unique.',
  heroPhoto: 'Upload a high-quality image (max 200KB after compression). It will be the background of the hero section.',
  heroFont: 'Choose a font style for the business name and text in the hero.',
  heroLayout: 'Select how the hero content is aligned.',
  description: 'A short description of your business that appears in the hero.',
  about: 'Tell your business story. This appears in the About section.',
  whyUs: 'Add reasons why customers should choose you. Each becomes a bullet point.',
  services: 'Add services with optional photo. They will appear as cards.',
  productName: 'The name of the product.',
  productPrice: 'Enter the price in Naira (figures only).',
  productImage: 'Upload a product photo (max 200KB).',
  portfolioDesc: 'A required description for each portfolio image.',
  footerText: 'Text that appears at the bottom of your page. Could include copyright, tagline, etc.',
  headerOrder: 'Drag or use arrows to reorder the navigation links.',
  headerSidebar: 'If enabled, navigation will be a side menu instead of a top header.',
  contactPhone: 'The phone number customers can call.',
  contactWhatsapp: 'The number customers can message on WhatsApp.',
  contactEmail: 'Your business email address.',
  contactAddress: 'Your physical location.',
  socialLinks: 'Paste the full URLs to your social media profiles.',
}

export default function PublicPageSettings() {
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [publicUrl, setPublicUrl] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)

  // Editing state per section
  const [editing, setEditing] = useState({})
  const [anyEditing, setAnyEditing] = useState(false)

  // Data state (extended)
  const [enabled, setEnabled] = useState(false)
  const [slug, setSlug] = useState('')
  const [slugStatus, setSlugStatus] = useState('idle')
  const [templateId, setTemplateId] = useState('elegant')
  const [logo, setLogo] = useState('')
  const [heroImage, setHeroImage] = useState('')
  const [heroFont, setHeroFont] = useState('Inter')
  const [heroLayout, setHeroLayout] = useState('center')
  const [description, setDescription] = useState('')
  const [about, setAbout] = useState('')
  const [whyUs, setWhyUs] = useState([])
  const [services, setServices] = useState([])
  const [shopProducts, setShopProducts] = useState([])
  const [portfolio, setPortfolio] = useState([])
  const [showQuoteButton, setShowQuoteButton] = useState(true)
  const [showWhatsappButton, setShowWhatsappButton] = useState(true)
  const [hasServices, setHasServices] = useState(true)
  const [hasShop, setHasShop] = useState(false)
  const [footerText, setFooterText] = useState('')
  const [helpOpen, setHelpOpen] = useState({})

  // New: Header customization
  const [headerOrder, setHeaderOrder] = useState(['Home', 'About', 'Services', 'Shop', 'Work', 'Contact'])
  const [headerSidebar, setHeaderSidebar] = useState(false)

  // New: Contact info (business)
  const [businessPhone, setBusinessPhone] = useState('')
  const [businessWhatsapp, setBusinessWhatsapp] = useState('')
  const [businessEmail, setBusinessEmail] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')
  const [businessFacebook, setBusinessFacebook] = useState('')
  const [businessGoogle, setBusinessGoogle] = useState('')
  const [businessInstagram, setBusinessInstagram] = useState('')
  const [businessTiktok, setBusinessTiktok] = useState('')
  const [businessYoutube, setBusinessYoutube] = useState('')
  const [businessLinkedin, setBusinessLinkedin] = useState('')

  const slugTimerRef = useRef(null)

  useEffect(() => {
    const load = async () => {
      if (!businessId) return
      try {
        // Load business data
        const { data: biz, error: bizErr } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', businessId)
          .single()
        if (bizErr) throw bizErr
        setLogo(biz.logo_url || '')
        setBusinessPhone(biz.phone || '')
        setBusinessWhatsapp(biz.whatsapp || '')
        setBusinessEmail(biz.email || '')
        setBusinessAddress(biz.location || '')
        setBusinessFacebook(biz.facebook || '')
        setBusinessGoogle(biz.google_business || '')
        setBusinessInstagram(biz.instagram || '')
        setBusinessTiktok(biz.tiktok || '')
        setBusinessYoutube(biz.youtube || '')
        setBusinessLinkedin(biz.linkedin || '')

        // Load public page
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
          setHeaderOrder(data.header_order || ['Home', 'About', 'Services', 'Shop', 'Work', 'Contact'])
          setHeaderSidebar(data.header_sidebar || false)
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

  const moveHeaderItem = (index, direction) => {
    const newOrder = [...headerOrder]
    const target = index + direction
    if (target < 0 || target >= newOrder.length) return
    ;[newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]]
    setHeaderOrder(newOrder)
  }

  const handleSave = async () => {
    if (!slug.trim()) { setMessage('Slug is required.'); return }
    if (slugStatus === 'taken') { setMessage('Slug is taken.'); return }
    setSaving(true)
    try {
      // Update business contact info
      const { error: bizError } = await supabase
        .from('businesses')
        .update({
          phone: businessPhone,
          whatsapp: businessWhatsapp,
          email: businessEmail,
          location: businessAddress,
          facebook: businessFacebook,
          google_business: businessGoogle,
          instagram: businessInstagram,
          tiktok: businessTiktok,
          youtube: businessYoutube,
          linkedin: businessLinkedin,
          logo_url: logo,
        })
        .eq('id', businessId)
      if (bizError) throw bizError

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
          header_order: headerOrder,
          header_sidebar: headerSidebar,
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

  // CRUD helpers
  const addService = () => setServices(prev => [...prev, { name: '', description: '', image_url: '', featured: false }])
  const updateService = (idx, field, val) => setServices(prev => prev.map((s, i) => i === idx ? { ...s, [field]: val } : s))
  const removeService = (idx) => setServices(prev => prev.filter((_, i) => i !== idx))
  const addProduct = () => setShopProducts(prev => [...prev, { name: '', description: '', price: '', image_url: '', featured: false }])
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

  const toggleFeaturedProduct = (idx) => {
    setShopProducts(prev => prev.map((p, i) => i === idx ? { ...p, featured: !p.featured } : p))
  }

  // Preview data
  const previewBusiness = {
    name: 'Your Business Name',
    logo_url: logo || null,
    phone: businessPhone,
    whatsapp: businessWhatsapp,
    email: businessEmail,
    location: businessAddress,
    facebook: businessFacebook,
    google_business: businessGoogle,
    instagram: businessInstagram,
    tiktok: businessTiktok,
    youtube: businessYoutube,
    linkedin: businessLinkedin,
  }
  const previewPage = {
    description: description || 'Welcome to our business.',
    about: about || '',
    why_us: whyUs,
    show_quote_button: showQuoteButton,
    show_whatsapp_button: showWhatsappButton,
    has_services: hasServices,
    has_shop: hasShop,
    hero_font: heroFont,
    hero_layout: heroLayout,
    header_order: headerOrder,
    header_sidebar: headerSidebar,
  }
  const previewServices = services.length > 0 ? services : [{ name: 'Service 1', description: 'Description', image_url: '' }]
  const previewShop = shopProducts.length > 0 ? shopProducts : [{ name: 'Product 1', description: 'Description', price: '₦5,000', image_url: '' }]
  const previewPortfolio = portfolio.length > 0 ? portfolio.map(p => ({ url: p.url, description: p.description })) : []
  const previewReviews = []

  const ActiveTemplate = TEMPLATES.find(t => t.id === templateId)?.component || Elegant

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--cresoa-bg)' }}><div className="cresoa-loading-spinner" /></div>

  return (
    <div style={{ padding: '1rem', maxWidth: '900px', margin: '0 auto', background: 'var(--cresoa-bg)', minHeight: '100vh', paddingBottom: '100px' }}>
            {/* Top Bar */}
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
      <SectionCard title="Website URL" editing={editing.url} toggleEdit={() => toggleEdit('url')}>
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
            <Help field="slug" helpOpen={helpOpen} toggleHelp={toggleHelp} />
          </div>
        )}
        {publicUrl && enabled && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem' }}>
            <button onClick={handleCopyLink} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', cursor: 'pointer', fontSize: '0.8rem' }}><Icon name="copy" size={14} /> Copy Link</button>
            <button onClick={handleShare} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', cursor: 'pointer', fontSize: '0.8rem' }}><Icon name="share" size={14} /> Share</button>
          </div>
        )}
      </SectionCard>

      {/* ========== SECTION: Templates ========== */}
      <SectionCard title="Templates" editing={editing.template} toggleEdit={() => toggleEdit('template')}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.6rem' }}>
          {TEMPLATES.map(t => (
            <button key={t.id} onClick={() => editing.template && setTemplateId(t.id)} disabled={!editing.template} style={{ background: templateId === t.id ? 'var(--cresoa-accent-soft)' : 'var(--cresoa-surface-soft)', border: `2px solid ${templateId === t.id ? 'var(--cresoa-accent)' : 'var(--cresoa-border)'}`, borderRadius: '10px', padding: '0.8rem', cursor: editing.template ? 'pointer' : 'not-allowed' }}>
              <strong>{t.name}</strong>
            </button>
          ))}
        </div>
      </SectionCard>

      {/* ========== SECTION: Header Customization ========== */}
      <SectionCard title="Header Navigation" editing={editing.header} toggleEdit={() => toggleEdit('header')}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Menu Items (Reorder)</label>
          {headerOrder.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
              <span style={{ fontWeight: 600, width: '100px' }}>{item}</span>
              {editing.header && (
                <>
                  <button onClick={() => moveHeaderItem(idx, -1)} disabled={idx === 0} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Icon name="up" size={14} /></button>
                  <button onClick={() => moveHeaderItem(idx, 1)} disabled={idx === headerOrder.length - 1} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Icon name="down" size={14} /></button>
                </>
              )}
            </div>
          ))}
          <Help field="headerOrder" helpOpen={helpOpen} toggleHelp={toggleHelp} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>Use Sidebar instead of Header</span>
          <button onClick={() => editing.header && setHeaderSidebar(!headerSidebar)} disabled={!editing.header} style={{ width: '48px', height: '24px', borderRadius: '12px', border: 'none', background: headerSidebar ? 'var(--cresoa-success)' : 'var(--cresoa-border)', position: 'relative' }}>
            <span style={{ position: 'absolute', top: '2px', left: headerSidebar ? '26px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
          </button>
          <Help field="headerSidebar" helpOpen={helpOpen} toggleHelp={toggleHelp} />
        </div>
      </SectionCard>

      {/* ========== SECTION: Hero ========== */}
      <SectionCard title="Hero Section" editing={editing.hero} toggleEdit={() => toggleEdit('hero')}>
        <div style={{ marginBottom: '0.8rem' }}>
          <label style={labelStyle}>Hero Photo <Help field="heroPhoto" helpOpen={helpOpen} toggleHelp={toggleHelp} /></label>
          {editing.hero && <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && uploadImage(e.target.files[0], 'cover', setHeroImage)} />}
          {heroImage && <img src={heroImage} alt="Hero" style={{ marginTop: '0.5rem', width: '100%', maxHeight: '250px', objectFit: 'cover', borderRadius: '8px' }} />}
        </div>
        <div style={{ marginBottom: '0.8rem' }}>
          <label style={labelStyle}>Hero Font <Help field="heroFont" helpOpen={helpOpen} toggleHelp={toggleHelp} /></label>
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
          <label style={labelStyle}>Layout Position <Help field="heroLayout" helpOpen={helpOpen} toggleHelp={toggleHelp} /></label>
          {editing.hero && (
            <select value={heroLayout} onChange={(e) => setHeroLayout(e.target.value)} style={inputStyle}>
              <option value="center">Centered</option>
              <option value="left">Left Aligned</option>
            </select>
          )}
          {!editing.hero && <span>{heroLayout === 'center' ? 'Centered' : 'Left Aligned'}</span>}
        </div>
        <div>
          <label style={labelStyle}>Short Description <Help field="description" helpOpen={helpOpen} toggleHelp={toggleHelp} /></label>
          <textarea value={description} onChange={(e) => editing.hero && setDescription(e.target.value)} disabled={!editing.hero} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>
      </SectionCard>

      {/* ========== SECTION: About ========== */}
      <SectionCard title="About Section" editing={editing.about} toggleEdit={() => toggleEdit('about')}>
        <label style={labelStyle}>Business Story <Help field="about" helpOpen={helpOpen} toggleHelp={toggleHelp} /></label>
        <textarea value={about} onChange={(e) => editing.about && setAbout(e.target.value)} disabled={!editing.about} rows={5} style={{ ...inputStyle, resize: 'vertical' }} />
      </SectionCard>

      {/* ========== SECTION: Why Us ========== */}
      <SectionCard title="Why Choose Us" editing={editing.whyUs} toggleEdit={() => toggleEdit('whyUs')}>
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
        <Help field="whyUs" helpOpen={helpOpen} toggleHelp={toggleHelp} />
      </SectionCard>

      {/* ========== SECTION: Services (Grid) ========== */}
      <SectionCard title="Services" editing={editing.services} toggleEdit={() => toggleEdit('services')}>
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
        <Help field="services" helpOpen={helpOpen} toggleHelp={toggleHelp} />
      </SectionCard>

      {/* ========== SECTION: Products (Grid + Featured) ========== */}
      <SectionCard title="Shop Products" editing={editing.products} toggleEdit={() => toggleEdit('products')}>
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--cresoa-text-muted)' }}>Check "Featured" to show on homepage (max 4).</p>
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
              {editing.products && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.5rem' }}>
                  <input type="checkbox" checked={p.featured || false} onChange={() => toggleFeaturedProduct(idx)} />
                  Featured on homepage
                </label>
              )}
            </div>
          ))}
        </div>
        {editing.products && <button onClick={addProduct} style={{ marginTop: '0.8rem', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px dashed var(--cresoa-border)', background: 'transparent', cursor: 'pointer' }}><Icon name="plus" size={14} /> Add Product</button>}
        <Help field="productName" helpOpen={helpOpen} toggleHelp={toggleHelp} />
      </SectionCard>

      {/* ========== SECTION: Portfolio ========== */}
      <SectionCard title="Portfolio" editing={editing.portfolio} toggleEdit={() => toggleEdit('portfolio')}>
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
        <Help field="portfolioDesc" helpOpen={helpOpen} toggleHelp={toggleHelp} />
      </SectionCard>

      {/* ========== SECTION: Contact Info ========== */}
      <SectionCard title="Contact Info" editing={editing.contact} toggleEdit={() => toggleEdit('contact')}>
        <div style={{ marginBottom: '0.8rem' }}>
          <label style={labelStyle}>Phone Number <Help field="contactPhone" helpOpen={helpOpen} toggleHelp={toggleHelp} /></label>
          <input type="text" value={businessPhone} onChange={(e) => editing.contact && setBusinessPhone(e.target.value)} disabled={!editing.contact} style={inputStyle} />
        </div>
        <div style={{ marginBottom: '0.8rem' }}>
          <label style={labelStyle}>WhatsApp Number <Help field="contactWhatsapp" helpOpen={helpOpen} toggleHelp={toggleHelp} /></label>
          <input type="text" value={businessWhatsapp} onChange={(e) => editing.contact && setBusinessWhatsapp(e.target.value)} disabled={!editing.contact} style={inputStyle} />
        </div>
        <div style={{ marginBottom: '0.8rem' }}>
          <label style={labelStyle}>Email <Help field="contactEmail" helpOpen={helpOpen} toggleHelp={toggleHelp} /></label>
          <input type="email" value={businessEmail} onChange={(e) => editing.contact && setBusinessEmail(e.target.value)} disabled={!editing.contact} style={inputStyle} />
        </div>
        <div style={{ marginBottom: '0.8rem' }}>
          <label style={labelStyle}>Address <Help field="contactAddress" helpOpen={helpOpen} toggleHelp={toggleHelp} /></label>
          <input type="text" value={businessAddress} onChange={(e) => editing.contact && setBusinessAddress(e.target.value)} disabled={!editing.contact} style={inputStyle} />
        </div>
        <div style={{ marginBottom: '0.8rem' }}>
          <label style={labelStyle}>Social Media Links <Help field="socialLinks" helpOpen={helpOpen} toggleHelp={toggleHelp} /></label>
          <input type="url" placeholder="Facebook URL" value={businessFacebook} onChange={(e) => editing.contact && setBusinessFacebook(e.target.value)} disabled={!editing.contact} style={{ ...inputStyle, marginBottom: '0.3rem' }} />
          <input type="url" placeholder="Google Business URL" value={businessGoogle} onChange={(e) => editing.contact && setBusinessGoogle(e.target.value)} disabled={!editing.contact} style={{ ...inputStyle, marginBottom: '0.3rem' }} />
          <input type="url" placeholder="Instagram URL" value={businessInstagram} onChange={(e) => editing.contact && setBusinessInstagram(e.target.value)} disabled={!editing.contact} style={{ ...inputStyle, marginBottom: '0.3rem' }} />
          <input type="url" placeholder="TikTok URL" value={businessTiktok} onChange={(e) => editing.contact && setBusinessTiktok(e.target.value)} disabled={!editing.contact} style={{ ...inputStyle, marginBottom: '0.3rem' }} />
          <input type="url" placeholder="YouTube URL" value={businessYoutube} onChange={(e) => editing.contact && setBusinessYoutube(e.target.value)} disabled={!editing.contact} style={{ ...inputStyle, marginBottom: '0.3rem' }} />
          <input type="url" placeholder="LinkedIn URL" value={businessLinkedin} onChange={(e) => editing.contact && setBusinessLinkedin(e.target.value)} disabled={!editing.contact} style={inputStyle} />
        </div>
      </SectionCard>

      {/* ========== SECTION: Footer & Buttons ========== */}
      <SectionCard title="Footer & Buttons" editing={editing.footer} toggleEdit={() => toggleEdit('footer')}>
        <div style={{ marginBottom: '0.8rem' }}>
          <label style={labelStyle}>Footer Text <Help field="footerText" helpOpen={helpOpen} toggleHelp={toggleHelp} /></label>
          <input type="text" value={footerText} onChange={(e) => editing.footer && setFooterText(e.target.value)} disabled={!editing.footer} style={inputStyle} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.8rem' }}>
          <span>Enable Public Page</span>
          <button onClick={() => editing.footer && setEnabled(!enabled)} disabled={!editing.footer} style={{ width: '48px', height: '24px', borderRadius: '12px', border: 'none', background: enabled ? 'var(--cresoa-success)' : 'var(--cresoa-border)', position: 'relative' }}>
            <span style={{ position: 'absolute', top: '2px', left: enabled ? '26px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
          </button>
        </div>
      </SectionCard>

      {/* Preview Modal */}
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

// Reusable Section Card component
function SectionCard({ title, editing, toggleEdit, children }) {
  return (
    <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{title}</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={toggleEdit} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', cursor: 'pointer' }}>
            <Icon name="edit" size={14} /> Edit
          </button>
          {/* Preview & View Live buttons per section (optional) */}
          <button onClick={() => alert('Preview for this section - will open modal')} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', cursor: 'pointer' }}>
            <Icon name="eye" size={14} /> Preview
          </button>
          <button onClick={() => window.open(`/${slug || ''}`, '_blank')} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', cursor: 'pointer' }}>
            <Icon name="eye" size={14} /> View Live
          </button>
        </div>
      </div>
      {children}
    </div>
  )
}
