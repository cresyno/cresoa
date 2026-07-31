'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../../lib/supabaseClient'
import { isOwner, canPerformAction } from '../../../../../lib/staffAuth'

export default function StaffPage() {
  const router = useRouter()
  const [staff, setStaff] = useState([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('staff')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [businessId, setBusinessId] = useState(null)
  const [isOwnerCheck, setIsOwnerCheck] = useState(false)

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

      // Fetch the user's business (assuming owner; we'll handle staff later)
      const { data: businessData } = await supabase
        .from('businesses')
        .select('id, owner_id')
        .eq('owner_id', user.id)
        .single()

      if (!businessData) {
        setLoading(false)
        return
      }

      setBusinessId(businessData.id)

      // Check if the user is owner (using your existing function)
      const owner = await isOwner(user.id, businessData.id)
      setIsOwnerCheck(owner)

      if (!owner) {
        setLoading(false)
        return // Access denied, we'll show a message
      }

      // Load staff
      const { data: staffData } = await supabase
        .from('staff')
        .select('*, users:user_id(email)')
        .eq('business_id', businessData.id)

      setStaff(staffData || [])
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const inviteStaff = async () => {
    setMessage('')
    const res = await fetch('/api/staff/invite', {
      method: 'POST',
      body: JSON.stringify({ email, role }),
      headers: { 'Content-Type': 'application/json' },
    })
    const data = await res.json()
    if (res.ok) {
      setMessage(`Invitation sent to ${email}`)
      setEmail('')
      loadData() // refresh list
    } else {
      setMessage(`Error: ${data.error || 'Unknown error'}`)
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
    return <div className="p-6">Loading...</div>
  }

  if (!isOwnerCheck) {
    return <div className="p-6">Access Denied. Only business owners can manage staff.</div>
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Staff Management</h1>

      <div className="mb-6 flex gap-4 items-center">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          className="border p-2 rounded"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="staff">Staff</option>
          <option value="manager">Manager</option>
        </select>
        <button
          onClick={inviteStaff}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Invite
        </button>
      </div>
      {message && <p className="text-sm mb-4">{message}</p>}

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2 text-left">Email</th>
            <th className="border p-2 text-left">Role</th>
            <th className="border p-2 text-left">Status</th>
            <th className="border p-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((s) => (
            <tr key={s.id} className="border-b">
              <td className="p-2">{s.users?.email || 'Unknown'}</td>
              <td className="p-2">{s.role}</td>
              <td className="p-2">{s.status}</td>
              <td className="p-2">
                <button
                  onClick={() => removeStaff(s.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
          {staff.length === 0 && (
            <tr>
              <td colSpan="4" className="p-4 text-center text-gray-500">
                No staff members yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
            }
