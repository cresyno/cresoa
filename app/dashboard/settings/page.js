'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../lib/getBusinessId'
import { Icon } from '../../../components/Icon'
import { Card } from '../../../components/Card'
import { Navigation } from '../../../components/Navigation'
import '../../globals.css'

export default function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = getCurrentBusinessId() || searchParams.get('business_id')

  // ─── Navigation helper ────────────────────────────────────
  const navigateWithBusiness = (path) => {
    const separator = path.includes('?') ? '&' : '?'
    router.push(`${path}${separator}business_id=${businessId}`)
  }

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [business, setBusiness] = useState(null)

  // ─── Form state for editing ──────────────────────────────
  const [editMode, setEditMode] = useState(null) // 'info', 'branding', or null
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

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

  // ─── Loading / Error states ──────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto', paddingBottom: '80px' }}>
        <Navigation businessId={businessId} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ height: '120px', background: 'var(--cresoa-border)', borderRadius: '12px', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
        <style>{`@keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }`}</style>
      </div>
    )
  }

  if (error && !business) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto', paddingBottom: '80px' }}>
        <Navigation businessId={businessId} />
        <Card style={{ padding: '2rem', textAlign: 'center', marginTop: '2rem' }}>
          <p style={{ color: 'var(--cresoa-danger)' }}>{error}</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', background: 'var(--cresoa-primary)', color: '#fff', border: 'none', borderRadius: '6px' }}>Retry</button>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto', paddingBottom: '80px' }}>
      <Navigation businessId={businessId} />

      {/* ─── Header ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem', marginTop: '0.5rem' }}>
        <div>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Business</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0', color: 'var(--cresoa-text)' }}>Settings</h1>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', margin: 0 }}>Manage your business details, branding, and workflow</p>
        </div>
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

      {/* ─── Settings Hub Grid ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>

        {/* Card 1: General Info */}
        <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--cresoa-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="building" size={20} stroke="var(--cresoa-accent)" />
            </div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--cresoa-text)' }}>General Info</h3>
          </div>
          {editMode === 'info' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
              <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Business Name" style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }} />
              <input type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="Phone" style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }} />
              <input type="text" name="whatsapp" value={formData.whatsapp} onChange={handleChange} placeholder="WhatsApp" style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }} />
              <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="Location" style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }} />
            </div>
          ) : (
            <div style={{ flex: 1, color: 'var(--cresoa-text-muted)', fontSize: '0.9rem', lineHeight: '1.6' }}>
              <p style={{ margin: '0 0 0.25rem 0', fontWeight: 500, color: 'var(--cresoa-text)' }}>{business?.name || 'Not set'}</p>
              <p style={{ margin: 0 }}>📞 {business?.phone || 'Not set'}</p>
              <p style={{ margin: 0 }}>💬 {business?.whatsapp || 'Not set'}</p>
              <p style={{ margin: 0 }}>📍 {business?.location || 'Not set'}</p>
            </div>
          )}
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
            {editMode === 'info' ? (
              <button onClick={handleSave} disabled={saving} style={{ padding: '0.4rem 1rem', borderRadius: '6px', border: 'none', background: 'var(--cresoa-primary)', color: '#fff', cursor: 'pointer' }}>{saving ? 'Saving...' : 'Save Info'}</button>
            ) : (
              <button onClick={() => setEditMode('info')} style={{ padding: '0.4rem 1rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'transparent', color: 'var(--cresoa-text)', cursor: 'pointer' }}>✏️ Edit</button>
            )}
            {editMode === 'info' && <button onClick={() => setEditMode(null)} style={{ padding: '0.4rem 1rem', borderRadius: '6px', border: 'none', background: 'var(--cresoa-border)', color: 'var(--cresoa-text)', cursor: 'pointer' }}>Cancel</button>}
          </div>
        </Card>

        {/* Card 2: Branding & Tracking */}
        <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--cresoa-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="palette" size={20} stroke="var(--cresoa-accent)" />
            </div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--cresoa-text)' }}>Branding & Tracking</h3>
          </div>
          {editMode === 'branding' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
              <div>
                <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Logo</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} id="logo-upload" />
                  <label htmlFor="logo-upload" style={{ padding: '0.3rem 1rem', borderRadius: '6px', background: 'var(--cresoa-primary)', color: '#fff', fontSize: '0.8rem', cursor: 'pointer' }}>Upload</label>
                  {(logoPreview || logoUrl) && <button onClick={handleRemoveLogo} style={{ padding: '0.3rem 0.8rem', borderRadius: '6px', border: '1px solid var(--cresoa-danger)', background: 'transparent', color: 'var(--cresoa-danger)', fontSize: '0.8rem' }}>Remove</button>}
                </div>
                {logoPreview && <div style={{ marginTop: '0.5rem', width: '60px', height: '60px', borderRadius: '50%', border: '1px solid var(--cresoa-border)', overflow: 'hidden' }}><img src={logoPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span>Primary:</span>
                <input type="color" name="tracking_primary_color" value={formData.tracking_primary_color} onChange={handleChange} style={{ width: '30px', height: '30px', border: 'none', cursor: 'pointer' }} />
                <input type="text" name="tracking_primary_color" value={formData.tracking_primary_color} onChange={handleChange} style={{ flex: 1, padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span>Background:</span>
                <input type="color" name="tracking_bg_color" value={formData.tracking_bg_color} onChange={handleChange} style={{ width: '30px', height: '30px', border: 'none', cursor: 'pointer' }} />
                <input type="text" name="tracking_bg_color" value={formData.tracking_bg_color} onChange={handleChange} style={{ flex: 1, padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)' }} />
              </div>
              <input type="text" name="tracking_welcome_message" value={formData.tracking_welcome_message} onChange={handleChange} placeholder="Welcome Message" style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)' }} />
              <input type="text" name="tracking_footer_message" value={formData.tracking_footer_message} onChange={handleChange} placeholder="Footer Message" style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)' }} />
            </div>
          ) : (
            <div style={{ flex: 1, color: 'var(--cresoa-text-muted)', fontSize: '0.9rem', lineHeight: '1.6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <span style={{ width: '16px', height: '16px', borderRadius: '4px', background: formData.tracking_primary_color }} />
                <span>Primary Color: <strong>{formData.tracking_primary_color}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <span style={{ width: '16px', height: '16px', borderRadius: '4px', background: formData.tracking_bg_color }} />
                <span>Background: <strong>{formData.tracking_bg_color}</strong></span>
              </div>
              <p style={{ margin: '0 0 0.25rem 0' }}>📢 {formData.tracking_welcome_message}</p>
              <p style={{ margin: 0 }}>🔚 {formData.tracking_footer_message}</p>
            </div>
          )}
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
            {editMode === 'branding' ? (
              <button onClick={handleSave} disabled={saving} style={{ padding: '0.4rem 1rem', borderRadius: '6px', border: 'none', background: 'var(--cresoa-primary)', color: '#fff', cursor: 'pointer' }}>{saving ? 'Saving...' : 'Save Branding'}</button>
            ) : (
              <button onClick={() => setEditMode('branding')} style={{ padding: '0.4rem 1rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'transparent', color: 'var(--cresoa-text)', cursor: 'pointer' }}>✏️ Edit</button>
            )}
            {editMode === 'branding' && <button onClick={() => setEditMode(null)} style={{ padding: '0.4rem 1rem', borderRadius: '6px', border: 'none', background: 'var(--cresoa-border)', color: 'var(--cresoa-text)', cursor: 'pointer' }}>Cancel</button>}
          </div>
        </Card>

           {/* Card 3: Workflow Stages (The new button!) */}
        <Card 
          style={{ 
            padding: '1.5rem', 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            background: 'var(--cresoa-surface)'
          }}
          onClick={() => navigateWithBusiness('/dashboard/settings/workflow')}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--cresoa-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="layers" size={20} stroke="var(--cresoa-accent)" />
            </div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--cresoa-text)' }}>Workflow Stages</h3>
          </div>
          
          <div style={{ flex: 1, color: 'var(--cresoa-text-muted)', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '1rem' }}>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              <strong>What is this?</strong> The 5 stages your orders move through on your dashboard and tracking page (e.g., Cutting, Sewing, Delivered).
            </p>
            <p style={{ margin: 0 }}>
              Click here to <strong>customize the names</strong> of these stages to match your specific industry (Fashion, Repairs, Manufacturing, etc.).
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--cresoa-border)', paddingTop: '1rem', marginTop: 'auto' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--cresoa-primary)' }}>Configure your stages →</span>
            <Icon name="chevron-right" size={18} stroke="var(--cresoa-primary)" />
          </div>
        </Card>

      </div>

      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={businessId} />
      </div>
    </div>
  )
}
