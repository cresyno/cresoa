// lib/planLimits.js

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'NGN',

    limits: {
      customers: 20,
      orders: 50,
      groups: 0,
      tracking_links: false,
      whatsapp_reminders: false,
      automatic_reminders: false,
      basic_analytics: false,
      advanced_reports: false,
      priority_support: false,
      bulk_actions: false,
      staff_accounts: 0,
      custom_branding: false,
      data_export: false,
      api_access: false,
    },

    features: [
      'Basic customer management (20 customers)',
      'Basic order tracking (50 orders)',
      'Payment recording',
      'Dashboard access',
      'Customer measurements (Fashion)',
      'Production tracking',
    ],

    badge: null,
  },

  starter: {
    id: 'starter',
    name: 'Starter',
    price: 5000,
    currency: 'NGN',

    limits: {
      customers: Infinity,
      orders: Infinity,
      groups: Infinity,
      tracking_links: true,
      whatsapp_reminders: true,
      automatic_reminders: true,
      basic_analytics: true,
      advanced_reports: false,
      priority_support: false,
      bulk_actions: false,
      staff_accounts: 2,
      custom_branding: false,
      data_export: false,
      api_access: false,
    },

    features: [
      'Everything in Free',
      'Unlimited customers',
      'Unlimited orders',
      'Group orders (Aso-Ebi)',
      'Customer tracking links',
      'WhatsApp notifications',
      'Automatic reminders',
      'Basic analytics',
      '2 staff accounts',
    ],

    badge: 'Popular',
  },

  pro: {
    id: 'pro',
    name: 'Pro',
    price: 10000,
    currency: 'NGN',

    limits: {
      customers: Infinity,
      orders: Infinity,
      groups: Infinity,
      tracking_links: true,
      whatsapp_reminders: true,
      automatic_reminders: true,
      basic_analytics: true,
      advanced_reports: true,
      priority_support: true,
      bulk_actions: true,
      staff_accounts: 10,
      custom_branding: true,
      data_export: true,
      api_access: true,
    },

    features: [
      'Everything in Starter',
      'Advanced analytics',
      'Bulk actions',
      '10 staff accounts',
      'Custom branding',
      'Data export (Excel/PDF)',
      'API access',
      'Priority support',
    ],

    badge: 'Best Value',
  },

  beta: {
    id: 'beta',
    name: 'Beta Tester',
    price: 0,
    currency: 'NGN',

    limits: {
      customers: Infinity,
      orders: Infinity,
      groups: Infinity,
      tracking_links: true,
      whatsapp_reminders: true,
      automatic_reminders: true,
      basic_analytics: true,
      advanced_reports: true,
      priority_support: true,
      bulk_actions: true,
      staff_accounts: 10,
      custom_branding: true,
      data_export: true,
      api_access: true,
    },

    features: [
      'All Pro features',
      'Free for 3 months',
      'Priority feedback channel',
    ],

    badge: 'Beta',
  },
}

export const FREE_TRIAL_DAYS = 14
export const BETA_EXPIRY_DAYS = 90

export function getPlanLimits(planId = 'free') {
  return PLANS[planId]?.limits || PLANS.free.limits
}

export function getPlan(planId) {
  return PLANS[planId] || PLANS.free
}

export function isFeatureAvailable(planId, feature) {
  const plan = getPlan(planId)

  return (
    plan.limits[feature] === true ||
    plan.limits[feature] > 0
  )
}

export function canAddMore(planId, resource, currentCount) {
  const limits = getPlanLimits(planId)
  const limit = limits[resource]

  // Boolean features aren't countable resources
  if (typeof limit !== 'number') {
    return limit === true
  }

  return currentCount < limit
}

export function getUpgradeMessage(
  resource,
  currentCount,
  planId = 'free'
) {
  const limits = getPlanLimits(planId)
  const limit = limits[resource]

  // Unlimited resource
  if (limit === Infinity) {
    return {
      title: null,
      message: null,
      showUpgrade: false,
    }
  }

  if (typeof limit !== 'number') {
    return {
      title: null,
      message: null,
      showUpgrade: false,
    }
  }

  const remaining = limit - currentCount

  if (remaining <= 0) {
    return {
      title: '🛑 Limit Reached',
      message: `You've used all ${limit} ${resource} on your ${getPlan(planId).name} plan.`,
      showUpgrade: true,
    }
  }

  if (remaining <= 2 && planId === 'free') {
    return {
      title: '⚠️ Almost at limit',
      message: `${remaining} ${resource} remaining on your Free plan.`,
      showUpgrade: true,
    }
  }

  return {
    title: null,
    message: null,
    showUpgrade: false,
  }
}

export function getAvailablePlans(currentPlan) {
  const allPlans = ['free', 'starter', 'pro']

  if (currentPlan === 'beta') {
    return allPlans
  }

  return allPlans.filter((plan) => plan !== currentPlan)
}

export function getStaffLimit(planId = 'free') {
  const limits = getPlanLimits(planId)
  return limits.staff_accounts || 0
}

export function getPlanStatusMessage(business) {
  const planId = business?.plan || 'free'
  const plan = getPlan(planId)
  const trialEndsAt = business?.trial_ends_at

  // Beta plan
  if (planId === 'beta') {
    return {
      status: 'beta',
      message: 'Beta plan (Free)',
      color: '#1E3A5F',
    }
  }

  // Trial
  if (trialEndsAt) {
    const trialEnd = new Date(trialEndsAt)
    const now = new Date()

    const daysLeft = Math.ceil(
      (trialEnd - now) / (1000 * 60 * 60 * 24)
    )

    if (daysLeft > 0) {
      return {
        status: 'trial',
        message: `${daysLeft} day${daysLeft > 1 ? 's' : ''} left in trial`,
        color: '#C79A2B',
      }
    }
  }

  // Paid plan
  if (planId !== 'free') {
    return {
      status: 'active',
      message: `${plan.name} plan • Active`,
      color: '#4C7A5E',
    }
  }

  // Free plan
  return {
    status: 'free',
    message: 'Free plan',
    color: '#6B6255',
  }
}
