'use client'

export default function FreshSerene({ business, page, services, portfolio, reviews }) {
  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: '#F5F5DC', color: '#5C4033', minHeight: '100vh' }}>
      {/* Hero */}
      <section style={{ background: '#2D4A22', color: '#F5F5DC', padding: '4rem 1.5rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#9CAF88', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 800, margin: '0 auto 1rem', color: '#2D4A22' }}>
            {business.name?.charAt(0) || 'B'}
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 600, margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>{business.name}</h1>
          <p style={{ fontSize: '1.1rem', lineHeight: 1.7, opacity: 0.9 }}>{page.description}</p>
        </div>
      </section>

      {/* Services */}
      {services.length > 0 && (
        <section style={{ padding: '4rem 1.5rem', maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 600, marginBottom: '2rem', textAlign: 'center', color: '#2D4A22' }}>Our Offerings</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            {services.map((service, idx) => (
              <div key={idx} style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(45,74,34,0.08)' }}>
                {service.image && <img src={service.image} alt={service.name} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', marginBottom: '0.8rem' }} />}
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, margin: '0 0 0.3rem' }}>{service.name}</h3>
                {service.price && <p style={{ color: '#9CAF88', fontWeight: 700, margin: '0 0 0.5rem' }}>₦{Number(service.price).toLocaleString()}</p>}
                <p style={{ color: '#8B7D6B', fontSize: '0.9rem', margin: 0 }}>{service.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Portfolio */}
      {portfolio.length > 0 && (
        <section style={{ padding: '4rem 1.5rem', background: '#fff' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 600, marginBottom: '2rem', textAlign: 'center' }}>Gallery</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem' }}>
            {portfolio.map((img, idx) => (
              <img key={idx} src={img.url} alt={`Work ${idx + 1}`} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px' }} />
            ))}
          </div>
        </section>
      )}

      {/* Testimonials */}
      {reviews.length > 0 && (
        <section style={{ padding: '4rem 1.5rem', maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 600, marginBottom: '2rem', textAlign: 'center' }}>Kind Words</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {reviews.map((review, idx) => (
              <blockquote key={idx} style={{ background: '#fff', borderRadius: '8px', padding: '1rem', border: '1px solid #E5E0D8', margin: 0 }}>
                <p style={{ fontStyle: 'italic', margin: '0 0 0.5rem' }}>“{review.review_text}”</p>
                <footer style={{ color: '#8B7D6B', fontSize: '0.9rem' }}><strong>{review.customer_name}</strong> · {'⭐'.repeat(review.rating)}</footer>
              </blockquote>
            ))}
          </div>
        </section>
      )}

      {/* Contact */}
      <section style={{ background: '#9CAF88', color: '#2D4A22', padding: '4rem 1.5rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 600, margin: '0 0 1.5rem' }}>Get in Touch</h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {page.show_whatsapp_button && business.phone && (
            <a href={`https://wa.me/${business.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener" style={{ background: '#2D4A22', color: '#fff', padding: '0.8rem 1.5rem', borderRadius: '8px', textDecoration: 'none', fontWeight: 700 }}>WhatsApp</a>
          )}
          {page.show_quote_button && (
            <button onClick={() => window.open(`mailto:${business.email}?subject=Quote Request`, '_blank')} style={{ background: 'transparent', color: '#2D4A22', padding: '0.8rem 1.5rem', borderRadius: '8px', border: '2px solid #2D4A22', fontWeight: 700, cursor: 'pointer' }}>Request Quote</button>
          )}
        </div>
      </section>

      <footer style={{ background: '#2D4A22', color: '#F5F5DC', padding: '1.5rem', textAlign: 'center', fontSize: '0.85rem' }}>
        © {new Date().getFullYear()} {business.name} · Powered by Cresoa
      </footer>
    </div>
  )
}
