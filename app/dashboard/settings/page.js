'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { Card } from '../../../components/Card'
import { Navigation } from '../../../components/Navigation'
import '../../globals.css'

// ─── HARDCODED ICONS (No imports, purely self-contained) ───
const Icon = ({ name, size = 20, stroke = 'currentColor', className = '' }) => {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: stroke, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', className }
  const icons = {
    'building': <svg {...props}><path d="M3 21h18"/><path d="M9 8h1"/><path d="M9 12h1"/><path d="M9 16h1"/><path d="M14 8h1"/><path d="M14 12h1"/><path d="M14 16h1"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/></svg>,
    'phone': <svg {...props}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
    'message-circle': <svg {...props}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>,
    'map-pin': <svg {...props}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
    'palette': <svg {...props}><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.4 0 .7 0 1-.1.5-.1 1-.5 1-1v-2.2c0-.6.4-1 1-1h1.6c4.6 0 8.4-3.8 8.4-8.4C23 5.8 18.2 2 12 2z"/></svg>,
    'layers': <svg {...props}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
    'chevron-right': <svg {...props}><polyline points="9 18 15 12 9 6"/></svg>,
    'check': <svg {...props}><polyline points="20 6 9 17 4 12"/></svg>,
    'upload': <svg {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
    'x': <svg {...props}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    'check-circle': <svg {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
    'alert-circle': <svg {...props}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
  }
  return icons[name] || <span />
}

export default function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')

  const navigateWithBusiness = (path) => {
    const separator = path.includes('?') ? '&' : '?'
    router.push(`${path}${separator}business_id=${businessId}`)
  }

  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [editMode, setEditMode] = useState(null) // null, 'general', 'contact', 'branding'

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    location: '',
    tracking_primary_color: '#D4A52A',
    tracking_bg_color: '#F8F6F2',
    tracking_welcome_message: 'Track your order status',
    tracking_footer_message: 'Thank you for choosing us',
  })

  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [logoUrl, setLogoUrl] = useState('')

  // ─── Load business data ───────────────────────────────────
  useEffect(() => {
    const load = async () => {
      if (!businessId) { router.push('/dashboard'); return }
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }

        const { data: bizData, error: bizError } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', businessId)
          .single()

        if (bizError) throw bizError
        setBusiness(bizData)

        setFormData({
          name: bizData.name || '',
          phone: bizData.phone || '',
          whatsapp: bizData.whatsapp || '',
          location: bizData.location || '',
          tracking_primary_color: bizData.tracking_primary_color || '#D4A52A',
          tracking_bg_color: bizData.tracking_bg_color || '#F8F6F2',
          tracking_welcome_message: bizData.tracking_welcome_message || 'Track your order status',
          tracking_footer_message: bizData.tracking_footer_message || 'Thank you for choosing us',
        })

        if (bizData.logo_url) {
          setLogoPreview(bizData.logo_url)
          setLogoUrl(bizData.logo_url)
        }
      } catch (err) {
        console.error(err)
        setError('Failed to load business settings.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [businessId])

  // ─── Handlers ──────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleLogoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 1024 * 1024) { setError('Logo must be less than 1MB'); return }
    if (!file.type.startsWith('image/')) { setError('Please upload an image file'); return }
    setLogoFile(file)
    const reader = new FileReader()
    reader.onload = (event) => setLogoPreview(event.target.result)
    reader.readAsDataURL(file)
  }

  const handleRemoveLogo = () => {
    if (confirm('Remove your business logo?')) {
      setLogoFile(null)
      setLogoPreview(null)
      setLogoUrl('')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      let finalLogoUrl = logoUrl
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop()
        const fileName = `${businessId}.${fileExt}`
        const filePath = `logos/${fileName}`
        const { error: uploadError } = await supabase.storage
          .from('business-logos')
          .upload(filePath, logoFile, { upsert: true })
        if (uploadError) throw new Error('Failed to upload logo')
        const { data: { publicUrl } } = supabase.storage
          .from('business-logos')
          .getPublicUrl(filePath)
        finalLogoUrl = publicUrl
      } else if (!logoPreview && !logoUrl) {
        finalLogoUrl = null
      }

      const updates = {
        name: formData.name,
        phone: formData.phone || null,
        whatsapp: formData.whatsapp || null,
        location: formData.location || null,
        logo_url: finalLogoUrl,
        tracking_primary_color: formData.tracking_primary_color,
        tracking_bg_color: formData.tracking_bg_color,
        tracking_welcome_message: formData.tracking_welcome_message,
        tracking_footer_message: formData.tracking_footer_message,
      }

      const { error: updateError } = await supabase
        .from('businesses')
        .update(updates)
        .eq('id', businessId)
      if (updateError) throw updateError

      await supabase.from('business_activity_logs').insert({
        business_id: businessId,
        performed_by: session.user.id,
        action: 'business_settings_updated',
        details: { name: formData.name }
      })

      setSuccess(true)
      setLogoFile(null)
      setBusiness({ ...business, ...updates })
      setEditMode(null)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '80px' }}>
        <Navigation businessId={businessId} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
          {[1,2,3,4].map(i => <div key={i} style={{ height: '120px', background: 'var(--cresoa-border)', borderRadius: '12px', animation: 'pulse 1.5s infinite' }} />)}
        </div>
        <style>{`@keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '80px' }}>
      <Navigation businessId={businessId} />

      {/* Header */}
      <div style={{ marginBottom: '1.5rem', marginTop: '0.5rem' }}>
        <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Business</p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0', color: 'var(--cresoa-text)' }}>Settings</h1>
        <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', margin: 0 }}>Manage your details, branding, and workflow</p>
      </div>

      {success && (
        <div style={{ padding: '0.6rem 1rem', borderRadius: '8px', background: 'var(--cresoa-success-soft)', color: 'var(--cresoa-success)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Icon name="check-circle" size={16} stroke="var(--cresoa-success)" /> Settings saved successfully!
        </div>
      )}
      {error && (
        <div style={{ padding: '0.6rem 1rem', borderRadius: '8px', background: 'var(--cresoa-danger-soft)', color: 'var(--cresoa-danger)', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* ─── Mobile-First, 1-Column List ─── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* Card 1: Business Profile & Logo */}
        <Card style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--cresoa-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="building" size={18} stroke="var(--cresoa-accent)" />
              </div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--cresoa-text)' }}>Profile & General</h3>
            </div>
            {editMode !== 'general' && <button onClick={() => setEditMode('general')} style={{ background: 'transparent', border: '1px solid var(--cresoa-border)', padding: '0.25rem 0.75rem', borderRadius: '6px', color: 'var(--cresoa-text)', fontSize: '0.8rem', cursor: 'pointer' }}>✏️ Edit</button>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--cresoa-bg)', border: '1px solid var(--cresoa-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {logoPreview ? <img src={logoPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '0.8rem', color: 'var(--cresoa-text-muted)' }}>Logo</span>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: 'var(--cresoa-text)' }}>{formData.name || 'Business Name'}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--cresoa-text-muted)' }}>Business Profile</div>
            </div>
          </div>

          {editMode === 'general' && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--cresoa-border)' }}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--cresoa-text-muted)', marginBottom: '0.25rem' }}>Business Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }} />
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--cresoa-text-muted)', marginBottom: '0.25rem' }}>Logo</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <input type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} id="logo-upload" />
                  <label htmlFor="logo-upload" style={{ padding: '0.25rem 0.8rem', borderRadius: '6px', background: 'var(--cresoa-primary)', color: '#fff', fontSize: '0.8rem', cursor: 'pointer' }}><Icon name="upload" size={14} stroke="#fff" /> Upload</label>
                  {(logoPreview || logoUrl) && <button onClick={handleRemoveLogo} style={{ padding: '0.25rem 0.8rem', borderRadius: '6px', border: '1px solid var(--cresoa-danger)', background: 'transparent', color: 'var(--cresoa-danger)', fontSize: '0.8rem', cursor: 'pointer' }}>Remove</button>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button onClick={handleSave} disabled={saving} style={{ padding: '0.3rem 1rem', borderRadius: '6px', border: 'none', background: 'var(--cresoa-primary)', color: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}>{saving ? 'Saving...' : 'Save'}</button>
                <button onClick={() => setEditMode(null)} style={{ padding: '0.3rem 1rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'transparent', color: 'var(--cresoa-text)', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
              </div>
            </div>
          )}
        </Card>

        {/* Card 2: Contact & Location */}
        <Card style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--cresoa-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="phone" size={18} stroke="var(--cresoa-accent)" />
              </div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--cresoa-text)' }}>Contact & Location</h3>
            </div>
            {editMode !== 'contact' && <button onClick={() => setEditMode('contact')} style={{ background: 'transparent', border: '1px solid var(--cresoa-border)', padding: '0.25rem 0.75rem', borderRadius: '6px', color: 'var(--cresoa-text)', fontSize: '0.8rem', cursor: 'pointer' }}>✏️ Edit</button>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', color: 'var(--cresoa-text-muted)', fontSize: '0.9rem' }}>
            <div><Icon name="phone" size={14} /> {formData.phone || 'Not set'}</div>
            <div><Icon name="message-circle" size={14} /> {formData.whatsapp || 'Not set'}</div>
            <div><Icon name="map-pin" size={14} /> {formData.location || 'Not set'}</div>
          </div>

          {editMode === 'contact' && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--cresoa-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <input type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="Phone" style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }} />
              <input type="text" name="whatsapp" value={formData.whatsapp} onChange={handleChange} placeholder="WhatsApp" style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }} />
              <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="Location" style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }} />
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button onClick={handleSave} disabled={saving} style={{ padding: '0.3rem 1rem', borderRadius: '6px', border: 'none', background: 'var(--cresoa-primary)', color: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}>{saving ? 'Saving...' : 'Save'}</button>
                <button onClick={() => setEditMode(null)} style={{ padding: '0.3rem 1rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'transparent', color: 'var(--cresoa-text)', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
              </div>
            </div>
          )}
        </Card>

            {/* Card 3: Branding & Tracking (With Live Preview) */}
        <Card style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--cresoa-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="palette" size={18} stroke="var(--cresoa-accent)" />
              </div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--cresoa-text)' }}>Branding & Tracking</h3>
            </div>
            {editMode !== 'branding' && <button onClick={() => setEditMode('branding')} style={{ background: 'transparent', border: '1px solid var(--cresoa-border)', padding: '0.25rem 0.75rem', borderRadius: '6px', color: 'var(--cresoa-text)', fontSize: '0.8rem', cursor: 'pointer' }}>✏️ Edit</button>}
          </div>

          <div style={{ fontSize: '0.9rem', color: 'var(--cresoa-text-muted)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div>🎨 Primary: <span style={{ color: formData.tracking_primary_color }}>{formData.tracking_primary_color}</span></div>
            <div>🖼️ Background: <span style={{ color: formData.tracking_bg_color }}>{formData.tracking_bg_color}</span></div>
            <div>📢 Message: {formData.tracking_welcome_message}</div>
            <div>🔚 Footer: {formData.tracking_footer_message}</div>
          </div>

          {editMode === 'branding' && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--cresoa-border)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div><label style={{ fontSize: '0.8rem', display: 'block' }}>Primary Color</label><input type="color" name="tracking_primary_color" value={formData.tracking_primary_color} onChange={handleChange} style={{ width: '100%', padding: '0.25rem', border: 'none', cursor: 'pointer' }} /></div>
                <div><label style={{ fontSize: '0.8rem', display: 'block' }}>Background Color</label><input type="color" name="tracking_bg_color" value={formData.tracking_bg_color} onChange={handleChange} style={{ width: '100%', padding: '0.25rem', border: 'none', cursor: 'pointer' }} /></div>
                <div><label style={{ fontSize: '0.8rem', display: 'block' }}>Welcome Message</label><input type="text" name="tracking_welcome_message" value={formData.tracking_welcome_message} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)' }} /></div>
                <div><label style={{ fontSize: '0.8rem', display: 'block' }}>Footer Message</label><input type="text" name="tracking_footer_message" value={formData.tracking_footer_message} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)' }} /></div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button onClick={handleSave} disabled={saving} style={{ padding: '0.3rem 1rem', borderRadius: '6px', border: 'none', background: 'var(--cresoa-primary)', color: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}>{saving ? 'Saving...' : 'Save'}</button>
                <button onClick={() => setEditMode(null)} style={{ padding: '0.3rem 1rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'transparent', color: 'var(--cresoa-text)', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
              </div>
            </div>
          )}

          {/* ─── DEDICATED TRACKING PAGE PREVIEW ─── */}
          <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '10px', background: formData.tracking_bg_color, border: '1px solid var(--cresoa-border)' }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Preview</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingTop: '0.5rem' }}>
              {logoPreview ? <img src={logoPreview} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: formData.tracking_primary_color }} />}
              <div>
                <div style={{ color: formData.tracking_primary_color, fontWeight: 600, fontSize: '0.9rem' }}>{formData.tracking_welcome_message}</div>
                <div style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.7rem' }}>{formData.tracking_footer_message}</div>
              </div>
            </div>
            <div style={{ marginTop: '0.5rem', padding: '0.4rem', background: 'rgba(255,255,255,0.5)', borderRadius: '6px', border: `1px solid ${formData.tracking_primary_color}` }}>
              <span style={{ color: formData.tracking_primary_color, fontWeight: 600, fontSize: '0.8rem' }}>Order #1234</span>
              <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.7rem', marginLeft: '0.75rem' }}>Status: In Progress</span>
            </div>
          </div>
        </Card>

        {/* Card 4: Workflow Stages (Working Button) */}
        <Card 
          style={{ 
            padding: '1.25rem', 
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onClick={() => navigateWithBusiness('/dashboard/settings/workflow')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--cresoa-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="layers" size={18} stroke="var(--cresoa-accent)" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--cresoa-text)' }}>Workflow Stages</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--cresoa-text-muted)' }}>Customize the 5 stages for your industry</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', color: 'var(--cresoa-primary)' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 500, marginRight: '0.25rem' }}>Configure</span>
              <Icon name="chevron-right" size={16} stroke="var(--cresoa-primary)" />
            </div>
          </div>
        </Card>

      </div>

      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={businessId} />
      </div>
    </div>
  )
            }
