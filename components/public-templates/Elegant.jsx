'use client'

import { useState } from 'react'
import CheckoutModal from '../public-page/CheckoutModal'
import ReviewModal from '../public-page/ReviewModal'
import FashionQuoteModal from '../public-page/FashionQuoteModal'
import RepairBookingModal from '../public-page/RepairBookingModal'
import PrintingQuoteModal from '../public-page/PrintingQuoteModal'

// Inline SVG social icons (no FontAwesome needed)
const SocialIcon = ({ name, size = 20, color = '#fff' }) => {
  const icons = {
    facebook: <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/></svg>,
    instagram: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>,
    tiktok: <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>,
    youtube: <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z"/></svg>,
    linkedin: <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM0 8h5v16H0V8zm7.5 0h4.78v2.2h.07c.67-1.27 2.3-2.6 4.73-2.6 5.06 0 6 3.33 6 7.66V24h-5v-7.3c0-1.74-.03-3.98-2.42-3.98-2.42 0-2.79 1.9-2.79 3.86V24h-5V8z"/></svg>,
    google: <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M12 11v2.6h6.2c-.3 1.6-1.7 4.6-6.2 4.6-3.7 0-6.8-3.1-6.8-6.8S8.3 4.6 12 4.6c2.1 0 3.5.9 4.3 1.7l2.9-2.8C17.4 2.2 15 1.2 12 1.2 6.4 1.2 1.8 5.8 1.8 11.4S6.4 21.6 12 21.6c3.7 0 6.4-2.6 7.2-6.3.3-1.2.4-2.5.4-3.3 0-.4 0-1-.1-1.5H12z"/></svg>,
  }
  return icons[name] || null
}

