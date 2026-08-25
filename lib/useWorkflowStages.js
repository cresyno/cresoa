'use client'

import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export function useWorkflowStages(businessId, fallbackStages = []) {
  const [stages, setStages] = useState(fallbackStages)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchStages = async () => {
      if (!businessId) {
        setStages(fallbackStages) // Use fallback if no business id
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

        // If custom workflow exists, use it. Otherwise, use the passed fallback.
        if (data.stages && data.stages.length > 0) {
          setStages(data.stages.map(s => s.stage_name))
        } else {
          setStages(fallbackStages)
        }
      } catch (e) {
        console.error('Error fetching workflow:', e)
        setStages(fallbackStages) // Fall back on error
        setError(e)
      } finally {
        setLoading(false)
      }
    }
    fetchStages()
    // Include fallbackStages in dependencies so it updates if the industry changes
  }, [businessId, fallbackStages])

  return { stages, loading, error }
}
