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

export default function PublicPageSettings() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [publicUrl, setPublicUrl] = useState('')

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
  const [portfolio, setPortfolio] = useState([])
  const [showQuoteButton, setShowQuoteButton] = useState(true)
  const [showWhatsappButton, setShowWhatsappButton] = useState(true)

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
          setPortfolio(data.portfolio_images || [])
          setShowQuoteButton(data.show_quote_button ?? true)
          setShowWhatsappButton(data.show_whatsapp_button ?? true)
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
    try {
      await navigator.clipboard.writeText(publicUrl)
      alert('Link copied!')
    } catch {
      alert('Could not copy link.')
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: businessName, text: 'Check out my business on Cresoa!', url: publicUrl })
      } catch {}
    } else {
      await handleCopyLink()
    }
  }

  const [businessName, setBusinessName] = useState('')

  useEffect(() => {
    const fetchName = async () => {
      const { data: biz } = await supabase.from('businesses').select('name').eq('id', businessId).single()
      if (biz?.name) setBusinessName(biz.name)
    }
    fetchName()
  }, [businessId])

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
          portfolio_images: portfolio,
          show_quote_button: showQuoteButton,
          show_whatsapp_button: showWhatsappButton,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Save failed')
      setPublicUrl(`${window.location.origin}/${slug}`)
      setMessage('✅ Saved!')
    } catch (err) { setMessage('❌ ' + err.message) } finally { setSaving(false) }
  }

  const addService = () => setServices(prev => [...prev, { name: '', price: '', description: '', image_url: '' }])
  const updateService = (idx, field, val) => setServices(prev => prev.map((s, i) => i === idx ? { ...s, [field]: val } : s))
  const removeService = (idx) => setServices(prev => prev.filter((_, i) => i !== idx))

  const handlePortfolioUpload = (url) => setPortfolio(prev => [...prev, { url, description: '' }])
  const updatePortfolioDescription = (idx, val) => setPortfolio(prev => prev.map((p, i) => i === idx ? { ...p, description: val } : p))
  const removePortfolio = (idx) => setPortfolio(prev => prev.filter((_, i) => i !== idx))

  const previewBusiness = { name: 'Your Business Name', logo_url: logo || null, phone: '08012345678', email: 'contact@business.com', location: 'Ibadan, Nigeria' }
  const previewPage = { description: description || 'Welcome to our business.', about: about || '', show_quote_button: showQuoteButton, show_whatsapp_button: showWhatsappButton }
  const previewServices = services.length > 0 ? services : [{ name: 'Service 1', price: '₦5,000', description: 'Description', image_url: '' }]
  const previewPortfolio = portfolio.length > 0 ? portfolio.map(p => ({ url: p.url, description: p.description })) : []
  const previewReviews = []

  const ActiveTemplate = TEMPLATES.find(t => t.id === templateId)?.component || Elegant

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--cresoa-bg)' }}><div className="cresoa-loading-spinner" /></div>

  return (
    <div style={{ padding: '1rem', maxWidth: '900px', margin: '0 auto', background: 'var(--cresoa-bg)', minHeight: '100vh', paddingBottom: '100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>Public Page</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.2rem 0' }}>Your Business Website</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {publicUrl && enabled && (
            <>
              <button onClick={handleCopyLink} style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', cursor: 'pointer', fontWeight: 600 }}>📋 Copy Link</button>
              <button onClick={handleShare} style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', cursor: 'pointer', fontWeight: 600 }}>📤 Share</button>
            </>
          )}
          <button onClick={handleSave} disabled={saving} style={{ background: 'var(--cresoa-accent)', color: '#fff', padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', fontWeight: 700 }}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>

      {message && <div style={{ padding: '0.6rem 1rem', borderRadius: '8px', marginBottom: '1rem', background: message.startsWith('✅') ? 'var(--cresoa-success-soft)' : 'var(--cresoa-danger-soft)', color: message.startsWith('✅') ? 'var(--cresoa-success)' : 'var(--cresoa-danger)' }}>{message}</div>}

      {/* Logo */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <label style={labelStyle}>Business Logo</label>
        <FileUpload businessId={businessId} purpose="logo" label="Upload Logo" onUploaded={setLogo} />
        {logo && <img src={logo} style={{ marginTop: '0.8rem', width: '80px', height: '80px', borderRadius: '12px', objectFit: 'contain', background: '#fff', padding: '8px', border: '1px solid #E5E7EB' }} />}
      </div>

      {/* Enable */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Enable your public page</span>
        <button onClick={() => setEnabled(!enabled)} style={{ width: '48px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: enabled ? 'var(--cresoa-success)' : 'var(--cresoa-border)', position: 'relative' }}>
          <span style={{ position: 'absolute', top: '2px', left: enabled ? '26px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
        </button>
      </div>

      {/* Slug */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <label style={labelStyle}>Your Page URL</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <span style={{ color: 'var(--cresoa-text-muted)' }}>cresoa.com.ng/</span>
          <input type="text" value={slug} onChange={handleSlugChange} style={{ ...inputStyle, flex: 1 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem' }}>
          <span style={{ color: slugStatus === 'available' ? 'green' : slugStatus === 'taken' ? 'red' : 'gray', fontSize: '0.8rem' }}>{slugStatus === 'checking' ? 'Checking...' : slugStatus === 'available' ? '✅ Available' : slugStatus === 'taken' ? '❌ Taken' : ''}</span>
          <button onClick={autoSuggestSlug} style={{ background: 'none', border: 'none', color: 'var(--cresoa-accent)', cursor: 'pointer', fontSize: '0.8rem' }}>Auto-suggest</button>
        </div>
      </div>

      {/* Template */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <label style={labelStyle}>Choose Template</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.6rem' }}>
          {TEMPLATES.map(t => (
            <button key={t.id} onClick={() => setTemplateId(t.id)} style={{ background: templateId === t.id ? 'var(--cresoa-accent-soft)' : 'var(--cresoa-surface-soft)', border: `2px solid ${templateId === t.id ? 'var(--cresoa-accent)' : 'var(--cresoa-border)'}`, borderRadius: '10px', padding: '0.8rem', cursor: 'pointer' }}>
              <strong>{t.name}</strong>
            </button>
          ))}
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <label style={labelStyle}>Hero Section Photo</label>
        <FileUpload businessId={businessId} purpose="cover" label="Upload Hero Photo" onUploaded={setHeroImage} />
        {heroImage && <img src={heroImage} style={{ marginTop: '0.8rem', width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px' }} />}
      </div>

      {/* Description */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <label style={labelStyle}>Short Description (Hero)</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
      </div>

      {/* About */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <label style={labelStyle}>About Section</label>
        <textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={5} style={{ ...inputStyle, resize: 'vertical' }} />
      </div>

      {/* Services */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <label style={labelStyle}>Services</label>
        {services.map((s, idx) => (
          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.6rem' }}>
            <input type="text" placeholder="Name" value={s.name} onChange={e => updateService(idx, 'name', e.target.value)} style={inputStyle} />
            <input type="text" placeholder="Price" value={s.price} onChange={e => updateService(idx, 'price', e.target.value)} style={inputStyle} />
            <input type="text" placeholder="Description" value={s.description} onChange={e => updateService(idx, 'description', e.target.value)} style={inputStyle} />
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <FileUpload businessId={businessId} purpose="service" label="Image" onUploaded={(url) => updateService(idx, 'image_url', url)} />
              {s.image_url && <img src={s.image_url} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />}
            </div>
            <button onClick={() => removeService(idx)} style={{ gridColumn: '3', background: 'none', border: 'none', color: 'red', cursor: 'pointer' }}>Remove</button>
          </div>
        ))}
        <button onClick={addService} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px dashed var(--cresoa-border)', background: 'transparent', cursor: 'pointer' }}>+ Add Service</button>
      </div>

      {/* Portfolio */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <label style={labelStyle}>Portfolio</label>
        <FileUpload businessId={businessId} purpose="portfolio" label="Add Image" multiple onUploaded={handlePortfolioUpload} />
        {portfolio.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.8rem' }}>
            {portfolio.map((p, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <img src={p.url} style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '8px' }} />
                <input type="text" placeholder="Optional description" value={p.description} onChange={e => updatePortfolioDescription(idx, e.target.value)} style={{ flex: 1, ...inputStyle }} />
                <button onClick={() => removePortfolio(idx)} style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer' }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toggles */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <label style={labelStyle}>Buttons</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Request a Quote</span><button onClick={() => setShowQuoteButton(!showQuoteButton)} style={{ width: '48px', height: '24px', borderRadius: '12px', border: 'none', background: showQuoteButton ? 'var(--cresoa-success)' : 'var(--cresoa-border)', position: 'relative' }}><span style={{ position: 'absolute', top: '2px', left: showQuoteButton ? '26px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} /></button></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>WhatsApp</span><button onClick={() => setShowWhatsappButton(!showWhatsappButton)} style={{ width: '48px', height: '24px', borderRadius: '12px', border: 'none', background: showWhatsappButton ? 'var(--cresoa-success)' : 'var(--cresoa-border)', position: 'relative' }}><span style={{ position: 'absolute', top: '2px', left: showWhatsappButton ? '26px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} /></button></div>
        </div>
      </div>

      {/* Preview */}
      <div style={{ marginTop: '2rem', borderTop: '2px solid var(--cresoa-accent)', paddingTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem' }}>Live Preview</h2>
        <div style={{ border: '1px solid var(--cresoa-border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            <ActiveTemplate business={previewBusiness} page={previewPage} services={previewServices} portfolio={previewPortfolio} reviews={previewReviews} />
          </div>
        </div>
      </div>
    </div>
  )
}

const inputStyle = { width: '100%', padding: '0.7rem 0.9rem', borderRadius: '10px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.95rem', boxSizing: 'border-box' }
const labelStyle = { display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--cresoa-text)' }
