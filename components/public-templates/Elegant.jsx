'use client'

import { useState } from 'react'
import CheckoutModal from '../public-page/CheckoutModal'
import QuoteModal from '../public-page/QuoteModal'
import ReviewModal from '../public-page/ReviewModal'

export default function Elegant({ business, page, services, shop, portfolio, reviews, onQuoteClick }) {
  const [cartItems, setCartItems] = useState([])
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [expandedImage, setExpandedImage] = useState(null)
  const [reviewOpen, setReviewOpen] = useState(false)

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  // Determine header order and sidebar mode
  const defaultOrder = ['Home', 'About', 'Services', 'Shop', 'Work', 'Contact']
  const headerOrder = page.header_order || defaultOrder
  const sidebar = page.header_sidebar || false

  // Featured products (max 4)
  const featuredProducts = shop.filter(p => p.featured).slice(0, 4)

  // Contact info from business
  const phone = business.phone || ''
  const whatsapp = business.whatsapp || business.phone || ''
  const email = business.email || ''
  const address = business.location || ''

  const getCartTotal = () => {
    return cartItems.reduce((sum, item) => {
      const price = parseFloat(item.price.replace(/[^\d.]/g, '')) || 0
      return sum + (price * item.quantity)
    }, 0)
  }

  const heroStyle = page.cover_image_url ? {
    backgroundImage: `linear-gradient(rgba(10,22,40,0.7), rgba(10,22,40,0.7)), url(${page.cover_image_url})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    color: '#fff',
    fontFamily: page.hero_font || "'Inter', sans-serif",
  } : {
    background: 'linear-gradient(135deg, #0F2B4A 0%, #1A3F66 100%)',
    color: '#fff',
    fontFamily: page.hero_font || "'Inter', sans-serif",
  }

  const heroTextAlign = page.hero_layout === 'left' ? 'left' : 'center'

  // Render nav items based on headerOrder
  const navItems = headerOrder.map(item => {
    const label = item.toLowerCase()
    let href = '#'
    let onClick = null
    if (label === 'home') onClick = () => scrollTo('home')
    else if (label === 'about') onClick = () => scrollTo('about')
    else if (label === 'services') onClick = () => scrollTo('services')
    else if (label === 'shop') { href = `/${page.slug || ''}/shop`; }
    else if (label === 'work') onClick = () => scrollTo('portfolio')
    else if (label === 'contact') onClick = () => scrollTo('contact')
    return (
      <button key={item} onClick={onClick} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}>
        {item}
      </button>
    )
  })

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", minHeight: '100vh', background: '#FAFAF9' }}>
      {/* Header or Sidebar */}
      {sidebar ? (
        <div style={{ position: 'fixed', left: 0, top: 0, height: '100vh', width: '200px', background: '#0F2B4A', color: '#fff', padding: '1rem', zIndex: 200 }}>
          <div style={{ marginBottom: '2rem' }}>
            <span style={{ fontWeight: 800, fontSize: '1.2rem' }}>{business.name}</span>
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {navItems}
          </nav>
        </div>
      ) : (
        <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(250,250,249,0.95)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E5E7EB', padding: '0.8rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {business.logo_url ? <img src={business.logo_url} alt={business.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'contain' }} /> : <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#D4A52A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>{business.name.charAt(0)}</div>}
            <span style={{ fontWeight: 600, fontSize: '1.1rem', color: '#0F2B4A' }}>{business.name}</span>
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', fontWeight: 500, color: '#6B7280' }}>
            {navItems}
          </div>
        </nav>
      )}

      {/* Hero – NO LOGO */}
      <section id="home" style={{ padding: '6rem 1.5rem', textAlign: heroTextAlign, ...heroStyle }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: heroTextAlign }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 300, letterSpacing: '-0.02em', margin: '0 0 1rem', lineHeight: 1.2 }}>{business.name}</h1>
          <p style={{ fontSize: '1.15rem', lineHeight: 1.8, maxWidth: '500px', margin: '0 auto', opacity: 0.9 }}>{page.description}</p>
          <div style={{ display: 'flex', justifyContent: heroTextAlign === 'left' ? 'flex-start' : 'center', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap' }}>
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

      {/* Featured Products (max 4) */}
      {page.has_shop && featuredProducts.length > 0 && (
        <section id="shop" style={{ padding: '4rem 1.5rem', maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 400, textAlign: 'center', marginBottom: '2rem', color: '#0F2B4A' }}>Featured Products</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {featuredProducts.map((product, idx) => (
              <div key={idx} style={{ background: '#fff', borderRadius: '12px', padding: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                {product.image_url && <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', marginBottom: '0.5rem' }} />}
                <h4 style={{ fontWeight: 600, margin: '0 0 0.3rem' }}>{product.name}</h4>
                <p style={{ color: '#D4A52A', fontWeight: 700, margin: '0 0 0.5rem' }}>{product.price}</p>
                <p style={{ color: '#6B7280', fontSize: '0.85rem', lineHeight: 1.5 }}>{product.description}</p>
                <button onClick={() => addToCart(product)} style={{ marginTop: '0.5rem', width: '100%', padding: '0.6rem', borderRadius: '8px', border: 'none', background: '#0F2B4A', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Add to Cart</button>
              </div>
            ))}
          </div>
          {shop.length > featuredProducts.length && (
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <a href={`/${page.slug || ''}/shop`} style={{ padding: '0.7rem 1.5rem', background: '#0F2B4A', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>View All Products</a>
            </div>
          )}
        </section>
      )}

      {/* Portfolio – with expand and CTA */}
      {portfolio.length > 0 && (
        <section id="portfolio" style={{ padding: '4rem 1.5rem', background: '#F3F4F6' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 400, textAlign: 'center', marginBottom: '2rem', color: '#0F2B4A' }}>Our Work</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {portfolio.map((img, idx) => (
                <div key={idx} style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <img src={img.url} alt={`Work ${idx + 1}`} style={{ width: '100%', height: '220px', objectFit: 'cover', cursor: 'pointer' }} onClick={() => setExpandedImage(img)} />
                  {img.description && <p style={{ padding: '1rem', margin: 0, color: '#4B5563', fontSize: '0.9rem' }}>{img.description}</p>}
                </div>
              ))}
            </div>
          </div>
          {/* Lightbox */}
          {expandedImage && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '2rem' }}>
              <button onClick={() => setExpandedImage(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
              <img src={expandedImage.url} alt="Expanded work" style={{ maxWidth: '80vw', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px' }} />
              {expandedImage.description && <p style={{ color: 'white', marginTop: '1rem', textAlign: 'center' }}>{expandedImage.description}</p>}
              <a href="/contact" onClick={(e) => { e.preventDefault(); scrollTo('contact'); setExpandedImage(null); }} style={{ marginTop: '1.5rem', background: '#D4A52A', color: '#0F2B4A', padding: '0.8rem 2rem', borderRadius: '999px', textDecoration: 'none', fontWeight: 700 }}>Request Similar Work →</a>
            </div>
          )}
        </section>
      )}

      {/* Why Us */}
      {page.why_us && page.why_us.length > 0 && (
        <section style={{ padding: '4rem 1.5rem', maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 400, textAlign: 'center', marginBottom: '2rem', color: '#0F2B4A' }}>Why Choose Us</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {page.why_us.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <span style={{ fontSize: '1.5rem', color: '#D4A52A' }}>✓</span>
                <span style={{ fontSize: '1.1rem', color: '#374151' }}>{item.text}</span>
              </div>
            ))}
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
          {page.show_whatsapp_button && whatsapp && <a href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener" style={{ background: '#25D366', color: '#fff', padding: '0.9rem 2rem', borderRadius: '999px', textDecoration: 'none', fontWeight: 600 }}>WhatsApp Us</a>}
          {page.show_quote_button && <button onClick={onQuoteClick} style={{ background: '#D4A52A', color: '#0F2B4A', padding: '0.9rem 2rem', borderRadius: '999px', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Request a Quote</button>}
          <button onClick={() => setReviewOpen(true)} style={{ background: 'transparent', color: '#fff', padding: '0.9rem 2rem', borderRadius: '999px', border: '2px solid #fff', fontWeight: 600, cursor: 'pointer' }}>Leave a Review</button>
        </div>
        {/* Social Links */}
        {(business.facebook || business.instagram || business.tiktok || business.youtube || business.linkedin || business.google_business) && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
            {business.facebook && <a href={business.facebook} target="_blank" rel="noopener" style={{ color: '#fff', fontSize: '1.5rem' }}><i className="fab fa-facebook" /></a>}
            {business.instagram && <a href={business.instagram} target="_blank" rel="noopener" style={{ color: '#fff', fontSize: '1.5rem' }}><i className="fab fa-instagram" /></a>}
            {business.tiktok && <a href={business.tiktok} target="_blank" rel="noopener" style={{ color: '#fff', fontSize: '1.5rem' }}><i className="fab fa-tiktok" /></a>}
            {business.youtube && <a href={business.youtube} target="_blank" rel="noopener" style={{ color: '#fff', fontSize: '1.5rem' }}><i className="fab fa-youtube" /></a>}
            {business.linkedin && <a href={business.linkedin} target="_blank" rel="noopener" style={{ color: '#fff', fontSize: '1.5rem' }}><i className="fab fa-linkedin" /></a>}
            {business.google_business && <a href={business.google_business} target="_blank" rel="noopener" style={{ color: '#fff', fontSize: '1.5rem' }}><i className="fab fa-google" /></a>}
          </div>
        )}
        {/* Phone, Email, Address */}
        <div style={{ marginTop: '2rem' }}>
          {phone && <p><a href={`tel:${phone}`} style={{ color: '#fff' }}>📞 {phone}</a></p>}
          {email && <p><a href={`mailto:${email}`} style={{ color: '#fff' }}>✉️ {email}</a></p>}
          {address && <p>📍 {address}</p>}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#0A1628', color: '#8899AA', padding: '2rem 1.5rem', textAlign: 'center', fontSize: '0.85rem' }}>
        {page.footer_text || `© ${new Date().getFullYear()} ${business.name} · Powered by Cresoa`}
      </footer>

      {/* Cart Floating Button */}
      {cartItems.length > 0 && (
        <button onClick={() => setCheckoutOpen(true)} style={{ position: 'fixed', bottom: '20px', right: '20px', background: '#25D366', color: '#fff', padding: '1rem 1.5rem', borderRadius: '999px', border: 'none', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,211,102,0.4)', zIndex: 1000 }}>
          🛒 Checkout ({cartItems.length} items) - ₦{getCartTotal().toLocaleString()}
        </button>
      )}

      {/* Modals */}
      {checkoutOpen && (
        <CheckoutModal
          open={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          cartItems={cartItems}
          business={business}
          page={page}
          onSuccess={() => setCartItems([])}
        />
      )}

      {reviewOpen && (
        <ReviewModal
          open={reviewOpen}
          onClose={() => setReviewOpen(false)}
          businessId={page.business_id}
        />
      )}

      {/* Quote Modal is passed via onQuoteClick from parent */}
    </div>
  )
          }
