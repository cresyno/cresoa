'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'

export default function StaffPage() {
  const router = useRouter()
  const [staff, setStaff] = useState([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('staff')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [isOwner, setIsOwner] = useState(false)
  const [businessId, setBusinessId] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: businessData, error: bizError } = await supabase
        .from('businesses')
        .select('id, owner_id')
        .eq('owner_id', user.id)
        .single()

      if (bizError || !businessData) {
        setIsOwner(false)
        setLoading(false)
        return
      }

      setBusinessId(businessData.id)
      setIsOwner(true)

      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*, users:user_id(email)')
        .eq('business_id', businessData.id)

      if (staffError) {
        console.error('Error loading staff:', staffError)
      } else {
        setStaff(staffData || [])
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const inviteStaff = async () => {
    if (!email.trim()) {
      setMessage('Please enter an email address')
      return
    }

    setMessage('')
    try {
      // Get access token
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        setMessage('❌ You are not logged in. Please refresh and try again.')
        return
      }

      const res = await fetch('/api/staff/invite', {
        method: 'POST',
        body: JSON.stringify({ email, role, accessToken }),
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (res.ok) {
        setMessage(`✅ Invitation sent to ${email}`)
        setEmail('')
        loadData()
      } else {
        setMessage(`❌ Error: ${data.error || 'Unknown error'}`)
      }
    } catch (err) {
      setMessage('❌ Network error. Please try again.')
    }
  }

  const removeStaff = async (id) => {
    if (!confirm('Remove this staff member?')) return
    const res = await fetch('/api/staff/remove', {
      method: 'DELETE',
      body: JSON.stringify({ staffId: id }),
      headers: { 'Content-Type': 'application/json' },
    })
    if (res.ok) {
      loadData()
    } else {
      const data = await res.json()
      alert(`Error: ${data.error}`)
    }
  }

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>
  }

  if (!isOwner) {
    return <div style={{ padding: '2rem' }}>Access Denied. Only business owners can manage staff.</div>
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Staff Management</h1>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          style={{ border: '1px solid #ccc', padding: '0.5rem', borderRadius: '4px', flex: 1 }}
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={{ border: '1px solid #ccc', padding: '0.5rem', borderRadius: '4px' }}
        >
          <option value="staff">Staff</option>
          <option value="manager">Manager</option>
        </select>
        <button
          onClick={inviteStaff}
          style={{ background: '#1E3A5F', color: 'white', padding: '0.5rem 1rem', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Invite
        </button>
      </div>
      {message && <p style={{ marginBottom: '1rem', color: message.startsWith('✅') ? 'green' : 'red' }}>{message}</p>}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Email</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Role</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Status</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((s) => (
            <tr key={s.id} style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: '8px' }}>{s.users?.email || 'Unknown'}</td>
              <td style={{ padding: '8px' }}>{s.role}</td>
              <td style={{ padding: '8px' }}>{s.status}</td>
              <td style={{ padding: '8px' }}>
                <button
                  onClick={() => removeStaff(s.id)}
                  style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
          {staff.length === 0 && (
            <tr>
              <td colSpan="4" style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
                No staff members yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
            }
