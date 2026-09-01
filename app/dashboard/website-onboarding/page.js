'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'

// ─── Self-contained SVG Icons ───
const SvgIcon = ({ name, size = 24, stroke = 'currentColor', style }) => {
  const icons = {
    fashion: <path d="M20.38 3.46L16 2l-4 4-4-4-4.38 1.46a2 2 0 0 0-1.28 2.25L3.6 9.6a2 2 0 0 0 1.46 1.34l2.34.52V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-8.54l2.34-.52a2 2 0 0 0 1.46-1.34l1.26-3.89a2 2 0 0 0-1.28-2.25z" />,
    printing: <><path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></>,
    repairs: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />,
    beauty: <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />,
    food: <><path d="M3 11h18a9 9 0 0 1-18 0z" /><path d="M12 20v-8" /></>,
    retail: <><path d="M4 4h16l-1 7H5z" /><path d="M5 11v9h14v-9" /></>,
    interior: <><path d="M3 3h18v18H3z" /><path d="M9 3v18" /></>,
    services: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    trash: <><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></>,
    back: <><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></>,
    next: <><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>,
    check: <polyline points="20 6 9 17 4 12" />,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>{icons[name]}</svg>
}

const businessTypes = [
  { id: 'fashion', label: 'Fashion & Clothing', icon: 'fashion', gradient: 'linear-gradient(135deg, #D4A52A, #F5D67B)' },
  { id: 'printing', label: 'Printing & Branding', icon: 'printing', gradient: 'linear-gradient(135deg, #3E7BFA, #6AA5FF)' },
  { id: 'repairs', label: 'Repairs & Technical', icon: 'repairs', gradient: 'linear-gradient(135deg, #2E7D5E, #6FCF97)' },
  { id: 'beauty', label: 'Beauty & Salon', icon: 'beauty', gradient: 'linear-gradient(135deg, #DB2777, #F472B6)' },
  { id: 'food', label: 'Food & Restaurants', icon: 'food', gradient: 'linear-gradient(135deg, #EA580C, #FB923C)' },
  { id: 'retail', label: 'Retail & Store', icon: 'retail', gradient: 'linear-gradient(135deg, #6366F1, #818CF8)' },
  { id: 'interior', label: 'Interior Design', icon: 'interior', gradient: 'linear-gradient(135deg, #10B981, #34D399)' },
  { id: 'services', label: 'Professional Services', icon: 'services', gradient: 'linear-gradient(135deg, #F59E0B, #FCD34D)' },
]

const templateOptions = [
  { id: 'elegant', name: 'Elegant', desc: 'Clean & Sophisticated', colors: ['#DB2777', '#1E293B', '#FAFAF9'] },
  { id: 'classic-gold', name: 'Classic Gold', desc: 'Premium & Trustworthy', colors: ['#0F2B4A', '#D4A52A', '#F7F5F0'] },
  { id: 'modern-bold', name: 'Modern Bold', desc: 'Energetic & Creative', colors: ['#4C1D95', '#F97316', '#FFFFFF'] },
  { id: 'fresh-serene', name: 'Fresh Serene', desc: 'Calm & Organic', colors: ['#2D4A22', '#9CAF88', '#F5F5DC'] },
  { id: 'dynamic-sunrise', name: 'Dynamic Sunrise', desc: 'Bold & High-Energy', colors: ['#EA580C', '#DB2777', '#FFFFFF'] },
]

const inputStyle = { width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.95rem', boxSizing: 'border-box' }
const labelStyle = { display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--cresoa-text)' }

const STEPS = [
  { id: 1, label: 'Business' },
  { id: 2, label: 'Type' },
  { id: 3, label: 'Template' },
  { id: 4, label: 'Content' },
  { id: 5, label: 'Publish' },
]

export default function WebsiteOnboarding() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [form, setForm] = useState({
    businessName: '',
    companyAddress: '',
    phone: '',
    whatsapp: '',
    email: '',
    description: '',
    businessType: '',
    templateId: 'elegant',
    slug: '',
    logo: '',
    heroImage: '',
    hasServices: true,
    hasShop: true,
    hasPortfolio: true,
    hasAbout: true,
  })

  // Services / Products
  const [services, setServices] = useState([{ name: '', description: '' }])
  const [products, setProducts] = useState([{ name: '', price: '', description: '' }])

  useEffect(() => {
    const check = async () => {
      if (!businessId) { router.push('/dashboard'); return }
      setLoading(true)
      try {
        const { data: biz } = await supabase.from('businesses').select('*').eq('id', businessId).single()
        if (biz) {
          setForm(prev => ({
            ...prev,
            businessName: biz.name || '',
            companyAddress: biz.location || '',
            phone: biz.phone || '',
            email: biz.email || '',
            logo: biz.logo_url || '',
          }))
        }

        const { data: existing } = await supabase
          .from('business_public_pages')
          .select('*')
          .eq('business_id', businessId)
          .maybeSingle()
        if (existing) {
          setForm(prev => ({
            ...prev,
            slug: existing.slug || '',
            templateId: existing.template_id || 'elegant',
            description: existing.description || '',
            heroImage: existing.cover_image_url || '',
            hasServices: existing.has_services ?? true,
            hasShop: existing.has_shop ?? true,
            hasPortfolio: true,
            hasAbout: true,
          }))
          if (existing.services?.length) setServices(existing.services)
          if (existing.shop_products?.length) setProducts(existing.shop_products)
        }
      } catch (e) { console.error(e) } finally { setLoading(false) }
    }
    check()
  }, [businessId, router])

  const updateField = (key, val) => {
    setForm(prev => ({ ...prev, [key]: val }))
    setError('')
  }

  const handleSlugChange = (e) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    updateField('slug', val)
  }

  const validateStep = () => {
    if (step === 1) {
      if (!form.businessName.trim()) { setError('Business name is required'); return false }
      if (!form.phone.trim()) { setError('Phone is required'); return false }
    }
    if (step === 2) {
      if (!form.businessType) { setError('Select a business type'); return false }
    }
    if (step === 3) {
      if (!form.templateId) { setError('Choose a template'); return false }
    }
    if (step === 5) {
      if (!form.slug.trim()) { setError('Slug is required'); return false }
    }
    setError('')
    return true
  }

  const handleNext = () => { if (validateStep()) setStep(s => Math.min(s + 1, STEPS.length)) }
  const handleBack = () => { setError(''); setStep(s => Math.max(s - 1, 1)) }

  const handlePublish = async () => {
    if (!validateStep()) return
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Save to business_public_pages
      const { error: saveError } = await supabase
        .from('business_public_pages')
        .upsert({
          business_id: businessId,
          slug: form.slug,
          is_enabled: true,
          publish_status: 'published',
          template_id: form.templateId,
          cover_image_url: form.heroImage || null,
          description: form.description || '',
          about: form.description || '',
          services: services.filter(s => s.name.trim()),
          shop_products: products.filter(p => p.name.trim()),
          show_quote_button: true,
          show_whatsapp_button: true,
          has_services: form.hasServices,
          has_shop: form.hasShop,
          has_services: form.hasServices,
          has_shop: form.hasShop,
        }, { onConflict: 'business_id' })

      if (saveError) throw saveError

      // Update business phone/email if needed
      const { error: bizUpdateError } = await supabase
        .from('businesses')
        .update({ phone: form.phone, location: form.companyAddress, email: form.email })
        .eq('id', businessId)

      if (bizUpdateError) throw bizUpdateError

      router.push(`/dashboard/website-editor?business_id=${businessId}&published=1`)
    } catch (e) {
      setError('Failed to publish: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--cresoa-bg)' }}><div className="cresoa-loading-spinner" /></div>

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cresoa-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ maxWidth: '680px', width: '100%', background: 'var(--cresoa-surface)', borderRadius: '20px', padding: '2rem', boxShadow: 'var(--shadow-lg)' }}>
        {/* Progress Bar */}
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '2rem' }}>
          {STEPS.map(s => (
            <div key={s.id} style={{ flex: 1, height: '6px', borderRadius: '99px', background: step >= s.id ? 'var(--cresoa-accent)' : 'var(--cresoa-border)' }} />
          ))}
        </div>
        <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.8rem', marginBottom: '1rem', fontWeight: 600 }}>Step {step} of {STEPS.length} · {STEPS[step-1].label}</p>

        {error && <div style={{ padding: '0.6rem 1rem', borderRadius: '8px', background: 'var(--cresoa-danger-soft)', color: 'var(--cresoa-danger)', marginBottom: '1rem' }}>{error}</div>}

        {/* Step 1: Business Info */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1rem' }}>Tell us about your business</h2>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Business Name *</label>
              <input type="text" value={form.businessName} onChange={(e) => updateField('businessName', e.target.value)} placeholder="e.g. Abraham Prints" style={inputStyle} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Address</label>
              <input type="text" value={form.companyAddress} onChange={(e) => updateField('companyAddress', e.target.value)} placeholder="e.g. 12 Allen Ave, Ikeja" style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Phone *</label>
                <input type="tel" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="0803..." style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>WhatsApp</label>
                <input type="tel" value={form.whatsapp} onChange={(e) => updateField('whatsapp', e.target.value)} placeholder="Same or different" style={inputStyle} />
              </div>
            </div>
            <div style={{ marginTop: '1rem' }}>
              <label style={labelStyle}>Email</label>
              <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder="contact@business.com" style={inputStyle} />
            </div>
          </div>
        )}

        {/* Step 2: Business Type */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1rem' }}>What kind of business?</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.8rem' }}>
              {businessTypes.map(type => (
                <button key={type.id} onClick={() => updateField('businessType', type.id)} style={{ padding: '1rem', borderRadius: '12px', border: `2px solid ${form.businessType === type.id ? 'var(--cresoa-accent)' : 'var(--cresoa-border)'}`, background: form.businessType === type.id ? 'var(--cresoa-accent-soft)' : 'var(--cresoa-surface)', cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ width: '40px', height: '40px', margin: '0 auto 0.5rem', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', background: type.gradient }}><SvgIcon name={type.icon} size={20} /></div>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{type.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Template */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1rem' }}>Pick a design</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.8rem' }}>
              {templateOptions.map(t => (
                <button key={t.id} onClick={() => updateField('templateId', t.id)} style={{ padding: '1rem', borderRadius: '12px', border: `2px solid ${form.templateId === t.id ? 'var(--cresoa-accent)' : 'var(--cresoa-border)'}`, background: form.templateId === t.id ? 'var(--cresoa-accent-soft)' : 'var(--cresoa-surface)', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.5rem' }}>
                    {t.colors.map(c => <div key={c} style={{ width: '16px', height: '16px', borderRadius: '50%', background: c }} />)}
                  </div>
                  <strong style={{ display: 'block', fontSize: '1rem' }}>{t.name}</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--cresoa-text-muted)' }}>{t.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Content (Services/Products toggle + add items) */}
        {step === 4 && (
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1rem' }}>Add content</h2>

            {/* Toggles */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
                <input type="checkbox" checked={form.hasServices} onChange={(e) => updateField('hasServices', e.target.checked)} /> Services
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
                <input type="checkbox" checked={form.hasShop} onChange={(e) => updateField('hasShop', e.target.checked)} /> Shop
              </label>
            </div>

            {form.hasServices && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Services</label>
                {services.map((s, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input type="text" placeholder="Service name" value={s.name} onChange={(e) => { const arr = [...services]; arr[idx].name = e.target.value; setServices(arr) }} style={inputStyle} />
                    <button onClick={() => setServices(services.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: 'var(--cresoa-danger)', cursor: 'pointer', flexShrink: 0 }}><SvgIcon name="trash" size={18} /></button>
                  </div>
                ))}
                <button onClick={() => setServices([...services, { name: '', description: '' }])} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px dashed var(--cresoa-border)', background: 'transparent', cursor: 'pointer' }}><SvgIcon name="plus" size={14} /> Add Service</button>
              </div>
            )}

            {form.hasShop && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Products</label>
                {products.map((p, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input type="text" placeholder="Product name" value={p.name} onChange={(e) => { const arr = [...products]; arr[idx].name = e.target.value; setProducts(arr) }} style={inputStyle} />
                    <input type="text" placeholder="Price" value={p.price} onChange={(e) => { const arr = [...products]; arr[idx].price = e.target.value; setProducts(arr) }} style={inputStyle} />
                    <button onClick={() => setProducts(products.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: 'var(--cresoa-danger)', cursor: 'pointer' }}><SvgIcon name="trash" size={18} /></button>
                  </div>
                ))}
                <button onClick={() => setProducts([...products, { name: '', price: '', description: '' }])} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px dashed var(--cresoa-border)', background: 'transparent', cursor: 'pointer' }}><SvgIcon name="plus" size={14} /> Add Product</button>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Publish */}
        {step === 5 && (
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1rem' }}>Publish your website</h2>
            <div style={{ background: 'var(--cresoa-surface-soft)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}><span>Template</span><strong>{templateOptions.find(t => t.id === form.templateId)?.name}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}><span>Services</span><strong>{form.hasServices ? services.filter(s => s.name.trim()).length : 0} items</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Products</span><strong>{form.hasShop ? products.filter(p => p.name.trim()).length : 0} items</strong></div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Your Website URL</label>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ padding: '0.8rem 0', color: 'var(--cresoa-text-muted)' }}>cresoa.com.ng/</span>
                <input type="text" value={form.slug} onChange={handleSlugChange} placeholder="your-business-name" style={{ ...inputStyle, marginLeft: '0.2rem' }} />
              </div>
            </div>

            <button onClick={handlePublish} disabled={saving} style={{ width: '100%', padding: '0.9rem', borderRadius: '12px', background: 'var(--cresoa-accent)', color: '#fff', border: 'none', fontWeight: 800, fontSize: '1.1rem', cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Publishing...' : '🚀 Publish Website'}
            </button>
          </div>
        )}

        {/* Footer buttons */}
        <div style={{ display: '
