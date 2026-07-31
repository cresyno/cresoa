// lib/staffAuth.js
import { supabase } from './supabaseClient';

/**
 * Get the user's role for a specific business.
 * Returns 'owner', 'manager', 'staff', or null if no access.
 */
export async function getStaffRole(userId, businessId) {
  // Check if user is the owner
  const { data: business } = await supabase
    .from('businesses')
    .select('owner_id')
    .eq('id', businessId)
    .single();

  if (business && business.owner_id === userId) {
    return 'owner';
  }

  // Check staff table
  const { data: staff } = await supabase
    .from('staff')
    .select('role, status')
    .eq('user_id', userId)
    .eq('business_id', businessId)
    .maybeSingle();

  if (staff && staff.status === 'active') {
    return staff.role; // 'manager' or 'staff'
  }

  return null; // no access
}

/**
 * Check if a user can perform a specific action.
 */
export async function canPerformAction(userId, businessId, action) {
  const role = await getStaffRole(userId, businessId);
  if (!role) return false;

  // Owner can do everything
  if (role === 'owner') return true;

  // Manager permissions (according to the matrix)
  const managerAllowed = [
    'view_dashboard',
    'view_customers',
    'create_customer',
    'edit_customer',
    'view_orders',
    'create_order',
    'edit_order',
    'record_payments',
    'send_whatsapp',
    'send_reminders',
    'view_analytics',
    // but NOT: delete_customer, delete_order, manage_staff, manage_subscription, change_settings, data_export
  ];
  if (role === 'manager') {
    // Check if action is in the allowed list
    return managerAllowed.includes(action);
  }

  // Staff permissions (more limited)
  const staffAllowed = [
    'view_dashboard',
    'view_customers',
    'create_customer',
    'edit_customer',
    'view_orders',
    'create_order',
    'edit_order',
    'record_payments',
    // but NOT: delete, send_whatsapp, send_reminders, view_analytics, manage_staff, etc.
  ];
  if (role === 'staff') {
    return staffAllowed.includes(action);
  }

  return false;
}

/**
 * Get count of active staff (excluding owner) for a business.
 */
export async function getActiveStaffCount(businessId) {
  const { count, error } = await supabase
    .from('staff')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('status', 'active');

  if (error) return 0;
  return count || 0;
}

/**
 * Check if a business can add more staff based on plan limit.
 */
export async function canAddStaff(businessId, planId) {
  const currentCount = await getActiveStaffCount(businessId);
  const limits = getPlanLimits(planId); // you need to import getPlanLimits
  const maxStaff = limits.staff_accounts || 0;
  return currentCount < maxStaff;
}

/**
 * Check if a user is the owner of a business.
 */
export async function isOwner(userId, businessId) {
  const { data } = await supabase
    .from('businesses')
    .select('owner_id')
    .eq('id', businessId)
    .single();
  return data?.owner_id === userId;
}

/**
 * Get the business ID for a staff member (by user ID).
 * Returns null if not a staff member.
 */
export async function getStaffBusinessId(userId) {
  const { data } = await supabase
    .from('staff')
    .select('business_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();
  return data?.business_id || null;
}
