'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ClassicGold({ business, page, products = [], slug }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // ── SAFE DATA EXTRACTION ──
  const name = business?.name || 'Your Business'
  const logo = business?.logo_url || ''
  const address = business?.location || ''
  const phone = business?.phone || ''
  const whatsapp = business?.whatsapp || phone 
  
  const heroImage = page?.cover_image_url || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1200'
  const aboutText = page?.about_text || 'Welcome to our business. We provide premium quality services tailored to your needs.'
  
  const sectorData = page?.sector_data || {}
  const services = Array.isArray(sectorData.services) ? sectorData.services : []
  const testimonials = Array.isArray(sectorData.testimonials) ? sectorData.testimonials : []
  const portfolio = Array.isArray(sectorData.portfolio) ? sectorData.portfolio : []
  
  // Slice to exactly 6 for the homepage
  const featuredProducts = products.slice(0, 6)
  const featuredPortfolio = portfolio.slice(0, 6)

  // Check if we have any shop or portfolio items to show in navigation
  const hasShop = products.length > 0 || sectorData?.has_shop
  const hasPortfolio = portfolio.length > 0

  // WhatsApp Link Generator
  const getWhatsAppLink = (message = "Hello! I found your website and I'd like to make an enquiry.") => {
    if (!whatsapp) return '#'
    let cleanPhone = whatsapp.replace(/\D/g, '')
    if (cleanPhone.startsWith('0')) cleanPhone = '234' + cleanPhone.slice(1)
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: '#333', background: '#fafafa', minHeight: '100vh', position: 'relative' }}>
      
      {/* ── MOBILE SIDEBAR NAVIGATION ── */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, opacity: isMenuOpen ? 1 : 0, pointerEvents: isMenuOpen ? 'auto' : 'none', transition: 'opacity 0.3s' }} onClick={() => setIsMenuOpen(false)}>
        <div style={{ width: '280px', height: '100%', background: '#fff', padding: '24px', display: 'flex', flexDirection: 'column', transform: isMenuOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
            {logo ? <img src={logo} style={{ height: '40px', objectFit: 'contain' }} /> : <h2 style={{ margin: 0, color: '#0F2B4A' }}>{name}</h2>}
            <button onClick={() => setIsMenuOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
          </div>
          
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Link href={`/${slug}`} style={{ textDecoration: 'none', color: '#0F2B4A', fontSize: '1.2rem', fontWeight: 600 }}>Home</Link>
            
            {/* ONLY SHOW SHOP IF PRODUCTS EXIST */}
            {hasShop && (
              <Link href={`/${slug}/shop`} style={{ textDecoration: 'none', color: '#0F2B4A', fontSize: '1.2rem', fontWeight: 600 }}>Shop</Link>
            )}
            
            {/* ONLY SHOW PORTFOLIO IF ITEMS EXIST */}
            {hasPortfolio && (
              <Link href={`/${slug}/portfolio`} style={{ textDecoration: 'none', color: '#0F2B4A', fontSize: '1.2rem', fontWeight: 600 }}>Portfolio</Link>
            )}

            {hasShop && (
              <Link href={`/${slug}/cart`} style={{ textDecoration: 'none', color: '#0F2B4A', fontSize: '1.2rem', fontWeight: 600 }}>Cart</Link>
            )}
          </nav>

          <div style={{ marginTop: 'auto' }}>
            <a href={getWhatsAppLink()} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#25D366', color: '#fff', padding: '15px', borderRadius: '10px', textDecoration: 'none', fontWeight: 600 }}>
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* ── STICKY HEADER ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 900, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #eee', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setIsMenuOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0F2B4A" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
        </button>
        
        <Link href={`/${slug}`} style={{ textDecoration: 'none' }}>
          {logo ? <img src={logo} style={{ height: '36px', objectFit: 'contain' }} /> : <h1 style={{ margin: 0, fontSize: '1.2rem', color: '#0F2B4A', fontFamily: "'Playfair Display', serif" }}>{name}</h1>}
        </Link>

        {/* ONLY SHOW CART ICON IF SHOP IS ACTIVE */}
        {hasShop ? (
          <Link href={`/${slug}/cart`} style={{ color: '#0F2B4A', position: 'relative' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>
          </Link>
        ) : <div style={{ width: '24px' }} /> }
      </header>

      {/* ── HERO SECTION ── */}
      <section style={{ position: 'relative', height: '70vh', minHeight: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px', background: `linear-gradient(rgba(15,43,74,0.6), rgba(15,43,74,0.9)), url(${heroImage}) center/cover` }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '3rem', fontWeight: 700, color: '#fff', margin: '0 0 15px 0', letterSpacing: '1px', lineHeight: 1.1 }}>
          {name}
        </h1>
        <p style={{ color: '#D4AF37', fontSize: '1rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '3px', marginBottom: '35px' }}>
          Premium Fashion & Tailoring
        </p>
        <div style={{ display: 'flex', gap: '15px' }}>
          <a href={getWhatsAppLink()} target="_blank" rel="noreferrer" style={{ background: '#D4AF37', color: '#0F2B4A', padding: '14px 28px', borderRadius: '30px', fontSize: '1rem', fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 15px rgba(212, 175, 55, 0.3)' }}>
            Book a Fitting
          </a>
          
          {/* ONLY SHOW SHOP BUTTON IF PRODUCTS EXIST */}
          {hasShop && (
            <Link href={`/${slug}/shop`} style={{ background: 'transparent', color: '#fff', border: '2px solid #fff', padding: '14px 28px', borderRadius: '30px', fontSize: '1rem', fontWeight: 700, textDecoration: 'none' }}>
              View Shop
            </Link>
          )}
        </div>
      </section>

      {/* ── FEATURED PRODUCTS ── */}
      {featuredProducts.length > 0 && (
        <section style={{ padding: '80px 20px', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
            <div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: '#0F2B4A', margin: '0 0 10px 0' }}>Featured Collection</h2>
              <div style={{ width: '60px', height: '3px', background: '#D4AF37' }} />
            </div>
            <Link href={`/${slug}/shop`} style={{ color: '#D4AF37', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
              View All <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
            {featuredProducts.map(product => (
              <Link key={product.id} href={`/${slug}/shop/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                  <div style={{ height: '320px', background: '#f5f5f5', position: 'relative' }}>
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.item_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ccc' }}>No Image</div>
                    )}
                  </div>
                  <div style={{ padding: '20px' }}>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem', color: '#0F2B4A' }}>{product.item_name}</h3>
                    <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#D4AF37' }}>₦{Number(product.selling_price).toLocaleString()}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── ABOUT SECTION ── */}
      <section style={{ padding: '80px 20px', background: '#fff' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: '#0F2B4A', marginBottom: '20px' }}>Our Story</h2>
          <div style={{ width: '60px', height: '3px', background: '#D4AF37', margin: '0 auto 30px' }} />
          <p style={{ fontSize: '1.1rem', lineHeight: 1.8, color: '#555', whiteSpace: 'pre-wrap' }}>
            {aboutText}
          </p>
        </div>
      </section>

      {/* ── SERVICES ── */}
      {services.length > 0 && (
        <section style={{ padding: '80px 20px', background: '#fafafa' }}>
           <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: '#0F2B4A', marginBottom: '10px' }}>What We Offer</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                {services.map((srv, i) => (
                  <div key={i} style={{ padding: '30px', borderRadius: '16px', border: '1px solid #eee', background: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
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

      {/* ── FEATURED PORTFOLIO ── */}
      {featuredPortfolio.length > 0 && (
        <section style={{ padding: '80px 20px', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
            <div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: '#0F2B4A', margin: '0 0 10px 0' }}>The Lookbook</h2>
              <div style={{ width: '60px', height: '3px', background: '#D4AF37' }} />
            </div>
            <Link href={`/${slug}/portfolio`} style={{ color: '#D4AF37', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
              View All <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
            {featuredPortfolio.map((item, i) => (
              <Link key={i} href={`/${slug}/portfolio`} style={{ textDecoration: 'none', display: 'block', position: 'relative', borderRadius: '16px', overflow: 'hidden', aspectRatio: '1' }}>
                <img src={item.url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '20px' }}>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: 700 }}>{item.title}</h3>
                  {item.desc && <p style={{ margin: '4px 0 0 0', color: '#ddd', fontSize: '0.85rem' }}>{item.desc}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── TESTIMONIALS ── */}
      {testimonials.length > 0 && (
        <section style={{ padding: '80px 20px', background: '#0F2B4A' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '50px' }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: '#fff', marginBottom: '10px' }}>Client Reviews</h2>
              <p style={{ color: '#D4AF37' }}>What our customers say about us</p>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
              {testimonials.map((t, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.05)', padding: '30px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ color: '#D4AF37', fontSize: '2rem', lineHeight: 1, marginBottom: '15px', fontFamily: 'serif' }}>"</div>
                  <p style={{ fontSize: '1rem', lineHeight: 1.6, fontStyle: 'italic', marginBottom: '20px', color: '#eaeaea' }}>{t.text}</p>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>{t.name}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FOOTER ── */}
      <footer style={{ padding: '80px 20px 40px', background: '#fff', borderTop: '1px solid #eaeaea', textAlign: 'center' }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: '#0F2B4A', marginBottom: '20px' }}>Get in Touch</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center', marginBottom: '40px' }}>
          {address && <div style={{ color: '#555' }}><strong>Address:</strong> {address}</div>}
          {sectorData.business_hours && <div style={{ color: '#555' }}><strong>Hours:</strong> {sectorData.business_hours}</div>}
          {phone && <div style={{ color: '#555' }}><strong>Phone:</strong> {phone}</div>}
        </div>

        <a href={getWhatsAppLink()} target="_blank" rel="noreferrer" style={{ background: '#0F2B4A', color: '#fff', padding: '15px 40px', borderRadius: '30px', fontSize: '1rem', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
          Send a Message
        </a>

        <div style={{ marginTop: '60px', paddingTop: '20px', borderTop: '1px solid #eaeaea', fontSize: '0.85rem', color: '#999' }}>
          © {new Date().getFullYear()} {name}. Powered by Cresoa.
        </div>
      </footer>

      {/* ── FLOATING WHATSAPP BUTTON ── */}
      {whatsapp && (
        <a 
          href={getWhatsAppLink()} 
          target="_blank" 
          rel="noreferrer"
          style={{ position: 'fixed', bottom: '24px', right: '24px', width: '60px', height: '60px', background: '#25D366', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(37, 211, 102, 0.4)', zIndex: 100 }}
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        </a>
      )}

    </div>
  )
                                                 }
