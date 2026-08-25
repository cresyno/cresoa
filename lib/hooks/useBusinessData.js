'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { FREE_TRIAL_DAYS } from '../planLimits'

export function useBusinessData(router, searchParams) {
  const [user, setUser] = useState(null)
  const [business, setBusiness] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) {
          router.push('/login')
          return
        }
        setUser(authUser)

        const businessIdFromUrl = searchParams?.get('business_id')
        let businessData = null

        if (businessIdFromUrl) {
          const { data: business, error } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', businessIdFromUrl)
            .maybeSingle()
          if (business && !error) businessData = business
        }

        if (!businessData) {
          const { data: ownedBusiness } = await supabase
            .from('businesses')
            .select('*')
            .eq('owner_id', authUser.id)
            .maybeSingle()
          if (ownedBusiness) {
            businessData = ownedBusiness
          } else {
            const { data: membershipData } = await supabase
              .from('business_memberships')
              .select('business_id, role')
              .eq('user_id', authUser.id)
              .maybeSingle()
            if (membershipData) {
              const { data: memberBusiness } = await supabase
                .from('businesses')
                .select('*')
                .eq('id', membershipData.business_id)
                .maybeSingle()
              if (memberBusiness) {
                businessData = memberBusiness
                setUserRole(membershipData.role)
              }
            }
          }
        }

        if (!businessData) {
          router.push('/onboarding')
          return
        }

        if (!userRole) {
          const { data: roleData } = await supabase
            .from('business_memberships')
            .select('role')
            .eq('business_id', businessData.id)
            .eq('user_id', authUser.id)
            .maybeSingle()
          if (roleData) {
            setUserRole(roleData.role)
          } else if (businessData.owner_id === authUser.id) {
            setUserRole('Owner')
          } else {
            setUserRole('Staff')
          }
        }

        if (businessData.plan === 'beta' && businessData.beta_expires_at) {
          const betaExpiry = new Date(businessData.beta_expires_at)
          const now = new Date()
          if (betaExpiry < now) {
            await supabase
              .from('businesses')
              .update({ plan: 'free', plan_status: 'expired' })
              .eq('id', businessData.id)
            businessData.plan = 'free'
            businessData.plan_status = 'expired'
          }
        }

        if (!businessData.trial_ends_at) {
          const trialEndsAt = new Date()
          trialEndsAt.setDate(trialEndsAt.getDate() + FREE_TRIAL_DAYS)
          await supabase
            .from('businesses')
            .update({
              trial_ends_at: trialEndsAt.toISOString(),
              trial_starts_at: new Date().toISOString(),
            })
            .eq('id', businessData.id)
          businessData.trial_ends_at = trialEndsAt.toISOString()
        }

        const now = new Date()
        if (businessData.plan !== 'free' && businessData.plan !== 'beta' && businessData.subscription_expires_at) {
          const expiresAt = new Date(businessData.subscription_expires_at)
          if (expiresAt < now) {
            await supabase
              .from('businesses')
              .update({ plan: 'free', plan_status: 'expired' })
              .eq('id', businessData.id)
            businessData.plan = 'free'
            businessData.plan_status = 'expired'
          }
        }

        setBusiness(businessData)

        if (!businessIdFromUrl && businessData) {
          const url = new URL(window.location.href)
          url.searchParams.set('business_id', businessData.id)
          window.history.replaceState({}, '', url.toString())
        }
      } catch (error) {
        console.error('Dashboard layout error:', error)
        router.push('/onboarding')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [router, searchParams])

  return { user, business, userRole, loading }
            }
