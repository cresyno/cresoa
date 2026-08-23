'use client'

import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export function useWorkflowStages(businessId) {
  const [stages, setStages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchStages = async () => {
      if (!businessId) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        
        const res = await fetch(`/api/settings/workflow?business_id=${businessId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        
        if (data.stages && data.stages.length > 0) {
          setStages(data.stages.map(s => s.stage_name))
        } else {
          // Fallback defaults if no custom workflow exists
          setStages(['Order Placed', 'Cutting', 'Sewing', 'Ready for Pickup', 'Delivered'])
        }
      } catch (e) {
        console.error('Error fetching workflow:', e)
        setError(e)
      } finally {
        setLoading(false)
      }
    }
    fetchStages()
  }, [businessId])

  return { stages, loading, error }
}
