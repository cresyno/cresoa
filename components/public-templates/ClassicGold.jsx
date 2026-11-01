'use client'

import { useState } from 'react'

export default function ClassicGold({ business, page }) {
  const [openFaq, setOpenFaq] = useState(null)

  // ── SAFE DATA EXTRACTION ──
  const name = business?.name || 'Your Business'
  const logo = business?.logo_url || ''
  const address = business?.location || ''
  const phone = business?.phone || ''
  const whatsapp = business?.whatsapp || phone // Fallback to phone if no whatsapp
  
  const heroImage = page?.cover_image_url || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1200'
  const aboutText = page?.about_text || 'Welcome to our business. We provide premium quality services tailored to your needs.'
  
  const gallery = Array.isArray(page?.gallery_urls) ? page.gallery_urls : []
  const sectorData = page?.sector_data || {}
  const services = Array.isArray(sectorData.services) ? sectorData.services : []
  const testimonials = Array.isArray(sectorData.testimonials) ? sectorData.testimonials : []
  const faqs = Array.isArray(sectorData.faqs) ? sectorData.faqs : []
  const businessHours = sectorData.business_hours || ''
  const fabrics = sectorData.fabrics || ''

  // WhatsApp Link Generator
  const getWhatsAppLink = (message = "Hello! I found your website and I'd like to make an enquiry.") => {
    if (!whatsapp) return '#'
    let cleanPhone = whatsapp.replace(/\D/g, '')
    if (cleanPhone.startsWith('0')) cleanPhone = '234' + cleanPhone.slice(1)
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: '#333', background: '#fafafa', minHeight: '100vh', position: 'relative' }}>
      
      {/* ── 1. HERO SECTION ── */}
      <section style={{ position: 'relative', height: '80vh', minHeight: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px', background: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.8)), url(${heroImage}) center/cover` }}>
        {logo && (
          <img src={logo} alt={name} style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #D4AF37', marginBottom: '20px', background: '#fff' }} />
        )}
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', fontWeight: 700, color: '#fff', margin: '0 0 10px 0', letterSpacing: '1px' }}>
          {name}
        </h1>
        <p style={{ color: '#D4AF37', fontSize: '1.1rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '30px' }}>
          Premium Fashion & Tailoring
        </p>
        <a href={getWhatsAppLink()} target="_blank" rel="noreferrer" style={{ background: '#25D366', color: '#fff', padding: '14px 32px', borderRadius: '30px', fontSize: '1rem', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(37, 211, 102, 0.4)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          Chat with us on WhatsApp
        </a>
      </section>

      {/* ── 2. ABOUT SECTION ── */}
      <section style={{ padding: '80px 20px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: '#0F2B4A', marginBottom: '20px' }}>Our Story</h2>
        <div style={{ width: '60px', height: '3px', background: '#D4AF37', margin: '0 auto 30px' }} />
        <p style={{ fontSize: '1.1rem', lineHeight: 1.8, color: '#555', whiteSpace: 'pre-wrap' }}>
          {aboutText}
        </p>
      </section>

      {/* ── 3. SERVICES SECTION ── */}
      {services.length > 0 && (
        <section style={{ padding: '80px 20px', background: '#fff' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '50px' }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: '#0F2B4A', marginBottom: '10px' }}>What We Offer</h2>
              <p style={{ color: '#777' }}>Premium tailoring and bespoke fashion services</p>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {services.map((srv, i) => (
                <div key={i} style={{ padding: '30px', borderRadius: '16px', border: '1px solid #eee', background: '#fafafa', transition: 'transform 0.2s', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0F2B4A', marginBottom: '10px' }}>{srv.name}</h3>
                    {srv.desc && <p style={{ color: '#666', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '20px' }}>{srv.desc}</p>}
                  </div>
                  {srv.price && (
                    <div style={{ borderTop: '1px solid #eaeaea', paddingTop: '15px', marginTop: 'auto' }}>
                      <span style={{ fontSize: '0.85rem', color: '#777', textTransform: 'uppercase', letterSpacing: '1px' }}>Starting from</span>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#D4AF37' }}>₦{Number(srv.price).toLocaleString()}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 4. PORTFOLIO / GALLERY ── */}
      {gallery.length > 0 && (
        <section style={{ padding: '80px 20px', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: '#0F2B4A', marginBottom: '10px' }}>Our Portfolio</h2>
            <p style={{ color: '#777' }}>A glimpse into our craftsmanship</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
            {gallery.map((img, i) => (
              <div key={i} style={{ aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                <img src={img} alt={`Portfolio ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 5. TESTIMONIALS ── */}
      {testimonials.length > 0 && (
        <section style={{ padding: '80px 20px', background: '#0F2B4A', color: '#fff' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '50px' }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', marginBottom: '10px' }}>Client Reviews</h2>
              <p style={{ color: '#D4AF37' }}>What our customers say about us</p>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
              {testimonials.map((t, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.05)', padding: '30px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ color: '#D4AF37', fontSize: '2rem', lineHeight: 1, marginBottom: '15px', fontFamily: 'serif' }}>"</div>
                  <p style={{ fontSize: '1rem', lineHeight: 1.6, fontStyle: 'italic', marginBottom: '20px', color: '#eaeaea' }}>{t.text}</p>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{t.name}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 6. FAQs ── */}
      {faqs.length > 0 && (
        <section style={{ padding: '80px 20px', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: '#0F2B4A' }}>Frequently Asked Questions</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {faqs.map((faq, i) => (
              <div key={i} style={{ border: '1px solid #eaeaea', borderRadius: '12px', overflow: 'hidden' }}>
                <button 
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width: '100%', padding: '20px', background: '#fff', border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'left', fontSize: '1rem', fontWeight: 600, color: '#0F2B4A' }}
                >
                  {faq.q}
                  <span style={{ fontSize: '1.2rem', transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>⌄</span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: '0 20px 20px 20px', background: '#fff', color: '#666', lineHeight: 1.6 }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 7. FOOTER / CONTACT ── */}
      <footer style={{ padding: '60px 20px', background: '#fff', borderTop: '1px solid #eaeaea', textAlign: 'center' }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', color: '#0F2B4A', marginBottom: '20px' }}>Get in Touch</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center', marginBottom: '40px' }}>
          {address && (
            <div style={{ color: '#555' }}>
              <strong>Address:</strong> {address}
            </div>
          )}
          {businessHours && (
            <div style={{ color: '#555' }}>
              <strong>Hours:</strong> {businessHours}
            </div>
          )}
          {phone && (
            <div style={{ color: '#555' }}>
              <strong>Phone:</strong> {phone}
            </div>
          )}
        </div>

        <a href={getWhatsAppLink()} target="_blank" rel="noreferrer" style={{ background: '#0F2B4A', color: '#fff', padding: '15px 40px', borderRadius: '30px', fontSize: '1rem', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
          Send a Message
        </a>

        <div style={{ marginTop: '50px', paddingTop: '20px', borderTop: '1px solid #eaeaea', fontSize: '0.85rem', color: '#999' }}>
          © {new Date().getFullYear()} {name}. Powered by Cresoa.
        </div>
      </footer>

      {/* ── FLOATING WHATSAPP BUTTON ── */}
      {whatsapp && (
        <a 
          href={getWhatsAppLink()} 
          target="_blank" 
          rel="noreferrer"
          style={{ position: 'fixed', bottom: '20px', right: '20px', width: '60px', height: '60px', background: '#25D366', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(37, 211, 102, 0.4)', zIndex: 100 }}
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        </a>
      )}

    </div>
  )
          }
