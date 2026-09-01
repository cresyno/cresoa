'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import FileUpload from '../../../components/FileUpload'
import Elegant from '../../../components/public-templates/Elegant'
import ClassicGold from '../../../components/public-templates/ClassicGold'
import ModernBold from '../../../components/public-templates/ModernBold'
import FreshSerene from '../../../components/public-templates/FreshSerene'
import DynamicSunrise from '../../../components/public-templates/DynamicSunrise'

const TEMPLATES = {
  'elegant': Elegant,
  'classic-gold': ClassicGold,
  'modern-bold': ModernBold,
  'fresh-serene': FreshSerene,
  'dynamic-sunrise': DynamicSunrise,
}

const Icon = ({ name, size = 18, stroke = 'currentColor', style }) => {
  const icons = {
    edit: <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />,
    save: <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></>,
    eye: <><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" /></>,
    up: <polyline points="18 15 12 9 6 15" />,
    down: <polyline points="6 9 12 15 18 9" />,
    trash: <><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    hide: <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></>,
    chevronDown: <polyline points="6 9 12 15 18 9" />,
    chevronUp: <polyline points="18 15 12 9 6 15" />,
    external: <><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></>,
    camera: <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>{icons[name]}</svg>
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

export default function WebsiteEditor() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [publicUrl, setPublicUrl] = useState('')
  const [hasWebsite, setHasWebsite] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // Website state
  const [slug, setSlug] = useState('')
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
  const [sectionOrder, setSectionOrder] = useState(['hero', 'about', 'services', 'shop', 'portfolio', 'testimonials', 'contact'])
  const [hiddenSections, setHiddenSections] = useState([])

  // Debounced save
  const saveTimer = useRef(null)

  useEffect(() => {
    const load = async () => {
      if (!businessId) return
      setLoading(true)
      try {
        const { data: biz } = await supabase.from('businesses').select('*').eq('id', businessId).single()
        if (biz) {
          setLogo(biz.logo_url || '')
          setSlug(biz.public_slug || '')
        }

        const { data: page } = await supabase
          .from('business_public_pages')
          .select('*')
          .eq('business_id', businessId)
          .maybeSingle()

        if (page) {
          setHasWebsite(true)
          setSlug(page.slug || '')
          setTemplateId(page.template_id || 'elegant')
          setHeroImage(page.cover_image_url || '')
          setDescription(page.description || '')
          setAbout(page.about || '')
          setServices(safeParseArray(page.services))
          setShopProducts(safeParseArray(page.shop_products))
          setPortfolio(safeParseArray(page.portfolio_images))
          setShowQuoteButton(page.show_quote_button ?? true)
          setShowWhatsappButton(page.show_whatsapp_button ?? true)
          setHasServices(page.has_services ?? true)
          setHasShop(page.has_shop ?? false)
          if (page.section_order && Array.isArray(page.section_order)) setSectionOrder(page.section_order)
          setPublicUrl(`${window.location.origin}/${page.slug}`)
        }
      } catch (err) { console.error(err) } finally { setLoading(false) }
    }
    load()
  }, [businessId])

  const saveWebsite = useCallback(async (showMsg = true) => {
    if (!businessId) return
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/public-page/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          business_id: businessId,
          slug,
          is_enabled: true,
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
          section_order: sectionOrder,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Save failed')
      if (showMsg) { setMessage('✅ Saved!'); setTimeout(() => setMessage(''), 2000) }
      setPublicUrl(`${window.location.origin}/${slug}`)
      setHasWebsite(true)
      setIsEditing(false)
    } catch (err) { setMessage('❌ ' + err.message) } finally { setSaving(false) }
  }, [businessId, slug, templateId, heroImage, description, about, services, shopProducts, portfolio, showQuoteButton, showWhatsappButton, hasServices, hasShop, sectionOrder])

  const handleAutoSave = () => {
    if (!isEditing) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveWebsite(false), 800)
  }

  const handleSave = async () => {
    await saveWebsite(true)
  }

  // Section reordering
  const moveSection = (idx, direction) => {
    const newOrder = [...sectionOrder]
    const target = idx + direction
    if (target < 0 || target >= newOrder.length) return
    ;[newOrder[idx], newOrder[target]] = [newOrder[target], newOrder[idx]]
    setSectionOrder(newOrder)
    handleAutoSave()
  }

  // Toggle section visibility
  const toggleSection = (section) => {
    setHiddenSections(prev => prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section])
    handleAutoSave()
  }

  // Services updaters
  const addService = () => { setServices(prev => [...prev, { name: '', description: '', image_url: '' }]); handleAutoSave() }
  const updateService = (idx, field, val) => { setServices(prev => prev.map((s, i) => i === idx ? { ...s, [field]: val } : s)); handleAutoSave() }
  const removeService = (idx) => { setServices(prev => prev.filter((_, i) => i !== idx)); handleAutoSave() }

  // Shop products updaters
  const addProduct = () => { setShopProducts(prev => [...prev, { name: '', description: '', price: '', image_url: '' }]); handleAutoSave() }
  const updateProduct = (idx, field, val) => { setShopProducts(prev => prev.map((p, i) => i === idx ? { ...p, [field]: val } : p)); handleAutoSave() }
  const removeProduct = (idx) => { setShopProducts(prev => prev.filter((_, i) => i !== idx)); handleAutoSave() }

  // Portfolio updaters
  const handlePortfolioUpload = (url) => { setPortfolio(prev => [...prev, { url, description: '' }]); handleAutoSave() }
  const updatePortfolioDescription = (idx, val) => { setPortfolio(prev => prev.map((p, i) => i === idx ? { ...p, description: val } : p)); handleAutoSave() }
  const removePortfolio = (idx) => { setPortfolio(prev => prev.filter((_, i) => i !== idx)); handleAutoSave() }

  // Preview
  const previewBusiness = { name: 'Your Business Name', logo_url: logo || null, phone: '08012345678', email: 'contact@business.com', location: 'Ibadan, Nigeria' }
  const previewPage = { description: description || 'Welcome to our business.', about: about || '', show_quote_button: showQuoteButton, show_whatsapp_button: showWhatsappButton, has_services: hasServices, has_shop: hasShop, slug }
  const previewServices = services.length > 0 ? services : [{ name: 'Service 1', description: 'Description', image_url: '' }]
  const previewShop = shopProducts.length > 0 ? shopProducts : [{ name: 'Product 1', description: 'Description', price: '₦5,000', image_url: '' }]
  const previewPortfolio = portfolio.length > 0 ? portfolio.map(p => ({ url: p.url, description: p.description })) : []
  const previewReviews = []
  const ActiveTemplate = TEMPLATES[templateId] || Elegant

  // Render section editor
  const renderSectionEditor = (section) => {
    switch (section) {
      case 'hero':
        return (
          <div key="hero" style={{ background: 'var(--cresoa-surface)', borderRadius: '14px', padding: '1.2rem', marginBottom: '0.8rem', border: '1px solid var(--cresoa-border)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <strong style={{ fontSize: '1rem' }}>Hero Section</strong>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                <button onClick={() => moveSection(sectionOrder.indexOf('hero'), -1)} disabled={sectionOrder.indexOf('hero') === 0} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-accent)' }}><Icon name="up" /></button>
                <button onClick={() => moveSection(sectionOrder.indexOf('hero'), 1)} disabled={sectionOrder.indexOf('hero') === sectionOrder.length - 1} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-accent)' }}><Icon name="down" /></button>
                <button onClick={() => toggleSection('hero')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: hiddenSections.includes('hero') ? 'var(--cresoa-danger)' : 'var(--cresoa-text-muted)' }}><Icon name={hiddenSections.includes('hero') ? 'hide' : 'eye'} /></button>
              </div>
            </div>
            {!hiddenSections.includes('hero') && (
              <>
                <FileUpload businessId={businessId} purpose="cover" label="Hero Image" onUploaded={(url) => { setHeroImage(url); handleAutoSave() }} />
                {heroImage && <img src={heroImage} alt="Hero" style={{ width: '100%', maxHeight: '150px', objectFit: 'cover', borderRadius: '8px', marginTop: '0.5rem' }} />}
                <label style={{ ...labelStyle, marginTop: '0.8rem' }}>Description</label>
                <textarea value={description} onChange={(e) => { setDescription(e.target.value); handleAutoSave() }} rows={3} style={inputStyle} />
              </>
            )}
          </div>
        )
      case 'about':
        return (
          <div key="about" style={{ background: 'var(--cresoa-surface)', borderRadius: '14px', padding: '1.2rem', marginBottom: '0.8rem', border: '1px solid var(--cresoa-border)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <strong style={{ fontSize: '1rem' }}>About Section</strong>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                <button onClick={() => moveSection(sectionOrder.indexOf('about'), -1)} disabled={sectionOrder.indexOf('about') === 0} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-accent)' }}><Icon name="up" /></button>
                <button onClick={() => moveSection(sectionOrder.indexOf('about'), 1)} disabled={sectionOrder.indexOf('about') === sectionOrder.length - 1} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-accent)' }}><Icon name="down" /></button>
                <button onClick={() => toggleSection('about')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: hiddenSections.includes('about') ? 'var(--cresoa-danger)' : 'var(--cresoa-text-muted)' }}><Icon name={hiddenSections.includes('about') ? 'hide' : 'eye'} /></button>
              </div>
            </div>
            {!hiddenSections.includes('about') && (
              <textarea value={about} onChange={(e) => { setAbout(e.target.value); handleAutoSave() }} rows={4} style={inputStyle} />
            )}
          </div>
        )
      case 'services':
        return (
          <div key="services" style={{ background: 'var(--cresoa-surface)', borderRadius: '14px', padding: '1.2rem', marginBottom: '0.8rem', border: '1px solid var(--cresoa-border)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <strong style={{ fontSize: '1rem' }}>Services</strong>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                <button onClick={() => moveSection(sectionOrder.indexOf('services'), -1)} disabled={sectionOrder.indexOf('services') === 0} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-accent)' }}><Icon name="up" /></button>
                <button onClick={() => moveSection(sectionOrder.indexOf('services'), 1)} disabled={sectionOrder.indexOf('services') === sectionOrder.length - 1} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-accent)' }}><Icon name="down" /></button>
                <button onClick={() => toggleSection('services')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: hiddenSections.includes('services') ? 'var(--cresoa-danger)' : 'var(--cresoa-text-muted)' }}><Icon name={hiddenSections.includes('services') ? 'hide' : 'eye'} /></button>
              </div>
            </div>
            {!hiddenSections.includes('services') && (
              <>
                {services.map((s, idx) => (
                  <div key={idx} style={{ marginBottom: '0.8rem' }}>
                    <input type="text" placeholder="Service name" value={s.name} onChange={(e) => updateService(idx, 'name', e.target.value)} style={{ ...inputStyle, marginBottom: '0.4rem' }} />
                    <textarea placeholder="Description" value={s.description} onChange={(e) => updateService(idx, 'description', e.target.value)} rows={2} style={{ ...inputStyle, marginBottom: '0.4rem' }} />
                    <FileUpload businessId={businessId} purpose="service" label="Image" onUploaded={(url) => updateService(idx, 'image_url', url)} />
                    <button onClick={() => removeService(idx)} style={{ background: 'none', border: 'none', color: 'var(--cresoa-danger)', cursor: 'pointer', fontSize: '0.85rem' }}>Remove</button>
                  </div>
                ))}
                <button onClick={addService} style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: '1px dashed var(--cresoa-border)', background: 'transparent', cursor: 'pointer' }}><Icon name="plus" size={14} /> Add Service</button>
              </>
            )}
          </div>
        )
      case 'shop':
        return (
          <div key="shop" style={{ background: 'var(--cresoa-surface)', borderRadius: '14px', padding: '1.2rem', marginBottom: '0.8rem', border: '1px solid var(--cresoa-border)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <strong style={{ fontSize: '1rem' }}>Shop</strong>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                <button onClick={() => moveSection(sectionOrder.indexOf('shop'), -1)} disabled={sectionOrder.indexOf('shop') === 0} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-accent)' }}><Icon name="up" /></button>
                <button onClick={() => moveSection(sectionOrder.indexOf('shop'), 1)} disabled={sectionOrder.indexOf('shop') === sectionOrder.length - 1} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-accent)' }}><Icon name="down" /></button>
                <button onClick={() => toggleSection('shop')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: hiddenSections.includes('shop') ? 'var(--cresoa-danger)' : 'var(--cresoa-text-muted)' }}><Icon name={hiddenSections.includes('shop') ? 'hide' : 'eye'} /></button>
              </div>
            </div>
            {!hiddenSections.includes('shop') && (
              <>
                {shopProducts.map((p, idx) => (
                  <div key={idx} style={{ marginBottom: '0.8rem' }}>
                    <input type="text" placeholder="Product name" value={p.name} onChange={(e) => updateProduct(idx, 'name', e.target.value)} style={{ ...inputStyle, marginBottom: '0.4rem' }} />
                    <input type="text" placeholder="Price" value={p.price} onChange={(e) => updateProduct(idx, 'price', e.target.value)} style={{ ...inputStyle, marginBottom: '0.4rem' }} />
                    <textarea placeholder="Description" value={p.description} onChange={(e) => updateProduct(idx, 'description', e.target.value)} rows={2} style={{ ...inputStyle, marginBottom: '0.4rem' }} />
                    <FileUpload businessId={businessId} purpose="product" label="Image" onUploaded={(url) => updateProduct(idx, 'image_url', url)} />
                    <button onClick={() => removeProduct(idx)} style={{ background: 'none', border: 'none', color: 'var(--cresoa-danger)', cursor: 'pointer', fontSize: '0.85rem' }}>Remove</button>
                  </div>
                ))}
                <button onClick={addProduct} style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: '1px dashed var(--cresoa-border)', background: 'transparent', cursor: 'pointer' }}><Icon name="plus" size={14} /> Add Product</button>
              </>
            )}
          </div>
        )

