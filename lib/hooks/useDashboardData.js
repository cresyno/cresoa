import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { normalizeOrder, normalizeCustomer, normalizeGroup } from '../normalizers'

export function useDashboardData(businessId) {
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [groups, setGroups] = useState([])
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const load = async (silent = false) => {
    if (!businessId) {
      setLoading(false)
      return
    }

    try {
      if (silent) setRefreshing(true)
      else setLoading(true)
      setError('')

      const [businessRes, ordersRes, customersRes, groupsRes] = await Promise.all([
        supabase.from('businesses').select('*').eq('id', businessId).maybeSingle(),
        supabase.from('orders').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
        supabase.from('customers').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
        supabase.from('group_orders').select('*').eq('business_id', businessId).order('created_at', { ascending: false })
      ])

      if (businessRes.error) throw businessRes.error
      if (ordersRes.error) throw ordersRes.error
      if (customersRes.error) throw customersRes.error
      if (groupsRes.error) throw groupsRes.error

      setBusiness(businessRes.data || null)
      setOrders((ordersRes.data || []).map(normalizeOrder))
      setCustomers((customersRes.data || []).map(normalizeCustomer))
      setGroups((groupsRes.data || []).map(normalizeGroup))
    } catch (err) {
      console.error('Dashboard data error:', err)
      setError(err?.message || 'Unable to load data.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    load()
  }, [businessId])

  return { orders, customers, groups, business, loading, refreshing, error, refresh: () => load(true) }
                  }
