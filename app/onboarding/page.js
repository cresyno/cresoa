'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function OnboardingPage() {
  const router = useRouter()
  const [categories, setCategories] = useState([])
  const [selectedSector, setSelectedSector] = useState(null)
  const [businessId, setBusinessId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [waitlisted, setWaitlisted] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: business } = await supabase
        .from('businesses')
        .select('id, onboarding_completed')
        .eq('owner_id', user.id)
        .single()

      if (business?.onboarding_completed) {
        router.push('/dashboard')
        return
      }

      setBusinessId(business?.id)

      const { data: catData } = await supabase
        .from('business_categories')
        .select('*')
        .order('sector')

      setCategories(catData || [])
      setLoading(false)
    }

    load()
  }, [router])

  const sectors = [...new Set(categories.map((c) => c.sector))]
  const subTypesForSector = categories.filter((c) => c.sector === selectedSector)

  const handleSelectSubType = async (subType, isActive) => {
    setSaving(true)

    await supabase
      .from('businesses')
      .update({
        sector: selectedSector,
        business_type: subType,
        onboarding_completed: isActive,
      })
      .eq('id', businessId)

    setSaving(false)

    if (isActive) {
      router.push('/dashboard')
    } else {
      setWaitlisted(true)
    }
  }

  const cardStyle = {
    background: '#fff', borderRadius: '12px', padding: '1rem 1.2rem',
    border: '1px solid #e4d8c2', marginBottom: '0.7rem', width: '100%',
    textAlign: 'left', fontSize: '0.95rem', fontWeight: '600', color: '#1E3A5F',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  }

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
            We're building tools for your business type next. We'll notify you as soon as it's ready — this could take a few weeks to a few months.
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

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '400px', margin: '0 auto' }}>
        {selectedSector ? (
          <>
            <button
              onClick={() => setSelectedSector(null)}
              style={{ background: 'none', border: 'none', color: '#1E3A5F', fontSize: '0.85rem', padding: 0, marginBottom: '1rem' }}
            >
              ← Back
            </button>
            <h1 style={{ color: '#1E3A5F', fontSize: '1.4rem', marginBottom: '0.3rem' }}>{selectedSector}</h1>
            <p style={{ color: '#6B6255', fontSize: '0.9rem', marginBottom: '1.5rem' }}>What best describes what you do?</p>

            {subTypesForSector.map((c) => (
              <button
                key={c.sub_type}
                onClick={() => handleSelectSubType(c.sub_type, c.is_active)}
                disabled={saving}
                style={cardStyle}
              >
                {c.sub_type}
                <span style={{ fontSize: '0.75rem', color: c.is_active ? '#4C7A5E' : '#C79A2B', fontWeight: '600' }}>
                  {c.is_active ? 'Ready →' : 'Coming soon'}
                </span>
              </button>
            ))}
          </>
        ) : (
          <>
            <h1 style={{ color: '#1E3A5F', fontSize: '1.5rem', marginBottom: '0.3rem' }}>Welcome to Cresoa</h1>
            <p style={{ color: '#6B6255', fontSize: '0.9rem', marginBottom: '1.5rem' }}>What kind of business do you run?</p>

            {sectors.map((sector) => (
              <button key={sector} onClick={() => setSelectedSector(sector)} style={cardStyle}>
                {sector}
                <span style={{ color: '#C79A2B' }}>→</span>
              </button>
            ))}
          </>
        )}
      </div>
    </main>
  )
        }
