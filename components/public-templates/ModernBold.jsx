'use client'

export default function ModernBold({ business, page, services, portfolio, reviews }) {
  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: '#FFFFFF', color: '#111827', minHeight: '100vh' }}>
      {/* Hero */}
      <section style={{ background: 'linear-gradient(135deg, #4C1D95 0%, #7C3AED 50%, #F97316 100%)', color: '#fff', padding: '4rem 1.5rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          {business.logo_url ? (
            <img src={business.logo_url} alt={business.name} style={{ width: '80px', height: '80px', objectFit: 'contain', marginBottom: '1rem', background: '#fff', borderRadius: '50%', padding: '8px' }} />
          ) : (
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 800, margin: '0 auto 1rem' }}>{business.name?.charAt(0) || 'B'}</div>
          )}
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, margin: '0 0 0.5rem', textTransform: 'uppercase' }}>{business.name}</h1>
          <p style={{ fontSize: '1.2rem', lineHeight: 1.7, opacity: 0.9 }}>{page.description}</p>
        </div>
      </section>

      {/* Services */}
      {services.length > 0 && (
        <section style={{ padding: '3rem 1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 900, marginBottom: '2rem', color: '#4C1D95' }}>Services</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            {services.map((service, idx) => (
              <div key={idx} style={{ background: '#F3F4F6', borderRadius: '16px', padding: '1.5rem', border: '2px solid transparent', transition: 'all 0.2s' }}>
                {service.image && <img src={service.image} alt={service.name} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', marginBottom: '0.8rem' }} />}
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.3rem' }}>{service.name}</h3>
                {service.price && <p style={{ color: '#F97316', fontWeight: 700, margin: '0 0 0.5rem' }}>₦{Number(service.price).toLocaleString()}</p>}
                <p style={{ color: '#6B7280', fontSize: '0.9rem', margin: 0 }}>{service.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Portfolio */}
      {portfolio.length > 0 && (
        <section style={{ padding: '3rem 1.5rem', background: '#4C1D95' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 900, marginBottom: '2rem', color: '#fff' }}>Our Work</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem' }}>
              {portfolio.map((img, idx) => (
                <img key={idx} src={img.url} alt={`Work ${idx + 1}`} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', border: '3px solid #F97316' }} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials */}
      {reviews.length > 0 && (
        <section style={{ padding: '3rem 1.5rem', maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 900, marginBottom: '2rem', color: '#4C1D95' }}>Reviews</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {reviews.map((review, idx) => (
              <blockquote key={idx} style={{ background: '#F3F4F6', borderLeft: '4px solid #F97316', padding: '1rem', borderRadius: '8px', margin: 0 }}>
                <p style={{ fontStyle: 'italic', margin: '0 0 0.5rem' }}>“{review.review_text}”</p>
                <footer style={{ color: '#6B7280', fontSize: '0.9rem' }}><strong>{review.customer_name}</strong> · {'⭐'.repeat(review.rating)}</footer>
              </blockquote>
            ))}
          </div>
        </section>
      )}

      {/* Contact */}
      <section style={{ background: '#F97316', color: '#fff', padding: '3rem 1.5rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 900, margin: '0 0 1rem' }}>Get in Touch!</h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {page.show_whatsapp_button && business.phone && (
            <a href={`https://wa.me/${business.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener" style={{ background: '#25D366', color: '#fff', padding: '0.8rem 1.5rem', borderRadius: '8px', textDecoration: 'none', fontWeight: 700 }}>WhatsApp</a>
          )}
          {page.show_quote_button && (
            <button onClick={() => window.open(`mailto:${business.email}?subject=Quote Request`, '_blank')} style={{ background: '#4C1D95', color: '#fff', padding: '0.8rem 1.5rem', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Request Quote</button>
          )}
        </div>
      </section>

      <footer style={{ background: '#111827', color: '#9CA3AF', padding: '1.5rem', textAlign: 'center', fontSize: '0.85rem' }}>
        © {new Date().getFullYear()} {business.name} · Powered by Cresoa
      </footer>
    </div>
  )
                }
