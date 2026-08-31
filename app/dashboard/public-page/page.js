'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import FileUpload from '../../../components/FileUpload'

// ─── Template Definitions ───
const TEMPLATES = [
  { id: 'classic-gold', name: 'Classic Gold', desc: 'Premium & Trustworthy', colors: ['#0F2B4A', '#D4A52A', '#F7F5F0'] },
  { id: 'modern-bold', name: 'Modern Bold', desc: 'Energetic & Creative', colors: ['#4C1D95', '#F97316', '#FFFFFF'] },
  { id: 'elegant-minimal', name: 'Elegant Minimalist', desc: 'Clean & Sophisticated', colors: ['#14B8A6', '#1E293B', '#FAFAF9'] },
  { id: 'fresh-serene', name: 'Fresh Serene', desc: 'Calm & Organic', colors: ['#2D4A22', '#9CAF88', '#F5F5DC'] },
  { id: 'dynamic-sunrise', name: 'Dynamic Sunrise', desc: 'Bold & High-Energy', colors: ['#EA580C', '#DB2777', '#FFFFFF'] },
]

const Svg = ({ name, size = 20, stroke = 'currentColor' }) => {
  const icons = {
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    trash: <><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></>,
    save: <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></>,
    eye: <><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" /></>,
    'arrow-left': <><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}

const inputStyle = {
  width: '100%', padding: '0.7rem 0.9rem', borderRadius: '10px',
  border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)',
  color: 'var(--cresoa-text)', fontSize: '0.95rem', boxSizing: 'border-box',
}

const labelStyle = { display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--cresoa-text)' }

