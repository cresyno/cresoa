// lib/sector-config.js

// Paths every sector shares no matter what — never gate these behind a sector check.
export const SHARED_DASHBOARD_PATHS = [
  '/dashboard/settings',
  '/dashboard/subscription',
  '/dashboard/profile',
  '/dashboard/support',
  '/dashboard/staff',
  '/dashboard/activity',
  '/dashboard/beta-apply',
  '/dashboard/my-website', // ✅ Replaced the old 4 public paths
]

const SHARED_WEBSITE_NAV_ITEMS = [
  // ✅ Consolidated into one single hub
  { name: 'My Website', path: '/dashboard/my-website', icon: 'globe' },
]

export const sectors = {
  fashion: {
    label: 'Fashion & Clothing',
    badge: '👗 Fashion',
    template: 'elegant',
    dashboardBasePath: '/dashboard/fashion',
    colors: { primary: '#D4A52A', secondary: '#0F2B4A', accent: '#D4A52A' },
    fonts: { heading: 'Playfair Display', body: 'Inter' },
    navItems: [
      { name: 'Dashboard', path: '/dashboard/fashion', icon: 'bar-chart-2' },
      { name: 'Orders', path: '/dashboard/orders', icon: 'file-text' },
      { name: 'Group Orders', path: '/dashboard/groups', icon: 'users' },
      { name: 'Customers', path: '/dashboard/customers', icon: 'users' },
      { name: 'Inventory', path: '/dashboard/inventory', icon: 'package' },
      { name: 'Production', path: '/dashboard/production', icon: 'file-text' },
      { name: 'Invoices', path: '/dashboard/invoices', icon: 'file-text' },
      { name: 'Reminders', path: '/dashboard/reminders', icon: 'bell' },
      ...SHARED_WEBSITE_NAV_ITEMS,
    ],
    defaultServices: [
      { name: 'Custom Tailoring', description: 'Bespoke outfits made to your measurements.' },
      { name: 'Fashion Consulting', description: 'Personal style advice and wardrobe planning.' },
      { name: 'Alterations', description: 'Expert fitting and adjustments.' },
    ],
    defaultProducts: [
      { name: 'Ready-to-wear Dresses', price: '₦15,000', description: 'Elegant dresses for all occasions.' },
      { name: 'Custom Suits', price: '₦50,000', description: 'Tailored suits for men and women.' },
      { name: 'Accessories', price: '₦5,000', description: 'Scarves, belts, and jewelry.' },
    ],
    extraSections: ['lookbook', 'size-guide', 'fitting'],
    cta: {
      label: 'Request Custom Design',
      type: 'fashion',
      fields: [
        { name: 'clothing_type', label: 'Clothing Type', type: 'text', required: false },
        { name: 'fabric_preference', label: 'Fabric Preference', type: 'text', required: false },
        { name: 'measurements', label: 'Measurements (optional)', type: 'textarea', required: false },
        { name: 'deadline', label: 'Deadline', type: 'date', required: false },
      ],
    },
    sampleDescription: 'Premium fashion design and tailoring for all occasions.',
  },

  repairs: {
    label: 'Repairs & Technical',
    badge: '🔧 Repairs',
    template: 'modern-bold',
    dashboardBasePath: '/dashboard/repairs',
    colors: { primary: '#2E7D5E', secondary: '#1F2937', accent: '#F59E0B' },
    fonts: { heading: 'Montserrat', body: 'Roboto' },
    navItems: [
      { name: 'Dashboard', path: '/dashboard/repairs', icon: 'bar-chart-2' },
      { name: 'Jobs', path: '/dashboard/repairs/jobs', icon: 'tool' },
      { name: 'Customers', path: '/dashboard/repairs/customers', icon: 'users' },
      { name: 'Parts', path: '/dashboard/repairs/parts', icon: 'package' },
      { name: 'Invoices', path: '/dashboard/repairs/invoices', icon: 'file-text' },
      ...SHARED_WEBSITE_NAV_ITEMS,
    ],
    defaultServices: [
      { name: 'Screen Replacement', description: 'Cracked screen? We fix it fast.' },
      { name: 'Battery Replacement', description: 'Replace worn-out batteries for phones and laptops.' },
      { name: 'Software Repair', description: 'Virus removal, OS reinstall, data recovery.' },
    ],
    defaultProducts: [
      { name: 'Replacement Parts', price: '₦8,000', description: 'Genuine parts for various devices.' },
      { name: 'Phone Accessories', price: '₦2,500', description: 'Chargers, cases, screen protectors.' },
    ],
    extraSections: ['repair-process', 'warranty', 'book-repair'],
    cta: {
      label: 'Book a Repair',
      type: 'repair',
      fields: [
        { name: 'device_type', label: 'Device Type', type: 'text', required: true },
        { name: 'issue_description', label: 'Describe the Issue', type: 'textarea', required: true },
        { name: 'preferred_date', label: 'Preferred Date', type: 'date', required: false },
        { name: 'urgency', label: 'Urgency', type: 'select', options: ['Normal', 'Urgent'], required: false },
      ],
    },
    sampleDescription: 'Fast and reliable repairs for phones, laptops, and more.',
  },

  printing: {
    label: 'Printing & Branding',
    badge: '🖨️ Printing',
    template: 'classic-gold',
    dashboardBasePath: '/dashboard/printing',
    colors: { primary: '#0F2B4A', secondary: '#D4A52A', accent: '#3E7BFA' },
    fonts: { heading: 'Lora', body: 'Inter' },
    navItems: [
      { name: 'Dashboard', path: '/dashboard/printing', icon: 'bar-chart-2' },
      { name: 'Jobs', path: '/dashboard/printing/jobs', icon: 'file-text' },
      { name: 'Quotations', path: '/dashboard/printing/quotations', icon: 'file-text' },
      { name: 'Customers', path: '/dashboard/printing/customers', icon: 'users' },
      { name: 'Materials', path: '/dashboard/printing/materials', icon: 'package' },
      { name: 'Invoices', path: '/dashboard/printing/invoices', icon: 'file-text' },
      ...SHARED_WEBSITE_NAV_ITEMS,
    ],
    defaultServices: [
      { name: 'Business Cards', description: 'Professional business cards with premium finish.' },
      { name: 'Flyers', description: 'Eye-catching flyers for promotions.' },
      { name: 'Banners', description: 'Large-format banners for events and storefronts.' },
    ],
    defaultProducts: [
      { name: 'T-Shirt Printing', price: '₦3,000', description: 'Custom print on quality tees.' },
      { name: 'Custom Stickers', price: '₦1,500', description: 'Die-cut stickers with your logo.' },
    ],
    extraSections: ['pricing', 'design-services'],
    cta: {
      label: 'Get a Printing Quote',
      type: 'printing',
      fields: [
        { name: 'print_type', label: 'Print Type', type: 'select', options: ['Business Cards', 'Flyers', 'Banners', 'Other'], required: true },
        { name: 'quantity', label: 'Quantity', type: 'number', required: true },
        { name: 'size', label: 'Size (optional)', type: 'text', required: false },
        { name: 'file_url', label: 'File Upload (link)', type: 'url', required: false },
      ],
    },
    sampleDescription: 'Professional printing and branding solutions for your business.',
  },
}

