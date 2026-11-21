// app/[slug]/layout.js
import { CartProvider } from '@/lib/CartContext'
import { createServerSupabase } from '@/lib/serverSupabase'
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic'

export default async function StoreLayout({ children, params }) {
  const { slug } = await params
  const sb = createServerSupabase()

  const { data: page } = await sb
    .from('business_public_pages')
    .select('business_id, is_enabled')
    .eq('slug', String(slug).trim().toLowerCase())
    .maybeSingle()

  if (!page || !page.is_enabled) notFound()

  return <CartProvider businessId={page.business_id}>{children}</CartProvider>
}
