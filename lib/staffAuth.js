// lib/staffAuth.js

import { supabase } from './supabaseClient'

/**
 * Get the current user's staff role for a business
 */
export async function getStaffRole(userId, businessId) {
  if (!userId || !businessId) return null

  const { data, error } = await supabase
    .from('staff')
    .select('role, status')
    .eq('user_id', userId)
    .eq('business_id', businessId)
    .single()

  if (error || !data) return null
  if (data.status !== 'active') return null

  return data.role // 'manager' or 'staff'
}

/**
 * Check if a user is the owner of a business
 */
export async function isOwner(userId, businessId) {
  if (!userId || !businessId) return false

  const { data, error } = await supabase
    .from('businesses')
    .select('owner_id')
    .eq('id', businessId)
    .single()

  if (error || !data) return false
  return data.owner_id === userId
}

/**
 * Get the user's role for a business (owner, manager, staff, or null)
 */
export async function getUserRole(userId, businessId) {
  if (!userId || !businessId) return null

  // Check if owner
  const owner = await isOwner(userId, businessId)
  if (owner) return 'owner'

  // Check staff
  const role = await getStaffRole(userId, businessId)
  return role // null, 'manager', or 'staff'
}

/**
 * Check if a user can perform a specific action
 */
export async function canPerformAction(userId, businessId, action) {
  if (!userId || !businessId) return false

  const role = await getUserRole(userId, businessId)
  if (!role) return false

  // Owner can do everything
  if (role === 'owner') return true

  // Permission matrix
  const permissions = {
    manager: {
      'view_dashboard': true,
      'view_customers': true,
      'create_customer': true,
      'edit_customer': true,
      'delete_customer': false,
      'view_orders': true,
      'create_order': true,
      'edit_order': true,
      'delete_order': false,
      'view_jobs': true,
      'create_job': true,
      'edit_job': true,
      'delete_job': false,
      'record_payment': true,
      'send_whatsapp': true,
      'send_reminder': true,
      'view_analytics': true,
      'manage_staff': false,
      'manage_subscription': false,
      'manage_settings': false,
      'view_audit': false,
      'view_staff': false,
    },
    staff: {
      'view_dashboard': true,
      'view_customers': true,
      'create_customer': true,
      'edit_customer': true,
      'delete_customer': false,
      'view_orders': true,
      'create_order': true,
      'edit_order': true,
      'delete_order': false,
      'view_jobs': true,
      'create_job': true,
      'edit_job': true,
      'delete_job': false,
      'record_payment': true,
      'send_whatsapp': false,
      'send_reminder': false,
      'view_analytics': false,
      'manage_staff': false,
      'manage_subscription': false,
      'manage_settings': false,
      'view_audit': false,
      'view_staff': false,
    }
  }

  return permissions[role]?.[action] || false
}

/**
 * Get all staff members for a business
 */
export async function getStaffMembers(businessId) {
  if (!businessId) return []

  const { data, error } = await supabase
    .from('staff')
    .select('*, users:user_id(email)')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (error) return []
  return data || []
}

/**
 * Count active staff for a business (for plan limit enforcement)
 */
export async function getActiveStaffCount(businessId) {
  if (!businessId) return 0

  const { count, error } = await supabase
    .from('staff')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('status', 'active')

  if (error) return 0
  return count || 0
}

/**
 * Check if a business can add more staff
 */
export async function canAddStaff(userId, businessId) {
  if (!userId || !businessId) return false

  // Only owner can add staff
  const owner = await isOwner(userId, businessId)
  if (!owner) return false

  // Get business plan
  const { data: business } = await supabase
    .from('businesses')
    .select('plan')
    .eq('id', businessId)
    .single()

  if (!business) return false

  const plan = business.plan || 'free'
  const limit = getStaffLimit(plan)
  if (limit === 0) return false

  const currentCount = await getActiveStaffCount(businessId)
  return currentCount < limit
        }
