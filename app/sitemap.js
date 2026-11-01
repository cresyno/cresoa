import { supabase } from '../lib/supabaseClient'

export const revalidate = 3600 // Regenerate the sitemap every hour automatically

export default async function sitemap() {
  const baseUrl = 'https://www.cresoa.com.ng'

  // 1. Your Core Static Pages
  const staticPages = [
    '', // Home
    '/login',
    '/signup',
    '/pricing',
    '/learn',
    '/support',
    '/fashion',
    '/repairs',
    '/blog',
    '/blog/how-to-create-professional-invoices-nigeria',
    '/blog/why-nigerian-businesses-lose-customers',
    '/blog/from-notebook-to-digital-scaling-tailoring-business-nigeria',
    '/blog/best-app-for-fashion-designers-nigeria',
    '/blog/how-to-market-your-fashion-business-nigeria',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1.0 : 0.8,
  }))

  // 2. Fetch Dynamic Business Pages from Supabase
  let businessPages = []
  try {
    const { data: pages } = await supabase
      .from('business_public_pages')
      .select('slug, updated_at')
      .eq('is_enabled', true)

    if (pages) {
      businessPages = pages.map((page) => ({
        url: `${baseUrl}/${page.slug}`,
        lastModified: page.updated_at ? new Date(page.updated_at).toISOString() : new Date().toISOString(),
        changeFrequency: 'weekly',
        priority: 0.9,
      }))
    }
  } catch (error) {
    console.error('Error fetching business pages for sitemap:', error)
  }

  // 3. Combine them
  return [...staticPages, ...businessPages]
}
