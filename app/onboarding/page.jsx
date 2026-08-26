'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

// Sector options with icons (inline SVGs)
const sectorOptions = [
  {
    value: 'fashion',
    label: 'Fashion & Custom Wear',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.38 3.46L16 2l-4 4-4-4-4.38 1.46a2 2 0 0 0-1.28 2.25L3.6 9.6a2 2 0 0 0 1.46 1.34l2.34.52V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-8.54l2.34-.52a2 2 0 0 0 1.46-1.34l1.26-3.89a2 2 0 0 0-1.28-2.25z"/>
      </svg>
    ),
    gradient: 'linear-gradient(135deg, #D4A52A, #F5D67B)',
  },
  {
    value: 'repairs',
    label: 'Repairs & Technical Services',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>
    ),
    gradient: 'linear-gradient(135deg, #3E7BFA, #6AA5FF)',
  },
  // You can add more sectors later
]

const CAC_PREFIXES = ['RC', 'BN', 'IT', 'LLP', 'LP']

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)

  // Wizard state
  const [step, setStep] = useState(1)
  const [creating, setCreating] = useState(false)

  // Form data
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    businessName: '',
    companyAddress: '',
    sector: '',
    businessType: '',
    phone: '',
    whatsapp: '',
    sameAsWhatsapp: false,
    bankName: '',
    accountNumber: '',
    accountName: '',
    cacPrefix: '',
    cacNumber: '',
    tinNumber: '',
  })

  // Check if user already has a business (and redirect if so)
  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }
        setUser(user)

        // Check if user owns a business
        const { data: owned } = await supabase
          .from('businesses')
          .select('id')
          .eq('owner_id', user.id)
          .maybeSingle()
        if (owned) {
          router.push('/dashboard')
          return
        }

        // Check if user is a member via memberships
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
        console.error('Onboarding check error:', err)
        setError('Something went wrong. Please refresh and try again.')
        setLoading(false)
      }
    }

    checkUserStatus()
  }, [router])

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  // WhatsApp checkbox logic
  const handleSameAsWhatsapp = (e) => {
    const checked = e.target.checked
    setFormData(prev => ({
      ...prev,
      sameAsWhatsapp: checked,
      whatsapp: checked ? prev.phone : prev.whatsapp
    }))
  }

  // Step validation
  const validateStep = () => {
    if (step === 1) {
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        setError('First name and last name are required.')
        return false
      }
    }
    if (step === 2) {
      if (!formData.businessName.trim() || !formData.companyAddress.trim() || !formData.sector) {
        setError('Business name, company address, and sector are required.')
        return false
      }
    }
    if (step === 3) {
      if (!formData.phone.trim() || (!formData.sameAsWhatsapp && !formData.whatsapp.trim())) {
        setError('Phone number and WhatsApp number are required.')
        return false
      }
    }
    // Step 4 is optional, no validation
    setError('')
    return true
  }

  // Next step
  const handleNext = () => {
    if (!validateStep()) return
    setStep(prev => Math.min(prev + 1, 5))
  }

  // Back step
  const handleBack = () => {
    setError('')
    setStep(prev => Math.max(prev - 1, 1))
  }

  // Skip optional step (step 4)
  const handleSkip = () => {
    setError('')
    setStep(5) // go to review
  }

  // Final submit
  const handleSubmit = async (e) => {
    e.preventDefault()
    setCreating(true)
    setError('')

    try {
      // 1. Update user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          whatsapp: formData.whatsapp,
          email: user.email,
          updated_at: new Date().toISOString(),
        })

      if (profileError) throw profileError

      // 2. Create business
      const { data: business, error: bizError } = await supabase
        .from('businesses')
        .insert({
          name: formData.businessName,
          sector: formData.sector,
          business_type: formData.businessType || null,
          owner_id: user.id,
          is_active: true,
          onboarding_completed: true,
          has_completed_onboarding: true,
          bank_name: formData.bankName || null,
          account_number: formData.accountNumber || null,
          account_name: formData.accountName || null,
          cac_prefix: formData.cacPrefix || null,
          cac_number: formData.cacNumber || null,
          tin_number: formData.tinNumber || null,
          location: formData.companyAddress,
        })
        .select()
        .single()

      if (bizError) throw bizError

      // 3. Add owner as member
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
        details: { name: formData.businessName, sector: formData.sector },
      })

      // 5. Redirect to sector-specific dashboard
      router.push(`/dashboard/${formData.sector}?business_id=${business.id}&t=${Date.now()}`)
    } catch (err) {
      console.error('Create business error:', err)
      setError(err.message || 'Failed to create business. Please try again.')
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--color-text-muted)' }}>Loading...</div>
      </div>
    )
  }

  // Render sector cards
  const renderSectorCards = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
      {sectorOptions.map((sector) => (
        <button
          key={sector.value}
          type="button"
          onClick={() => setFormData(prev => ({ ...prev, sector: sector.value }))}
          style={{
            padding: '1rem',
            border: `2px solid ${formData.sector === sector.value ? 'var(--color-accent)' : 'var(--color-border)'}`,
            borderRadius: '12px',
            background: sector.gradient,
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            minHeight: '120px',
            justifyContent: 'center',
          }}
        >
          {sector.icon}
          <span style={{ fontWeight: '600', fontSize: '0.9rem', textAlign: 'center' }}>{sector.label}</span>
        </button>
      ))}
    </div>
  )

  // Render current step content
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '1rem' }}>Personal Information</h2>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', marginBottom: '0.3rem' }}>First Name *</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', marginBottom: '0.3rem' }}>Last Name *</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                style={inputStyle}
              />
            </div>
          </div>
        )
      case 2:
        return (
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '1rem' }}>Business Information</h2>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', marginBottom: '0.3rem' }}>Business Name *</label>
              <input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                required
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', marginBottom: '0.3rem' }}>Company Address *</label>
              <input
                type="text"
                name="companyAddress"
                value={formData.companyAddress}
                onChange={handleChange}
                required
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', marginBottom: '0.3rem' }}>Business Type (optional)</label>
              <input
                type="text"
                name="businessType"
                value={formData.businessType}
                onChange={handleChange}
                placeholder="e.g., Phone Repair, Tailor, etc."
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', marginBottom: '0.3rem' }}>Industry *</label>
              {renderSectorCards()}
            </div>
          </div>
        )
      case 3:
        return (
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '1rem' }}>Contact Information</h2>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', marginBottom: '0.3rem' }}>Phone Number *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={formData.sameAsWhatsapp}
                  onChange={handleSameAsWhatsapp}
                  style={{ width: '16px', height: '16px' }}
                />
                Same as WhatsApp number
              </label>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', marginBottom: '0.3rem' }}>WhatsApp Number *</label>
              <input
                type="tel"
                name="whatsapp"
                value={formData.whatsapp}
                onChange={handleChange}
                required={!formData.sameAsWhatsapp}
                disabled={formData.sameAsWhatsapp}
                style={{ ...inputStyle, opacity: formData.sameAsWhatsapp ? 0.5 : 1 }}
              />
            </div>
          </div>
        )
      case 4:
        return (
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '1rem' }}>Compliance (Optional)</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>You can skip this – you'll be able to add it later.</p>
            
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--color-bg)', borderRadius: '8px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.8rem' }}>Bank Details</h3>
              <div style={{ marginBottom: '0.8rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', marginBottom: '0.3rem' }}>Bank Name</label>
                <input
                  type="text"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleChange}
                  placeholder="e.g., Access Bank"
                  style={inputStyle}
                />
              </div>
              <div style={{ marginBottom: '0.8rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', marginBottom: '0.3rem' }}>Account Number</label>
                <input
                  type="text"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleChange}
                  maxLength={10}
                  placeholder="10-digit account number"
                  style={inputStyle}
                />
              </div>
              <div style={{ marginBottom: '0.8rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', marginBottom: '0.3rem' }}>Account Name</label>
                <input
                  type="text"
                  name="accountName"
                  value={formData.accountName}
                  onChange={handleChange}
                  placeholder="Account holder name"
                  style={inputStyle}
                />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Without bank details, you won't be able to create invoices.</p>
            </div>

            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--color-bg)', borderRadius: '8px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.8rem' }}>CAC (Corporate Affairs Commission)</h3>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.8rem' }}>
                <select
                  name="cacPrefix"
                  value={formData.cacPrefix}
                  onChange={handleChange}
                  style={{ ...inputStyle, width: '30%', flexShrink: 0 }}
                >
                  <option value="">Prefix</option>
                  {CAC_PREFIXES.map(prefix => (
                    <option key={prefix} value={prefix}>{prefix}</option>
                  ))}
                </select>
                <input
                  type="text"
                  name="cacNumber"
                  value={formData.cacNumber}
                  onChange={handleChange}
                  placeholder="CAC Number"
                  style={{ ...inputStyle, width: '70%' }}
                />
              </div>
            </div>

            <div style={{ padding: '1rem', background: 'var(--color-bg)', borderRadius: '8px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.8rem' }}>TIN (Tax Identification Number)</h3>
              <input
                type="text"
                name="tinNumber"
                value={formData.tinNumber}
                onChange={handleChange}
                placeholder="TIN Number"
                style={inputStyle}
              />
            </div>
          </div>
        )
      case 5:
        // Review step
        return (
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '1rem' }}>Review Your Information</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <ReviewRow label="First Name" value={formData.firstName} />
              <ReviewRow label="Last Name" value={formData.lastName} />
              <ReviewRow label="Business Name" value={formData.businessName} />
              <ReviewRow label="Company Address" value={formData.companyAddress} />
              <ReviewRow label="Industry" value={sectorOptions.find(s => s.value === formData.sector)?.label || ''} />
              <ReviewRow label="Business Type" value={formData.businessType || '—'} />
              <ReviewRow label="Phone" value={formData.phone} />
              <ReviewRow label="WhatsApp" value={formData.whatsapp} />
              <ReviewRow label="Bank Name" value={formData.bankName || '—'} />
              <ReviewRow label="Account Number" value={formData.accountNumber || '—'} />
              <ReviewRow label="Account Name" value={formData.accountName || '—'} />
              <ReviewRow label="CAC" value={`${formData.cacPrefix} ${formData.cacNumber}`.trim() || '—'} />
              <ReviewRow label="TIN" value={formData.tinNumber || '—'} />
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ maxWidth: '600px', width: '100%', background: 'var(--color-card)', padding: '2rem', borderRadius: '12px', boxShadow: 'var(--shadow)', border: '1px solid var(--color-border)' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--color-primary)', marginBottom: '0.25rem' }}>
          Welcome to Cresoa 🎉
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          Let's set up your workspace in {step} of 5 steps.
        </p>

        {/* Progress bar */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
            {['Personal', 'Business', 'Contact', 'Compliance', 'Review'].map((label, index) => (
              <span key={label} style={{ fontSize: '0.65rem', fontWeight: step === index + 1 ? '600' : '400', color: step === index + 1 ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>
                {label}
              </span>
            ))}
          </div>
          <div style={{ height: '6px', background: 'var(--color-border)', borderRadius: '3px' }}>
            <div style={{ height: '100%', width: `${(step / 5) * 100}%`, background: 'var(--color-accent)', borderRadius: '3px', transition: 'width 0.3s ease' }} />
          </div>
        </div>

             {error && (
          <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.8rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.9rem' }}>
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {renderStepContent()}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', gap: '1rem' }}>
            {step > 1 && step < 5 && (
              <button
                type="button"
                onClick={handleBack}
                style={{
                  padding: '0.7rem 1.2rem',
                  background: 'var(--color-card)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Back
              </button>
            )}
            {step === 4 && (
              <button
                type="button"
                onClick={handleSkip}
                style={{
                  padding: '0.7rem 1.2rem',
                  background: 'transparent',
                  color: 'var(--color-text-muted)',
                  border: 'none',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                }}
              >
                Skip for now
              </button>
            )}
            {step < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                style={{
                  padding: '0.7rem 1.5rem',
                  background: 'var(--color-accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginLeft: 'auto',
                }}
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={creating}
                style={{
                  padding: '0.7rem 1.5rem',
                  background: 'var(--color-accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: creating ? 'not-allowed' : 'pointer',
                  opacity: creating ? 0.7 : 1,
                  marginLeft: 'auto',
                }}
              >
                {creating ? 'Creating...' : 'Confirm & Create Business'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

// Reusable styles
const inputStyle = {
  width: '100%',
  padding: '0.7rem',
  border: '1px solid var(--color-border)',
  borderRadius: '6px',
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  fontSize: '0.95rem',
}

// Review row component
function ReviewRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)' }}>
      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{label}</span>
      <span style={{ fontWeight: '500', fontSize: '0.9rem', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  )
            }
