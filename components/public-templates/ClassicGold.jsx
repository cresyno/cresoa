'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

// ─── PREMIUM SCROLL ANIMATION HOOK ───
function useScrollReveal() {
  const ref = useRef(null)
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          // Optional: unobserve after revealing to keep it visible
          // observer.unobserve(entry.target)
        }
      },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return ref
}

// ─── SMART PRICE FORMATTER FOR FASHION ───
const formatPrice = (priceStr) => {
  if (!priceStr || priceStr === '0') return 'Price on Request';
  const cleanStr = String(priceStr).replace(/,/g, '').trim();
  const num = Number(cleanStr);
  
  // If it's a valid number, format as currency
  if (!isNaN(num) && num > 0) {
    return `₦${num.toLocaleString()}`;
  }
  // If it's text (e.g. "Request Price", "Contact Us"), return as is
  return priceStr;
};

export default function ClassicGold({ business, page, products = [], slug }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // ── SAFE DATA EXTRACTION ──
  const name = business?.name || 'Your Business'
  const logo = business?.logo_url || ''
  const address = business?.location || ''
  const phone = business?.phone || ''
  const whatsapp = business?.whatsapp || phone 
  
  const heroImage = page?.cover_image_url || 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=1600'
  const aboutText = page?.about_text || 'Welcome to our business. We provide premium quality services tailored to your needs.'
  
  const sectorData = page?.sector_data || {}
  const services = Array.isArray(sectorData.services) ? sectorData.services : []
  const testimonials = Array.isArray(sectorData.testimonials) ? sectorData.testimonials : []
  const portfolio = Array.isArray(sectorData.portfolio) ? sectorData.portfolio : []
  
  const featuredProducts = products.slice(0, 6)
  const featuredPortfolio = portfolio.slice(0, 6)

  const hasShop = products.length > 0 || sectorData?.has_shop
  const hasPortfolio = portfolio.length > 0

  const getWhatsAppLink = (message = "Hello! I found your website and I'd like to make an enquiry.") => {
    if (!whatsapp) return '#'
    let cleanPhone = whatsapp.replace(/\D/g, '')
    if (cleanPhone.startsWith('0')) cleanPhone = '234' + cleanPhone.slice(1)
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: '#333', background: '#fafafa', minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
      
      {/* ─── PREMIUM CSS ANIMATIONS & MICRO-INTERACTIONS ─── */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slowZoom {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        
        .reveal {
          opacity: 0;
          transform: translateY(40px);
          transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal.is-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .premium-btn {
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        .premium-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(212, 175, 55, 0.4);
        }

        .img-zoom-container {
          overflow: hidden;
        }
        .img-zoom-container img {
          transition: transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .img-zoom-container:hover img {
          transform: scale(1.06);
        }

        .service-card {
          transition: all 0.4s ease;
        }
        .service-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 40px rgba(0,0,0,0.08);
        }

        .hero-content {
          animation: fadeUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .hero-bg {
          animation: slowZoom 20s infinite ease-in-out;
        }
      `}} />

      {/* ── MOBILE SIDEBAR NAVIGATION ── */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,43,74,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, opacity: isMenuOpen ? 1 : 0, pointerEvents: isMenuOpen ? 'auto' : 'none', transition: 'opacity 0.4s ease' }} onClick={() => setIsMenuOpen(false)}>
        <div style={{ width: '320px', height: '100%', background: '#fff', padding: '30px', display: 'flex', flexDirection: 'column', transform: isMenuOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '50px' }}>
            {logo ? <img src={logo} style={{ height: '40px', objectFit: 'contain' }} /> : <h2 style={{ margin: 0, color: '#0F2B4A', fontFamily: "'Playfair Display', serif", fontSize: '1.6rem' }}>{name}</h2>}
            <button onClick={() => setIsMenuOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.8rem', cursor: 'pointer', color: '#999' }}>×</button>
          </div>
          
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <Link href={`/${slug}`} style={{ textDecoration: 'none', color: '#0F2B4A', fontSize: '1.2rem', fontWeight: 600 }}>Home</Link>
            {hasShop && <Link href={`/${slug}/shop`} style={{ textDecoration: 'none', color: '#0F2B4A', fontSize: '1.2rem', fontWeight: 600 }}>Shop</Link>}
            {hasPortfolio && <Link href={`/${slug}/portfolio`} style={{ textDecoration: 'none', color: '#0F2B4A', fontSize: '1.2rem', fontWeight: 600 }}>Lookbook</Link>}
            {hasShop && <Link href={`/${slug}/cart`} style={{ textDecoration: 'none', color: '#0F2B4A', fontSize: '1.2rem', fontWeight: 600 }}>Cart</Link>}
          </nav>

          <div style={{ marginTop: 'auto' }}>
            <a href={getWhatsAppLink()} target="_blank" rel="noreferrer" className="premium-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#25D366', color: '#fff', padding: '16px', borderRadius: '12px', textDecoration: 'none', fontWeight: 600, fontSize: '1.05rem' }}>
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* ── STICKY HEADER ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 900, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(15px)', borderBottom: '1px solid rgba(0,0,0,0.05)', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setIsMenuOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0F2B4A" strokeWidth="1.5" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
        </button>
        
        <Link href={`/${slug}`} style={{ textDecoration: 'none' }}>
          {logo ? <img src={logo} style={{ height: '38px', objectFit: 'contain' }} /> : <h1 style={{ margin: 0, fontSize: '1.4rem', color: '#0F2B4A', fontFamily: "'Playfair Display', serif", letterSpacing: '1px' }}>{name}</h1>}
        </Link>

        {hasShop ? (
          <Link href={`/${slug}/cart`} style={{ color: '#0F2B4A', position: 'relative' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>
          </Link>
        ) : <div style={{ width: '24px' }} /> }
      </header>

      {/* ── CINEMATIC HERO SECTION ── */}
      <section style={{ position: 'relative', height: '80vh', minHeight: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px', overflow: 'hidden' }}>
        {/* Background with slow zoom animation */}
        <div className="hero-bg" style={{ position: 'absolute', inset: 0, background: `linear-gradient(rgba(15,43,74,0.4), rgba(15,43,74,0.8)), url(${heroImage}) center/cover`, zIndex: 0 }} />
        
        <div className="hero-content" style={{ position: 'relative', zIndex: 1, maxWidth: '800px' }}>
          <p style={{ color: '#D4AF37', fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '4px', marginBottom: '20px' }}>
            Bespoke & Ready-to-Wear
          </p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '4rem', fontWeight: 700, color: '#fff', margin: '0 0 24px 0', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
            {name}
          </h1>
          
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '40px' }}>
            <a href={getWhatsAppLink()} target="_blank" rel="noreferrer" className="premium-btn" style={{ background: '#D4AF37', color: '#0F2B4A', padding: '16px 36px', borderRadius: '4px', fontSize: '1rem', fontWeight: 700, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Book a Fitting
            </a>
            {hasShop && (
              <Link href={`/${slug}/shop`} className="premium-btn" style={{ background: 'transparent', color: '#fff', border: '1px solid #fff', padding: '16px 36px', borderRadius: '4px', fontSize: '1rem', fontWeight: 700, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Explore Collection
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── ABOUT SECTION ── */}
      <section className="reveal" ref={useScrollReveal()} style={{ padding: '100px 20px', background: '#fff' }}>
        <div style={{ maxWidth: '750px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', color: '#0F2B4A', marginBottom: '24px' }}>The Atelier</h2>
          <div style={{ width: '40px', height: '2px', background: '#D4AF37', margin: '0 auto 30px' }} />
          <p style={{ fontSize: '1.15rem', lineHeight: 1.9, color: '#555', whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>
            "{aboutText}"
          </p>
        </div>
      </section>

      {/* ── PREMIUM SERVICES SECTION (EDITORIAL STYLE) ── */}
      {services.length > 0 && (
        <section className="reveal" ref={useScrollReveal()} style={{ padding: '100px 20px', background: '#fafafa' }}>
           <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', color: '#0F2B4A', marginBottom: '16px' }}>Our Services</h2>
                <div style={{ width: '40px', height: '2px', background: '#D4AF37', margin: '0 auto' }} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
                {services.map((srv, i) => (
                  <div key={i} className="service-card" style={{ borderRadius: '8px', overflow: 'hidden', background: '#fff', border: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column' }}>
                    
                    {/* Service Image Area */}
                    <div className="img-zoom-container" style={{ height: '240px', background: srv.image_url ? '#fff' : 'linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)', position: 'relative' }}>
                      {srv.image_url ? (
                        <img src={srv.image_url} alt={srv.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                         <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: '3rem', fontFamily: 'serif', opacity: 0.5 }}>
                           {name.charAt(0)}
                         </div>
                      )}
                    </div>

                    {/* Service Details */}
                    <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0F2B4A', marginBottom: '12px', fontFamily: "'Playfair Display', serif" }}>{srv.name}</h3>
                      {srv.desc && <p style={{ color: '#666', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: '24px', flex: 1 }}>{srv.desc}</p>}
                      
                      <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '20px', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: '#999', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Price</span>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#D4AF37' }}>
                          {formatPrice(srv.price)}
                        </div>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
           </div>
        </section>
      )}

      {/* ── FEATURED PRODUCTS ── */}
      {featuredProducts.length > 0 && (
        <section className="reveal" ref={useScrollReveal()} style={{ padding: '100px 20px', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '50px' }}>
            <div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', color: '#0F2B4A', margin: '0 0 16px 0' }}>The Collection</h2>
              <div style={{ width: '40px', height: '2px', background: '#D4AF37' }} />
            </div>
            <Link href={`/${slug}/shop`} style={{ color: '#0F2B4A', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #0F2B4A', paddingBottom: '4px' }}>
              View All <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '30px' }}>
            {featuredProducts.map(product => (
              <Link key={product.id} href={`/${slug}/shop/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="img-zoom-container" style={{ background: '#fff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #f0f0f0' }}>
                  <div style={{ height: '380px', background: '#f9f9f9', position: 'relative' }}>
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.item_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ccc' }}>Cresoa Exclusive</div>
                    )}
                  </div>
                  <div style={{ padding: '24px', textAlign: 'center' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: '#0F2B4A', fontWeight: 600 }}>{product.item_name}</h3>
                    <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#D4AF37' }}>{formatPrice(product.selling_price)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── FEATURED PORTFOLIO / LOOKBOOK ── */}
      {featuredPortfolio.length > 0 && (
        <section className="reveal" ref={useScrollReveal()} style={{ padding: '100px 20px', background: '#0F2B4A' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '50px' }}>
              <div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', color: '#fff', margin: '0 0 16px 0' }}>The Lookbook</h2>
                <div style={{ width: '40px', height: '2px', background: '#D4AF37' }} />
              </div>
              <Link href={`/${slug}/portfolio`} style={{ color: '#D4AF37', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                View Full Gallery <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {featuredPortfolio.map((item, i) => (
                <Link key={i} href={`/${slug}/portfolio`} className="img-zoom-container" style={{ textDecoration: 'none', display: 'block', position: 'relative', borderRadius: '8px', overflow: 'hidden', aspectRatio: '3/4' }}>
                  <img src={item.url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 40%, rgba(0,0,0,0.9))', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '30px' }}>
                    <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', fontWeight: 600, fontFamily: "'Playfair Display', serif" }}>{item.title}</h3>
                    {item.desc && <p style={{ margin: '6px 0 0 0', color: '#ccc', fontSize: '0.9rem' }}>{item.desc}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── TESTIMONIALS ── */}
          {testimonials.length > 0 && (
        <section className="reveal" ref={useScrollReveal()} style={{ padding: '100px 20px', background: '#fff' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '60px' }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', color: '#0F2B4A', marginBottom: '16px' }}>Client Diaries</h2>
              <div style={{ width: '40px', height: '2px', background: '#D4AF37', margin: '0 auto' }} />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
              {testimonials.map((t, i) => (
                <div key={i} style={{ padding: '30px 0', textAlign: 'center' }}>
                  <div style={{ color: '#D4AF37', fontSize: '4rem', lineHeight: 0.5, marginBottom: '20px', fontFamily: 'serif' }}>"</div>
                  <p style={{ fontSize: '1.1rem', lineHeight: 1.8, fontStyle: 'italic', marginBottom: '24px', color: '#444' }}>{t.text}</p>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F2B4A', textTransform: 'uppercase', letterSpacing: '1px' }}>— {t.name}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FOOTER ── */}
      <footer style={{ padding: '100px 20px 40px', background: '#fafafa', borderTop: '1px solid #eaeaea', textAlign: 'center' }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', color: '#0F2B4A', marginBottom: '30px' }}>Visit Us</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', marginBottom: '50px' }}>
          {address && <div style={{ color: '#555', fontSize: '1.1rem' }}>{address}</div>}
          {sectorData.business_hours && <div style={{ color: '#555', fontSize: '1.1rem' }}>{sectorData.business_hours}</div>}
          {phone && <div style={{ color: '#555', fontSize: '1.1rem', fontWeight: 600 }}>{phone}</div>}
        </div>

        <a href={getWhatsAppLink()} target="_blank" rel="noreferrer" className="premium-btn" style={{ background: '#0F2B4A', color: '#fff', padding: '16px 40px', borderRadius: '4px', fontSize: '1rem', fontWeight: 700, textDecoration: 'none', display: 'inline-block', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Book an Appointment
        </a>

        <div style={{ marginTop: '80px', paddingTop: '30px', borderTop: '1px solid #eaeaea', fontSize: '0.9rem', color: '#999' }}>
          © {new Date().getFullYear()} {name}. Powered by Cresoa.
        </div>
      </footer>

      {/* ── FLOATING WHATSAPP BUTTON ── */}
      {whatsapp && (
        <a 
          href={getWhatsAppLink()} 
          target="_blank" 
          rel="noreferrer"
          className="premium-btn"
          style={{ position: 'fixed', bottom: '30px', right: '30px', width: '64px', height: '64px', background: '#25D366', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 30px rgba(37, 211, 102, 0.4)', zIndex: 100 }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        </a>
      )}

    </div>
  )
}
