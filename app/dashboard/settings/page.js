'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { Card } from '../../../components/Card'
import { Navigation } from '../../../components/Navigation'
import '../../globals.css'

// ─── Custom CSS (Cresoa Design System) ─────────────────
const customCSS = `
  .cresoa-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .cresoa-modal-body {
    background: var(--cresoa-surface);
    border: 1px solid var(--cresoa-border);
    border-radius: 16px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
    color: var(--cresoa-text);
    width: 100%;
    max-width: 480px;
    padding: 1.5rem;
    position: relative;
  }

  .cresoa-input {
    width: 100%;
    padding: 0.6rem 0.8rem;
    border: 1px solid var(--cresoa-border);
    border-radius: 8px;
    background: var(--cresoa-bg);
    color: var(--cresoa-text);
    font-size: 0.85rem;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .cresoa-input:focus {
    border-color: var(--cresoa-accent);
    box-shadow: 0 0 0 3px var(--cresoa-accent-soft);
  }

  .cresoa-prefix-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--cresoa-surface);
    border: 1px solid var(--cresoa-border);
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    z-index: 9999;
    margin-top: 4px;
    overflow: hidden;
  }

  .cresoa-prefix-option {
    width: 100%;
    padding: 0.6rem 0.8rem;
    background: transparent;
    border: none;
    color: var(--cresoa-text);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s;
  }

  .cresoa-prefix-option:hover {
    background: var(--cresoa-accent-soft);
    color: var(--cresoa-accent);
  }
`

