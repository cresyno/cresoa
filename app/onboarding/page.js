'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

const SECTOR_INFO = {
  'Fashion & Custom Wear': {
    icon: '👔',
    description: 'Manage customers, measurements, orders, payments and production in one place.',
    examples: 'Tailors · Fashion Designers · Uniform Makers',
  },
  'Repairs & Technical Services': {
    icon: '🔧',
    description: 'Track devices, repair jobs, customer updates and payments without losing anything.',
    examples: 'Phone Repair · Laptop Repair · Electronics Repair',
  },
  'Custom Products & Services': {
    icon: '🛠️',
    description: 'Manage custom jobs, deadlines, payments and delivery from one workspace.',
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

      const { data: business } = await supabase
        .from('businesses')
        .select('id, onboarding_completed, name')
        .eq('owner_id', user.id)
        .single()

      if (business?.onboarding_completed) {
        router.push('/dashboard')
        return
      }

      setBusinessId(business?.id)
      setBusinessName(business?.name || '')

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

    if (!businessName.trim() || phone.length !== 11 || !location.trim()) {
      setProfileMessage('Please fill in your business name, an 11-digit phone number, and location.')
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('businesses')
      .update({
        name: businessName,
        phone: phone,
        whatsapp: whatsapp || phone,
        location: location,
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
    setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))
  }

  const inputStyle = {
    width: '100%', padding: '0.7rem', borderRadius: '8px',
    border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box'
  }
  const labelStyle = { display: 'block', color: '#2B2620', marginBottom: '0.4rem', fontSize: '0.9rem' }

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
      </main>
    )
  }

  if (waitlisted) {
    return (
      <main style={{ minHeight: '100vh', background: '#F5EFE2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '360px' }}>
          <h1 style={{ color: '#1E3A5F', fontSize: '1.3rem', marginBottom: '0.8rem' }}>You're on the early list! 🎉</h1>
          <p style={{ color: '#2B2620', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
            We're building tools for your business type next. We'll notify you as soon as it's ready.
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
        <div style={{ maxWidth: '400px', margin: '0 auto' }}>
          <h1 style={{ color: '#1E3A5F', fontSize: '1.4rem', marginBottom: '0.3rem' }}>Complete your workspace</h1>
          <p style={{ color: '#6B6255', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Just a few details before your dashboard is ready.
          </p>

          <form onSubmit={handleSaveProfile} style={{ background: '#fff', borderRadius: '14px', padding: '1.5rem', border: '1px solid #e4d8c2' }}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Business name</label>
              <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required style={inputStyle} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Phone number</label>
              <input type="tel" inputMode="numeric" value={phone} onChange={handlePhoneChange} required placeholder="e.g. 08012345678" style={inputStyle} />
              <p style={{ fontSize: '0.78rem', color: phone.length === 11 ? '#4C7A5E' : '#6B6255', marginTop: '0.3rem' }}>{phone.length}/11 digits</p>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>WhatsApp number (optional, if different)</label>
              <input type="tel" inputMode="numeric" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, '').slice(0, 11))} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle}>Location</label>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} required placeholder="e.g. Ibadan, Oyo State" style={inputStyle} />
            </div>

            <button type="submit" disabled={saving} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: 'none', background: '#1E3A5F', color: '#fff', fontSize: '1rem', fontWeight: '600' }}>
              {saving ? 'Saving...' : 'Enter my dashboard'}
            </button>

            {profileMessage && (
              <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#AE4A34' }}>{profileMessage}</p>
            )}
          </form>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '400px', margin: '0 auto' }}>
        <h1 style={{ color: '#1E3A5F', fontSize: '1.5rem', marginBottom: '0.3rem' }}>Welcome to Cresoa 👋</h1>
        <p style={{ color: '#6B6255', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Let's set up your workspace for the way your business works.
        </p>

        {categories.map((c) => (
          <button
            key={c.sector}
            onClick={() => handleSelectSector(c.sector, c.is_active)}
            disabled={saving}
            style={{
              width: '100%', textAlign: 'left', background: '#fff', borderRadius: '14px',
              padding: '1.2rem', border: '1px solid #e4d8c2', marginBottom: '0.8rem'
            }}
          >
            <p style={{ margin: '0 0 0.4rem', fontSize: '1.05rem', fontWeight: '700', color: '#1E3A5F' }}>
              {SECTOR_INFO[c.sector]?.icon} {c.sector}
            </p>
            <p style={{ margin: '0 0 0.4rem', fontSize: '0.85rem', color: '#2B2620' }}>
              {SECTOR_INFO[c.sector]?.description}
            </p>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#6B6255' }}>
              {SECTOR_INFO[c.sector]?.examples}
            </p>
          </button>
        ))}
      </div>
    </main>
  )
    }
