import { CartProvider } from '@/app/lib/CartContext'
// You would fetch the business data here based on the slug
// For now, let's assume you pass the businessId down.
export default function StorefrontLayout({ children, params }) {
  // In a real app, fetch business ID from slug here
  const businessId = 'fetched-id'; 
  return (
    <CartProvider businessId={businessId}>
      {children}
    </CartProvider>
  )
}
