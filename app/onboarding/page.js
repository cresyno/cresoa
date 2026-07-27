'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

const SECTOR_INFO = {
  'Fashion & Custom Wear': {
    icon: '👗',
    badgeColor: '#C79A2B',
    benefit: 'The perfect fit for your fashion business',
    description: 'Customers, measurements, orders, payments & production—all in one place.',
    examples: 'Tailors · Fashion Designers · Uniform Makers',
  },
  'Repairs & Technical Services': {
    icon: '🔧',
    badgeColor: '#4C7A5E',
    benefit: 'Track repairs without losing track of devices',
    description: 'Devices, repair jobs, customer updates & payments—never lose a job again.',
    examples: 'Phone Repair · Laptop Repair · Electronics',
  },
  'Custom Products & Services': {
    icon: '🛠️',
    badgeColor: '#1E3A5F',
    benefit: 'Manage custom jobs from order to delivery',
    description: 'Custom orders, deadlines, payments & delivery from one workspace.',
    examples: 'Furniture · Shoemaking · Aluminium & Glass · Welding',
  },
}

export default function OnboardingPage() {
  const router = useRouter()
  const [categories, setCategories] = useState([])
  const [businessId, setBusinessId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState('sector')
  const [waitlisted, setWaitlisted] = useState(false)
  const [selectedSector, setSelectedSector] = useState(null)
  const [userId, setUserId] = useState(null)

  const [businessName, setBusinessName] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [location, setLocation] = useState('')
  const [saving, setSaving] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUserId(user.id)

      const { data: business } = await supabase
        .from('businesses')
        .select('id, onboarding_completed, name, phone, sector')
        .eq('owner_id', user.id)
        .single()

      if (business?.onboarding_completed) {
        router.push('/dashboard')
        return
      }

      if (business) {
        setBusinessId(business.id)
        setBusinessName(business.name || '')
        setPhone(business.phone || '')
        setWhatsapp(business.phone || '')
        if (business.sector) {
          setSelectedSector(business.sector)
          setStep('profile')
        }
      }

      const { data: catData } = await supabase
        .from('business_categories')
        .select('*')
      setCategories(catData || [])
      setLoading(false)
    }
    load()
  }, [router])

  const handleSelectSector = async (sector, isActive) => {
    setSaving(true)
    setSelectedSector(sector)

    if (!businessId) {
      const { data: newBusiness, error } = await supabase
        .from('businesses')
        .insert({
          owner_id: userId,
          name: businessName || 'My Business',
          sector: sector,
          business_type: isActive ? 'Fashion Designer' : sector,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating business:', error)
        setSaving(false)
        return
      }
      setBusinessId(newBusiness.id)
      setBusinessName(newBusiness.name || '')

      if (isActive) {
        setStep('profile')
      } else {
        setWaitlisted(true)
      }
      setSaving(false)
      return
    }

    await supabase
      .from('businesses')
      .update({
        sector: sector,
        business_type: isActive ? 'Fashion Designer' : sector,
      })
      .eq('id', businessId)

    setSaving(false)
    if (isActive) {
      setStep('profile')
    } else {
      setWaitlisted(true)
    }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setProfileMessage('')

    const phoneDigits = phone.replace(/\D/g, '')
    if (!businessName.trim() || phoneDigits.length !== 11 || !location.trim()) {
      setProfileMessage('Please fill in your business name, an 11-digit phone number, and location.')
      return
    }

    setSaving(true)

    if (!businessId) {
      const { data: newBusiness, error } = await supabase
        .from('businesses')
        .insert({
          owner_id: userId,
          name: businessName.trim(),
          phone: phoneDigits,
          whatsapp: whatsapp ? whatsapp.replace(/\D/g, '') : phoneDigits,
          location: location.trim(),
          sector: selectedSector || 'Fashion & Custom Wear',
          onboarding_completed: true,
        })
        .select()
        .single()

      if (error) {
        setProfileMessage('Error: ' + error.message)
        setSaving(false)
        return
      }
      setBusinessId(newBusiness.id)
      router.push('/dashboard')
      return
    }

    const { error } = await supabase
      .from('businesses')
      .update({
        name: businessName.trim(),
        phone: phoneDigits,
        whatsapp: whatsapp ? whatsapp.replace(/\D/g, '') : phoneDigits,
        location: location.trim(),
        onboarding_completed: true,
      })
      .eq('id', businessId)

    if (error) {
      setProfileMessage('Error: ' + error.message)
      setSaving(false)
      return
    }

    router.push('/dashboard')
  }

  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
    setPhone(digits)
    if (!whatsapp || whatsapp === phone) {
      setWhatsapp(digits)
    }
  }

  const handleWhatsAppChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
    setWhatsapp(digits)
  }

  const inputStyle = {
    width: '100%', padding: '0.7rem', borderRadius: '8px',
    border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box',
  }
  const labelStyle = {
    display: 'block', color: '#2B2620', marginBottom: '0.4rem', fontSize: '0.9rem',
  }

  const welcomeStyles = `
    @keyframes fadeSlideUp {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-in { animation: fadeSlideUp 0.6s ease-out both; }
    .animate-in-delay { animation: fadeSlideUp 0.6s ease-out 0.15s both; }
    .sector-card {
      transition: all 0.2s ease;
      background: #fff;
      border-radius: 14px;
      padding: 1.2rem;
      border: 2px solid transparent;
      margin-bottom: 0.8rem;
      cursor: pointer;
      text-align: left;
      width: 100%;
      box-shadow: 0 2px 8px rgba(30,58,95,0.04);
    }
    .sector-card:hover {
      border-color: #C79A2B;
      box-shadow: 0 4px 16px rgba(199,154,43,0.15);
      transform: translateY(-2px);
    }
    .sector-card:active { transform: scale(0.98); }
    .sector-card .icon { font-size: 1.8rem; display: block; margin-bottom: 0.4rem; }
    .sector-card .badge {
      display: inline-block;
      padding: 0.1rem 0.6rem;
      border-radius: 12px;
      font-size: 0.6rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: #F6E9C8;
      color: #1E3A5F;
      margin-bottom: 0.4rem;
    }
    .sector-card .benefit {
      font-size: 0.85rem;
      font-weight: 700;
      color: #1E3A5F;
      margin: 0.2rem 0 0.3rem;
    }
    .sector-card .desc { font-size: 0.82rem; color: #6B6255; margin: 0 0 0.3rem; }
    .sector-card .examples { font-size: 0.72rem; color: #A89888; margin: 0; }
    .step-indicator {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      justify-content: center;
    }
    .step-dot {
      width: 8px; height: 8px; border-radius: 50%; background: #E8E0D5;
      transition: background 0.3s ease;
    }
    .step-dot.active { background: #C79A2B; width: 12px; height: 12px; }
    .step-dot.done { background: #4C7A5E; }
    .step-line {
      width: 24px; height: 2px; background: #E8E0D5; flex-shrink: 0;
    }
    .step-line.done { background: #4C7A5E; }
  `

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: '#F5EFE2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          .cresoa-spinner {
            width: 40px; height: 40px;
            border: 4px solid #e4d8c2;
            border-top: 4px solid #1E3A5F;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
        `}</style>
        <div className="cresoa-spinner"></div>
        <p style={{ color: '#6B6255', fontSize: '0.85rem', marginTop: '1rem' }}>Setting up your workspace...</p>
      </main>
    )
  }

  if (waitlisted) {
    return (
      <main style={{ minHeight: '100vh', background: '#F5EFE2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', textAlign: 'center' }}>
        <style>{welcomeStyles}</style>
        <div className="animate-in" style={{ maxWidth: '360px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎉</div>
          <h1 style={{ color: '#1E3A5F', fontSize: '1.4rem', marginBottom: '0.6rem' }}>You're on the early list!</h1>
          <p style={{ color: '#2B2620', fontSize: '0.95rem', marginBottom: '0.4rem' }}>
            We're building tools for your business type next.
          </p>
          <p style={{ color: '#6B6255', fontSize: '0.85rem', marginBottom: '1.8rem' }}>
            We'll notify you as soon as it's ready.
          </p>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
            style={{ padding: '0.7rem 1.4rem', borderRadius: '8px', border: '1px solid #1E3A5F', background: '#fff', color: '#1E3A5F', fontSize: '0.9rem', fontWeight: '600' }}
          >
            Log out
          </button>
        </div>
      </main>
    )
  }

  if (step === 'profile') {
    return (
      <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '2rem 1.5rem' }}>
        <style>{welcomeStyles}</style>
        <div style={{ maxWidth: '400px', margin: '0 auto' }}>
          <div className="step-indicator">
            <span className="step-dot done"></span>
            <span className="step-line done"></span>
            <span className="step-dot active"></span>
          </div>
          <h1 className="animate-in" style={{ color: '#1E3A5F', fontSize: '1.4rem', marginBottom: '0.3rem' }}>
            Complete your workspace
          </h1>
          <p className="animate-in-delay" style={{ color: '#6B6255', fontSize: '0.9rem', marginBottom: '1.2rem' }}>
            {selectedSector ? `Almost there, ${selectedSector} business owner!` : 'Just a few details before your dashboard is ready.'}
          </p>
          <form onSubmit={handleSaveProfile} className="animate-in-delay" style={{ background: '#fff', borderRadius: '14px', padding: '1.5rem', border: '1px solid #e4d8c2', boxShadow: '0 4px 12px rgba(30,58,95,0.06)' }}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Business name</label>
              <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required style={inputStyle} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Phone number</label>
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={handlePhoneChange}
                required
                placeholder="e.g. 08012345678"
                style={inputStyle}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.3rem' }}>
                <span style={{ fontSize: '0.75rem', color: phone.length === 11 ? '#4C7A5E' : '#6B6255' }}>
                  {phone.length}/11 digits
                </span>
                {phone.length === 11 && (
                  <span style={{ fontSize: '0.7rem', background: '#DCEBE2', color: '#4C7A5E', padding: '0.1rem 0.5rem', borderRadius: '10px' }}>✓ valid</span>
                )}
              </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>WhatsApp number <span style={{ fontWeight: '400', color: '#6B6255' }}>(optional)</span></label>
              <input
                type="tel"
                inputMode="numeric"
                value={whatsapp}
                onChange={handleWhatsAppChange}
                placeholder="If different from phone"
                style={inputStyle}
              />
              <p style={{ fontSize: '0.7rem', color: '#A89888', marginTop: '0.2rem' }}>
                {whatsapp ? `✓ WhatsApp number set` : 'We\'ll use your phone number if left blank.'}
              </p>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle}>Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                placeholder="e.g. Ibadan, Oyo State"
                style={inputStyle}
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              style={{
                width: '100%', padding: '0.8rem', borderRadius: '8px',
                border: 'none', background: 'linear-gradient(135deg, #C79A2B, #B4881E)',
                color: '#1E3A5F', fontSize: '1rem', fontWeight: '700',
                boxShadow: '0 4px 14px rgba(199,154,43,0.3)',
                transition: 'transform 0.1s ease',
              }}
            >
              {saving ? 'Saving...' : '🚀 Enter my dashboard'}
            </button>
            {profileMessage && (
              <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#AE4A34', textAlign: 'center' }}>
                {profileMessage}
              </p>
            )}
          </form>
        </div>
      </main>
    )
  }

  // Sector selection
  const activeSector = categories.find(c => c.is_active)

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '2rem 1.5rem' }}>
      <style>{welcomeStyles}</style>
      <div style={{ maxWidth: '400px', margin: '0 auto' }}>
        <div className="step-indicator">
          <span className="step-dot active"></span>
          <span className="step-line"></span>
          <span className="step-dot"></span>
        </div>
        <div className="animate-in">
          <h1 style={{ color: '#1E3A5F', fontSize: '1.5rem', marginBottom: '0.2rem' }}>Welcome to Cresoa 👋</h1>
          <p style={{ color: '#6B6255', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            Let's set up your workspace for the way your business works.
          </p>
          {activeSector && (
            <p style={{ color: '#C79A2B', fontSize: '0.8rem', fontWeight: '500' }}>
              ✨ Currently serving: {activeSector.sector} businesses
            </p>
          )}
        </div>
        <div className="animate-in-delay" style={{ marginTop: '1.2rem' }}>
          {categories.map((c) => {
            const info = SECTOR_INFO[c.sector]
            const isActive = c.is_active
            return (
              <button
                key={c.sector}
                onClick={() => handleSelectSector(c.sector, isActive)}
                disabled={saving}
                className="sector-card"
                style={{
                  borderColor: isActive ? '#C79A2B' : 'transparent',
                  background: isActive ? '#FBF8F0' : '#fff',
                  opacity: saving ? '0.7' : '1',
                  cursor: saving ? 'default' : 'pointer',
                }}
              >
                <span className="icon">{info?.icon || '📌'}</span>
                <span className="badge" style={{ background: info?.badgeColor || '#1E3A5F', color: '#fff' }}>
                  {isActive ? '✓ Live Now' : 'Coming Soon'}
                </span>
                <p className="benefit">{info?.benefit || c.sector}</p>
                <p className="desc">{info?.description}</p>
                <p className="examples">{info?.examples}</p>
                {isActive && (
                  <div style={{ marginTop: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: '#C79A2B', fontWeight: '600' }}>
                    <span>→</span> Select this to continue
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </main>
  )
      }
