'use client'

import { useState } from 'react'

const fonts = "'Playfair Display', 'Inter', sans-serif"

export default function Elegant({ business, page, services, portfolio, reviews, onQuoteClick, onReviewClick }) {
  const [activeNav, setActiveNav] = useState('home')
  const scrollTo = (id) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setActiveNav(id) }

  const heroStyle = page.cover_image_url ? {
    background: `linear-gradient(rgba(219,39,119,0.3), rgba(30,41,59,0.5)), url(${page.cover_image_url}) center/cover no-repeat`,
    color: '#fff',
  } : { background: 'linear-gradient(180deg, #FAFAF9 0%, #FDF2F8 100%)', color: '#1E293B' }

  return (
    <div style={{ fontFamily: fonts, background: '#FAFAF9', color: '#1E293B', minHeight: '100vh' }}>
      {/* Header */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(250,250,249,0.95)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E5E7EB', padding: '0.8rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {business.logo_url ? (
            <img src={business.logo_url} alt={business.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'contain', background: '#fff', border: '1px solid #E5E7EB' }} />
          ) : (
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#DB2777', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>{business.name?.charAt(0) || 'B'}</div>
          )}
          <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{business.name}</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
          <button onClick={() => scrollTo('about')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>About</button>
          <button onClick={() => scrollTo('services')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>Services</button>
          <button onClick={() => scrollTo('portfolio')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>Work</button>
          <button onClick={() => scrollTo('contact')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>Contact</button>
        </div>
      </nav>

      {/* Hero */}
      <section id="home" style={{ padding: '6rem 1.5rem', textAlign: 'center', ...heroStyle }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          {business.logo_url ? (
            <img src={business.logo_url} alt={business.name} style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'contain', background: '#fff', padding: '10px', marginBottom: '1.5rem', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
          ) : (
            <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#DB2777', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 800, color: '#fff', margin: '0 auto 1.5rem' }}>{business.name?.charAt(0) || 'B'}</div>
          )}
          <h1 style={{ fontSize: '3rem', fontWeight: 400, letterSpacing: '-0.02em', margin: '0 0 1rem' }}>{business.name}</h1>
          <p style={{ fontSize: '1.2rem', lineHeight: 1.8, maxWidth: '500px', margin: '0 auto' }}>{page.description}</p>
        </div>
      </section>

      {/* About */}
      {page.about && (
        <section id="about" style={{ padding: '4rem 1.5rem', maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 400, textAlign: 'center', marginBottom: '2rem' }}>About Us</h2>
          <p style={{ fontSize: '1.05rem', color: '#4B5563', lineHeight: 2, textAlign: 'center' }}>{page.about}</p>
        </section>
      )}

      {/* Services */}
      <section id="services" style={{ padding: '4rem 1.5rem', maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 400, textAlign: 'center', marginBottom: '2rem' }}>Our Services</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          {services.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', background: '#fff', borderRadius: '12px' }}>Our services are coming soon!</div>
          ) : services.map((service, idx) => (
            <div key={idx} style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #E5E7EB' }}>
              {service.image_url && <img src={service.image_url} alt={service.name} style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '8px', marginBottom: '0.8rem' }} />}
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 0.5rem' }}>{service.name}</h3>
              <p style={{ color: '#DB2777', fontWeight: 600, margin: '0 0 0.5rem' }}>{service.price}</p>
              <p style={{ color: '#6B7280', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>{service.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Portfolio */}
      <section id="portfolio" style={{ padding: '4rem 1.5rem', background: '#fff' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 400, textAlign: 'center', marginBottom: '2rem' }}>Our Work</h2>
          {portfolio.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', background: '#F3F4F6', borderRadius: '12px' }}>Our portfolio is coming soon!</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {portfolio.map((img, idx) => (
                <div key={idx} style={{ background: '#F3F4F6', borderRadius: '12px', overflow: 'hidden' }}>
                  <img src={img.url} alt={`Work ${idx + 1}`} style={{ width: '100%', height: '220px', objectFit: 'cover' }} />
                  {img.description && <p style={{ padding: '0.8rem 1rem', margin: 0, color: '#4B5563', fontSize: '0.9rem', textAlign: 'center' }}>{img.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Testimonials */}
      {reviews.length > 0 && (
        <section style={{ padding: '4rem 1.5rem', maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 400, textAlign: 'center', marginBottom: '2rem' }}>Testimonials</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {reviews.map((review, idx) => (
              <blockquote key={idx} style={{ background: '#fff', borderLeft: '4px solid #DB2777', padding: '1.5rem', borderRadius: '12px', margin: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <p style={{ fontStyle: 'italic', margin: '0 0 0.8rem', lineHeight: 1.6 }}>“{review.review_text}”</p>
                <footer style={{ color: '#6B7280', fontSize: '0.9rem' }}><strong>{review.customer_name}</strong> · {'⭐'.repeat(review.rating)}</footer>
              </blockquote>
            ))}
          </div>
        </section>
      )}

      {/* Contact */}
      <section id="contact" style={{ background: '#1E293B', color: '#fff', padding: '4rem 1.5rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 400, margin: '0 0 1.5rem' }}>Let's Work Together</h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {page.show_whatsapp_button && business.phone && (
            <a href={`https://wa.me/${business.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener" style={{ background: '#25D366', color: '#fff', padding: '0.9rem 2rem', borderRadius: '999px', textDecoration: 'none', fontWeight: 600 }}>WhatsApp</a>
          )}
          {page.show_quote_button && <button onClick={onQuoteClick} style={{ background: '#DB2777', color: '#fff', padding: '0.9rem 2rem', borderRadius: '999px', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Request Quote</button>}
          <button onClick={onReviewClick} style={{ background: 'transparent', color: '#fff', padding: '0.9rem 2rem', borderRadius: '999px', border: '2px solid #fff', fontWeight: 600, cursor: 'pointer' }}>Leave Review</button>
        </div>
        {business.location && <p style={{ marginTop: '2rem', opacity: 0.7 }}>📍 {business.location}</p>}
      </section>

      <footer style={{ background: '#111827', color: '#9CA3AF', padding: '2rem 1.5rem', textAlign: 'center', fontSize: '0.85rem' }}>
        © {new Date().getFullYear()} {business.name} · Powered by <span style={{ color: '#DB2777', fontWeight: 700 }}>Cresoa</span>
      </footer>
    </div>
  )
            }