export default function PublicPageSettings() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // ─── Form State ───
  const [enabled, setEnabled] = useState(false)
  const [slug, setSlug] = useState('')
  const [slugStatus, setSlugStatus] = useState('idle') // idle, checking, available, taken
  const [slugMessage, setSlugMessage] = useState('')
  const [templateId, setTemplateId] = useState('classic-gold')
  const [coverImage, setCoverImage] = useState('')
  const [description, setDescription] = useState('')
  const [services, setServices] = useState([]) // [{ name, price, description, image_url }]
  const [portfolioImages, setPortfolioImages] = useState([])
  const [showQuoteButton, setShowQuoteButton] = useState(true)
  const [showWhatsappButton, setShowWhatsappButton] = useState(true)

  // ─── Debounce Reference ───
  const slugTimerRef = useRef(null)

  // ─── Load existing page settings ───
  useEffect(() => {
    const load = async () => {
      if (!businessId) return
      try {
        const { data, error } = await supabase
          .from('business_public_pages')
          .select('*')
          .eq('business_id', businessId)
          .maybeSingle()

        if (error) throw error

        if (data) {
          setEnabled(data.is_enabled || false)
          setSlug(data.slug || '')
          setTemplateId(data.template_id || 'classic-gold')
          setCoverImage(data.cover_image_url || '')
          setDescription(data.description || '')
          setServices(data.services || [])
          setShowQuoteButton(data.show_quote_button ?? true)
          setShowWhatsappButton(data.show_whatsapp_button ?? true)

          // Fetch portfolio images separately (from a new table or store in JSON)
          const { data: portfolioData } = await supabase
            .from('public_portfolio_images')
            .select('*')
            .eq('business_id', businessId)
            .order('created_at', { ascending: false })
          setPortfolioImages(portfolioData?.map(p => ({ url: p.image_url, id: p.id })) || [])
        }
      } catch (err) {
        console.error('Load public page error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [businessId])

  // ─── Live Slug Check (debounced) ───
  const checkSlug = useCallback(async (value) => {
    if (slugTimerRef.current) clearTimeout(slugTimerRef.current)
    slugTimerRef.current = setTimeout(async () => {
      if (!value.trim()) {
        setSlugStatus('idle')
        setSlugMessage('')
        return
      }
      setSlugStatus('checking')
      const res = await fetch(`/api/public-page/check-slug?slug=${value}&business_id=${businessId}`)
      const data = await res.json()
      if (data.available) {
        setSlugStatus('available')
        setSlugMessage('✅ Available')
        // Auto-normalize
        setSlug(data.normalized)
      } else {
        setSlugStatus('taken')
        setSlugMessage('❌ Taken')
      }
    }, 500)
  }, [businessId])

  const handleSlugChange = (e) => {
    const val = e.target.value
    setSlug(val)
    checkSlug(val)
  }

  // ─── Auto-suggest slug from business name ───
  const autoSuggestSlug = async () => {
    const { data: biz } = await supabase.from('businesses').select('name').eq('id', businessId).single()
    if (biz?.name) {
      const suggested = biz.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      setSlug(suggested)
      checkSlug(suggested)
    }
  }

  // ─── Save ───
  const handleSave = async () => {
    if (!slug.trim()) {
      setMessage('Slug is required.')
      return
    }
    if (slugStatus === 'taken') {
      setMessage('Slug is already taken. Please choose another.')
      return
    }
    if (slugStatus === 'checking') {
      setMessage('Please wait for slug check to finish.')
      return
    }

    setSaving(true)
    setMessage('')

    try {
      // Upsert business_public_pages
      const { error: pageError } = await supabase
        .from('business_public_pages')
        .upsert({
          business_id: businessId,
          slug: slug.toLowerCase(),
          is_enabled: enabled,
          template_id: templateId,
          cover_image_url: coverImage || null,
          description: description || null,
          services,
          show_quote_button: showQuoteButton,
          show_whatsapp_button: showWhatsappButton,
          updated_at: new Date().toISOString(),
        })

      if (pageError) throw pageError

      // Save portfolio images (upsert into a new table)
      if (portfolioImages.length > 0) {
        // We'll handle this by removing existing and re-adding for simplicity
        const { error: deleteError } = await supabase
          .from('public_portfolio_images')
          .delete()
          .eq('business_id', businessId)
        if (deleteError) throw deleteError

        for (const img of portfolioImages) {
          const { error: insertError } = await supabase
            .from('public_portfolio_images')
            .insert({ business_id: businessId, image_url: img.url })
          if (insertError) throw insertError
        }
      }

      setMessage('✅ Public page saved successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      console.error('Save error:', err)
      setMessage('❌ Error saving: ' + (err.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  // ─── Services Manager ───
  const addService = () => {
    setServices(prev => [...prev, { name: '', price: '', description: '', image_url: '' }])
  }

  const updateService = (index, field, value) => {
    setServices(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s))
  }

  const removeService = (index) => {
    setServices(prev => prev.filter((_, i) => i !== index))
  }

  // ─── Portfolio Upload ───
  const handlePortfolioUpload = (fileUrl) => {
    setPortfolioImages(prev => [...prev, { url: fileUrl, id: Date.now() }])
  }

  const removePortfolioImage = (id) => {
    setPortfolioImages(prev => prev.filter(img => img.id !== id))
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cresoa-bg)' }}><div className="cresoa-loading-spinner" /></div>
  }

  return (
    <div style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto', background: 'var(--cresoa-bg)', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Public Page</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.2rem 0' }}>Your Business Website</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: 'var(--cresoa-accent)', color: '#fff', padding: '0.6rem 1.5rem', borderRadius: '8px',
            border: 'none', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.9rem',
          }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {message && (
        <div style={{ padding: '0.6rem 1rem', borderRadius: '8px', marginBottom: '1rem', background: message.startsWith('✅') ? 'var(--cresoa-success-soft)' : 'var(--cresoa-danger-soft)', color: message.startsWith('✅') ? 'var(--cresoa-success)' : 'var(--cresoa-danger)' }}>
          {message}
        </div>
      )}

      {/* Enable Toggle */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <strong>Enable your public page</strong>
          <p style={{ margin: '0.2rem 0 0', color: 'var(--cresoa-text-muted)', fontSize: '0.85rem' }}>Make your business visible to the world.</p>
        </div>
        <button
          onClick={() => setEnabled(!enabled)}
          style={{
            width: '48px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer',
            background: enabled ? 'var(--cresoa-success)' : 'var(--cresoa-border)',
            position: 'relative', transition: 'background 0.2s',
          }}
        >
          <span style={{ position: 'absolute', top: '2px', left: enabled ? '26px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
        </button>
      </div>

      {/* Slug */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <label style={labelStyle}>Your Page URL</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.9rem' }}>cresoa.com.ng/</span>
          <input
            type="text"
            value={slug}
            onChange={handleSlugChange}
            placeholder="your-business-name"
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem' }}>
          <div>
            {slugStatus === 'checking' && <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.8rem' }}>⏳ Checking...</span>}
            {slugStatus === 'available' && <span style={{ color: 'var(--cresoa-success)', fontSize: '0.8rem' }}>{slugMessage}</span>}
            {slugStatus === 'taken' && <span style={{ color: 'var(--cresoa-danger)', fontSize: '0.8rem' }}>{slugMessage}</span>}
          </div>
          <button onClick={autoSuggestSlug} style={{ background: 'none', border: 'none', color: 'var(--cresoa-accent)', cursor: 'pointer', fontSize: '0.8rem' }}>Auto-suggest</button>
        </div>
      </div>

      {/* Template Selector */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <label style={labelStyle}>Choose Your Template</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.6rem' }}>
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => setTemplateId(t.id)}
              style={{
                background: 'var(--cresoa-surface-soft)', borderRadius: '10px', padding: '0.8rem', cursor: 'pointer',
                border: `2px solid ${templateId === t.id ? 'var(--cresoa-accent)' : 'var(--cresoa-border)'}`,
                transition: 'border-color 0.2s', textAlign: 'center',
              }}
            >
              <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginBottom: '0.5rem' }}>
                {t.colors.map(c => <span key={c} style={{ width: '16px', height: '16px', borderRadius: '50%', background: c }} />)}
              </div>
              <strong style={{ display: 'block', fontSize: '0.9rem' }}>{t.name}</strong>
              <span style={{ fontSize: '0.7rem', color: 'var(--cresoa-text-muted)' }}>{t.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Cover Image */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <label style={labelStyle}>Cover Image</label>
        <FileUpload
          businessId={businessId}
          sector="public-page"
          label="Upload Cover"
          onUploaded={(res) => setCoverImage(res.fileUrl)}
        />
        {coverImage && <img src={coverImage} alt="Cover" style={{ marginTop: '0.8rem', width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px' }} />}
      </div>

      {/* Description */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <label style={labelStyle}>Business Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Tell customers what you do..." style={{ ...inputStyle, resize: 'vertical' }} />
      </div>

      {/* Services */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <label style={labelStyle}>Your Services</label>
        {services.length === 0 && <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem' }}>No services added yet. Add your first service.</p>}
        {services.map((service, idx) => (
          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.8rem' }}>
            <input type="text" value={service.name} onChange={(e) => updateService(idx, 'name', e.target.value)} placeholder="Service name" style={inputStyle} />
            <input type="text" value={service.price} onChange={(e) => updateService(idx, 'price', e.target.value)} placeholder="Price (₦)" style={inputStyle} />
            <input type="text" value={service.description} onChange={(e) => updateService(idx, 'description', e.target.value)} placeholder="Description" style={{ ...inputStyle, gridColumn: '1 / -1' }} />
            <button onClick={() => removeService(idx)} style={{ background: 'none', border: 'none', color: 'var(--cresoa-danger)', cursor: 'pointer', fontSize: '0.8rem' }}>Remove</button>
          </div>
        ))}
        <button onClick={addService} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px dashed var(--cresoa-border)', background: 'transparent', cursor: 'pointer', color: 'var(--cresoa-text)', fontSize: '0.85rem' }}>+ Add Service</button>
      </div>

      {/* Portfolio */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <label style={labelStyle}>Portfolio Gallery</label>
        <FileUpload
          businessId={businessId}
          sector="public-page"
          label="Upload Image"
          onUploaded={(res) => handlePortfolioUpload(res.fileUrl)}
        />
        {portfolioImages.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem', marginTop: '0.8rem' }}>
            {portfolioImages.map(img => (
              <div key={img.id} style={{ position: 'relative' }}>
                <img src={img.url} alt="Portfolio" style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px' }} />
                <button onClick={() => removePortfolioImage(img.id)} style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer' }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toggle Buttons */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <label style={labelStyle}>Buttons</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Show "Request a Quote" button</span>
            <button onClick={() => setShowQuoteButton(!showQuoteButton)} style={{ width: '48px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: showQuoteButton ? 'var(--cresoa-success)' : 'var(--cresoa-border)', position: 'relative' }}>
              <span style={{ position: 'absolute', top: '2px', left: showQuoteButton ? '26px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Show "WhatsApp" button</span>
            <button onClick={() => setShowWhatsappButton(!showWhatsappButton)} style={{ width: '48px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: showWhatsappButton ? 'var(--cresoa-success)' : 'var(--cresoa-border)', position: 'relative' }}>
              <span style={{ position: 'absolute', top: '2px', left: showWhatsappButton ? '26px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
            </button>
          </div>
        </div>
      </div>

      {/* Save Footer */}
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--cresoa-accent)', color: '#fff', padding: '0.8rem 2rem', borderRadius: '8px',
          border: 'none', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: 'var(--shadow-md)',
        }}
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  )
}