// ─── Self-contained SVG icons ──────────────────────
const Icon = ({ name, size = 20, stroke = 'currentColor', className = '' }) => {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', className }
  const icons = {
    'building': <svg {...props}><path d="M3 21h18"/><path d="M9 8h1"/><path d="M9 12h1"/><path d="M9 16h1"/><path d="M14 8h1"/><path d="M14 12h1"/><path d="M14 16h1"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/></svg>,
    'phone': <svg {...props}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
    'message-circle': <svg {...props}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>,
    'map-pin': <svg {...props}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
    'palette': <svg {...props}><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.4 0 .7 0 1-.1.5-.1 1-.5 1-1v-2.2c0-.6.4-1 1-1h1.6c4.6 0 8.4-3.8 8.4-8.4C23 5.8 18.2 2 12 2z"/></svg>,
    'layers': <svg {...props}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
    'chevron-down': <svg {...props}><polyline points="6 9 12 15 18 9"/></svg>,
    'check': <svg {...props}><polyline points="20 6 9 17 4 12"/></svg>,
    'upload': <svg {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
    'x': <svg {...props}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    'check-circle': <svg {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
    'alert-circle': <svg {...props}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
    'bell': <svg {...props}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
    'card': <svg {...props}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
    'edit': <svg {...props}><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>,
    'shield': <svg {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
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
  const [lastSaved, setLastSaved] = useState(null)

  const [activeTab, setActiveTab] = useState('general')
  const [editModal, setEditModal] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    location: '',
    tracking_primary_color: '#D4A52A',
    tracking_bg_color: '#F8F6F2',
    tracking_welcome_message: 'Track your order status',
    tracking_footer_message: 'Thank you for choosing us',
    bank_name: '',
    account_number: '',
    account_name: '',
    cac_prefix: 'RC',
    cac_number: '',
  })

  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [logoUrl, setLogoUrl] = useState('')

  const [showPrefixDropdown, setShowPrefixDropdown] = useState(false)
  const cacPrefixes = ['RC', 'BN', 'IT', 'LLP', 'LP']

  const brandColors = ['#D4A52A', '#0F2B4A', '#FFFFFF', '#000000', '#2E7D5E', '#D9534F', '#F8F6F2', '#C79A2B']

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

        let cacPrefix = 'RC'
        let cacNumber = ''
        if (bizData.cac_number) {
          const parts = bizData.cac_number.split('-')
          if (parts.length === 2) {
            cacPrefix = parts[0]
            cacNumber = parts[1]
          } else {
            cacNumber = bizData.cac_number
          }
        }

        setFormData({
          name: bizData.name || '',
          phone: bizData.phone || '',
          whatsapp: bizData.whatsapp || '',
          location: bizData.location || '',
          tracking_primary_color: bizData.tracking_primary_color || '#D4A52A',
          tracking_bg_color: bizData.tracking_bg_color || '#F8F6F2',
          tracking_welcome_message: bizData.tracking_welcome_message || 'Track your order status',
          tracking_footer_message: bizData.tracking_footer_message || 'Thank you for choosing us',
          bank_name: bizData.bank_name || '',
          account_number: bizData.account_number || '',
          account_name: bizData.account_name || '',
          cac_prefix: cacPrefix,
          cac_number: cacNumber,
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
      if (formData.account_number && !/^\d{10}$/.test(formData.account_number)) {
        alert('Account Number must be exactly 10 digits.')
        setSaving(false)
        return
      }

      if (formData.cac_number && !/^\d{5,7}$/.test(formData.cac_number)) {
        alert('CAC Number must be between 5 and 7 digits.')
        setSaving(false)
        return
      }

      const finalCac = formData.cac_number ? `${formData.cac_prefix}-${formData.cac_number}` : null

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
        bank_name: formData.bank_name || null,
        account_number: formData.account_number || null,
        account_name: formData.account_name || null,
        cac_number: finalCac,
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
      setEditModal(null)
      setLastSaved(new Date().toLocaleTimeString())
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const renderModalContent = () => {
    if (editModal === 'general') {
      return (
        <div>
          <h3 style={{ marginTop: 0, color: 'var(--cresoa-text)' }}>Edit General Info</h3>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>Business Name</label>
          <input type="text" name="name" value={formData.name} onChange={handleChange} className="cresoa-input" style={{ marginBottom: '1rem' }} />
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>Logo</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--cresoa-bg)', border: '1px solid var(--cresoa-border)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {logoPreview ? <img src={logoPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Icon name="building" size={20} stroke="var(--cresoa-text-muted)" />}
            </div>
            <input type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} id="logo-upload-modal" />
            <label htmlFor="logo-upload-modal" style={{ padding: '0.25rem 0.8rem', borderRadius: '6px', background: '#D4A52A', color: '#ffff', fontSize: '0.8rem', cursor: 'pointer' }}><Icon name="upload" size={14} stroke="#fff" /> Upload</label>
            {(logoPreview || logoUrl) && <button onClick={handleRemoveLogo} style={{ padding: '0.25rem 0.8rem', borderRadius: '6px', border: '1px solid var(--cresoa-danger)', background: 'transparent', color: 'var(--cresoa-danger)', fontSize: '0.8rem', cursor: 'pointer' }}>Remove</button>}
          </div>
        </div>
      )
    } else if (editModal === 'contact') {
      return (
        <div>
          <h3 style={{ marginTop: 0, color: 'var(--cresoa-text)' }}>Edit Contact & Location</h3>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>Business Phone</label>
          <input type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="e.g. 08012345678" className="cresoa-input" style={{ marginBottom: '0.8rem' }} />
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>WhatsApp Number</label>
          <input type="text" name="whatsapp" value={formData.whatsapp} onChange={handleChange} placeholder="e.g. 08012345678" className="cresoa-input" style={{ marginBottom: '0.8rem' }} />
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>Business Address</label>
          <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="e.g. Lagos, Nigeria" className="cresoa-input" />
        </div>
      )
        } else if (editModal === 'branding') {
      return (
        <div>
          <h3 style={{ marginTop: 0, color: 'var(--cresoa-text)' }}>Edit Branding & Tracking</h3>
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--cresoa-bg)', borderRadius: '8px', border: '1px solid var(--cresoa-border)' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--cresoa-text)' }}>Logo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--cresoa-card)', border: '1px solid var(--cresoa-border)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {logoPreview ? <img src={logoPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Icon name="building" size={24} stroke="var(--cresoa-text-muted)" />}
              </div>
              <input type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} id="logo-upload-branding" />
              <label htmlFor="logo-upload-branding" style={{ padding: '0.4rem 1rem', borderRadius: '6px', background: 'var(--cresoa-primary)', color: '#fff', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 500 }}><Icon name="upload" size={14} stroke="#fff" /> Upload</label>
              {(logoPreview || logoUrl) && <button onClick={handleRemoveLogo} style={{ padding: '0.4rem 1rem', borderRadius: '6px', border: '1px solid var(--cresoa-danger)', background: 'transparent', color: 'var(--cresoa-danger)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 500 }}>Remove</button>}
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--cresoa-text)' }}>Primary Color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {brandColors.map((c) => (
                  <div key={c} onClick={() => setFormData({ ...formData, tracking_primary_color: c })} style={{ width: '36px', height: '36px', borderRadius: '8px', background: c, border: formData.tracking_primary_color === c ? '2px solid var(--cresoa-primary)' : '1px solid var(--cresoa-border)', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }} />
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: formData.tracking_primary_color }} />
                <input type="text" value={formData.tracking_primary_color} onChange={(e) => setFormData({ ...formData, tracking_primary_color: e.target.value })} className="cresoa-input" style={{ width: '90px', textAlign: 'center', fontWeight: 600 }} />
              </div>
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--cresoa-text)' }}>Background Color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {brandColors.map((c) => (
                  <div key={c} onClick={() => setFormData({ ...formData, tracking_bg_color: c })} style={{ width: '36px', height: '36px', borderRadius: '8px', background: c, border: formData.tracking_bg_color === c ? '2px solid var(--cresoa-primary)' : '1px solid var(--cresoa-border)', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }} />
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: formData.tracking_bg_color }} />
                <input type="text" value={formData.tracking_bg_color} onChange={(e) => setFormData({ ...formData, tracking_bg_color: e.target.value })} className="cresoa-input" style={{ width: '90px', textAlign: 'center', fontWeight: 600 }} />
              </div>
            </div>
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>Welcome Message</label>
              <input type="text" name="tracking_welcome_message" value={formData.tracking_welcome_message} onChange={handleChange} className="cresoa-input" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>Footer Message</label>
              <input type="text" name="tracking_footer_message" value={formData.tracking_footer_message} onChange={handleChange} className="cresoa-input" />
            </div>
          </div>
        </div>
      )
    } else if (editModal === 'payments') {
      return (
        <div>
          <h3 style={{ marginTop: 0, color: 'var(--cresoa-text)' }}>Edit Payment Details</h3>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>Bank Name</label>
          <input type="text" name="bank_name" value={formData.bank_name} onChange={handleChange} placeholder="e.g. GTBank" className="cresoa-input" style={{ marginBottom: '0.8rem' }} />
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>Account Number (10 digits)</label>
          <input type="text" name="account_number" value={formData.account_number} onChange={(e) => setFormData({ ...formData, account_number: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="e.g. 0123456789" className="cresoa-input" style={{ marginBottom: '0.8rem' }} />
          {formData.account_number && !/^\d{10}$/.test(formData.account_number) && (
            <p style={{ color: 'var(--cresoa-danger)', fontSize: '0.75rem', margin: '-0.5rem 0 0.8rem' }}>Account number must be exactly 10 digits.</p>
          )}
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>Account Name</label>
          <input type="text" name="account_name" value={formData.account_name} onChange={handleChange} placeholder="e.g. John Doe" className="cresoa-input" />
        </div>
      )
    } else if (editModal === 'compliance') {
      return (
        <div>
          <h3 style={{ marginTop: 0, color: 'var(--cresoa-text)' }}>Edit Compliance (CAC)</h3>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>CAC Registration Number</label>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.8rem' }}>
            {/* Prefix Dropdown */}
            <div style={{ position: 'relative', width: '90px' }}>
              <button
                type="button"
                onClick={() => setShowPrefixDropdown(!showPrefixDropdown)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '8px',
                  border: '1px solid var(--cresoa-border)',
                  background: 'var(--cresoa-bg)',
                  color: 'var(--cresoa-text)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>{formData.cac_prefix}</span>
                <Icon name="chevron-down" size={14} stroke="currentColor" />
              </button>
              {showPrefixDropdown && (
                <div className="cresoa-prefix-dropdown">
                  {cacPrefixes.map(prefix => (
                    <button
                      key={prefix}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, cac_prefix: prefix })
                        setShowPrefixDropdown(false)
                      }}
                      className="cresoa-prefix-option"
                    >
                      {prefix}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Number Input */}
            <input
              type="text"
              name="cac_number"
              value={formData.cac_number}
              onChange={(e) => setFormData({ ...formData, cac_number: e.target.value.replace(/\D/g, '').slice(0, 7) })}
              placeholder="12345"
              className="cresoa-input"
            />
          </div>
          {formData.cac_number && !/^\d{5,7}$/.test(formData.cac_number) && (
            <p style={{ color: 'var(--cresoa-danger)', fontSize: '0.75rem', margin: '-0.5rem 0 0.8rem' }}>CAC Number must be between 5 and 7 digits.</p>
          )}
          <p style={{ fontSize: '0.75rem', color: 'var(--cresoa-text-muted)' }}>
            Adding your CAC number builds trust with customers and makes your business look more credible.
          </p>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '80px' }}>
        <Navigation businessId={businessId} />
        <div style={{ marginTop: '2rem', height: '200px', background: 'var(--cresoa-border)', borderRadius: '12px', animation: 'pulse 1.5s infinite' }} />
        <style>{`@keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1000px', margin: '0 auto', paddingBottom: '100px', position: 'relative' }}>
      <style>{customCSS}</style>
      <Navigation businessId={businessId} />

      <div style={{ marginBottom: '1.5rem', marginTop: '0.5rem' }}>
        <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Business</p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0', color: 'var(--cresoa-text)' }}>Settings</h1>
        <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', margin: 0 }}>Manage your business details, branding, and payments</p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--cresoa-border)', marginBottom: '1.5rem', overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
        {[
          { id: 'general', label: 'General', icon: 'building' },
          { id: 'contact', label: 'Contact', icon: 'phone' },
          { id: 'branding', label: 'Branding', icon: 'palette' },
          { id: 'payments', label: 'Payments', icon: 'card' },
          { id: 'compliance', label: 'Compliance', icon: 'shield' },
          { id: 'workflow', label: 'Workflow', icon: 'layers' },
          { id: 'notifications', label: 'Notifications', icon: 'bell' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 1rem',
            border: 'none', background: 'transparent', color: activeTab === tab.id ? 'var(--cresoa-accent)' : 'var(--cresoa-text-muted)',
            borderBottom: activeTab === tab.id ? '2px solid var(--cresoa-accent)' : '2px solid transparent', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem', transition: 'all 0.2s'
          }}>
            <Icon name={tab.icon} size={16} stroke={activeTab === tab.id ? 'var(--cresoa-accent)' : 'currentColor'} />
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ minHeight: '300px' }}>
        {activeTab === 'general' && (
          <Card style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--cresoa-text)' }}>General Information</h3>
              <button onClick={() => setEditModal('general')} style={{ background: 'transparent', border: '1px solid var(--cresoa-border)', padding: '0.25rem 0.75rem', borderRadius: '6px', color: 'var(--cresoa-text)', fontSize: '0.8rem', cursor: 'pointer' }}><Icon name="edit" size={14} stroke="currentColor" style={{ marginRight: '0.3rem' }} /> Edit</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--cresoa-bg)', border: '1px solid var(--cresoa-border)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {logoPreview ? <img src={logoPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Icon name="building" size={24} stroke="var(--cresoa-text-muted)" />}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--cresoa-text)' }}>{formData.name || 'Business Name'}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--cresoa-text-muted)' }}>Business Profile</div>
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'contact' && (
          <Card style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--cresoa-text)' }}>Contact & Location</h3>
              <button onClick={() => setEditModal('contact')} style={{ background: 'transparent', border: '1px solid var(--cresoa-border)', padding: '0.25rem 0.75rem', borderRadius: '6px', color: 'var(--cresoa-text)', fontSize: '0.8rem', cursor: 'pointer' }}><Icon name="edit" size={14} stroke="currentColor" style={{ marginRight: '0.3rem' }} /> Edit</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--cresoa-text-muted)', fontSize: '0.9rem' }}>
              <div><strong style={{ color: 'var(--cresoa-text)' }}>Phone:</strong> {formData.phone || 'Not set'}</div>
              <div><strong style={{ color: 'var(--cresoa-text)' }}>WhatsApp:</strong> {formData.whatsapp || 'Not set'}</div>
              <div><strong style={{ color: 'var(--cresoa-text)' }}>Address:</strong> {formData.location || 'Not set'}</div>
            </div>
          </Card>
        )}

   {activeTab === 'branding' && (
          <Card style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--cresoa-text)' }}>Branding & Tracking</h3>
              <button onClick={() => setEditModal('branding')} style={{ background: 'transparent', border: '1px solid var(--cresoa-border)', padding: '0.25rem 0.75rem', borderRadius: '6px', color: 'var(--cresoa-text)', fontSize: '0.8rem', cursor: 'pointer' }}><Icon name="edit" size={14} stroke="currentColor" style={{ marginRight: '0.3rem' }} /> Edit</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--cresoa-text-muted)', fontSize: '0.9rem' }}>
              <div><strong style={{ color: 'var(--cresoa-text)' }}>Primary Color:</strong> <span style={{ display: 'inline-block', width: '16px', height: '16px', borderRadius: '4px', background: formData.tracking_primary_color, verticalAlign: 'middle', marginRight: '0.3rem' }} /> {formData.tracking_primary_color}</div>
              <div><strong style={{ color: 'var(--cresoa-text)' }}>Background:</strong> <span style={{ display: 'inline-block', width: '16px', height: '16px', borderRadius: '4px', background: formData.tracking_bg_color, verticalAlign: 'middle', marginRight: '0.3rem' }} /> {formData.tracking_bg_color}</div>
              <div><strong style={{ color: 'var(--cresoa-text)' }}>Welcome Message:</strong> {formData.tracking_welcome_message}</div>
              <div><strong style={{ color: 'var(--cresoa-text)' }}>Footer Message:</strong> {formData.tracking_footer_message}</div>
            </div>
            <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '10px', background: formData.tracking_bg_color, border: '1px solid var(--cresoa-border)' }}>
              <div style={{ fontSize: '0.6rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Live Preview</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
        )}

        {activeTab === 'payments' && (
          <Card style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--cresoa-text)' }}>Payment Details</h3>
              <button onClick={() => setEditModal('payments')} style={{ background: 'transparent', border: '1px solid var(--cresoa-border)', padding: '0.25rem 0.75rem', borderRadius: '6px', color: 'var(--cresoa-text)', fontSize: '0.8rem', cursor: 'pointer' }}><Icon name="edit" size={14} stroke="currentColor" style={{ marginRight: '0.3rem' }} /> Edit</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--cresoa-text-muted)', fontSize: '0.9rem' }}>
              <div><strong style={{ color: 'var(--cresoa-text)' }}>Bank Name:</strong> {formData.bank_name || 'Not set'}</div>
              <div><strong style={{ color: 'var(--cresoa-text)' }}>Account Number:</strong> {formData.account_number || 'Not set'}</div>
              <div><strong style={{ color: 'var(--cresoa-text)' }}>Account Name:</strong> {formData.account_name || 'Not set'}</div>
            </div>
            <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--cresoa-text-muted)' }}>
              These details will appear on all invoices. Account number must be exactly 10 digits.
            </p>
          </Card>
        )}

        {activeTab === 'compliance' && (
          <Card style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--cresoa-text)' }}>Compliance (CAC)</h3>
              <button onClick={() => setEditModal('compliance')} style={{ background: 'transparent', border: '1px solid var(--cresoa-border)', padding: '0.25rem 0.75rem', borderRadius: '6px', color: 'var(--cresoa-text)', fontSize: '0.8rem', cursor: 'pointer' }}><Icon name="edit" size={14} stroke="currentColor" style={{ marginRight: '0.3rem' }} /> Edit</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--cresoa-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="shield" size={24} stroke="var(--cresoa-accent)" />
              </div>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--cresoa-text)' }}>CAC Registration Number</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--cresoa-text-muted)' }}>{formData.cac_number ? `${formData.cac_prefix}-${formData.cac_number}` : 'Not set'}</div>
              </div>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--cresoa-text-muted)', marginBottom: 0 }}>
              Adding your CAC number builds trust with customers and makes your business look more credible. It will be displayed on your invoices.
            </p>
          </Card>
        )}

        {activeTab === 'notifications' && (
          <Card style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--cresoa-text-muted)' }}>
            <Icon name="bell" size={32} stroke="var(--cresoa-text-muted)" />
            <h3 style={{ margin: '0.5rem 0 0.25rem', fontWeight: 500 }}>Notifications</h3>
            <p>Notification preferences are coming soon.</p>
          </Card>
        )}

        {activeTab === 'workflow' && (
          <Card style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--cresoa-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="layers" size={18} stroke="var(--cresoa-accent)" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--cresoa-text)' }}>Workflow Stages</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--cresoa-text-muted)' }}>Customize the 5 stages for your industry</p>
                </div>
              </div>
              <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.9rem', lineHeight: '1.6', margin: '0 0 0.5rem 0' }}>
                Define the 5 stages your orders go through. This will update the Production page for your industry.
              </p>
              <button onClick={() => navigateWithBusiness('/dashboard/settings/workflow')} style={{ padding: '0.5rem 1.5rem', borderRadius: '8px', border: 'none', background: 'var(--cresoa-primary)', color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Icon name="layers" size={14} stroke="#fff" /> Configure Workflow
              </button>
            </div>
          </Card>
        )}
      </div>

      {/* THE BEAUTIFUL MODAL (Using Custom CSS) */}
      {editModal && (
        <div className="cresoa-modal-overlay">
          <div className="cresoa-modal-body">
            {renderModalContent()}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button onClick={() => setEditModal(null)} style={{
                padding: '0.6rem 1.2rem',
                borderRadius: '8px',
                border: '1px solid var(--cresoa-border)',
                background: 'transparent',
                color: 'var(--cresoa-text)',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '0.9rem'
              }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} style={{
                padding: '0.6rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--cresoa-primary)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.9rem',
                opacity: saving ? '0.7' : '1'
              }}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom save bar */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--cresoa-card)',
        borderTop: '1px solid var(--cresoa-border)',
        padding: '0.75rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 100,
        boxShadow: '0 -4px 12px rgba(0,0,0,0.04)',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}>
        <div>
          {lastSaved ? <span style={{ fontSize: '0.7rem', color: 'var(--cresoa-text-muted)' }}>Last saved: {lastSaved}</span> : <span style={{ fontSize: '0.7rem', color: 'var(--cresoa-text-muted)' }}>Unsaved changes</span>}
          {success && <span style={{ fontSize: '0.7rem', color: 'var(--cresoa-success)', marginLeft: '0.5rem' }}>✅ Saved</span>}
        </div>
        <button onClick={handleSave} disabled={saving} style={{ padding: '0.6rem 1.8rem', borderRadius: '8px', border: 'none', background: 'var(--cresoa-primary)', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', opacity: saving ? '0.7' : '1' }}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={businessId} />
      </div>
    </div>
  )
          }
