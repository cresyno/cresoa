'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import FileUpload from '../../../components/FileUpload'
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

// ─── Self-contained SVG Icons ───
const Icon = ({ name, size = 20, stroke = 'currentColor' }) => {
  const icons = {
    edit: <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />,
    save: <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></>,
    copy: <><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
    share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    trash: <><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></>,
    check: <polyline points="20 6 9 17 4 12" />,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}

const inputStyle = { width: '100%', padding: '0.7rem 0.9rem', borderRadius: '10px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.95rem', boxSizing: 'border-box' }
const labelStyle = { display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--cresoa-text)' }

export default function PublicPageSettings() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [publicUrl, setPublicUrl] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  // Form state
  const [enabled, setEnabled] = useState(false)
  const [slug, setSlug] = useState('')
  const [slugStatus, setSlugStatus] = useState('idle')
  const [templateId, setTemplateId] = useState('elegant')
  const [logo, setLogo] = useState('')
  const [heroImage, setHeroImage] = useState('')
  const [description, setDescription] = useState('')
  const [about, setAbout] = useState('')
  const [services, setServices] = useState([])
  const [shopProducts, setShopProducts] = useState([])
  const [portfolio, setPortfolio] = useState([])
  const [showQuoteButton, setShowQuoteButton] = useState(true)
  const [showWhatsappButton, setShowWhatsappButton] = useState(true)
  const [hasServices, setHasServices] = useState(true)
  const [hasShop, setHasShop] = useState(false)

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
          setDescription(data.description || '')
          setAbout(data.about || '')
          setServices(data.services || [])
          setShopProducts(data.shop_products || [])
          setPortfolio(data.portfolio_images || [])
          setShowQuoteButton(data.show_quote_button ?? true)
          setShowWhatsappButton(data.show_whatsapp_button ?? true)
          setHasServices(data.has_services ?? true)
          setHasShop(data.has_shop ?? false)
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
    try { await navigator.clipboard.writeText(publicUrl); alert('Link copied!') } catch { alert('Could not copy link.') }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'My Business', url: publicUrl }) } catch {}
    } else { await handleCopyLink() }
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
          description,
          about,
          services,
          shop_products: shopProducts,
          portfolio_images: portfolio,
          show_quote_button: showQuoteButton,
          show_whatsapp_button: showWhatsappButton,
          has_services: hasServices,
          has_shop: hasShop,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Save failed')
      setPublicUrl(`${window.location.origin}/${slug}`)
      setMessage('✅ Saved!')
      setIsEditing(false)
    } catch (err) { setMessage('❌ ' + err.message) } finally { setSaving(false) }
  }

  // Services
  const addService = () => setServices(prev => [...prev, { name: '', description: '', image_url: '' }])
  const updateService = (idx, field, val) => setServices(prev => prev.map((s, i) => i === idx ? { ...s, [field]: val } : s))
  const removeService = (idx) => setServices(prev => prev.filter((_, i) => i !== idx))

  // Shop products
  const addProduct = () => setShopProducts(prev => [...prev, { name: '', description: '', price: '', image_url: '' }])
  const updateProduct = (idx, field, val) => setShopProducts(prev => prev.map((p, i) => i === idx ? { ...p, [field]: val } : p))
  const removeProduct = (idx) => setShopProducts(prev => prev.filter((_, i) => i !== idx))

  // Portfolio
  const handlePortfolioUpload = (url) => setPortfolio(prev => [...prev, { url, description: '' }])
  const updatePortfolioDescription = (idx, val) => setPortfolio(prev => prev.map((p, i) => i === idx ? { ...p, description: val } : p))
  const removePortfolio = (idx) => setPortfolio(prev => prev.filter((_, i) => i !== idx))

  const previewBusiness = { name: 'Your Business Name', logo_url: logo || null, phone: '08012345678', email: 'contact@business.com', location: 'Ibadan, Nigeria' }
  const previewPage = { description: description || 'Welcome to our business.', about: about || '', show_quote_button: showQuoteButton, show_whatsapp_button: showWhatsappButton, has_services: hasServices, has_shop: hasShop }
  const previewServices = services.length > 0 ? services : [{ name: 'Service 1', description: 'Description', image_url: '' }]
  const previewShop = shopProducts.length > 0 ? shopProducts : [{ name: 'Product 1', description: 'Description', price: '₦5,000', image_url: '' }]
  const previewPortfolio = portfolio.length > 0 ? portfolio.map(p => ({ url: p.url, description: p.description })) : []
  const previewReviews = []

  const ActiveTemplate = TEMPLATES.find(t => t.id === templateId)?.component || Elegant

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--cresoa-bg)' }}><div className="cresoa-loading-spinner" /></div>

  return (
    <div style={{ padding: '1rem', maxWidth: '900px', margin: '0 auto', background: 'var(--cresoa-bg)', minHeight: '100vh', paddingBottom: '100px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>Public Page</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.2rem 0' }}>Your Business Website</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {isEditing ? (
            <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'var(--cresoa-accent)', color: '#fff', padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', fontWeight: 700 }}><Icon name="save" size={16} stroke="#fff" /> {saving ? 'Saving...' : 'Save'}</button>
          ) : (
            <button onClick={() => setIsEditing(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)', padding: '0.6rem 1.5rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', fontWeight: 700 }}><Icon name="edit" size={16} /> Edit</button>
          )}
        </div>
      </div>

      {message && <div style={{ padding: '0.6rem 1rem', borderRadius: '8px', marginBottom: '1rem', background: message.startsWith('✅') ? 'var(--cresoa-success-soft)' : 'var(--cresoa-danger-soft)', color: message.startsWith('✅') ? 'var(--cresoa-success)' : 'var(--cresoa-danger)' }}>{message}</div>}

      {/* Logo */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <label style={labelStyle}>Business Logo</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {logo && <img src={logo} alt="Logo" style={{ width: '60px', height: '60px', borderRadius: '12px', objectFit: 'contain', background: '#fff', padding: '6px', border: '1px solid #E5E7EB' }} />}
          {isEditing && <FileUpload businessId={businessId} purpose="logo" label="Upload Logo" onUploaded={setLogo} />}
        </div>
      </div>

      {/* Enable */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Enable your public page</span>
        <button onClick={() => isEditing && setEnabled(!enabled)} disabled={!isEditing} style={{ width: '48px', height: '24px', borderRadius: '12px', border: 'none', cursor: isEditing ? 'pointer' : 'not-allowed', background: enabled ? 'var(--cresoa-success)' : 'var(--cresoa-border)', position: 'relative' }}>
          <span style={{ position: 'absolute', top: '2px', left: enabled ? '26px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
        </button>
      </div>

      {/* Slug */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <label style={labelStyle}>Your Page URL</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <span style={{ color: 'var(--cresoa-text-muted)' }}>cresoa.com.ng/</span>
          {isEditing ? (
            <input type="text" value={slug} onChange={handleSlugChange} style={{ ...inputStyle, flex: 1 }} />
          ) : (
            <span style={{ fontWeight: 600, fontSize: '1rem' }}>{slug || 'your-business-name'}</span>
          )}
          {isEditing && (
            <button onClick={autoSuggestSlug} style={{ background: 'none', border: 'none', color: 'var(--cresoa-accent)', cursor: 'pointer', fontSize: '0.8rem' }}>Auto-suggest</button>
          )}
        </div>
        {isEditing && (
          <div style={{ marginTop: '0.4rem' }}>
            <span style={{ color: slugStatus === 'available' ? 'green' : slugStatus === 'taken' ? 'red' : 'gray', fontSize: '0.8rem' }}>
              {slugStatus === 'checking' ? 'Checking...' : slugStatus === 'available' ? '✅ Available' : slugStatus === 'taken' ? '❌ Taken' : ''}
            </span>
          </div>
        )}
        {publicUrl && enabled && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem' }}>
            <button onClick={handleCopyLink} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', cursor: 'pointer', fontSize: '0.8rem' }}><Icon name="copy" size={14} /> Copy Link</button>
            <button onClick={handleShare} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', cursor: 'pointer', fontSize: '0.8rem' }}><Icon name="share" size={14} /> Share</button>
          </div>
        )}
      </div>

      {/* Template */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <label style={labelStyle}>Choose Template</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.6rem' }}>
          {TEMPLATES.map(t => (
            <button key={t.id} onClick={() => isEditing && setTemplateId(t.id)} disabled={!isEditing} style={{ background: templateId === t.id ? 'var(--cresoa-accent-soft)' : 'var(--cresoa-surface-soft)', border: `2px solid ${templateId === t.id ? 'var(--cresoa-accent)' : 'var(--cresoa-border)'}`, borderRadius: '10px', padding: '0.8rem', cursor: isEditing ? 'pointer' : 'not-allowed' }}>
              <strong>{t.name}</strong>
            </button>
          ))}
        </div>
      </div>

      {/* Hero Photo */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <label style={labelStyle}>Hero Section Photo</label>
        {isEditing && <FileUpload businessId={businessId} purpose="cover" label="Upload Hero Photo" onUploaded={setHeroImage} />}
        {heroImage && <img src={heroImage} alt="Hero" style={{ marginTop: '0.8rem', width: '100%', maxHeight: '250px', objectFit: 'cover', borderRadius: '8px' }} />}
      </div>

      {/* Description */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <label style={labelStyle}>Short Description (Hero)</label>
        <textarea value={description} onChange={(e) => isEditing && setDescription(e.target.value)} disabled={!isEditing} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
      </div>

      {/* About */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <label style={labelStyle}>About Section</label>
        <textarea value={about} onChange={(e) => isEditing && setAbout(e.target.value)} disabled={!isEditing} rows={5} style={{ ...inputStyle, resize: 'vertical' }} />
      </div>

      {/* Services vs Shop Toggle */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <label style={labelStyle}>Show Sections</label>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <input type="checkbox" checked={hasServices} onChange={(e) => isEditing && setHasServices(e.target.checked)} disabled={!isEditing} />
            Services
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <input type="checkbox" checked={hasShop} onChange={(e) => isEditing && setHasShop(e.target.checked)} disabled={!isEditing} />
            Shop
          </label>
        </div>
      </div>

            {/* Services Manager (Only if hasServices) */}
      {hasServices && (
        <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
          <label style={labelStyle}>Services</label>
          {services.map((s, idx) => (
            <div key={idx} style={{ marginBottom: '0.8rem' }}>
              <input type="text" placeholder="Service name" value={s.name} onChange={(e) => isEditing && updateService(idx, 'name', e.target.value)} disabled={!isEditing} style={{ ...inputStyle, marginBottom: '0.4rem' }} />
              <textarea placeholder="Description" value={s.description} onChange={(e) => isEditing && updateService(idx, 'description', e.target.value)} disabled={!isEditing} rows={2} style={{ ...inputStyle, marginBottom: '0.4rem' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isEditing && <FileUpload businessId={businessId} purpose="service" label="Image" onUploaded={(url) => updateService(idx, 'image_url', url)} />}
                {s.image_url && <img src={s.image_url} alt="Service" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />}
                {isEditing && <button onClick={() => removeService(idx)} style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer' }}><Icon name="trash" size={16} /></button>}
              </div>
            </div>
          ))}
          {isEditing && <button onClick={addService} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px dashed var(--cresoa-border)', background: 'transparent', cursor: 'pointer' }}><Icon name="plus" size={14} /> Add Service</button>}
        </div>
      )}

      {/* Shop Products Manager (Only if hasShop) */}
      {hasShop && (
        <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
          <label style={labelStyle}>Shop Products</label>
          {shopProducts.map((p, idx) => (
            <div key={idx} style={{ marginBottom: '0.8rem' }}>
              <input type="text" placeholder="Product name" value={p.name} onChange={(e) => isEditing && updateProduct(idx, 'name', e.target.value)} disabled={!isEditing} style={{ ...inputStyle, marginBottom: '0.4rem' }} />
              <input type="text" placeholder="Price (e.g. ₦15,000)" value={p.price} onChange={(e) => isEditing && updateProduct(idx, 'price', e.target.value)} disabled={!isEditing} style={{ ...inputStyle, marginBottom: '0.4rem' }} />
              <textarea placeholder="Description" value={p.description} onChange={(e) => isEditing && updateProduct(idx, 'description', e.target.value)} disabled={!isEditing} rows={2} style={{ ...inputStyle, marginBottom: '0.4rem' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isEditing && <FileUpload businessId={businessId} purpose="product" label="Image" onUploaded={(url) => updateProduct(idx, 'image_url', url)} />}
                {p.image_url && <img src={p.image_url} alt="Product" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />}
                {isEditing && <button onClick={() => removeProduct(idx)} style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer' }}><Icon name="trash" size={16} /></button>}
              </div>
            </div>
          ))}
          {isEditing && <button onClick={addProduct} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px dashed var(--cresoa-border)', background: 'transparent', cursor: 'pointer' }}><Icon name="plus" size={14} /> Add Product</button>}
        </div>
      )}

      {/* Portfolio */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <label style={labelStyle}>Portfolio</label>
        {isEditing && <FileUpload businessId={businessId} purpose="portfolio" label="Add Image" multiple onUploaded={handlePortfolioUpload} />}
        {portfolio.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.8rem' }}>
            {portfolio.map((p, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <img src={p.url} alt="Portfolio" style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '8px' }} />
                <input type="text" placeholder="Optional description" value={p.description} onChange={(e) => isEditing && updatePortfolioDescription(idx, e.target.value)} disabled={!isEditing} style={{ flex: 1, ...inputStyle }} />
                {isEditing && <button onClick={() => removePortfolio(idx)} style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer' }}><Icon name="trash" size={16} /></button>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toggles */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <label style={labelStyle}>Buttons</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Request a Quote</span><button onClick={() => isEditing && setShowQuoteButton(!showQuoteButton)} disabled={!isEditing} style={{ width: '48px', height: '24px', borderRadius: '12px', border: 'none', background: showQuoteButton ? 'var(--cresoa-success)' : 'var(--cresoa-border)', position: 'relative' }}><span style={{ position: 'absolute', top: '2px', left: showQuoteButton ? '26px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} /></button></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>WhatsApp</span><button onClick={() => isEditing && setShowWhatsappButton(!showWhatsappButton)} disabled={!isEditing} style={{ width: '48px', height: '24px', borderRadius: '12px', border: 'none', background: showWhatsappButton ? 'var(--cresoa-success)' : 'var(--cresoa-border)', position: 'relative' }}><span style={{ position: 'absolute', top: '2px', left: showWhatsappButton ? '26px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} /></button></div>
        </div>
      </div>

           {/* Live Preview */}
      <div style={{ marginTop: '2rem', borderTop: '2px solid var(--cresoa-accent)', paddingTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem' }}>Live Preview</h2>
        <div style={{ border: '1px solid var(--cresoa-border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            <ActiveTemplate business={previewBusiness} page={previewPage} services={previewServices} shop={previewShop} portfolio={previewPortfolio} reviews={previewReviews} />
          </div>
        </div>
      </div>
    </div>
  )
        }
