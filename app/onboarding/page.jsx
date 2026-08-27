'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import ThemeToggle from '../../components/ThemeToggle'

// ─── Sector Options (with self-contained SVG icons, no emojis) ───
const sectorOptions = [
  {
    value: 'fashion',
    label: 'Fashion & Custom Wear',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.38 3.46L16 2l-4 4-4-4-4.38 1.46a2 2 0 0 0-1.28 2.25L3.6 9.6a2 2 0 0 0 1.46 1.34l2.34.52V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-8.54l2.34-.52a2 2 0 0 0 1.46-1.34l1.26-3.89a2 2 0 0 0-1.28-2.25z"/>
      </svg>
    ),
    gradient: 'linear-gradient(135deg, #D4A52A, #F5D67B)',
  },
  {
    value: 'repairs',
    label: 'Repairs & Technical Services',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>
    ),
    gradient: 'linear-gradient(135deg, #3E7BFA, #6AA5FF)',
  },
  {
    value: 'printing',
    label: 'Printing and Branding',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9V2h12v7" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" />
      </svg>
    ),
    gradient: 'linear-gradient(135deg, #2E7D5E, #6FCF97)',
  },
]

const STEPS = [
  { id: 1, label: 'Personal Info' },
  { id: 2, label: 'Business Info' },
  { id: 3, label: 'Contact' },
  { id: 4, label: 'Compliance (Optional)' },
  { id: 5, label: 'Review & Save' },
]

