'use client'

export default function DynamicSunrise({ business, page, services, portfolio, reviews }) {
  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: '#FFFFFF', color: '#111827', minHeight: '100vh' }}>
      {/* Hero */}
      <section style={{ background: 'linear-gradient(90deg, #EA580C 0%, #DB2777 100%)', color: '#fff', padding: '5rem 1.5rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '20px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 800, margin: '0 auto 1rem', color: '#EA580C' }}>
            {business.name?.charAt(0) || 'B'}
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, margin: '0 0 0.5rem', textTransform: 'uppercase' }}>{business.name}</h1>
          <p style={{ fontSize: '1.2rem', lineHeight: 1.7 }}>{page.description}</p>
        </div>
      </section>

      {/* Services */}
      {services.length > 0 && (
        <section style={{ padding: '3rem 1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 900, marginBottom: '2rem', color: '#1E3A8A' }}>What We Offer</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            {services.map((service, idx) => (
              <div key={idx} style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 16px rgba(234,88,12,0.1)', border: '1px solid #FDE68A' }}>
                {service.image && <img src={service.image} alt={service.name} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', marginBottom: '0.8rem' }} />}
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.3rem' }}>{service.name}</h3>
                {service.price && <p style={{ color: '#EA580C', fontWeight: 700, margin: '0 0 0.5rem' }}>₦{Number(service.price).toLocaleString()}</p>}
                <p style={{ color: '#6B7280', fontSize: '0.9rem', margin: 0 }}>{service.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Portfolio */}
      {portfolio.length > 0 && (
        <section style={{ padding: '3rem 1.5rem', background: '#F3F4F6' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 900, marginBottom: '2rem', color: '#1E3A8A' }}>Our Portfolio</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem' }}>
              {portfolio.map((img, idx) => (
                <img key={idx} src={img.url} alt={`Work ${idx + 1}`} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', border: '3px solid #DB2777' }} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials */}
      {reviews.length > 0 && (
        <section style={{ padding: '3rem 1.5rem', maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 900, marginBottom: '2rem', color: '#1E3A8A' }}>Client Reviews</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {reviews.map((review, idx) => (
              <blockquote key={idx} style={{ background: '#fff', borderLeft: '4px solid #EA580C', padding: '1rem', borderRadius: '8px', margin: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <p style={{ fontStyle: 'italic', margin: '0 0 0.5rem' }}>“{review.review_text}”</p>
                <footer style={{ color: '#6B7280', fontSize: '0.9rem' }}><strong>{review.customer_name}</strong> · {'⭐'.repeat(review.rating)}</footer>
              </blockquote>
            ))}
          </div>
        </section>
      )}

      {/* Contact */}
      <section style={{ background: '#1E3A8A', color: '#fff', padding: '4rem 1.5rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 900, margin: '0 0 1.5rem' }}>Get Started Today!</h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {page.show_whatsapp_button && business.phone && (
            <a href={`https://wa.me/${business.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener" style={{ background: '#25D366', color: '#fff', padding: '0.8rem 1.5rem', borderRadius: '8px', textDecoration: 'none', fontWeight: 700 }}>WhatsApp</a>
          )}
          {page.show_quote_button && (
            <button onClick={() => window.open(`mailto:${business.email}?subject=Quote Request`, '_blank')} style={{ background: '#EA580C', color: '#fff', padding: '0.8rem 1.5rem', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Request Quote</button>
          )}
        </div>
      </section>

      <footer style={{ background: '#111827', color: '#9CA3AF', padding: '1.5rem', textAlign: 'center', fontSize: '0.85rem' }}>
        © {new Date().getFullYear()} {business.name} · Powered by Cresoa
      </footer>
    </div>
  )
                }
