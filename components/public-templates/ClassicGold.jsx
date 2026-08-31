'use client'

// ─── Classic Gold Template ───
export default function ClassicGold({ business, page, services, portfolio, reviews }) {
  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: '#F7F5F0', color: '#1A1A1A', minHeight: '100vh' }}>
      {/* Hero Section */}
      <section style={{ background: 'linear-gradient(135deg, #0F2B4A 0%, #1A3F66 100%)', color: '#fff', padding: '4rem 1.5rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          {business.logo_url ? (
            <img src={business.logo_url} alt={business.name} style={{ width: '80px', height: '80px', objectFit: 'contain', marginBottom: '1rem', background: '#fff', borderRadius: '12px', padding: '8px' }} />
          ) : (
            <div style={{ width: '80px', height: '80px', borderRadius: '12px', background: '#D4A52A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 800, margin: '0 auto 1rem' }}>
              {business.name?.charAt(0) || 'B'}
            </div>
          )}
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0 0 0.5rem' }}>{business.name}</h1>
          <p style={{ fontSize: '1.1rem', opacity: 0.9, lineHeight: 1.7 }}>{page.description || 'Welcome to our business.'}</p>
          {business.location && <p style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '1rem' }}>📍 {business.location}</p>}
        </div>
      </section>

      {/* Services Section */}
      {services.length > 0 && (
        <section style={{ padding: '3rem 1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '1.8rem', fontWeight: 800, marginBottom: '2rem' }}>Our Services</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            {services.map((service, idx) => (
              <div key={idx} style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 16px rgba(15,43,74,0.06)', border: '1px solid #E5E0D8' }}>
                {service.image && <img src={service.image} alt={service.name} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', marginBottom: '0.8rem' }} />}
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.3rem' }}>{service.name}</h3>
                {service.price && <p style={{ color: '#D4A52A', fontWeight: 700, margin: '0 0 0.5rem' }}>₦{Number(service.price).toLocaleString()}</p>}
                <p style={{ color: '#8A8A8A', fontSize: '0.9rem', margin: 0 }}>{service.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Portfolio Section */}
      {portfolio.length > 0 && (
        <section style={{ padding: '3rem 1.5rem', background: '#fff' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', fontSize: '1.8rem', fontWeight: 800, marginBottom: '2rem' }}>Our Work</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem' }}>
              {portfolio.map((img, idx) => (
                <img key={idx} src={img.url} alt={`Work ${idx + 1}`} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px' }} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials */}
      {reviews.length > 0 && (
        <section style={{ padding: '3rem 1.5rem', maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '1.8rem', fontWeight: 800, marginBottom: '2rem' }}>What Our Customers Say</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {reviews.map((review, idx) => (
              <blockquote key={idx} style={{ background: '#fff', borderLeft: '4px solid #D4A52A', padding: '1rem', borderRadius: '8px', margin: 0, boxShadow: '0 2px 8px rgba(15,43,74,0.04)' }}>
                <p style={{ fontStyle: 'italic', margin: '0 0 0.5rem' }}>“{review.review_text}”</p>
                <footer style={{ color: '#8A8A8A', fontSize: '0.9rem' }}>
                  <strong>{review.customer_name}</strong> · {'⭐'.repeat(review.rating)}
                </footer>
              </blockquote>
            ))}
          </div>
        </section>
      )}

      {/* Contact / CTA */}
      <section style={{ background: '#0F2B4A', color: '#fff', padding: '3rem 1.5rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 1rem' }}>Get in Touch</h2>
        <p style={{ opacity: 0.9, marginBottom: '1.5rem' }}>We'd love to hear from you!</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {page.show_whatsapp_button && business.phone && (
            <a href={`https://wa.me/${business.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener" style={{ background: '#25D366', color: '#fff', padding: '0.8rem 1.5rem', borderRadius: '8px', textDecoration: 'none', fontWeight: 700 }}>WhatsApp Us</a>
          )}
          {page.show_quote_button && (
            <button onClick={() => window.open(`mailto:${business.email}?subject=Quote Request`, '_blank')} style={{ background: '#D4A52A', color: '#0F2B4A', padding: '0.8rem 1.5rem', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Request a Quote</button>
          )}
        </div>
        {business.location && <p style={{ marginTop: '1.5rem', opacity: 0.8 }}>📍 {business.location}</p>}
      </section>

      {/* Footer */}
      <footer style={{ background: '#0A1628', color: '#8899AA', padding: '1.5rem', textAlign: 'center', fontSize: '0.85rem' }}>
        © {new Date().getFullYear()} {business.name} · Powered by Cresoa
      </footer>
    </div>
  )
                                    }
