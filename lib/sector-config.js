// lib/sector-config.js
export const sectors = {
  fashion: {
    label: 'Fashion & Clothing',
    template: 'elegant',
    colors: { primary: '#D4A52A', secondary: '#0F2B4A', accent: '#D4A52A' },
    fonts: { heading: 'Playfair Display', body: 'Inter' },
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
    template: 'modern-bold',
    colors: { primary: '#2E7D5E', secondary: '#1F2937', accent: '#F59E0B' },
    fonts: { heading: 'Montserrat', body: 'Roboto' },
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
    template: 'classic-gold',
    colors: { primary: '#0F2B4A', secondary: '#D4A52A', accent: '#3E7BFA' },
    fonts: { heading: 'Lora', body: 'Inter' },
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
};

export function getSectorConfig(sectorId) {
  return sectors[sectorId] || null;
    }