export default function Elegant({ business, page, services, shop, portfolio, reviews, onQuoteClick }) {
  const [cartItems, setCartItems] = useState([])
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [expandedImage, setExpandedImage] = useState(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sectorModal, setSectorModal] = useState(null)

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  // Dynamic colors and fonts
  const primary = page.color_primary || '#0F2B4A'
  const secondary = page.color_secondary || '#D4A52A'
  const accent = page.color_accent || '#D4A52A'
  const headingFont = page.font_heading || 'Inter'
  const bodyFont = page.font_body || 'Inter'

  // Header order & sidebar
  const defaultOrder = ['Home', 'About', 'Services', 'Shop', 'Work', 'Contact']
  const headerOrder = page.header_order || defaultOrder
  const sidebar = page.header_sidebar || false

  // Featured products (max 4)
  const featuredProducts = shop.filter(p => p.featured).slice(0, 4)

  // Contact info
  const phone = business.phone || ''
  const whatsapp = business.whatsapp || business.phone || ''
  const email = business.email || ''
  const address = business.location || ''

  // Business type and CTA
  const businessType = business.business_type || ''
  const ctaConfig = {
    fashion: { label: 'Request Custom Design', type: 'fashion' },
    repairs: { label: 'Book a Repair', type: 'repair' },
    printing: { label: 'Get a Printing Quote', type: 'printing' },
  }
  const defaultCta = { label: 'Request a Quote', type: 'quote' }
  const currentCta = page.cta_label ? { label: page.cta_label, type: page.cta_type } : (ctaConfig[businessType] || defaultCta)

  const handleCtaClick = () => {
    if (currentCta.type === 'fashion') setSectorModal('fashion')
    else if (currentCta.type === 'repair') setSectorModal('repair')
    else if (currentCta.type === 'printing') setSectorModal('printing')
    else {
      if (onQuoteClick) onQuoteClick()
    }
  }

  // Extra sections
  const extraSections = page.sector_sections || []

  const getCartTotal = () => {
    return cartItems.reduce((sum, item) => {
      const price = parseFloat(item.price.replace(/[^\d.]/g, '')) || 0
      return sum + (price * item.quantity)
    }, 0)
  }

  const addToCart = (product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.name === product.name)
      if (existing) return prev.map(item => item.name === product.name ? { ...item, quantity: item.quantity + 1 } : item)
      return [...prev, { ...product, quantity: 1 }]
    })
  }

  // Hero style using dynamic colors
  const heroStyle = page.cover_image_url ? {
    backgroundImage: `linear-gradient(rgba(10,22,40,0.7), rgba(10,22,40,0.7)), url(${page.cover_image_url})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    color: '#fff',
    fontFamily: headingFont,
  } : {
    background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`,
    color: '#fff',
    fontFamily: headingFont,
  }

  const heroTextAlign = page.hero_layout === 'left' ? 'left' : 'center'

  const navItems = headerOrder.map(item => {
    const label = item.toLowerCase()
    if (label === 'shop') {
      return (
        <a key={item} href={`/${page.slug || ''}/shop`} style={{ textDecoration: 'none', color: 'inherit', fontSize: '0.85rem', fontWeight: 500 }}>
          {item}
        </a>
      )
    }
    const scrollTarget = {
      home: 'home', about: 'about', services: 'services', work: 'portfolio', contact: 'contact'
    }[label] || 'home'
    return (
      <button key={item} onClick={() => scrollTo(scrollTarget)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}>
        {item}
      </button>
    )
  })

  return (
    <div style={{ fontFamily: bodyFont, minHeight: '100vh', background: '#FAFAF9' }}>
      {/* Header or Sidebar */}
      {sidebar ? (
        <>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ position: 'fixed', top: '15px', left: '15px', zIndex: 300, background: primary, color: '#fff', border: 'none', borderRadius: '8px', padding: '0.5rem 0.8rem', cursor: 'pointer', fontSize: '1.2rem' }}>☰</button>
          {sidebarOpen && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }} onClick={() => setSidebarOpen(false)} />}
          <div style={{ position: 'fixed', left: 0, top: 0, height: '100vh', width: '250px', background: primary, color: '#fff', padding: '2rem 1rem', transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.3s ease', zIndex: 250, display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '2rem' }}><span style={{ fontWeight: 800, fontSize: '1.2rem' }}>{business.name}</span></div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>{navItems}</nav>
          </div>
        </>
      ) : (
        <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(250,250,249,0.95)', backdropFilter: 'blur(10px)', borderBottom: `2px solid ${accent}`, padding: '0.8rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {business.logo_url ? <img src={business.logo_url} alt={business.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'contain' }} /> : <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>{business.name.charAt(0)}</div>}
            <span style={{ fontWeight: 600, fontSize: '1.1rem', color: primary }}>{business.name}</span>
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', fontWeight: 500, color: '#6B7280' }}>{navItems}</div>
        </nav>
      )}

      {/* Hero */}
      <section id="home" style={{ padding: '6rem 1.5rem', textAlign: heroTextAlign, ...heroStyle }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: heroTextAlign }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 300, letterSpacing: '-0.02em', margin: '0 0 1rem', lineHeight: 1.2, color: '#fff' }}>{business.name}</h1>
          <p style={{ fontSize: '1.15rem', lineHeight: 1.8, maxWidth: '500px', margin: '0 auto', opacity: 0.9 }}>{page.description}</p>
          <div style={{ display: 'flex', justifyContent: heroTextAlign === 'left' ? 'flex-start' : 'center', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap' }}>
            <button onClick={handleCtaClick} style={{ background: accent, color: '#fff', padding: '0.9rem 2rem', borderRadius: '999px', border: 'none', fontWeight: 700, cursor: 'pointer', boxShadow: `0 4px 14px ${accent}40` }}>{currentCta.label} →</button>
            <button onClick={() => scrollTo('portfolio')} style={{ background: 'transparent', color: '#fff', padding: '0.9rem 2rem', borderRadius: '999px', border: '2px solid #fff', fontWeight: 600, cursor: 'pointer' }}>View Our Work</button>
          </div>
        </div>
      </section>

      {/* About */}
      {page.about && (
        <section id="about" style={{ padding: '4rem 1.5rem', maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 400, textAlign: 'center', marginBottom: '2rem', color: primary }}>About Us</h2>
          <p style={{ fontSize: '1.1rem', color: '#4B5563', lineHeight: 2, textAlign: 'center' }}>{page.about}</p>
        </section>
      )}

      {/* Services */}
      {page.has_services !== false && services.length > 0 && (
        <section id="services" style={{ padding: '4rem 1.5rem', background: '#F3F4F6' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 400, textAlign: 'center', marginBottom: '2rem', color: primary }}>Our Services</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {services.map((service, idx) => (
                <div key={idx} style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
                  {service.image_url && <img src={service.image_url} alt={service.name} style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '12px', marginBottom: '1rem' }} />}
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 600, margin: '0 0 0.5rem' }}>{service.name}</h3>
                  <p style={{ color: '#6B7280', fontSize: '0.95rem', lineHeight: 1.6 }}>{service.description}</p>
                  <button onClick={handleCtaClick} style={{ marginTop: '1rem', padding: '0.5rem 1.2rem', borderRadius: '8px', border: 'none', background: accent, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Request Service →</button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Products */}
      {page.has_shop && featuredProducts.length > 0 && (
        <section id="shop" style={{ padding: '4rem 1.5rem', maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 400, textAlign: 'center', marginBottom: '2rem', color: primary }}>Featured Products</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {featuredProducts.map((product, idx) => (
              <div key={idx} style={{ background: '#fff', borderRadius: '12px', padding: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                {product.image_url && <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', marginBottom: '0.5rem' }} />}
                <h4 style={{ fontWeight: 600, margin: '0 0 0.3rem' }}>{product.name}</h4>
                <p style={{ color: accent, fontWeight: 700, margin: '0 0 0.5rem' }}>{product.price}</p>
                <p style={{ color: '#6B7280', fontSize: '0.85rem', lineHeight: 1.5 }}>{product.description}</p>
                <button onClick={() => addToCart(product)} style={{ marginTop: '0.5rem', width: '100%', padding: '0.6rem', borderRadius: '8px', border: 'none', background: primary, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Add to Cart</button>
              </div>
            ))}
          </div>
          {shop.length > featuredProducts.length && (
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <a href={`/${page.slug || ''}/shop`} style={{ padding: '0.7rem 1.5rem', background: primary, color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>View All Products</a>
            </div>
          )}
        </section>
      )}

      {/* Portfolio */}
      {portfolio.length > 0 && (
        <section id="portfolio" style={{ padding: '4rem 1.5rem', background: '#F3F4F6' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 400, textAlign: 'center', marginBottom: '2rem', color: primary }}>Our Work</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {portfolio.map((img, idx) => (
                <div key={idx} style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <img src={img.url} alt={`Work ${idx + 1}`} style={{ width: '100%', height: '220px', objectFit: 'cover', cursor: 'pointer' }} onClick={() => setExpandedImage(img)} />
                  {img.description && <p style={{ padding: '1rem', margin: 0, color: '#4B5563', fontSize: '0.9rem' }}>{img.description}</p>}
                </div>
              ))}
            </div>
          </div>
          {expandedImage && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '2rem' }}>
              <button onClick={() => setExpandedImage(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: accent, color: '#fff', border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
              <img src={expandedImage.url} alt="Expanded work" style={{ maxWidth: '80vw', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px' }} />
              {expandedImage.description && <p style={{ color: 'white', marginTop: '1rem', textAlign: 'center' }}>{expandedImage.description}</p>}
              <a href="/contact" onClick={(e) => { e.preventDefault(); scrollTo('contact'); setExpandedImage(null); }} style={{ marginTop: '1.5rem', background: accent, color: '#fff', padding: '0.8rem 2rem', borderRadius: '999px', textDecoration: 'none', fontWeight: 700 }}>Request Similar Work →</a>
            </div>
          )}
        </section>
      )}

      {/* Why Us */}
      {page.why_us && page.why_us.length > 0 && (
        <section style={{ padding: '4rem 1.5rem', maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 400, textAlign: 'center', marginBottom: '2rem', color: primary }}>Why Choose Us</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {page.why_us.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <span style={{ fontSize: '1.5rem', color: accent }}>✓</span>
                <span style={{ fontSize: '1.1rem', color: '#374151' }}>{item.text}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sector-specific extra sections */}
      {extraSections.includes('size-guide') && (
        <section style={{ padding: '4rem 1.5rem', maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 400, textAlign: 'center', marginBottom: '2rem', color: primary }}>Size Guide</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={{ border: '1px solid #ddd', padding: '0.5rem' }}>Size</th><th style={{ border: '1px solid #ddd', padding: '0.5rem' }}>Bust</th><th style={{ border: '1px solid #ddd', padding: '0.5rem' }}>Waist</th><th style={{ border: '1px solid #ddd', padding: '0.5rem' }}>Hips</th></tr></thead>
              <tbody><tr><td style={{ border: '1px solid #ddd', padding: '0.5rem' }}>S</td><td style={{ border: '1px solid #ddd', padding: '0.5rem' }}>34</td><td style={{ border: '1px solid #ddd', padding: '0.5rem' }}>26</td><td style={{ border: '1px solid #ddd', padding: '0.5rem' }}>36</td></tr><tr><td style={{ border: '1px solid #ddd', padding: '0.5rem' }}>M</td><td style={{ border: '1px solid #ddd', padding: '0.5rem' }}>36</td><td style={{ border: '1px solid #ddd', padding: '0.5rem' }}>28</td><td style={{ border: '1px solid #ddd', padding: '0.5rem' }}>38</td></tr></tbody>
            </table>
          </div>
        </section>
      )}
      {extraSections.includes('repair-process') && (
        <section style={{ padding: '4rem 1.5rem', maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 400, textAlign: 'center', marginBottom: '2rem', color: primary }}>Repair Process</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div><strong>1.</strong> Contact us with your issue</div>
            <div><strong>2.</strong> We assess and give a quote</div>
            <div><strong>3.</strong> We repair and return</div>
          </div>
        </section>
      )}
      {extraSections.includes('pricing') && (
        <section style={{ padding: '4rem 1.5rem', maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 400, textAlign: 'center', marginBottom: '2rem', color: primary }}>Pricing Packages</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ background: '#fff', padding: '1rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}><h4>Starter</h4><p>₦10,000</p></div>
            <div style={{ background: '#fff', padding: '1rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}><h4>Pro</h4><p>₦25,000</p></div>
          </div>
        </section>
      )}

      {/* Testimonials */}
      {reviews.length > 0 && (
        <section style={{ padding: '4rem 1.5rem', maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 400, textAlign: 'center', marginBottom: '2rem', color: primary }}>What Clients Say</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {reviews.map((review, idx) => (
              <blockquote key={idx} style={{ background: '#fff', borderLeft: `4px solid ${accent}`, padding: '1.5rem', borderRadius: '12px', margin: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <p style={{ fontStyle: 'italic', margin: '0 0 0.8rem' }}>"{review.review_text}"</p>
                <footer style={{ color: '#6B7280', fontSize: '0.9rem' }}><strong>{review.customer_name}</strong> · {'⭐'.repeat(review.rating)}</footer>
              </blockquote>
            ))}
          </div>
        </section>
      )}

      {/* Contact */}
      <section id="contact" style={{ background: primary, color: '#fff', padding: '4rem 1.5rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 400, margin: '0 0 1.5rem' }}>Get in Touch</h2>
        <p style={{ opacity: 0.8, marginBottom: '2rem' }}>We'd love to hear from you!</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {page.show_whatsapp_button && whatsapp && <a href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener" style={{ background: '#25D366', color: '#fff', padding: '0.9rem 2rem', borderRadius: '999px', textDecoration: 'none', fontWeight: 600 }}>WhatsApp Us</a>}
          {page.show_quote_button && <button onClick={handleCtaClick} style={{ background: accent, color: '#fff', padding: '0.9rem 2rem', borderRadius: '999px', border: 'none', fontWeight: 600, cursor: 'pointer' }}>{currentCta.label}</button>}
          <button onClick={() => setReviewOpen(true)} style={{ background: 'transparent', color: '#fff', padding: '0.9rem 2rem', borderRadius: '999px', border: '2px solid #fff', fontWeight: 600, cursor: 'pointer' }}>Leave a Review</button>
        </div>
        {/* Social Icons (inline SVG) */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
          {business.facebook && <a href={business.facebook} target="_blank" rel="noopener"><SocialIcon name="facebook" size={24} color="#fff" /></a>}
          {business.instagram && <a href={business.instagram} target="_blank" rel="noopener"><SocialIcon name="instagram" size={24} color="#fff" /></a>}
          {business.tiktok && <a href={business.tiktok} target="_blank" rel="noopener"><SocialIcon name="tiktok" size={24} color="#fff" /></a>}
          {business.youtube && <a href={business.youtube} target="_blank" rel="noopener"><SocialIcon name="youtube" size={24} color="#fff" /></a>}
          {business.linkedin && <a href={business.linkedin} target="_blank" rel="noopener"><SocialIcon name="linkedin" size={24} color="#fff" /></a>}
          {business.google_business && <a href={business.google_business} target="_blank" rel="noopener"><SocialIcon name="google" size={24} color="#fff" /></a>}
        </div>
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
        <button onClick={() => setCheckoutOpen(true)} style={{ position: 'fixed', bottom: '20px', right: '20px', background: '#25D366', color: '#fff', padding: '1rem 1.5rem', borderRadius: '999px', border: 'none', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,211,102,0.4)', zIndex: 1000 }}>🛒 Checkout ({cartItems.length} items) - ₦{getCartTotal().toLocaleString()}</button>
      )}

      {/* Modals */}
      {checkoutOpen && <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} cartItems={cartItems} business={business} page={page} onSuccess={() => setCartItems([])} />}
      {reviewOpen && <ReviewModal open={reviewOpen} onClose={() => setReviewOpen(false)} businessId={page.business_id} />}
      {sectorModal === 'fashion' && <FashionQuoteModal open={true} onClose={() => setSectorModal(null)} businessId={page.business_id} businessName={business.name} />}
      {sectorModal === 'repair' && <RepairBookingModal open={true} onClose={() => setSectorModal(null)} businessId={page.business_id} businessName={business.name} />}
      {sectorModal === 'printing' && <PrintingQuoteModal open={true} onClose={() => setSectorModal(null)} businessId={page.business_id} businessName={business.name} />}
    </div>
  )
}
