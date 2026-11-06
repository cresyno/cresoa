// lib/publicPageData.js
export function parseSectorData(raw) {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return {} }
  }
  if (typeof raw === 'object') return raw
  return {}
}

export function normalizeSectorData(raw) {
  const s = parseSectorData(raw)
  return {
    portfolio:     Array.isArray(s.portfolio) ? s.portfolio : [],
    services:      Array.isArray(s.services) ? s.services : [],
    testimonials:  Array.isArray(s.testimonials) ? s.testimonials : [],
    faqs:          Array.isArray(s.faqs) ? s.faqs : [],
    business_hours: typeof s.business_hours === 'string' ? s.business_hours : '',
    free_delivery: Boolean(s.free_delivery),
    delivery_rates:
      s.delivery_rates && typeof s.delivery_rates === 'object' && !Array.isArray(s.delivery_rates)
        ? s.delivery_rates
        : {},
  }
}

export function normalizePage(page) {
  if (!page) return null
  return { ...page, sector_data: normalizeSectorData(page.sector_data) }
}

export const NIGERIAN_STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
  'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo',
  'Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa',
  'Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba',
  'Yobe','Zamfara',
]
