'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const redirect = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: business, error } = await supabase
        .from('businesses')
        .select('sector')
        .eq('owner_id', user.id)
        .single()

      if (error || !business) {
        router.push('/onboarding')
        return
      }

      const sectorMap = {
        'Fashion & Custom Wear': '/dashboard/fashion',
        'Repairs & Technical Services': '/dashboard/repairs',
        'Custom Products & Services': '/dashboard/manufacturing',
      }

      router.push(sectorMap[business.sector] || '/dashboard/fashion')
    }

    redirect()
  }, [router])

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#F5EFE2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          .spinner {
            width: 40px; height: 40px;
            border: 4px solid #e4d8c2;
            border-top: 4px solid #1E3A5F;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
        `}</style>
        <div className="spinner"></div>
        <p style={{ color: '#6B6255', fontSize: '0.9rem' }}>Loading your dashboard...</p>
      </div>
    )
  }

  return null
}
