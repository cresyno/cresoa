'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function TeamPage() {
  const [team, setTeam] = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('Staff')

  // Fetch team members when the page loads
  useEffect(() => {
    fetchTeamMembers()
  }, [])

  const fetchTeamMembers = async () => {
    setLoading(true)
    // TODO: Replace 'business_users' with your exact Supabase table name linking users to businesses
    const { data, error } = await supabase
      .from('business_users')
      .select(`
        id,
        role,
        users ( id, email, full_name )
      `)
      
    if (error) {
      console.error('Error fetching team:', error)
    } else {
      setTeam(data || [])
    }
    setLoading(false)
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    // Here we will add the Supabase Edge Function or insert logic to invite a user
    console.log(`Inviting ${inviteEmail} as ${inviteRole}`)
    alert(`Invite sent to ${inviteEmail}!`)
    setInviteEmail('')
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team & Staff</h1>
          <p className="text-gray-600 mt-1">Manage who has access to this business.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Team List */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Current Members</h2>
          
          {loading ? (
            <p className="text-gray-500 animate-pulse">Loading team...</p>
          ) : team.length === 0 ? (
            <p className="text-gray-500">You are the only member of this business.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {team.map((member) => (
                <div key={member.id} className="py-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">{member.users?.full_name || 'Unknown User'}</p>
                    <p className="text-sm text-gray-500">{member.users?.email}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    member.role === 'Owner' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Invite Form */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 h-fit">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Invite New Staff</h2>
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="staff@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
              >
                <option value="Staff">Staff (Limited Access)</option>
                <option value="Manager">Manager (Full Access)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-[#1e293b] text-white font-medium rounded-lg px-4 py-2.5 hover:bg-gray-800 transition-colors"
            >
              Send Invite
            </button>
          </form>
        </div>

      </div>
    </div>
  )
                      }
