'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../lib/getBusinessId'
import { Icon } from '../../../components/Icon'
import { Card } from '../../../components/Card'
import { SectionHeader } from '../../../components/SectionHeader'
import { Navigation } from '../../../components/Navigation'
import '../../globals.css'

export default function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = getCurrentBusinessId() || searchParams.get('business_id')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [business, setBusiness] = useState(null)

  // ─── Form state ────────────────────────────────────────────
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

  // ─── Logo state ────────────────────────────────────────────
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [logoUrl, setLogoUrl] = useState('')

  // ─── Navigation helper ────────────────────────────────────
  const navigateWithBusiness = (path) => {
    const separator = path.includes('?') ? '&' : '?'
    router.push(`${path}${separator}business_id=${businessId}`)
  }

  // ─── Load business data ───────────────────────────────────
  useEffect(() => {
    const load = async () => {
      if (!businessId) {
        router.push('/dashboard')
        return
      }

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

    if (file.size > 1024 * 1024) {
      setError('Logo must be less than 1MB')
      return
    }
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      let finalLogoUrl = logoUrl

      // Upload new logo if selected
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
        finalLogoUrl = null // explicitly remove logo
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

      // Log activity
      await supabase.from('business_activity_logs').insert({
        business_id: businessId,
        performed_by: session.user.id,
        action: 'business_settings_updated',
        details: { name: formData.name }
      })

      setSuccess(true)
      setLogoFile(null)
      setBusiness({ ...business, ...updates })
      setTimeout(() => setSuccess(false), 3000)

    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  // ─── Loading skeleton ────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto', paddingBottom: '80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ width: '140px', height: '24px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
          <div style={{ width: '100px', height: '32px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ background: 'var(--cresoa-surface)', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', animation: 'pulse 1.5s infinite' }}>
              <div style={{ width: '60%', height: '16px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
              <div style={{ width: '40%', height: '12px', background: 'var(--cresoa-border)', borderRadius: '6px', marginTop: '0.3rem' }} />
            </div>
          ))}
        </div>
        <style>{`@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }`}</style>
        <Navigation businessId={businessId} />
      </div>
    )
  }

  if (error && !business) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto', paddingBottom: '80px' }}>
        <Card style={{ padding: '2rem', textAlign: 'center' }}>
          <Icon name="alert-circle" size={32} stroke="var(--cresoa-danger)" />
          <h2 style={{ margin: '0.5rem 0' }}>Couldn't load settings</h2>
          <p style={{ color: 'var(--cresoa-text-muted)' }}>{error}</p>
          <button onClick={() => window.location.reload()} className="cresoa-primary-button" style={{ marginTop: '1rem' }}>Retry</button>
        </Card>
        <Navigation businessId={businessId} />
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto', paddingBottom: '80px' }}>
      <Navigation businessId={businessId} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <div>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Business</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0', color: 'var(--cresoa-text)' }}>Business Settings</h1>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', margin: 0 }}>Manage your business details and branding</p>
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

      <form onSubmit={handleSubmit}>
        {/* ─── Business Logo ──────────────────────────────────── */}
        <Card style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          <SectionHeader title="Business Logo" subtitle="Upload a square image for your business logo" />
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', background: 'var(--cresoa-bg)', border: '2px solid var(--cresoa-border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {logoPreview ? (
                <img src={logoPreview} alt="Logo preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Icon name="building" size={32} stroke="var(--cresoa-text-muted)" />
              )}
            </div>
            <div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  style={{ display: 'none' }}
                  id="logo-upload"
                />
                <label htmlFor="logo-upload" className="cresoa-primary-button" style={{ cursor: 'pointer', padding: '0.3rem 1rem', fontSize: '0.8rem', background: 'var(--cresoa-primary)' }}>
                  <Icon name="upload" size={14} stroke="#fff" style={{ marginRight: '0.3rem' }} /> Upload
                </label>
                {(logoPreview || logoUrl) && (
                  <button type="button" onClick={handleRemoveLogo} style={{ padding: '0.3rem 1rem', borderRadius: '6px', border: '1px solid var(--cresoa-danger)', background: 'transparent', color: 'var(--cresoa-danger)', cursor: 'pointer', fontSize: '0.8rem' }}>
                    Remove
                  </button>
                )}
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--cresoa-text-muted)', marginTop: '0.3rem' }}>
                PNG, JPG or GIF · Max 1MB · Square recommended
              </p>
            </div>
          </div>
        </Card>

        {/* ─── Business Information ───────────────────────────── */}
        <Card style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          <SectionHeader title="Business Information" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>Business Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.95rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g. 08012345678"
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.95rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>WhatsApp Number</label>
              <input
                type="tel"
                name="whatsapp"
                value={formData.whatsapp}
                onChange={handleChange}
                placeholder="e.g. 08012345678"
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.95rem' }}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g. Lagos, Nigeria"
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.95rem' }}
              />
            </div>
          </div>
        </Card>

        {/* ─── Tracking Page Customisation ───────────────────── */}
        <Card style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          <SectionHeader title="Tracking Page" subtitle="Customise how your order tracking page looks to customers" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>Primary Colour</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="color"
                  name="tracking_primary_color"
                  value={formData.tracking_primary_color}
                  onChange={handleChange}
                  style={{ width: '40px', height: '40px', padding: '2px', border: '1px solid var(--cresoa-border)', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }}
                />
                <input
                  type="text"
                  name="tracking_primary_color"
                  value={formData.tracking_primary_color}
                  onChange={handleChange}
                  style={{ flex: 1, padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.95rem' }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>Background Colour</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="color"
                  name="tracking_bg_color"
                  value={formData.tracking_bg_color}
                  onChange={handleChange}
                  style={{ width: '40px', height: '40px', padding: '2px', border: '1px solid var(--cresoa-border)', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }}
                />
                <input
                  type="text"
                  name="tracking_bg_color"
                  value={formData.tracking_bg_color}
                  onChange={handleChange}
                  style={{ flex: 1, padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.95rem' }}
                />
              </div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>Welcome Message</label>
              <input
                type="text"
                name="tracking_welcome_message"
                value={formData.tracking_welcome_message}
                onChange={handleChange}
                placeholder="Track your order status"
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.95rem' }}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>Footer Message</label>
              <input
                type="text"
                name="tracking_footer_message"
                value={formData.tracking_footer_message}
                onChange={handleChange}
                placeholder="Thank you for choosing us"
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.95rem' }}
              />
            </div>
          </div>

          {/* ─── Live Preview ────────────────────────────────── */}
          <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: formData.tracking_bg_color, borderRadius: '12px', border: '1px solid var(--cresoa-border)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Live Preview</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: formData.tracking_primary_color }} />
              )}
              <div>
                <div style={{ color: formData.tracking_primary_color, fontWeight: 700, fontSize: '1.1rem' }}>{formData.tracking_welcome_message}</div>
                <div style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>{formData.tracking_footer_message}</div>
              </div>
            </div>
            <div style={{ marginTop: '0.8rem', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.5)', borderRadius: '6px', border: `1px solid ${formData.tracking_primary_color}` }}>
              <span style={{ color: formData.tracking_primary_color, fontWeight: 600 }}>Your Order #1234</span>
              <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.8rem', marginLeft: '1rem' }}>Status: In Progress</span>
            </div>
          </div>
        </Card>

        {/* ─── Save / Cancel ──────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <button type="submit" disabled={saving} className="cresoa-primary-button" style={{ padding: '0.6rem 1.5rem' }}>
            <Icon name="check" size={14} stroke="#fff" style={{ marginRight: '0.3rem' }} /> {saving ? 'Saving...' : 'Save Settings'}
          </button>
          <button
            type="button"
            onClick={() => navigateWithBusiness('/dashboard')}
            style={{
              padding: '0.6rem 1.5rem',
              borderRadius: '8px',
              border: '1px solid var(--cresoa-border)',
              background: 'transparent',
              color: 'var(--cresoa-text)',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 500
            }}
          >
            Cancel
          </button>
        </div>
      </form>

      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={businessId} />
      </div>
    </div>
  )
          }
