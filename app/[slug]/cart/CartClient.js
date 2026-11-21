'use client';
import { useCart } from '@/lib/CartContext'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation';

export default function CartClient({ slug: propSlug }) {
  const params = useParams()
  const router = useRouter()
  const slug = propSlug || params?.slug
  const { cart, removeFromCart, updateQuantity } = useCart()

  const getSafeProduct = (item) => item.product || item;

  if (!cart || cart.length === 0) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#FAFAF9', padding: '20px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: '#0F2B4A', marginBottom: '10px' }}>Your bag is empty</h2>
        <p style={{ color: '#666', marginBottom: '30px' }}>Looks like you haven't added any pieces yet.</p>
        <Link href={`/${slug}/shop`} style={{ background: '#0F2B4A', color: '#FFF', padding: '15px 30px', textDecoration: 'none', borderRadius: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.9rem' }}>
          Continue Shopping
        </Link>
      </div>
    )
  }

  const total = cart.reduce((sum, item) => {
    const p = getSafeProduct(item);
    return sum + (Number(p.selling_price || 0) * (item.quantity || 1));
  }, 0);

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh', fontFamily: "'Inter', sans-serif", paddingBottom: '100px' }}>
      
      <header style={{ padding: '20px', textAlign: 'center', borderBottom: '1px solid #F0F0F0', position: 'sticky', top: 0, background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(10px)', zIndex: 100 }}>
        <h1 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', color: '#0F2B4A' }}>Shopping Bag</h1>
      </header>

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {cart.map((item, idx) => {
            const p = getSafeProduct(item);
            return (
              <div key={idx} style={{ display: 'flex', gap: '20px', borderBottom: '1px solid #EAEAEA', paddingBottom: '20px' }}>
                <div style={{ width: '100px', height: '130px', background: '#F9F9F9', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                  {p.image_url ? (
                    <img src={p.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '0.7rem', color: '#AAA' }}>No Image</div>
                  )}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <h4 style={{ margin: '0 0 5px 0', fontSize: '1.1rem', color: '#0F2B4A', fontWeight: 600 }}>{p.item_name || p.name}</h4>
                  <p style={{ margin: '0 0 15px 0', fontWeight: 700, color: '#0F2B4A' }}>₦{Number(p.selling_price || 0).toLocaleString()}</p>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #EAEAEA', borderRadius: '4px' }}>
                      <button onClick={() => updateQuantity && updateQuantity(p.id, Math.max(1, item.quantity - 1))} style={{ padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer' }}>-</button>
                      <span style={{ padding: '0 10px', fontWeight: 600 }}>{item.quantity}</span>
                      <button onClick={() => updateQuantity && updateQuantity(p.id, item.quantity + 1)} style={{ padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer' }}>+</button>
                    </div>
                    {removeFromCart && (
                      <button onClick={() => removeFromCart(p.id)} style={{ background: 'none', border: 'none', color: '#D9534F', fontSize: '0.85rem', textDecoration: 'underline', cursor: 'pointer' }}>Remove</button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '2px solid #0F2B4A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0F2B4A' }}>Total</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F2B4A' }}>₦{total.toLocaleString()}</span>
        </div>

        <button 
          onClick={() => router.push(`/${slug}/checkout`)}
          style={{ width: '100%', padding: '20px', marginTop: '30px', background: '#0F2B4A', color: '#FFF', border: 'none', borderRadius: '4px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '2px' }}
        >
          Proceed to Checkout
        </button>
      </main>
    </div>
  )
                                }
