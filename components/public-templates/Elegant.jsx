'use client'

import { useState } from 'react'

export default function Elegant({ business, page, services, shop, portfolio, reviews, onQuoteClick }) {
  const [cartItems, setCartItems] = useState([])
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  const shopUrl = `/${page.slug || ''}/shop`
  const shopPreview = shop.slice(0, 2)

  const addToCart = (product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.name === product.name)
      if (existing) return prev.map(item => item.name === product.name ? { ...item, quantity: item.quantity + 1 } : item)
      return [...prev, { ...product, quantity: 1 }]
    })
  }

  const getCartTotal = () => {
    return cartItems.reduce((sum, item) => {
      const price = parseFloat(item.price.replace(/[^\d.]/g, '')) || 0
      return sum + (price * item.quantity)
    }, 0)
  }

  const handleWhatsAppCheckout = async () => {
  if (!cartItems.length) return
  const customerName = prompt('What is your name?') || 'Customer'
  const customerPhone = prompt('What is your phone number?') || ''
  const customerAddress = prompt('What is your delivery address?') || ''
  const total = getCartTotal().toLocaleString()
  const itemsText = cartItems.map(item => `- ${item.name} (x${item.quantity}) - ${item.price}`).join('\n')

  // Save order to database first
  try {
    const res = await fetch('/api/public-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_id: page.business_id,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        items: cartItems,
        total_amount: `₦${total}`,
      }),
    })
    if (!res.ok) console.error('Failed to save order')
  } catch (err) {
    console.error('Order save error:', err)
  }

  const message = `Hello ${business.name},\n\nI would like to order:\n\n${itemsText}\n\nTotal: ₦${total}\n\nName: ${customerName}\nPhone: ${customerPhone}\nAddress: ${customerAddress}`
  const waUrl = `https://wa.me/${business.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
  window.open(waUrl, '_blank')
  setCartItems([])
    }
  const heroStyle = page.cover_image_url ? {
    backgroundImage: `linear-gradient(rgba(10,22,40,0.7), rgba(10,22,40,0.7)), url(${page.cover_image_url})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    color: '#fff',
  } : {
    background: 'linear-gradient(135deg, #0F2B4A 0%, #1A3F66 100%)',
    color: '#fff',
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", minHeight: '100vh', background: '#FAFAF9' }}>
      {/* Header */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(250,250,249,0.95)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E5E7EB', padding: '0.8rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {business.logo_url ? <img src={business.logo_url} alt={business.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'contain' }} /> : <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#D4A52A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>{business.name.charAt(0)}</div>}
          <span style={{ fontWeight: 600, fontSize: '1.1rem', color: '#0F2B4A' }}>{business.name}</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', fontWeight: 500, color: '#6B7280' }}>
          <button onClick={() => scrollTo('about')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>About</button>
          <button onClick={() => scrollTo('services')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Services</button>
          {page.has_shop && <a href={shopUrl} style={{ textDecoration: 'none', color: '#D4A52A', fontWeight: 600 }}>Shop</a>}
          <button onClick={() => scrollTo('portfolio')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Work</button>
          <button onClick={() => scrollTo('contact')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Contact</button>
        </div>
      </nav>

      {/* Hero */}
      <section id="home" style={{ padding: '6rem 1.5rem', textAlign: 'center', ...heroStyle }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          {business.logo_url ? <img src={business.logo_url} alt={business.name} style={{ width: '100px', height: '100px', borderRadius: '20px', objectFit: 'contain', marginBottom: '1.5rem', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }} /> : <div style={{ width: '100px', height: '100px', borderRadius: '20px', background: '#D4A52A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', fontWeight: 800, margin: '0 auto 1.5rem', color: '#fff' }}>{business.name.charAt(0)}</div>}
          <h1 style={{ fontSize: '2.5rem', fontWeight: 300, letterSpacing: '-0.02em', margin: '0 0 1rem', lineHeight: 1.2 }}>{business.name}</h1>
          <p style={{ fontSize: '1.15rem', lineHeight: 1.8, maxWidth: '500px', margin: '0 auto', opacity: 0.9 }}>{page.description}</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap' }}>
            <button onClick={onQuoteClick} style={{ background: '#D4A52A', color: '#0F2B4A', padding: '0.9rem 2rem', borderRadius: '999px', border: 'none', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(212,165,42,0.3)' }}>Request a Free Quote →</button>
            <button onClick={() => scrollTo('portfolio')} style={{ background: 'transparent', color: '#fff', padding: '0.9rem 2rem', borderRadius: '999px', border: '2px solid #fff', fontWeight: 600, cursor: 'pointer' }}>View Our Work</button>
          </div>
        </div>
      </section>

      {/* About */}
      {page.about && (
        <section id="about" style={{ padding: '4rem 1.5rem', maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 400, textAlign: 'center', marginBottom: '2rem', color: '#0F2B4A' }}>About Us</h2>
          <p style={{ fontSize: '1.1rem', color: '#4B5563', lineHeight: 2, textAlign: 'center' }}>{page.about}</p>
        </section>
      )}

      {/* Services */}
      {page.has_services !== false && services.length > 0 && (
        <section id="services" style={{ padding: '4rem 1.5rem', background: '#F3F4F6' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 400, textAlign: 'center', marginBottom: '2rem', color: '#0F2B4A' }}>Our Services</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {services.map((service, idx) => (
                <div key={idx} style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
                  {service.image_url && <img src={service.image_url} alt={service.name} style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '12px', marginBottom: '1rem' }} />}
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 600, margin: '0 0 0.5rem' }}>{service.name}</h3>
                  <p style={{ color: '#6B7280', fontSize: '0.95rem', lineHeight: 1.6 }}>{service.description}</p>
                  <button onClick={onQuoteClick} style={{ marginTop: '1rem', padding: '0.5rem 1.2rem', borderRadius: '8px', border: 'none', background: '#D4A52A', color: '#0F2B4A', fontWeight: 600, cursor: 'pointer' }}>Request Service →</button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Shop (Limit to 2) */}
      {page.has_shop && shop.length > 0 && (
        <section id="shop" style={{ padding: '4rem 1.5rem', maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 400, textAlign: 'center', marginBottom: '2rem', color: '#0F2B4A' }}>Our Products</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {shopPreview.map((product, idx) => (
              <div key={idx} style={{ background: '#fff', borderRadius: '12px', padding: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                {product.image_url && <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', marginBottom: '0.5rem' }} />}
                <h4 style={{ fontWeight: 600, margin: '0 0 0.3rem' }}>{product.name}</h4>
                <p style={{ color: '#D4A52A', fontWeight: 700, margin: '0 0 0.5rem' }}>{product.price}</p>
                <p style={{ color: '#6B7280', fontSize: '0.85rem', lineHeight: 1.5 }}>{product.description}</p>
                <button onClick={() => addToCart(product)} style={{ marginTop: '0.5rem', width: '100%', padding: '0.6rem', borderRadius: '8px', border: 'none', background: '#0F2B4A', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Add to Cart</button>
              </div>
            ))}
          </div>
          {shop.length > 2 && (
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <a href={shopUrl} style={{ padding: '0.7rem 1.5rem', background: '#0F2B4A', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>View All Products</a>
            </div>
          )}
        </section>
      )}

      {/* Portfolio */}
      {portfolio.length > 0 && (
        <section id="portfolio" style={{ padding: '4rem 1.5rem', background: '#F3F4F6' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 400, textAlign: 'center', marginBottom: '2rem', color: '#0F2B4A' }}>Our Work</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {portfolio.map((img, idx) => (
                <div key={idx} style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <img src={img.url} alt={`Work ${idx + 1}`} style={{ width: '100%', height: '220px', objectFit: 'cover' }} />
                  {img.description && <p style={{ padding: '1rem', margin: 0, color: '#4B5563', fontSize: '0.9rem' }}>{img.description}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials */}
      {reviews.length > 0 && (
        <section style={{ padding: '4rem 1.5rem', maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 400, textAlign: 'center', marginBottom: '2rem', color: '#0F2B4A' }}>What Clients Say</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {reviews.map((review, idx) => (
              <blockquote key={idx} style={{ background: '#fff', borderLeft: '4px solid #D4A52A', padding: '1.5rem', borderRadius: '12px', margin: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <p style={{ fontStyle: 'italic', margin: '0 0 0.8rem' }}>"{review.review_text}"</p>
                <footer style={{ color: '#6B7280', fontSize: '0.9rem' }}><strong>{review.customer_name}</strong> · {'⭐'.repeat(review.rating)}</footer>
              </blockquote>
            ))}
          </div>
        </section>
      )}

      {/* Contact */}
      <section id="contact" style={{ background: '#0F2B4A', color: '#fff', padding: '4rem 1.5rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 400, margin: '0 0 1.5rem' }}>Get in Touch</h2>
        <p style={{ opacity: 0.8, marginBottom: '2rem' }}>We'd love to hear from you!</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {page.show_whatsapp_button && business.phone && <a href={`https://wa.me/${business.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener" style={{ background: '#25D366', color: '#fff', padding: '0.9rem 2rem', borderRadius: '999px', textDecoration: 'none', fontWeight: 600 }}>WhatsApp Us</a>}
          {page.show_quote_button && <button onClick={onQuoteClick} style={{ background: '#D4A52A', color: '#0F2B4A', padding: '0.9rem 2rem', borderRadius: '999px', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Request a Quote</button>}
        </div>
        {business.location && <p style={{ marginTop: '2rem', opacity: 0.7 }}>📍 {business.location}</p>}
      </section>

      {/* Footer */}
      <footer style={{ background: '#0A1628', color: '#8899AA', padding: '2rem 1.5rem', textAlign: 'center', fontSize: '0.85rem' }}>
        © {new Date().getFullYear()} {business.name} · Powered by <span style={{ color: '#D4A52A', fontWeight: 700 }}>Cresoa</span>
      </footer>

      {/* Cart Floating Button */}
      {cartItems.length > 0 && (
        <button onClick={handleWhatsAppCheckout} style={{ position: 'fixed', bottom: '20px', right: '20px', background: '#25D366', color: '#fff', padding: '1rem 1.5rem', borderRadius: '999px', border: 'none', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,211,102,0.4)', zIndex: 1000 }}>
          🛒 Checkout ({cartItems.length} items) - ₦{getCartTotal().toLocaleString()}
        </button>
      )}
    </div>
  )
                      }
