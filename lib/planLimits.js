// lib/planLimits.js

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'NGN',
    limits: {
      customers: 5,
      orders: 10,
      groups: 0,
      tracking_links: false,
      whatsapp_reminders: false,
      advanced_reports: false,
      priority_support: false,
    },
    features: [
      'Basic customer management',
      'Basic order tracking',
      'Payment recording',
      'Dashboard access',
    ],
    badge: null,
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 100,
    currency: 'NGN',
    limits: {
      customers: Infinity,
      orders: Infinity,
      groups: Infinity,
      tracking_links: true,
      whatsapp_reminders: true,
      advanced_reports: false,
      priority_support: false,
    },
    features: [
      'Everything in Free',
      'Unlimited customers',
      'Unlimited orders',
      'Group orders (Aso-Ebi)',
      'Customer tracking links',
      'WhatsApp integration',
    ],
    badge: 'Popular',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 200,
    currency: 'NGN',
    limits: {
      customers: Infinity,
      orders: Infinity,
      groups: Infinity,
      tracking_links: true,
      whatsapp_reminders: true,
      advanced_reports: true,
      priority_support: true,
    },
    features: [
      'Everything in Starter',
      'Priority support',
      'Advanced reports',
      'Export data',
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
      advanced_reports: true,
      priority_support: true,
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
  return plan.limits[feature] === true || plan.limits[feature] > 0
}

export function canAddMore(planId, resource, currentCount) {
  const limits = getPlanLimits(planId)
  const limit = limits[resource] || 0
  return currentCount < limit
}

export function getUpgradeMessage(resource, currentCount, planId) {
  const limits = getPlanLimits(planId)
  const limit = limits[resource] || 0
  const remaining = limit - currentCount

  if (remaining <= 0) {
    return {
      title: '🛑 Limit Reached',
      message: `You've used all ${limit} ${resource} on your Free plan.`,
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
  if (currentPlan === 'beta') return allPlans
  return allPlans.filter(plan => plan !== currentPlan)
}

export function getPlanStatusMessage(business) {
  const planId = business.plan || 'free'
  const plan = getPlan(planId)
  const trialEndsAt = business.trial_ends_at

  // Check beta
  if (business.plan === 'beta') {
    return {
      status: 'beta',
      message: 'Beta plan (Free)',
      color: '#1E3A5F',
    }
  }

  // Check trial
  if (trialEndsAt) {
    const trialEnd = new Date(trialEndsAt)
    const daysLeft = Math.ceil((trialEnd - new Date()) / (1000 * 60 * 60 * 24))
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

  return {
    status: 'free',
    message: 'Free plan',
    color: '#6B6255',
  }
}
