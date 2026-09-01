import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import PublicPageWrapper from '../../components/public-page/PublicPageWrapper'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const revalidate = 60

export async function generateMetadata({ params }) {
  const slug = params.slug
  const { data: page } = await supabaseAdmin
    .from('business_public_pages')
    .select('*')
    .eq('slug', slug)
    .eq('is_enabled', true)
    .maybeSingle()
  if (!page) return {}
  const { data: business } = await supabaseAdmin
    .from('businesses')
    .select('name, sector, description, logo_url, location')
    .eq('id', page.business_id)
    .single()
  return {
    title: `${business?.name || 'Business'} - ${business?.sector || 'Services'}`,
    description: page.description || business?.description || 'Welcome to our business.',
    openGraph: {
      title: business?.name || 'Business',
      description: page.description || business?.description || '',
      images: business?.logo_url ? [business.logo_url] : [],
    },
  }
}

export default async function PublicPage({ params }) {
  const slug = params.slug

  const { data: page } = await supabaseAdmin
    .from('business_public_pages')
    .select('*')
    .eq('slug', slug)
    .eq('is_enabled', true)
    .maybeSingle()

  if (!page) notFound()

  const { data: business } = await supabaseAdmin
    .from('businesses')
    .select('*')
    .eq('id', page.business_id)
    .single()

  const { data: reviews } = await supabaseAdmin
    .from('public_reviews')
    .select('*')
    .eq('business_id', page.business_id)
    .eq('is_approved', true)
    .order('created_at', { ascending: false })

  // Normalize portfolio to { url, description } format
  const rawPortfolio = page.portfolio_images || []
  const portfolio = rawPortfolio.map(item => {
    if (typeof item === 'string') return { url: item, description: '' }
    return { url: item.url, description: item.description || '' }
  })

  // Ensure `about` is available (if not set in the page, use business description)
  const about = page.about || business?.description || ''

  return (
    <PublicPageWrapper
      business={{
        name: business.name,
        logo_url: business.logo_url,
        phone: business.phone,
        email: business.email,
        location: business.location,
      }}
      page={{
        ...page,
        about,
        description: page.description || business?.description || '',
      }}
      services={page.services || []}
      shop={page.shop_products || []}
      portfolio={portfolio}
      reviews={reviews || []}
      templateId={page.template_id || 'elegant'}
    />
  )
        }