const INITIAL_FORM = {
  first_name: '',
  last_name: '',
  phone: '',
  whatsapp: '',
  sameAsWhatsapp: false,
  businessName: '',
  sector: '',
  businessType: '',
  companyAddress: '',
  bankName: '',
  accountNumber: '',
  accountName: '',
  cacPrefix: '',
  cacNumber: '',
  tinNumber: '',
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(INITIAL_FORM)

  // ─── Theme Toggle is handled by the component itself ───

  // ─── Check if user already has a business ───
  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        const { data: owned } = await supabase
          .from('businesses')
          .select('id')
          .eq('owner_id', user.id)
          .maybeSingle()
        if (owned) {
          router.push('/dashboard')
          return
        }

        const { data: membership } = await supabase
          .from('business_memberships')
          .select('business_id')
          .eq('user_id', user.id)
          .maybeSingle()
        if (membership) {
          router.push('/dashboard')
          return
        }

        setLoading(false)
      } catch (err) {
        setError('Something went wrong. Please refresh and try again.')
        setLoading(false)
      }
    }
    checkUserStatus()
  }, [router])

  // ─── Helper: normalize sector display to short code ───
  const normalizeSector = (sector) => {
    if (!sector) return ''
    const s = sector.toLowerCase()
    if (s.includes('print')) return 'printing'
    if (s.includes('fashion')) return 'fashion'
    if (s.includes('repair')) return 'repairs'
    return s
  }

  // ─── Update field ───
  const updateField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setError('')
  }

  // ─── WhatsApp same as phone ───
  const handleSameAsWhatsapp = (e) => {
    const checked = e.target.checked
    setForm(prev => ({
      ...prev,
      sameAsWhatsapp: checked,
      whatsapp: checked ? prev.phone : prev.whatsapp,
    }))
  }

  // ─── Validation per step ───
  const validateStep = () => {
    if (step === 1) {
      if (!form.first_name.trim() || !form.last_name.trim()) {
        setError('First name and last name are required.')
        return false
      }
    }
    if (step === 2) {
      if (!form.businessName.trim() || !form.companyAddress.trim() || !form.sector) {
        setError('Business name, company address, and sector are required.')
        return false
      }
    }
    if (step === 3) {
      if (!form.phone.trim() || (!form.sameAsWhatsapp && !form.whatsapp.trim())) {
        setError('Phone number and WhatsApp number are required.')
        return false
      }
    }
    // Step 4 is optional, no validation
    setError('')
    return true
  }

  const handleNext = () => {
    if (!validateStep()) return
    setStep(prev => Math.min(prev + 1, STEPS.length))
  }

  const handleBack = () => {
    setError('')
    setStep(prev => Math.max(prev - 1, 1))
  }

  const handleSkip = () => {
    setError('')
    setStep(5)
  }

  // ─── Save the business ───
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (step < STEPS.length) {
      handleNext()
      return
    }

    if (creating) return
    setCreating(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // 1. Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          phone: form.phone.trim(),
          whatsapp: form.whatsapp.trim(),
          email: user.email,
          updated_at: new Date().toISOString(),
        })
      if (profileError) throw profileError

      // 2. Create business
      const sectorCode = normalizeSector(form.sector)
      const { data: business, error: bizError } = await supabase
        .from('businesses')
        .insert({
          name: form.businessName.trim(),
          sector: sectorCode,
          business_type: form.businessType || null,
          owner_id: user.id,
          is_active: true,
          onboarding_completed: true,
          has_completed_onboarding: true,
          location: form.companyAddress.trim(),
          bank_name: form.bankName || null,
          account_number: form.accountNumber || null,
          account_name: form.accountName || null,
          cac_prefix: form.cacPrefix || null,
          cac_number: form.cacNumber || null,
          tin_number: form.tinNumber || null,
        })
        .select()
        .single()

      if (bizError) throw bizError

      // 3. Add owner membership
      const { error: memberError } = await supabase
        .from('business_memberships')
        .insert({
          business_id: business.id,
          user_id: user.id,
          role: 'Owner',
        })
      if (memberError) throw memberError

      // 4. Log activity
      await supabase.from('business_activity_logs').insert({
        business_id: business.id,
        performed_by: user.id,
        action: 'business_created',
        details: { name: form.businessName, sector: sectorCode },
      })

      // 5. Redirect to sector-specific dashboard
      router.push(`/dashboard/${sectorCode}?business_id=${business.id}&t=${Date.now()}`)

    } catch (err) {
      console.error('Onboarding error:', err)
      setError(err.message || 'Failed to create business. Please try again.')
      setCreating(false)
    }
  }

  // ─── Render the sector selector (with clear active state) ───
  const renderSectorSelector = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
      {sectorOptions.map((sector) => {
        const isSelected = form.sector === sector.value
        return (
          <button
            key={sector.value}
            type="button"
            onClick={() => updateField('sector', sector.value)}
            style={{
              padding: '1rem',
              borderRadius: '12px',
              border: `2px solid ${isSelected ? 'var(--cresoa-accent)' : 'var(--cresoa-border)'}`,
              background: isSelected ? 'var(--cresoa-accent-soft)' : 'var(--cresoa-surface)',
              color: 'var(--cresoa-text)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative',
              transform: isSelected ? 'scale(1.02)' : 'scale(1)',
              boxShadow: isSelected ? 'var(--shadow-md)' : 'var(--shadow-sm)',
            }}
          >
            {isSelected && (
              <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'var(--cresoa-accent)', color: '#fff', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>✓</div>
            )}
            <div style={{ color: isSelected ? 'var(--cresoa-accent)' : 'var(--cresoa-text-muted)' }}>
              {sector.icon}
            </div>
            <span style={{ fontWeight: '600', fontSize: '0.9rem', textAlign: 'center' }}>{sector.label}</span>
          </button>
        )
      })}
    </div>
  )

  // ─── Render current step content ───
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem' }}>Personal Information</h2>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>First name *</label>
              <input type="text" value={form.first_name} onChange={(e) => updateField('first_name', e.target.value)} placeholder="e.g. Amaka" style={inputStyle} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Last name *</label>
              <input type="text" value={form.last_name} onChange={(e) => updateField('last_name', e.target.value)} placeholder="e.g. Okafor" style={inputStyle} />
            </div>
          </div>
        )
      case 2:
        return (
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem' }}>Business Information</h2>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Business name *</label>
              <input type="text" value={form.businessName} onChange={(e) => updateField('businessName', e.target.value)} placeholder="e.g. Crescent Prints" style={inputStyle} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Company address *</label>
              <input type="text" value={form.companyAddress} onChange={(e) => updateField('companyAddress', e.target.value)} placeholder="e.g. 12 Allen Avenue, Ikeja" style={inputStyle} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Business type (optional)</label>
              <input type="text" value={form.businessType} onChange={(e) => updateField('businessType', e.target.value)} placeholder="e.g. Offset printing, Signage" style={inputStyle} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Industry *</label>
              {renderSectorSelector()}
            </div>
          </div>
        )
      case 3:
        return (
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem' }}>Contact Information</h2>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Phone number *</label>
              <input type="tel" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="0803 123 4567" style={inputStyle} />
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.sameAsWhatsapp} onChange={handleSameAsWhatsapp} style={{ width: '16px', height: '16px' }} />
                Same as WhatsApp number
              </label>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>WhatsApp number *</label>
              <input type="tel" value={form.whatsapp} onChange={(e) => updateField('whatsapp', e.target.value)} disabled={form.sameAsWhatsapp} placeholder="0803 123 4567" style={{ ...inputStyle, opacity: form.sameAsWhatsapp ? 0.5 : 1 }} />
            </div>
          </div>
        )
      case 4:
        return (
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem' }}>Compliance (Optional)</h2>
            <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>You can skip this – you'll be able to add it later.</p>
            
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--cresoa-surface-soft)', borderRadius: '8px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.8rem' }}>Bank Details</h3>
              <div style={{ marginBottom: '0.8rem' }}>
                <label style={labelStyle}>Bank name</label>
                <input type="text" value={form.bankName} onChange={(e) => updateField('bankName', e.target.value)} placeholder="e.g. Access Bank" style={inputStyle} />
              </div>
              <div style={{ marginBottom: '0.8rem' }}>
                <label style={labelStyle}>Account number</label>
                <input type="text" value={form.accountNumber} onChange={(e) => updateField('accountNumber', e.target.value)} maxLength="10" placeholder="10-digit account" style={inputStyle} />
              </div>
              <div style={{ marginBottom: '0.8rem' }}>
                <label style={labelStyle}>Account name</label>
                <input type="text" value={form.accountName} onChange={(e) => updateField('accountName', e.target.value)} placeholder="Account holder" style={inputStyle} />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--cresoa-text-muted)' }}>Without bank details, you won't be able to create invoices.</p>
            </div>

            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--cresoa-surface-soft)', borderRadius: '8px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.8rem' }}>CAC (Corporate Affairs Commission)</h3>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.8rem' }}>
                <select value={form.cacPrefix} onChange={(e) => updateField('cacPrefix', e.target.value)} style={{ ...inputStyle, width: '30%', flexShrink: 0 }}>
                  <option value="">Prefix</option>
                  {['RC', 'BN', 'IT', 'LLP', 'LP'].map(prefix => <option key={prefix} value={prefix}>{prefix}</option>)}
                </select>
                <input type="text" value={form.cacNumber} onChange={(e) => updateField('cacNumber', e.target.value)} placeholder="CAC Number" style={{ ...inputStyle, width: '70%' }} />
              </div>
            </div>

            <div style={{ padding: '1rem', background: 'var(--cresoa-surface-soft)', borderRadius: '8px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.8rem' }}>TIN (Tax Identification Number)</h3>
              <input type="text" value={form.tinNumber} onChange={(e) => updateField('tinNumber', e.target.value)} placeholder="TIN Number" style={inputStyle} />
            </div>
          </div>
        )
      case 5:
        return (
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem' }}>Review & Save</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', background: 'var(--cresoa-surface-soft)', padding: '1rem', borderRadius: '8px' }}>
              <ReviewRow label="First Name" value={form.first_name} />
              <ReviewRow label="Last Name" value={form.last_name} />
              <ReviewRow label="Business Name" value={form.businessName} />
              <ReviewRow label="Industry" value={sectorOptions.find(s => s.value === form.sector)?.label || ''} />
              <ReviewRow label="Business Type" value={form.businessType || '—'} />
              <ReviewRow label="Address" value={form.companyAddress} />
              <ReviewRow label="Phone" value={form.phone} />
              <ReviewRow label="WhatsApp" value={form.whatsapp} />
              <ReviewRow label="Bank Name" value={form.bankName || '—'} />
              <ReviewRow label="Account Number" value={form.accountNumber || '—'} />
              <ReviewRow label="Account Name" value={form.accountName || '—'} />
              <ReviewRow label="CAC" value={`${form.cacPrefix} ${form.cacNumber}`.trim() || '—'} />
              <ReviewRow label="TIN" value={form.tinNumber || '—'} />
            </div>
          </div>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cresoa-bg)' }}>
        <div style={{ color: 'var(--cresoa-text-muted)' }}>Loading...</div>
      </div>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--cresoa-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', position: 'relative' }}>
      {/* Theme Toggle top right */}
      <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 10 }}>
        <ThemeToggle />
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .onboarding-card { animation: fadeUp 0.5s ease-out; }
        .cresoa-primary-button {
          background: var(--cresoa-accent);
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 0.6rem 1.2rem;
          font-weight: 700;
          cursor: pointer;
          font-size: 0.9rem;
          transition: transform 0.1s ease, box-shadow 0.2s ease;
        }
        .cresoa-primary-button:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(212,165,42,0.3); }
        .cresoa-primary-button:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .cresoa-secondary-button {
          background: transparent;
          color: var(--cresoa-text);
          border: 1px solid var(--cresoa-border);
          border-radius: 8px;
          padding: 0.6rem 1.2rem;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.9rem;
        }
      `}</style>

      <div className="onboarding-card" style={{ maxWidth: '600px', width: '100%', background: 'var(--cresoa-surface)', borderRadius: '20px', padding: '1.5rem', boxShadow: 'var(--shadow-lg)' }}>
             {/* Header */}
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', margin: '0 0 0.5rem' }}>Welcome to Cresoa 🎉</h1>
        <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.9rem', margin: '0 0 1rem' }}>Let's set up your workspace.</p>

        {/* Progress bar */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
            {STEPS.map((s, i) => (
              <span key={s.id} style={{ fontSize: '0.65rem', fontWeight: i + 1 <= step ? '600' : '400', color: i + 1 <= step ? 'var(--cresoa-accent)' : 'var(--cresoa-text-muted)' }}>
                {s.label}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            {STEPS.map((s, i) => (
              <div key={s.id} style={{ flex: 1, height: '6px', borderRadius: '99px', background: i + 1 <= step ? 'var(--cresoa-accent)' : 'var(--cresoa-border)' }} />
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: '0.6rem 1rem', borderRadius: '8px', background: 'var(--cresoa-danger-soft)', color: 'var(--cresoa-danger)', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {/* Content */}
        <form onSubmit={handleSubmit}>
          {renderStepContent()}

          {/* Navigation buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
            {step > 1 && step < 5 && (
              <button type="button" onClick={handleBack} className="cresoa-secondary-button">Back</button>
            )}
            {step === 4 && (
              <button type="button" onClick={handleSkip} className="cresoa-secondary-button" style={{ background: 'transparent', border: 'none', color: 'var(--cresoa-text-muted)' }}>Skip for now</button>
            )}
            {step < 5 ? (
              <button type="button" onClick={handleNext} className="cresoa-primary-button" style={{ marginLeft: 'auto' }}>Continue</button>
            ) : (
              <button type="submit" disabled={creating} className="cresoa-primary-button" style={{ marginLeft: 'auto', opacity: creating ? 0.7 : 1 }}>
                {creating ? 'Saving...' : 'Save & Continue'}
              </button>
            )}
          </div>
        </form>
      </div>
    </main>
  )
}

// ─── Helper components & styles ───
function ReviewRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--cresoa-border)' }}>
      <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem' }}>{label}</span>
      <span style={{ fontWeight: '600', fontSize: '0.9rem', textAlign: 'right' }}>{value}</span>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '0.6rem 0.8rem',
  borderRadius: '8px',
  border: '1px solid var(--cresoa-border)',
  background: 'var(--cresoa-bg)',
  color: 'var(--cresoa-text)',
  fontSize: '0.95rem',
  boxSizing: 'border-box',
}

const labelStyle = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: '600',
  marginBottom: '0.3rem',
  color: 'var(--cresoa-text)',
}
