// lib/auditLog.js

import { supabase } from './supabaseClient'

/**
 * Log a change to the audit log
 */
export async function logChange({
  businessId,
  userId,
  userEmail,
  userRole,
  action,
  resourceType,
  resourceId,
  resourceName,
  changes = [],
  metadata = {},
}) {
  if (!businessId || !userId) return

  // Only log if user is staff (not owner)
  if (userRole === 'owner') return

  // Don't log if no changes
  if (changes.length === 0) return

  // Clean changes: remove empty values
  const cleanedChanges = changes.filter(c => c.old !== c.new)

  if (cleanedChanges.length === 0) return

  await supabase.from('audit_log').insert({
    business_id: businessId,
    user_id: userId,
    user_email: userEmail || null,
    user_role: userRole || null,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    resource_name: resourceName || null,
    changes: cleanedChanges,
    metadata: metadata,
  })
}

/**
 * Build changes object by comparing old and new data
 */
export function buildChanges(oldData, newData, fields) {
  const changes = []
  for (const field of fields) {
    const oldValue = oldData[field] ?? ''
    const newValue = newData[field] ?? ''
    if (oldValue !== newValue) {
      changes.push({
        field,
        old: oldValue,
        new: newValue,
      })
    }
  }
  return changes
}

/**
 * Fetch audit logs for a business
 */
export async function getAuditLogs(businessId, filters = {}) {
  let query = supabase
    .from('audit_log')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (filters.resourceType) {
    query = query.eq('resource_type', filters.resourceType)
  }
  if (filters.userId) {
    query = query.eq('user_id', filters.userId)
  }
  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate)
  }
  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate)
  }
  if (filters.limit) {
    query = query.limit(filters.limit)
  }
  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1)
  }

  const { data, error } = await query
  if (error) return []
  return data || []
      }
