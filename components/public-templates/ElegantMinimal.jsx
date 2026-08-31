'use client'

export default function ElegantMinimal({ business, page, services, portfolio, reviews }) {
  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: '#FAFAF9', color: '#000000', minHeight: '100vh' }}>
      {/* Hero */}
      <section style={{ padding: '6rem 1.5rem', textAlign: 'center', borderBottom: '1px solid #E5E7EB' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#14B8A6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 800, margin: '0 auto 1.5rem', color: '#fff' }}>
            {business.name?.charAt(0) || 'B'}
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 300, letterSpacing: '-0.02em', margin: '0 0 1rem' }}>{business.name}</h1>
          <p style={{ fontSize: '1.2rem', color: '#6B7280', lineHeight: 1.7, maxWidth: '500px', margin: '0 auto' }}>{page.description}</p>
        </div>
      </section>

      {/* Services */}
      {services.length > 0 && (
        <section style={{ padding: '4rem 1.5rem', maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2rem', textAlign: 'center', color: '#1E293B' }}>Services</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
            {services.map((service, idx) => (
              <div key={idx} style={{ borderTop: '2px solid #14B8A6', paddingTop: '1rem' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 500, margin: '0 0 0.5rem' }}>{service.name}</h3>
                {service.price && <p style={{ color: '#14B8A6', fontWeight: 600, margin: '0 0 0.5rem' }}>₦{Number(service.price).toLocaleString()}</p>}
                <p style={{ color: '#6B7280', fontSize: '0.95rem', lineHeight: 1.6 }}>{service.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Portfolio */}
      {portfolio.length > 0 && (
        <section style={{ padding: '4rem 1.5rem', background: '#fff' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2rem', textAlign: 'center' }}>Selected Work</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {portfolio.map((img, idx) => (
              <img key={idx} src={img.url} alt={`Work ${idx + 1}`} style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '4px' }} />
            ))}
          </div>
        </section>
      )}

      {/* Testimonials */}
      {reviews.length > 0 && (
        <section style={{ padding: '4rem 1.5rem', maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2rem', textAlign: 'center' }}>Testimonials</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {reviews.map((review, idx) => (
              <blockquote key={idx} style={{ borderLeft: '2px solid #14B8A6', paddingLeft: '1rem', margin: 0 }}>
                <p style={{ fontStyle: 'italic', margin: '0 0 0.5rem', fontSize: '1.05rem', lineHeight: 1.6 }}>“{review.review_text}”</p>
                <footer style={{ color: '#9CA3AF', fontSize: '0.9rem' }}><strong>{review.customer_name}</strong> · {'⭐'.repeat(review.rating)}</footer>
              </blockquote>
            ))}
          </div>
        </section>
      )}

      {/* Contact */}
      <section style={{ padding: '4rem 1.5rem', background: '#1E293B', color: '#fff', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 400, margin: '0 0 1.5rem' }}>Contact Us</h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {page.show_whatsapp_button && business.phone && (
            <a href={`https://wa.me/${business.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener" style={{ background: '#14B8A6', color: '#fff', padding: '0.8rem 2rem', borderRadius: '999px', textDecoration: 'none', fontWeight: 600 }}>WhatsApp</a>
          )}
          {page.show_quote_button && (
            <button onClick={() => window.open(`mailto:${business.email}?subject=Quote Request`, '_blank')} style={{ background: 'transparent', color: '#fff', padding: '0.8rem 2rem', borderRadius: '999px', border: '1px solid #14B8A6', fontWeight: 600, cursor: 'pointer' }}>Request Quote</button>
          )}
        </div>
        {business.location && <p style={{ marginTop: '1.5rem', opacity: 0.7 }}>📍 {business.location}</p>}
      </section>

      <footer style={{ background: '#111827', color: '#6B7280', padding: '1.5rem', textAlign: 'center', fontSize: '0.85rem' }}>
        © {new Date().getFullYear()} {business.name} · Powered by Cresoa
      </footer>
    </div>
  )
      }
