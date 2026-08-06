'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient' // Adjust path if necessary (e.g., '../lib/supabaseClient')

export default function AcceptInvitePage() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleAcceptCode = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    // 1. Verify the code exists and is pending in Supabase
    const { data: inviteData, error: inviteError } = await supabase
      .from('business_invites')
      .select('*')
      .eq('invite_code', code.toUpperCase())
      .eq('status', 'pending')
      .single()

    if (inviteError || !inviteData) {
      setMessage('Invalid or expired invite code.')
      setLoading(false)
      return
    }

    // 2. Get the currently logged-in user accepting the invite
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setMessage('You must be logged in to accept an invite.')
      // Route them to login if needed: router.push('/login')
      setLoading(false)
      return
    }

    // 3. Add the user to the business_users table
    const { error: insertError } = await supabase
      .from('business_users')
      .insert([
        {
          business_id: inviteData.business_id,
          user_id: user.id,
          role: inviteData.role
        }
      ])

    if (insertError) {
      setMessage('Error joining the business. Please try again.')
      setLoading(false)
      return
    }

    // 4. Mark the invite as accepted
    await supabase
      .from('business_invites')
      .update({ status: 'accepted' })
      .eq('id', inviteData.id)

    setMessage('Success! You have joined the business.')
    
    // Redirect to the dashboard after a short delay
    setTimeout(() => {
      router.push('/dashboard')
    }, 2000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white max-w-md w-full rounded-xl shadow-md p-8 border border-gray-100">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">Join a Business</h1>
        <p className="text-center text-gray-600 mb-6">Enter the invite code provided by your manager.</p>
        
        <form onSubmit={handleAcceptCode} className="space-y-4">
          <div>
            <input
              type="text"
              required
              maxLength={6}
              className="w-full text-center text-2xl tracking-widest border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 uppercase"
              placeholder="XXXXXX"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          
          {message && (
            <p className={`text-sm text-center ${message.includes('Success') ? 'text-green-600' : 'text-red-600'}`}>
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1e293b] text-white font-medium rounded-lg px-4 py-3 hover:bg-gray-800 transition-colors disabled:bg-gray-400"
          >
            {loading ? 'Verifying...' : 'Accept Invite'}
          </button>
        </form>
      </div>
    </div>
  )
            }
