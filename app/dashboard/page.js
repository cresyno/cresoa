'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../lib/getBusinessId'

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const redirect = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // ─── Get business ID from URL or localStorage ───
      const businessId = getCurrentBusinessId();
      let businessData = null;

      if (businessId) {
        const { data, error } = await supabase
          .from('businesses')
          .select('sector')
          .eq('id', businessId)
          .maybeSingle();
        if (data && !error) {
          businessData = data;
        }
      }

      // ─── Fallback to owned business ───
      if (!businessData) {
        const { data, error } = await supabase
          .from('businesses')
          .select('sector')
          .eq('owner_id', user.id)
          .single();
        if (error || !data) {
          router.push('/onboarding')
          return
        }
        businessData = data;
      }

      const sectorMap = {
        'Fashion & Custom Wear': '/dashboard/fashion',
        'Repairs & Technical Services': '/dashboard/repairs',
        'Custom Products & Services': '/dashboard/manufacturing',
      }

      const basePath = sectorMap[businessData.sector] || '/dashboard/fashion';
      const redirectUrl = businessId ? `${basePath}?business_id=${businessId}` : basePath;
      router.push(redirectUrl);
    }

    redirect()
  }, [router, searchParams])

  // Loading spinner (same as before)
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
