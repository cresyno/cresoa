'use client'

import { useState } from 'react'
import CheckoutModal from '../public-page/CheckoutModal'
import QuoteModal from '../public-page/QuoteModal'
import ReviewModal from '../public-page/ReviewModal'

export default function CreativeStudio({ business, page, services, shop, portfolio, reviews, onQuoteClick }) {
  const [cartItems, setCartItems] = useState([])
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [expandedImage, setExpandedImage] = useState(null)
  const [reviewOpen, setReviewOpen] = useState(false)

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  const featuredProducts = shop.filter(p => p.featured).slice(0, 4)

  const heroStyle = page.cover_image_url ? {
    backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${page.cover_image_url})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    color: '#fff',
  } : {
    background: 'linear-gradient(135deg, #FF6B6B, #FFE66D, #6BCB77)',
    color: '#fff',
  }

  const getCartTotal = () => {
    return cartItems.reduce((sum, item) => {
      const price = parseFloat(item.price.replace(/[^\d.]/g, '')) || 0
      return sum + (price * item.quantity)
    }, 0)
  }

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif", minHeight: '100vh', background: '#fafafa' }}>
      {/* Header */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', borderBottom: '2px solid #FF6B6B', padding: '0.8rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {business.logo_url ? <img src={business.logo_url} alt={business.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'contain' }} /> : <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#FF6B6B', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>{business.name.charAt(0)}</div>}
          <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#222' }}>{business.name}</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', fontWeight: 600, color: '#555' }}>
          <button onClick={() => scrollTo('home')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Home</button>
          <button onClick={() => scrollTo('about')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>About</button>
          <button onClick={() => scrollTo('services')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Services</button>
          {page.has_shop && <a href={`/${page.slug}/shop`} style={{ textDecoration: 'none', color: '#FF6B6B' }}>Shop</a>}
          <button onClick={() => scrollTo('portfolio')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Work</button>
          <button onClick={() => scrollTo('contact')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Contact</button>
        </div>
      </nav>

      {/* Hero */}
      <section id="home" style={{ padding: '6rem 1.5rem', textAlign: 'center', ...heroStyle }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '2.8rem', fontWeight: 800, margin: '0 0 1rem', textShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}>{business.name}</h1>
          <p style={{ fontSize: '1.2rem', lineHeight: 1.8, maxWidth: '500px', margin: '0 auto', opacity: 0.9 }}>{page.description}</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
            <button onClick={onQuoteClick} style={{ background: '#FF6B6B', color: '#fff', padding: '0.9rem 2rem', borderRadius: '8px', border: 'none', fontWeight: 700 }}>Get a Quote</button>
            <button onClick={() => scrollTo('portfolio')} style={{ background: 'transparent', color: '#fff', padding: '0.9rem 2rem', borderRadius: '8px', border: '2px solid #fff', fontWeight: 700 }}>See Our Work</button>
          </div>
        </div>
      </section>

      {/* About */}
      {page.about && (
        <section id="about" style={{ padding: '4rem 1.5rem', maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#FF6B6B', textAlign: 'center', marginBottom: '2rem' }}>About Us</h2>
          <p style={{ fontSize: '1.1rem', lineHeight: 2, color: '#555', textAlign: 'center' }}>{page.about}</p>
        </section>
      )}

      {/* Services */}
      {page.has_services && services.length > 0 && (
        <section id="services" style={{ padding: '4rem 1.5rem', background: '#f0f0f0' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#FF6B6B', textAlign: 'center', marginBottom: '2rem' }}>Our Services</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {services.map((s, i) => (
                <div key={i} style={{ background: '#fff', padding: '1.5rem', borderBottom: '4px solid #FF6B6B', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                  {s.image_url && <img src={s.image_url} alt={s.name} style={{ width: '100%', height: '150px', objectFit: 'cover', marginBottom: '1rem' }} />}
                  <h3 style={{ fontWeight: 700, color: '#222' }}>{s.name}</h3>
                  <p style={{ color: '#666', lineHeight: 1.6 }}>{s.description}</p>
                  <button onClick={onQuoteClick} style={{ background: '#FF6B6B', color: '#fff', padding: '0.5rem 1.2rem', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Request</button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Products */}
      {page.has_shop && featuredProducts.length > 0 && (
        <section id="shop" style={{ padding: '4rem 1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#FF6B6B', textAlign: 'center', marginBottom: '2rem' }}>Featured Products</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            {featuredProducts.map((p, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #eee', borderRadius: '8px', padding: '1rem', transition: 'transform 0.2s' }}>
                {p.image_url && <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '180px', objectFit: 'cover' }} />}
                <h4 style={{ fontWeight: 700, margin: '0.5rem 0' }}>{p.name}</h4>
                <p style={{ color: '#FF6B6B', fontWeight: 700 }}>{p.price}</p>
                <p style={{ color: '#666', fontSize: '0.9rem' }}>{p.description}</p>
                <button onClick={() => addToCart(p)} style={{ background: '#FF6B6B', color: '#fff', width: '100%', padding: '0.7rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>Add to Cart</button>
              </div>
            ))}
          </div>
          {shop.length > featuredProducts.length && (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <a href={`/${page.slug}/shop`} style={{ color: '#FF6B6B', fontWeight: 700 }}>View All Products</a>
            </div>
          )}
        </section>
      )}

      {/* Portfolio */}
      {portfolio.length > 0 && (
        <section id="portfolio" style={{ padding: '4rem 1.5rem', background: '#f0f0f0' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#FF6B6B', textAlign: 'center', marginBottom: '2rem' }}>Our Work</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {portfolio.map((img, i) => (
                <div key={i} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer' }} onClick={() => setExpandedImage(img)}>
                  <img src={img.url} alt={`Work ${i}`} style={{ width: '100%', height: '250px', objectFit: 'cover' }} />
                  {img.description && <p style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0.5rem', background: 'rgba(0,0,0,0.6)', color: '#fff', margin: 0, fontSize: '0.9rem' }}>{img.description}</p>}
                </div>
              ))}
            </div>
          </div>
          {expandedImage && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
              <button onClick={() => setExpandedImage(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: '#FF6B6B', border: 'none', fontSize: '1.5rem', width: '40px', height: '40px', borderRadius: '50%' }}>×</button>
              <img src={expandedImage.url} alt="Expanded" style={{ maxWidth: '80vw', maxHeight: '70vh', objectFit: 'contain' }} />
              <p style={{ color: '#fff' }}>{expandedImage.description}</p>
              <button onClick={() => { scrollTo('contact'); setExpandedImage(null); }} style={{ background: '#FF6B6B', color: '#fff', padding: '0.8rem 2rem', border: 'none', marginTop: '1rem' }}>Request Similar Work</button>
            </div>
          )}
        </section>
      )}

      {/* Why Us */}
      {page.why_us && page.why_us.length > 0 && (
        <section style={{ padding: '4rem 1.5rem', maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, textAlign: 'center', marginBottom: '2rem', color: '#FF6B6B' }}>Why Choose Us</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {page.why_us.map((w, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: '#fff', padding: '1rem', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                <span style={{ color: '#FF6B6B', fontSize: '1.5rem' }}>✦</span>
                <span style={{ fontSize: '1rem', color: '#444' }}>{w.text}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Contact */}
      <section id="contact" style={{ background: '#FF6B6B', color: '#fff', padding: '4rem 1.5rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Get in Touch</h2>
        <p style={{ opacity: 0.9, marginBottom: '2rem' }}>We'd love to hear from you!</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {page.show_whatsapp_button && business.whatsapp && <a href={`https://wa.me/${business.whatsapp.replace(/\D/g, '')}`} style={{ background: '#fff', color: '#FF6B6B', padding: '0.9rem 2rem', textDecoration: 'none', fontWeight: 700 }}>WhatsApp</a>}
          {page.show_quote_button && <button onClick={onQuoteClick} style={{ background: '#fff', color: '#FF6B6B', padding: '0.9rem 2rem', border: 'none', fontWeight: 700 }}>Request a Quote</button>}
          <button onClick={() => setReviewOpen(true)} style={{ background: 'transparent', color: '#fff', padding: '0.9rem 2rem', border: '2px solid #fff', fontWeight: 700 }}>Leave a Review</button>
        </div>
        <div style={{ marginTop: '2rem' }}>
          {business.phone && <p><a href={`tel:${business.phone}`} style={{ color: '#fff' }}>📞 {business.phone}</a></p>}
          {business.email && <p><a href={`mailto:${business.email}`} style={{ color: '#fff' }}>✉️ {business.email}</a></p>}
          {business.location && <p>📍 {business.location}</p>}
        </div>
        {(business.facebook || business.instagram || business.tiktok || business.youtube || business.linkedin) && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
            {business.facebook && <a href={business.facebook} target="_blank" rel="noopener" style={{ color: '#fff' }}><i className="fab fa-facebook" /></a>}
            {business.instagram && <a href={business.instagram} target="_blank" rel="noopener" style={{ color: '#fff' }}><i className="fab fa-instagram" /></a>}
            {business.tiktok && <a href={business.tiktok} target="_blank" rel="noopener" style={{ color: '#fff' }}><i className="fab fa-tiktok" /></a>}
            {business.youtube && <a href={business.youtube} target="_blank" rel="noopener" style={{ color: '#fff' }}><i className="fab fa-youtube" /></a>}
            {business.linkedin && <a href={business.linkedin} target="_blank" rel="noopener" style={{ color: '#fff' }}><i className="fab fa-linkedin" /></a>}
          </div>
        )}
      </section>

      <footer style={{ background: '#222', color: '#aaa', textAlign: 'center', padding: '1.5rem', fontSize: '0.85rem' }}>
        {page.footer_text || `© ${new Date().getFullYear()} ${business.name} · Powered by Cresoa`}
      </footer>

      {/* Floating Cart */}
      {cartItems.length > 0 && (
        <button onClick={() => setCheckoutOpen(true)} style={{ position: 'fixed', bottom: '20px', right: '20px', background: '#FF6B6B', color: '#fff', padding: '1rem 1.5rem', borderRadius: '50px', border: 'none', fontWeight: 700, zIndex: 1000 }}>🛒 ({cartItems.length})</button>
      )}
      {checkoutOpen && <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} cartItems={cartItems} business={business} page={page} onSuccess={() => setCartItems([])} />}
      {reviewOpen && <ReviewModal open={reviewOpen} onClose={() => setReviewOpen(false)} businessId={page.business_id} />}
    </div>
  )
        }
