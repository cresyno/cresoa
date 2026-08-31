'use client'

import { useState } from 'react'

// Premium Fonts
const fontFamily = "'Inter', 'Poppins', sans-serif"

export default function DynamicSunrise({ business, page, services, portfolio, reviews, onQuoteClick, onReviewClick }) {
  const [activeSection, setActiveSection] = useState('home')

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setActiveSection(id)
  }

  return (
    <div style={{ fontFamily, background: '#FFFFFF', color: '#111827', minHeight: '100vh' }}>
      {/* Sticky Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #F3F4F6', padding: '0.8rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {business.logo_url ? (
            <img src={business.logo_url} alt={business.name} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'contain' }} />
          ) : (
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'linear-gradient(135deg, #EA580C, #DB2777)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '1.2rem' }}>
              {business.name?.charAt(0) || 'B'}
            </div>
          )}
          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1E3A8A' }}>{business.name}</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', fontWeight: 600, color: '#6B7280' }}>
          <button onClick={() => scrollTo('services')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: activeSection === 'services' ? '#EA580C' : '#6B7280' }}>Services</button>
          <button onClick={() => scrollTo('portfolio')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: activeSection === 'portfolio' ? '#EA580C' : '#6B7280' }}>Portfolio</button>
          <button onClick={() => scrollTo('contact')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: activeSection === 'contact' ? '#EA580C' : '#6B7280' }}>Contact</button>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" style={{ background: 'linear-gradient(135deg, #EA580C 0%, #DB2777 50%, #7C3AED 100%)', color: '#fff', padding: '5rem 1.5rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '300px', height: '300px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-30%', left: '-10%', width: '200px', height: '200px', background: 'rgba(255,255,255,0.08)', borderRadius: '50%' }} />
        
        <div style={{ maxWidth: '700px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          {business.logo_url ? (
            <img src={business.logo_url} alt={business.name} style={{ width: '100px', height: '100px', borderRadius: '20px', objectFit: 'contain', background: 'rgba(255,255,255,0.9)', padding: '10px', marginBottom: '1.5rem', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }} />
          ) : (
            <div style={{ width: '100px', height: '100px', borderRadius: '20px', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', fontWeight: 900, color: '#EA580C', margin: '0 auto 1.5rem', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
              {business.name?.charAt(0) || 'B'}
            </div>
          )}
          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: 900, margin: '0 0 1rem', letterSpacing: '-0.02em' }}>{business.name}</h1>
          <p style={{ fontSize: '1.2rem', lineHeight: 1.8, maxWidth: '500px', margin: '0 auto', opacity: 0.95 }}>{page.description}</p>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" style={{ padding: '4rem 1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 900, marginBottom: '2.5rem', color: '#1E3A8A', letterSpacing: '-0.01em' }}>What We Offer</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {services.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', background: '#F3F4F6', borderRadius: '16px' }}>
              <p style={{ color: '#6B7280' }}>Our services are coming soon!</p>
            </div>
          ) : services.map((service, idx) => (
            <div key={idx} style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 16px rgba(234,88,12,0.08)', border: '1px solid #FDE68A', transition: 'transform 0.3s, box-shadow 0.3s' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #EA580C, #DB2777)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.5rem', marginBottom: '0.8rem' }}>
                {String(idx + 1).padStart(2, '0')}
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.5rem' }}>{service.name}</h3>
              <p style={{ color: '#EA580C', fontWeight: 700, margin: '0 0 0.5rem' }}>{service.price}</p>
              <p style={{ color: '#6B7280', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>{service.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Portfolio Section */}
      <section id="portfolio" style={{ padding: '4rem 1.5rem', background: '#F3F4F6' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 900, marginBottom: '2.5rem', color: '#1E3A8A' }}>Our Portfolio</h2>
          {portfolio.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', background: '#fff', borderRadius: '16px' }}>
              <p style={{ color: '#6B7280' }}>Our portfolio is coming soon!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {portfolio.map((img, idx) => (
                <div key={idx} style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
                  <img src={img.url} alt={`Work ${idx + 1}`} style={{ width: '100%', height: '200px', objectFit: 'cover', transition: 'transform 0.3s' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', transition: 'background 0.3s' }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Testimonials */}
      {reviews.length > 0 && (
        <section style={{ padding: '4rem 1.5rem', maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 900, marginBottom: '2.5rem', color: '#1E3A8A' }}>What Our Clients Say</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {reviews.map((review, idx) => (
              <blockquote key={idx} style={{ background: '#fff', borderLeft: '4px solid #EA580C', padding: '1.5rem', borderRadius: '12px', margin: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <p style={{ fontStyle: 'italic', margin: '0 0 0.8rem', lineHeight: 1.6, color: '#374151' }}>“{review.review_text}”</p>
                <footer style={{ color: '#6B7280', fontSize: '0.9rem' }}>
                  <strong style={{ color: '#1E3A8A' }}>{review.customer_name}</strong> · {'⭐'.repeat(review.rating)}
                </footer>
              </blockquote>
            ))}
          </div>
        </section>
      )}

      {/* Contact Section */}
      <section id="contact" style={{ background: '#1E3A8A', color: '#fff', padding: '4rem 1.5rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 900, margin: '0 0 1rem' }}>Get Started Today!</h2>
        <p style={{ opacity: 0.9, marginBottom: '2rem' }}>Let's work together to bring your vision to life.</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {page.show_whatsapp_button && business.phone && (
            <a href={`https://wa.me/${business.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener" style={{ background: '#25D366', color: '#fff', padding: '0.9rem 2rem', borderRadius: '999px', textDecoration: 'none', fontWeight: 700, boxShadow: '0 4px 12px rgba(37,211,102,0.3)', transition: 'transform 0.2s' }}>
              WhatsApp Us
            </a>
          )}
          {page.show_quote_button && (
            <button onClick={onQuoteClick} style={{ background: '#EA580C', color: '#fff', padding: '0.9rem 2rem', borderRadius: '999px', border: 'none', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(234,88,12,0.3)', transition: 'transform 0.2s' }}>
              Request a Quote
            </button>
          )}
          <button onClick={onReviewClick} style={{ background: 'transparent', color: '#fff', padding: '0.9rem 2rem', borderRadius: '999px', border: '2px solid #fff', fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}>
            Leave a Review
          </button>
        </div>
        {business.location && <p style={{ marginTop: '2rem', opacity: 0.7 }}>📍 {business.location}</p>}
      </section>

      {/* Footer */}
      <footer style={{ background: '#111827', color: '#9CA3AF', padding: '2rem 1.5rem', textAlign: 'center', fontSize: '0.85rem' }}>
        © {new Date().getFullYear()} {business.name} · Powered by <span style={{ color: '#EA580C', fontWeight: 700 }}>Cresoa</span>
      </footer>
    </div>
  )
          }
