'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)
  const [businessName, setBusinessName] = useState('')
  const [sector, setSector] = useState('Fashion & Custom Wear')
  const [creating, setCreating] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinMessage, setJoinMessage] = useState('')

  // ─── Check if user already has a business ───
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

  // ─── Create new business ───
  const handleCreateBusiness = async (e) => {
    e.preventDefault()
    setCreating(true)
    setError('')

    try {
      // 1. Create the business
      const { data: business, error: bizError } = await supabase
        .from('businesses')
        .insert({
          name: businessName,
          sector: sector,
          owner_id: user.id,
          is_active: true,
          onboarding_completed: true,
          has_completed_onboarding: true,
        })
        .select()
        .single()

      if (bizError) throw bizError

      // 2. Add the owner as a member
      const { error: memberError } = await supabase
        .from('business_memberships')
        .insert({
          business_id: business.id,
          user_id: user.id,
          role: 'Owner',
        })

      if (memberError) throw memberError

      // 3. Log activity
      await supabase.from('business_activity_logs').insert({
        business_id: business.id,
        performed_by: user.id,
        action: 'business_created',
        details: { name: businessName, sector },
      })

      // 4. Redirect to dashboard with business_id
      router.push(`/dashboard?business_id=${business.id}&t=${Date.now()}`)
    } catch (err) {
      console.error('Create business error:', err)
      setError(err.message || 'Failed to create business. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  // ─── Join existing business via invite code ───
  const handleJoinBusiness = async (e) => {
    e.preventDefault()
    setJoining(true)
    setJoinMessage('')
    setError('')

    try {
      // ─── Get the current session ───
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setJoinMessage('❌ You are not logged in.')
        setJoining(false)
        return
      }

      const response = await fetch('/api/team/invites/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ invite_code: inviteCode })
      })

      const result = await response.json()
      if (response.ok && result.redirect) {
        window.location.replace(result.redirect)
      } else {
        setJoinMessage('❌ ' + (result.error || 'Failed to join business'))
      }
    } catch (err) {
      console.error(err)
      setJoinMessage('❌ An unexpected error occurred.')
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--color-text-muted)' }}>Loading...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ maxWidth: '600px', width: '100%', background: 'var(--color-card)', padding: '2.5rem', borderRadius: '12px', boxShadow: 'var(--shadow)', border: '1px solid var(--color-border)' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--color-primary)', marginBottom: '0.25rem' }}>
          Welcome to Cresoa 🎉
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
          Let's set up your workspace for the way your business works.
        </p>

        {error && (
          <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.8rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.9rem' }}>
            ❌ {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* ─── Create Business ─── */}
          <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--color-text)', marginBottom: '0.5rem' }}>
              🚀 Start a new business
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Create a new workspace and become the owner.
            </p>
            <form onSubmit={handleCreateBusiness}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', color: 'var(--color-text-muted)', marginBottom: '0.3rem' }}>
                  Business Name
                </label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g., Crescent Fashion House"
                  style={{
                    width: '100%',
                    padding: '0.7rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    background: 'var(--color-bg)',
                    color: 'var(--color-text)',
                    fontSize: '0.95rem',
                  }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', color: 'var(--color-text-muted)', marginBottom: '0.3rem' }}>
                  Industry
                </label>
                <select
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.7rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    background: 'var(--color-bg)',
                    color: 'var(--color-text)',
                    fontSize: '0.95rem',
                  }}
                >
                  <option value="Fashion & Custom Wear">👗 Fashion & Custom Wear</option>
                  <option value="Repairs & Technical Services">🔧 Repairs & Technical Services</option>
                  <option value="Custom Products & Services">🛠️ Custom Products</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={creating}
                style={{
                  width: '100%',
                  padding: '0.7rem',
                  background: 'var(--color-accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: creating ? 'not-allowed' : 'pointer',
                  opacity: creating ? 0.7 : 1,
                }}
              >
                {creating ? 'Creating...' : 'Create Business'}
              </button>
            </form>
          </div>

          {/* ─── Join Business ─── */}
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--color-text)', marginBottom: '0.5rem' }}>
              🔗 Join an existing business
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Have an invite code? Enter it below to join your team.
            </p>
            <form onSubmit={handleJoinBusiness}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', color: 'var(--color-text-muted)', marginBottom: '0.3rem' }}>
                  Invite Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="e.g., A7X3K9"
                  style={{
                    width: '100%',
                    padding: '0.7rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    background: 'var(--color-bg)',
                    color: 'var(--color-text)',
                    fontSize: '0.95rem',
                    textAlign: 'center',
                    letterSpacing: '0.3rem',
                    fontWeight: '600',
                  }}
                />
              </div>
              {joinMessage && (
                <p style={{ color: joinMessage.includes('Success') ? 'var(--color-success)' : 'var(--color-danger)', marginBottom: '0.8rem', fontSize: '0.9rem' }}>
                  {joinMessage}
                </p>
              )}
              <button
                type="submit"
                disabled={joining}
                style={{
                  width: '100%',
                  padding: '0.7rem',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: joining ? 'not-allowed' : 'pointer',
                  opacity: joining ? 0.7 : 1,
                }}
              >
                {joining ? 'Joining...' : 'Join Business'}
              </button>
            </form>
          </div>
        </div>

        <p style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          Need help? Contact support via the dashboard after you set up.
        </p>
      </div>
    </div>
  )
            }