export function getSectorConfig(sectorId) {
  return sectors[sectorId] || sectors.fashion
}

export function getNavItemsFor(sectorId) {
  return (sectors[sectorId] || sectors.fashion).navItems
}

export function getDashboardBasePath(sectorId) {
  return (sectors[sectorId] || sectors.fashion).dashboardBasePath
}

export function getSectorBadge(sectorId) {
  return (sectors[sectorId] || sectors.fashion).badge || ''
}

export const SECTOR_KEYS = Object.keys(sectors)

// The one place that decides whether a nav link is "active".
export function isNavPathActive(pathname, path) {
  const isSomeSectorHome = SECTOR_KEYS.some((key) => sectors[key].dashboardBasePath === path)
  if (isSomeSectorHome) return pathname === path
  
  // Because our hub uses ?tab= query parameters, pathname will be /dashboard/my-website
  // The startsWith check handles this perfectly.
  return pathname?.startsWith(path)
}

// ─── BOTTOM NAV CURATION ─────────────────────────────────────────────────
const BOTTOM_NAV_PATHS = {
  fashion: [
    '/dashboard/fashion',
    '/dashboard/orders',
    '/dashboard/groups',
    '/dashboard/customers',
    '/dashboard/inventory',
  ],
  repairs: [
    '/dashboard/repairs',
    '/dashboard/repairs/jobs',
    '/dashboard/repairs/customers',
    '/dashboard/repairs/parts',
    '/dashboard/repairs/invoices',
  ],
  printing: [
    '/dashboard/printing',
    '/dashboard/printing/jobs',
    '/dashboard/printing/customers',
    '/dashboard/printing/materials',
    '/dashboard/printing/invoices',
  ],
}

export function getBottomNavItemsFor(sectorId) {
  const allItems = getNavItemsFor(sectorId)
  const whitelist = BOTTOM_NAV_PATHS[sectorId]

  if (!whitelist) return allItems.slice(0, 5)

  return whitelist
    .map((path) => allItems.find((item) => item.path === path))
    .filter(Boolean)
}

// Add this to the bottom of lib/sector-config.js

export function getSectorOnboardingFields(sectorId) {
  if (sectorId === 'fashion') {
    return [
      { id: 'lookbook', label: 'Upload images of your best work (Lookbook)', type: 'gallery' },
      { id: 'size_guide', label: 'Upload your Size Chart (Image)', type: 'image' },
      { id: 'fabric_options', label: 'What fabrics do you work with?', type: 'text', placeholder: 'e.g. Ankara, Lace, Cotton' },
    ]
  }
  if (sectorId === 'repairs') {
    return [
      { id: 'warranty_months', label: 'Warranty period (Months)', type: 'number', placeholder: 'e.g. 3' },
      { id: 'turnaround_time', label: 'Average turnaround time', type: 'text', placeholder: 'e.g. 48 hours' },
      { id: 'devices', label: 'What devices do you repair?', type: 'text', placeholder: 'e.g. iPhones, Laptops, Generators' },
      { id: 'tracking', label: 'Enable Repair Tracking?', type: 'boolean' },
    ]
  }
  if (sectorId === 'printing') {
    return [
      { id: 'materials', label: 'Materials you print on', type: 'text', placeholder: 'e.g. Card, Vinyl, Flex' },
      { id: 'bulk_pricing', label: 'Do you offer bulk discounts?', type: 'boolean' },
    ]
  }
  return []
}
