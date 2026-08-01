// app/dashboard/settings/beta/page.js
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'

export default function BetaManagementPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [invites, setInvites] = useState([])
  const [message, setMessage] = useState('')
  const [isOwner, setIsOwner] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    checkOwnerAndLoad()
  }, [])

  const checkOwnerAndLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: business, error } = await supabase
      .from('businesses')
      .select('owner_id')
      .eq('owner_id', user.id)
      .single()

    if (!business || error) {
      setIsOwner(false)
      setFetching(false)
      return
    }

    setIsOwner(true)
    await loadBetaUsers()
    setFetching(false)
  }

  const loadBetaUsers = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const res = await fetch(`/api/beta/list?accessToken=${session.access_token}`)
    const data = await res.json()
    if (res.ok) {
      setInvites(data.data || [])
    } else {
      console.error('Failed to load beta users:', data.error)
    }
  }

  const inviteBetaUser = async () => {
    if (!email.trim()) {
      setMessage('Please enter an email address')
      return
    }

    setMessage('')
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setMessage('❌ You are not logged in')
        return
      }

      const res = await fetch('/api/beta/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, accessToken: session.access_token }),
      })

      const data = await res.json()
      if (res.ok) {
        setMessage(`✅ Invitation sent to ${email}`)
        setEmail('')
        loadBetaUsers()
      } else {
        setMessage(`❌ ${data.error || 'Failed to send invitation'}`)
      }
    } catch (err) {
      setMessage('❌ Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const removeBetaUser = async (inviteId) => {
    if (!confirm('Remove this beta user? They will lose beta access.')) return

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const res = await fetch('/api/beta/remove', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteId, accessToken: session.access_token }),
    })

    if (res.ok) {
      loadBetaUsers()
    } else {
      const data = await res.json()
      alert('Error: ' + data.error)
    }
  }

  if (fetching) {
    return <div style={{ padding: '2rem' }}>Loading...</div>
  }

  if (!isOwner) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#AE4A34' }}>
        ❌ Access Denied. Only business owners can manage beta users.
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>🧪 Beta Program</h1>
      <p style={{ color: '#6B6255', marginBottom: '1.5rem' }}>
        Invite users to test your business on Cresoa. Beta users get <strong>full Pro access free for 90 days</strong>.
      </p>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          style={{ flex: 1, padding: '0.6rem', border: '1px solid #ccc', borderRadius: '6px', minWidth: '200px' }}
        />
        <button
          onClick={inviteBetaUser}
          disabled={loading}
          style={{
            padding: '0.6rem 1.2rem',
            background: '#1E3A5F',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Sending...' : 'Invite to Beta'}
        </button>
      </div>

      {message && <p style={{ marginBottom: '1rem', color: message.startsWith('✅') ? '#4C7A5E' : '#AE4A34' }}>{message}</p>}

      <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #E8E0D5', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#F5EFE2' }}>
            <tr>
              <th style={{ padding: '0.6rem', textAlign: 'left' }}>Email</th>
              <th style={{ padding: '0.6rem', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '0.6rem', textAlign: 'left' }}>Invited</th>
              <th style={{ padding: '0.6rem', textAlign: 'left' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {invites.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ padding: '1rem', textAlign: 'center', color: '#6B6255' }}>
                  No beta users yet. Invite your first tester!
                </td>
              </tr>
            ) : (
              invites.map((invite) => (
                <tr key={invite.id} style={{ borderTop: '1px solid #E8E0D5' }}>
                  <td style={{ padding: '0.6rem' }}>{invite.email}</td>
                  <td style={{ padding: '0.6rem' }}>
                    <span style={{
                      background: invite.status === 'accepted' ? '#DCEBE2' : '#F6E9C8',
                      color: invite.status === 'accepted' ? '#4C7A5E' : '#B4881E',
                      padding: '0.1rem 0.6rem',
                      borderRadius: '12px',
                      fontSize: '0.7rem',
                      fontWeight: '600',
                    }}>
                      {invite.status === 'accepted' ? '✅ Active' : '⏳ Pending'}
                    </span>
                  </td>
                  <td style={{ padding: '0.6rem', fontSize: '0.8rem', color: '#6B6255' }}>
                    {new Date(invite.invited_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '0.6rem' }}>
                    <button
                      onClick={() => removeBetaUser(invite.id)}
                      style={{ background: 'none', border: 'none', color: '#AE4A34', cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
      }
