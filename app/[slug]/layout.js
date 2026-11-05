import { CartProvider } from '../lib/CartContext';
import { supabase } from '@/lib/supabaseClient'

export default async function StoreLayout({ children, params }) {
  const { slug } = params

  // Fetch the business by slug so the cart is isolated per business
  const { data: page } = await supabase
    .from('business_public_pages')
    .select('business_id')
    .eq('slug', slug)
    .single()

  const businessId = page?.business_id || 'unknown'

  return (
    <CartProvider businessId={businessId}>
      {children}
    </CartProvider>
  )
}