case 'portfolio':
        return (
          <div key="portfolio" style={{ background: 'var(--cresoa-surface)', borderRadius: '14px', padding: '1.2rem', marginBottom: '0.8rem', border: '1px solid var(--cresoa-border)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <strong style={{ fontSize: '1rem' }}>Portfolio</strong>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                <button onClick={() => moveSection(sectionOrder.indexOf('portfolio'), -1)} disabled={sectionOrder.indexOf('portfolio') === 0} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-accent)' }}><Icon name="up" /></button>
                <button onClick={() => moveSection(sectionOrder.indexOf('portfolio'), 1)} disabled={sectionOrder.indexOf('portfolio') === sectionOrder.length - 1} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-accent)' }}><Icon name="down" /></button>
                <button onClick={() => toggleSection('portfolio')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: hiddenSections.includes('portfolio') ? 'var(--cresoa-danger)' : 'var(--cresoa-text-muted)' }}><Icon name={hiddenSections.includes('portfolio') ? 'hide' : 'eye'} /></button>
              </div>
            </div>
            {!hiddenSections.includes('portfolio') && (
              <>
                <FileUpload businessId={businessId} purpose="portfolio" label="Add Image" multiple onUploaded={handlePortfolioUpload} />
                {portfolio.length > 0 && (
                  <div style={{ marginTop: '0.5rem' }}>
                    {portfolio.map((p, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem' }}>
                        <img src={p.url} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px' }} />
                        <input type="text" placeholder="Description" value={p.description} onChange={(e) => updatePortfolioDescription(idx, e.target.value)} style={{ flex: 1, ...inputStyle }} />
                        <button onClick={() => removePortfolio(idx)} style={{ background: 'none', border: 'none', color: 'var(--cresoa-danger)', cursor: 'pointer' }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )
      case 'testimonials':
        return (
          <div key="testimonials" style={{ background: 'var(--cresoa-surface)', borderRadius: '14px', padding: '1.2rem', marginBottom: '0.8rem', border: '1px solid var(--cresoa-border)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <strong style={{ fontSize: '1rem' }}>Testimonials</strong>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                <button onClick={() => moveSection(sectionOrder.indexOf('testimonials'), -1)} disabled={sectionOrder.indexOf('testimonials') === 0} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-accent)' }}><Icon name="up" /></button>
                <button onClick={() => moveSection(sectionOrder.indexOf('testimonials'), 1)} disabled={sectionOrder.indexOf('testimonials') === sectionOrder.length - 1} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-accent)' }}><Icon name="down" /></button>
                <button onClick={() => toggleSection('testimonials')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: hiddenSections.includes('testimonials') ? 'var(--cresoa-danger)' : 'var(--cresoa-text-muted)' }}><Icon name={hiddenSections.includes('testimonials') ? 'hide' : 'eye'} /></button>
              </div>
            </div>
            {!hiddenSections.includes('testimonials') && (
              <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.9rem' }}>Testimonials will be displayed here. We'll add management soon.</p>
            )}
          </div>
        )
      case 'contact':
        return (
          <div key="contact" style={{ background: 'var(--cresoa-surface)', borderRadius: '14px', padding: '1.2rem', marginBottom: '0.8rem', border: '1px solid var(--cresoa-border)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <strong style={{ fontSize: '1rem' }}>Contact</strong>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                <button onClick={() => moveSection(sectionOrder.indexOf('contact'), -1)} disabled={sectionOrder.indexOf('contact') === 0} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-accent)' }}><Icon name="up" /></button>
                <button onClick={() => moveSection(sectionOrder.indexOf('contact'), 1)} disabled={sectionOrder.indexOf('contact') === sectionOrder.length - 1} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-accent)' }}><Icon name="down" /></button>
                <button onClick={() => toggleSection('contact')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: hiddenSections.includes('contact') ? 'var(--cresoa-danger)' : 'var(--cresoa-text-muted)' }}><Icon name={hiddenSections.includes('contact') ? 'hide' : 'eye'} /></button>
              </div>
            </div>
            {!hiddenSections.includes('contact') && (
              <>
                <label style={labelStyle}>Show WhatsApp Button</label>
                <input type="checkbox" checked={showWhatsappButton} onChange={(e) => { setShowWhatsappButton(e.target.checked); handleAutoSave() }} />
                <label style={{ ...labelStyle, marginTop: '0.5rem' }}>Show Quote Button</label>
                <input type="checkbox" checked={showQuoteButton} onChange={(e) => { setShowQuoteButton(e.target.checked); handleAutoSave() }} />
              </>
            )}
          </div>
        )
      default:
        return null
    }
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--cresoa-bg)' }}><div className="cresoa-loading-spinner" /></div>

  // Empty state (no website yet)
  if (!hasWebsite && !isEditing) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cresoa-bg)', padding: '1rem' }}>
        <div style={{ maxWidth: '400px', textAlign: 'center', background: 'var(--cresoa-surface)', borderRadius: '20px', padding: '2.5rem', boxShadow: 'var(--shadow-lg)' }}>
          <div style={{ width: '80px', height: '80px', margin: '0 auto 1rem', borderRadius: '20px', background: 'var(--cresoa-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cresoa-accent)' }}>
            <Icon name="external" size={32} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>You don't have a website yet</h2>
          <p style={{ color: 'var(--cresoa-text-muted)', marginBottom: '1.5rem' }}>Create a beautiful professional website for your business in minutes.</p>
          <button onClick={() => router.push(`/dashboard/website-onboarding?business_id=${businessId}`)} style={{ background: 'var(--cresoa-accent)', color: '#fff', padding: '0.8rem 2rem', borderRadius: '10px', border: 'none', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(212,165,42,0.3)' }}>
            🚀 Create Yours Now
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '1rem', maxWidth: '1100px', margin: '0 auto', background: 'var(--cresoa-bg)', minHeight: '100vh', paddingBottom: '100px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>My Website</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.2rem 0' }}>Website Editor</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {publicUrl && <a href={publicUrl} target="_blank" style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Icon name="external" size={16} /> View Website</a>}
          {isEditing ? (
            <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'var(--cresoa-accent)', color: '#fff', padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', fontWeight: 700 }}><Icon name="save" size={16} /> {saving ? 'Saving...' : 'Save'}</button>
          ) : (
            <button onClick={() => setIsEditing(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)', padding: '0.6rem 1.5rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', fontWeight: 700 }}><Icon name="edit" size={16} /> Edit</button>
          )}
        </div>
      </div>

      {message && <div style={{ padding: '0.6rem 1rem', borderRadius: '8px', marginBottom: '1rem', background: message.startsWith('✅') ? 'var(--cresoa-success-soft)' : 'var(--cresoa-danger-soft)', color: message.startsWith('✅') ? 'var(--cresoa-success)' : 'var(--cresoa-danger)' }}>{message}</div>}

      {/* Two-column layout (desktop) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', '@media (max-width: 768px)': { gridTemplateColumns: '1fr' } }}>
        {/* LEFT: Editor */}
        <div style={{ minWidth: 0 }}>
          {/* Template Selector */}
          <div style={{ background: 'var(--cresoa-surface)', borderRadius: '14px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
            <label style={labelStyle}>Template</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem' }}>
              {Object.keys(TEMPLATES).map(id => (
                <button key={id} onClick={() => { setTemplateId(id); handleAutoSave() }} disabled={!isEditing} style={{ padding: '0.6rem', borderRadius: '8px', border: `2px solid ${templateId === id ? 'var(--cresoa-accent)' : 'var(--cresoa-border)'}`, background: templateId === id ? 'var(--cresoa-accent-soft)' : 'var(--cresoa-surface)', cursor: isEditing ? 'pointer' : 'not-allowed', fontWeight: 600, fontSize: '0.85rem' }}>
                  {id === 'elegant' ? 'Elegant' : id === 'classic-gold' ? 'Classic Gold' : id === 'modern-bold' ? 'Modern Bold' : id === 'fresh-serene' ? 'Fresh Serene' : 'Dynamic Sunrise'}
                </button>
              ))}
            </div>
          </div>

          {/* Logo */}
          <div style={{ background: 'var(--cresoa-surface)', borderRadius: '14px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
            <label style={labelStyle}>Logo</label>
            {isEditing ? (
              <FileUpload businessId={businessId} purpose="logo" label="Upload Logo" onUploaded={(url) => { setLogo(url); handleAutoSave() }} />
            ) : null}
            {logo && <img src={logo} style={{ marginTop: '0.5rem', width: '60px', height: '60px', borderRadius: '10px', objectFit: 'contain', background: '#fff', padding: '4px' }} />}
          </div>

          {/* Sections list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {sectionOrder.map(section => renderSectionEditor(section))}
          </div>
        </div>

        {/* RIGHT: Live Preview */}
        <div style={{ position: 'sticky', top: '20px', alignSelf: 'start' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '0.8rem' }}>Live Preview</h3>
          <div style={{ border: '1px solid var(--cresoa-border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              <ActiveTemplate business={previewBusiness} page={previewPage} services={previewServices} shop={previewShop} portfolio={previewPortfolio} reviews={previewReviews} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
