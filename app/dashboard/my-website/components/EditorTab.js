'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import { compressImage } from '../../../../lib/compressImage'
import { getSectorOnboardingFields } from '../../../../lib/sector-config'

// Simple Icon Component
const Icon = ({ name, size = 20, stroke = 'currentColor' }) => {
  const icons = {
    save: <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    trash: <><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></>,
    external: <><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></>,
    link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}

const inputStyle = { width: '100%', padding: '0.8rem 1rem', borderRadius: '10px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.95rem', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s' }
const labelStyle = { display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--cresoa-text)' }

export default function EditorTab({ businessId }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [hasWebsite, setHasWebsite] = useState(false)

  // Core Data
  const [sector, setSector] = useState('fashion')
  const [slug, setSlug] = useState('')
  const [templateId, setTemplateId] = useState('elegant')
  const [aboutText, setAboutText] = useState('')
  const [heroImage, setHeroImage] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [isEnabled, setIsEnabled] = useState(false)
  
  // Dynamic Sector Data & Gallery
  const [sectorData, setSectorData] = useState({})
  const [gallery, setGallery] = useState([])
  
  // Contact Info
  const [businessPhone, setBusinessPhone] = useState('')
  const [businessWhatsapp, setBusinessWhatsapp] = useState('')
  const [businessEmail, setBusinessEmail] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')

  const [previewOpen, setPreviewOpen] = useState(false)
  const [publicUrl, setPublicUrl] = useState('')

  useEffect(() => {
    const load = async () => {
      if (!businessId) return
      try {
        // 1. Load Business Info
        const { data: biz } = await supabase.from('businesses').select('*').eq('id', businessId).single()
        if (biz) {
          setSector(biz.sector || biz.business_type || 'fashion')
          setLogoUrl(biz.logo_url || '')
          setBusinessPhone(biz.phone || '')
          setBusinessWhatsapp(biz.whatsapp || '')
          setBusinessEmail(biz.email || '')
          setBusinessAddress(biz.location || '')
        }

        // 2. Load Public Page
        const { data: page } = await supabase.from('business_public_pages').select('*').eq('business_id', businessId).maybeSingle()
        if (page) {
          setHasWebsite(true)
          setSlug(page.slug || '')
          setTemplateId(page.template_id || 'elegant')
          setAboutText(page.about_text || '')
          setHeroImage(page.cover_image_url || '')
          setIsEnabled(page.is_enabled || false)
          setSectorData(page.sector_data || {})
          setGallery(page.gallery_urls || [])
          setPublicUrl(`${window.location.origin}/${page.slug}`)
        }
      } catch (err) {
        console.error('Load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [businessId])

  const handleSave = async () => {
    if (!slug.trim()) { setMessage('❌ Website URL is required.'); return }
    setSaving(true)
    setMessage('')
    try {
      // 1. Save Contact Info to businesses table
      await supabase.from('businesses').update({
        phone: businessPhone,
        whatsapp: businessWhatsapp,
        email: businessEmail,
        location: businessAddress,
        logo_url: logoUrl
      }).eq('id', businessId)

      // 2. Save Page Settings
      const { error } = await supabase.from('business_public_pages').upsert({
        business_id: businessId,
        slug,
        template_id: templateId,
        about_text: aboutText,
        cover_image_url: heroImage,
        is_enabled: isEnabled,
        sector_data: sectorData,
        gallery_urls: gallery
      }, { onConflict: 'business_id' })
      
      if (error) throw error
      
      setHasWebsite(true)
      setPublicUrl(`${window.location.origin}/${slug}`)
      setMessage('✅ Settings saved successfully!')
    } catch (err) {
      setMessage('❌ ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const uploadImage = async (file, callback, isGallery = false) => {
    if (!file) return
    setSaving(true)
    try {
      const compressedBlob = await compressImage(file, 200) // 200kb max
      const filePath = `${businessId}/${isGallery ? 'gallery' : 'assets'}-${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage.from('business-assets').upload(filePath, compressedBlob, { contentType: 'image/jpeg' })
      
      if (uploadError) throw uploadError
      
      const { data: urlData } = supabase.storage.from('business-assets').getPublicUrl(filePath)
      
      if (isGallery) {
        callback([...gallery, urlData.publicUrl])
      } else {
        callback(urlData.publicUrl)
      }
    } catch (err) {
      setMessage('❌ Upload failed: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const removeGalleryImage = (indexToRemove) => {
    setGallery(gallery.filter((_, index) => index !== indexToRemove))
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}><div className="cresoa-loading-spinner" /></div>

  // ── EMPTY STATE ──
  if (!hasWebsite) {
    return (
      <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '420px', textAlign: 'center', background: 'var(--cresoa-surface)', borderRadius: '24px', padding: '3rem 2rem', boxShadow: '0 10px 40px rgba(0,0,0,0.05)', border: '1px solid var(--cresoa-border)' }}>
          <div style={{ width: '80px', height: '80px', margin: '0 auto 1.5rem', borderRadius: '24px', background: 'var(--cresoa-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cresoa-accent)' }}>
            <Icon name="eye" size={36} />
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.8rem', color: 'var(--cresoa-text)' }}>Build Your Website</h2>
          <p style={{ color: 'var(--cresoa-text-muted)', marginBottom: '2rem', lineHeight: 1.6, fontSize: '0.95rem' }}>
            Create a beautiful, high-converting website for your business in minutes. No coding required.
          </p>
          <button onClick={() => router.push(`/dashboard/website-onboarding?business_id=${businessId}`)} style={{ background: 'var(--cresoa-accent)', color: '#fff', padding: '1rem 2rem', borderRadius: '12px', border: 'none', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', width: '100%', boxShadow: '0 4px 14px rgba(212,165,42,0.3)' }}>
            🚀 Start Setup Wizard
          </button>
        </div>
      </div>
    )
  }

  const sectorFields = getSectorOnboardingFields(sector) || []

  return (
    <div style={{ paddingBottom: '120px', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* ── STICKY TOP BAR ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', position: 'sticky', top: 0, background: 'var(--cresoa-bg)', zIndex: 10, padding: '1rem 0', borderBottom: '1px solid var(--cresoa-border)' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--cresoa-text)' }}>Website Settings</h2>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--cresoa-text-muted)' }}>Manage your online presence</p>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem' }}>
          <button onClick={() => setPreviewOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', cursor: 'pointer', fontWeight: 600, color: 'var(--cresoa-text)' }}>
            <Icon name="eye" size={16} /> Preview
          </button>
          <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--cresoa-accent)', color: '#fff', padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(212,165,42,0.2)' }}>
            <Icon name="save" size={16} stroke="#fff" /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {message && (
        <div style={{ padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem', background: message.includes('✅') ? 'var(--cresoa-success-soft)' : 'var(--cresoa-danger-soft)', color: message.includes('✅') ? 'var(--cresoa-success)' : 'var(--cresoa-danger)', fontWeight: 600, fontSize: '0.9rem' }}>
          {message}
        </div>
      )}

      {/* ── SECTION 1: BRAND & DESIGN ── */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid var(--cresoa-border)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--cresoa-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ background: 'var(--cresoa-accent-soft)', color: 'var(--cresoa-accent)', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>1</span>
          Brand & URL
        </h3>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>Website URL</label>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--cresoa-bg)', borderRadius: '10px', border: '1px solid var(--cresoa-border)', padding: '0 1rem' }}>
            <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>cresoa.com.ng/</span>
            <input 
              type="text" 
              value={slug} 
              onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} 
              style={{ ...inputStyle, border: 'none', background: 'transparent', paddingLeft: '0.5rem', fontWeight: 600 }} 
              placeholder="your-business-name"
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <label style={labelStyle}>Business Logo</label>
            <div style={{ border: '2px dashed var(--cresoa-border)', borderRadius: '12px', padding: '1rem', textAlign: 'center', background: 'var(--cresoa-bg)' }}>
              {logoUrl ? (
                <div style={{ position: 'relative' }}>
                  <img src={logoUrl} alt="Logo" style={{ width: '80px', height: '80px', objectFit: 'contain', borderRadius: '8px', margin: '0 auto' }} />
                  <label style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--cresoa-surface)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer', border: '1px solid var(--cresoa-border)' }}>
                    Change<input type="file" accept="image/*" onChange={(e) => uploadImage(e.target.files[0], setLogoUrl)} style={{ display: 'none' }} />
                  </label>
                </div>
              ) : (
                <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--cresoa-text-muted)' }}>
                  <Icon name="plus" size={24} />
                  <span style={{ fontSize: '0.8rem', marginTop: '0.5rem', fontWeight: 600 }}>Upload Logo</span>
                  <input type="file" accept="image/*" onChange={(e) => uploadImage(e.target.files[0], setLogoUrl)} style={{ display: 'none' }} />
                </label>
              )}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Hero Cover Image</label>
            <div style={{ border: '2px dashed var(--cresoa-border)', borderRadius: '12px', padding: '1rem', textAlign: 'center', background: 'var(--cresoa-bg)' }}>
              {heroImage ? (
                <div style={{ position: 'relative' }}>
                  <img src={heroImage} alt="Hero" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '8px' }} />
                  <label style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--cresoa-surface)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer', border: '1px solid var(--cresoa-border)' }}>
                    Change<input type="file" accept="image/*" onChange={(e) => uploadImage(e.target.files[0], setHeroImage)} style={{ display: 'none' }} />
                  </label>
                </div>
              ) : (
                <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--cresoa-text-muted)' }}>
                  <Icon name="image" size={24} />
                  <span style={{ fontSize: '0.8rem', marginTop: '0.5rem', fontWeight: 600 }}>Upload Cover</span>
                  <input type="file" accept="image/*" onChange={(e) => uploadImage(e.target.files[0], setHeroImage)} style={{ display: 'none' }} />
                </label>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: CONTENT ── */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid var(--cresoa-border)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--cresoa-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ background: 'var(--cresoa-accent-soft)', color: 'var(--cresoa-accent)', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>2</span>
          About Your Business
        </h3>
        <textarea 
          value={aboutText} 
          onChange={e => setAboutText(e.target.value)} 
          placeholder="Tell your customers your story, what makes you unique, and why they should choose you..." 
          rows={5} 
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
        />
      </div>

      {/* ── SECTION 3: SECTOR SPECIFICS ── */}
      {sectorFields.length > 0 && (
        <div style={{ background: 'var(--cresoa-surface)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid var(--cresoa-border)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--cresoa-text)', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'capitalize' }}>
            <span style={{ background: 'var(--cresoa-accent-soft)', color: 'var(--cresoa-accent)', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>3</span>
            {sector} Features
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {sectorFields.map(field => (
              <div key={field.id}>
                <label style={labelStyle}>{field.label}</label>
                
                {/* Text / Number Input */}
                {(field.type === 'text' || field.type === 'number') && (
                  <input 
                    type={field.type} 
                    value={sectorData[field.id] || ''} 
                    onChange={e => setSectorData({...sectorData, [field.id]: e.target.value})} 
                    placeholder={field.placeholder}
                    style={inputStyle} 
                  />
                )}

                {/* Boolean Toggle */}
                {field.type === 'boolean' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <button 
                      onClick={() => setSectorData({...sectorData, [field.id]: !sectorData[field.id]})}
                      style={{ width: '48px', height: '24px', borderRadius: '12px', border: 'none', background: sectorData[field.id] ? 'var(--cresoa-success)' : 'var(--cresoa-border)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}
                    >
                      <span style={{ position: 'absolute', top: '2px', left: sectorData[field.id] ? '26px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
                    </button>
                    <span style={{ fontSize: '0.9rem', color: 'var(--cresoa-text)' }}>{sectorData[field.id] ? 'Enabled' : 'Disabled'}</span>
                  </div>
                )}

                {/* Single Image Upload */}
                  {field.type === 'image' && (
                  <div style={{ border: '2px dashed var(--cresoa-border)', borderRadius: '12px', padding: '1rem', background: 'var(--cresoa-bg)', textAlign: 'center' }}>
                    {sectorData[field.id] ? (
                      <div style={{ position: 'relative' }}>
                        <img src={sectorData[field.id]} alt={field.label} style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '8px' }} />
                        <label style={{ display: 'inline-block', marginTop: '0.5rem', color: 'var(--cresoa-accent)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                          Change Image<input type="file" accept="image/*" onChange={(e) => uploadImage(e.target.files[0], (url) => setSectorData({...sectorData, [field.id]: url}))} style={{ display: 'none' }} />
                        </label>
                      </div>
                    ) : (
                      <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--cresoa-text-muted)' }}>
                        <Icon name="image" size={24} />
                        <span style={{ fontSize: '0.85rem', marginTop: '0.5rem', fontWeight: 600 }}>Click to upload</span>
                        <input type="file" accept="image/*" onChange={(e) => uploadImage(e.target.files[0], (url) => setSectorData({...sectorData, [field.id]: url}))} style={{ display: 'none' }} />
                      </label>
                    )}
                  </div>
                )}

                {/* Gallery Upload */}
                {field.type === 'gallery' && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                      {gallery.map((img, i) => (
                        <div key={i} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', height: '100px' }}>
                          <img src={img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button onClick={() => removeGalleryImage(i)} style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            ×
                          </button>
                        </div>
                      ))}
                      <label style={{ border: '2px dashed var(--cresoa-border)', borderRadius: '8px', height: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--cresoa-text-muted)', background: 'var(--cresoa-bg)' }}>
                        <Icon name="plus" size={20} />
                        <span style={{ fontSize: '0.75rem', marginTop: '0.3rem', fontWeight: 600 }}>Add Photo</span>
                        <input type="file" accept="image/*" onChange={(e) => uploadImage(e.target.files[0], setGallery, true)} style={{ display: 'none' }} />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SECTION 4: CONTACT INFO ── */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid var(--cresoa-border)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--cresoa-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ background: 'var(--cresoa-accent-soft)', color: 'var(--cresoa-accent)', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>4</span>
          Contact Information
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Phone Number</label>
            <input type="text" value={businessPhone} onChange={e => setBusinessPhone(e.target.value)} style={inputStyle} placeholder="e.g. 08012345678" />
          </div>
          <div>
            <label style={labelStyle}>WhatsApp Number</label>
            <input type="text" value={businessWhatsapp} onChange={e => setBusinessWhatsapp(e.target.value)} style={inputStyle} placeholder="e.g. 08012345678" />
          </div>
          <div>
            <label style={labelStyle}>Email Address</label>
            <input type="email" value={businessEmail} onChange={e => setBusinessEmail(e.target.value)} style={inputStyle} placeholder="hello@business.com" />
          </div>
          <div>
            <label style={labelStyle}>Physical Address</label>
            <input type="text" value={businessAddress} onChange={e => setBusinessAddress(e.target.value)} style={inputStyle} placeholder="e.g. 12 Allen Ave, Ikeja" />
          </div>
        </div>
      </div>

      {/* ── SECTION 5: STATUS ── */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid var(--cresoa-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--cresoa-text)' }}>Website Status</h3>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--cresoa-text-muted)' }}>{isEnabled ? 'Your website is live and visible to customers.' : 'Your website is currently hidden from the public.'}</p>
        </div>
        <button 
          onClick={() => setIsEnabled(!isEnabled)} 
          style={{ width: '56px', height: '28px', borderRadius: '14px', border: 'none', background: isEnabled ? 'var(--cresoa-success)' : 'var(--cresoa-border)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}
        >
          <span style={{ position: 'absolute', top: '3px', left: isEnabled ? '31px' : '3px', width: '22px', height: '22px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
        </button>
      </div>

      {/* ── PREVIEW MODAL ── */}
      {previewOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--cresoa-surface)', borderRadius: '20px', padding: '1.5rem', maxWidth: '900px', width: '100%', maxHeight: '95vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Live Preview</h3>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {publicUrl && isEnabled && (
                  <a href={publicUrl} target="_blank" rel="noopener" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', color: 'var(--cresoa-accent)', textDecoration: 'none', fontWeight: 600 }}>
                    <Icon name="external" size={14} /> Open Live Site
                  </a>
                )}
                <button onClick={() => setPreviewOpen(false)} style={{ background: 'var(--cresoa-bg)', border: '1px solid var(--cresoa-border)', width: '32px', height: '32px', borderRadius: '50%', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cresoa-text)' }}>×</button>
              </div>
            </div>
            
            {/* Phone Mockup Frame */}
            <div style={{ border: '8px solid #333', borderRadius: '32px', overflow: 'hidden', background: '#fff', height: '600px', position: 'relative' }}>
              <div style={{ width: '100%', height: '100%', overflowY: 'auto' }}>
                {/* Note: In production, this would render <MasterTemplate> with the current state */}
                <div style={{ padding: '4rem 2rem', textAlign: 'center', background: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.8)), url(${heroImage || 'https://via.placeholder.com/800x600'}) center/cover`, color: '#fff', minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  {logoUrl && <img src={logoUrl} style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 1rem', border: '2px solid #fff' }} />}
                  <h1 style={{ margin: 0, fontSize: '2rem' }}>{aboutText.split('.')[0] || 'Your Business'}</h1>
                  <p style={{ opacity: 0.8, marginTop: '0.5rem' }}>{businessAddress}</p>
                </div>
                <div style={{ padding: '2rem', textAlign: 'center', color: '#333' }}>
                  <p style={{ lineHeight: 1.6 }}>{aboutText || 'Your business story will appear here.'}</p>
                  <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    <span style={{ background: '#25D366', color: '#fff', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.8rem' }}>WhatsApp Us</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
