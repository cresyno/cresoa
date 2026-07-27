'use client';

import React, { useState } from 'react';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'order' | 'measurements' | 'payment'>('order');

  const features = [
    { icon: '📏', title: 'Customer & measurements', desc: 'Save every customer with their measurements once — reuse them for every future order.' },
    { icon: '🧵', title: 'Order tracking', desc: 'Move orders through real stages: Order placed → Cutting → Sewing → Ready → Delivered.' },
    { icon: '🔗', title: 'Customer tracking link', desc: 'Send customers a private link where they check their own order status — no more "is it ready?" messages.' },
    { icon: '👗', title: 'Group / aso-ebi orders', desc: 'Manage a whole event\'s worth of orders — one coordinator, many members, one shared deadline.' },
    { icon: '💰', title: 'Payments & balances', desc: 'Record every payment, see balances owed at a glance, no more guessing who paid what.' },
  ];

  const steps = [
    'Create your free business account',
    'Add your customers and their measurements',
    'Create orders and track them through production',
    'Share a tracking link with each customer via WhatsApp',
  ];

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', paddingBottom: '80px' }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade { animation: fadeUp 0.6s ease-out both; }
        .tab-btn {
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.78rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }
      `}</style>

      {/* Hero Section */}
      <div style={{ background: 'linear-gradient(160deg, #1E3A5F 0%, #16293F 100%)', padding: '2.5rem 1.25rem 3.5rem', borderRadius: '0 0 32px 32px' }}>
        <div className="fade" style={{ maxWidth: '480px', margin: '0 auto', textAlign: 'center' }}>
          
          {/* Live Badge Pill */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(199, 154, 43, 0.15)', border: '1px solid rgba(199, 154, 43, 0.3)', padding: '4px 12px', borderRadius: '20px', marginBottom: '1rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
            <span style={{ color: '#E4D8C2', fontSize: '0.78rem', fontWeight: '600', letterSpacing: '0.3px' }}>Live for Fashion & Bespoke Tailors</span>
          </div>

          {/* Logo */}
          <div style={{ margin: '0 auto 1rem', boxShadow: '0 8px 24px rgba(0,0,0,0.25)', borderRadius: '16px', display: 'inline-block' }}>
            <svg width="52" height="52" viewBox="0 0 64 64" fill="none">
              <rect width="64" height="64" rx="16" fill="#1E3A5F" />
              <line x1="44" y1="18" x2="20" y2="42" stroke="#C79A2B" strokeWidth="3" strokeLinecap="round" />
              <circle cx="44" cy="18" r="4.5" fill="none" stroke="#C79A2B" strokeWidth="2.5" />
              <path d="M20 42 C 13 38, 11 29, 18 24" stroke="#C79A2B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            </svg>
          </div>

          <h1 style={{ color: '#fff', fontSize: '2.1rem', margin: '0 0 0.7rem', fontWeight: '800', lineHeight: '1.2' }}>Cresoa</h1>
          
          <p style={{ color: '#E4D8C2', fontSize: '1.02rem', lineHeight: '1.55', margin: '0 0 1.5rem' }}>
            Stop losing measurements in paper notebooks and WhatsApp chats. The simple business operating system for Nigerian fashion businesses.
          </p>

          {/* Action CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginBottom: '2rem' }}>
            <a href="/signup" style={{ background: 'linear-gradient(135deg, #C79A2B, #B4881E)', color: '#1E3A5F', padding: '0.9rem', borderRadius: '10px', fontSize: '0.95rem', fontWeight: '700', textDecoration: 'none', display: 'block', boxShadow: '0 6px 16px rgba(199,154,43,0.35)' }}>
              Create your business account
            </a>
            <a href="/login" style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', padding: '0.85rem', borderRadius: '10px', fontSize: '0.95rem', fontWeight: '600', textDecoration: 'none', display: 'block', border: '1px solid rgba(255,255,255,0.25)' }}>
              Log in
            </a>
          </div>

          {/* Interactive Mock Preview Container */}
          <div style={{ background: '#244570', borderRadius: '16px', padding: '1rem', border: '1px solid rgba(199, 154, 43, 0.3)', textAlign: 'left', boxShadow: '0 12px 32px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <span style={{ color: '#C79A2B', fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Interactive Demo</span>
              
              <div style={{ display: 'flex', gap: '4px' }}>
                <button 
                  onClick={() => setActiveTab('order')} 
                  className="tab-btn"
                  style={{ background: activeTab === 'order' ? '#C79A2B' : 'transparent', color: activeTab === 'order' ? '#1E3A5F' : '#E4D8C2' }}
                >
                  Tracker
                </button>
                <button 
                  onClick={() => setActiveTab('measurements')} 
                  className="tab-btn"
                  style={{ background: activeTab === 'measurements' ? '#C79A2B' : 'transparent', color: activeTab === 'measurements' ? '#1E3A5F' : '#E4D8C2' }}
                >
                  Sizing
                </button>
                <button 
                  onClick={() => setActiveTab('payment')} 
                  className="tab-btn"
                  style={{ background: activeTab === 'payment' ? '#C79A2B' : 'transparent', color: activeTab === 'payment' ? '#1E3A5F' : '#E4D8C2' }}
                >
                  Balance
                </button>
              </div>
            </div>

            {/* Dynamic Interactive Card Content */}
            <div style={{ background: '#1E3A5F', padding: '0.9rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
              {activeTab === 'order' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ color: '#fff', fontWeight: '700', fontSize: '0.88rem' }}>Order #CR-1042</span>
                    <span style={{ background: '#F6E9C8', color: '#1E3A5F', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>🧵 Sewing</span>
                  </div>
                  <p style={{ color: '#E4D8C2', fontSize: '0.78rem', margin: '0 0 0.5rem' }}>Client: Mrs. Amina Okafor (Aso-Ebi Wedding Fit)</p>
                  <div style={{ background: 'rgba(255,255,255,0.1)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: '65%', height: '100%', background: '#C79A2B' }}></div>
                  </div>
                </div>
              )}

              {activeTab === 'measurements' && (
                <div>
                  <p style={{ color: '#C79A2B', fontWeight: '700', fontSize: '0.8rem', margin: '0 0 0.4rem' }}>Saved Profile: Mrs. Amina Okafor</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', color: '#fff', fontSize: '0.75rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 6px', borderRadius: '6px' }}>Bust: <strong>38"</strong></div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 6px', borderRadius: '6px' }}>Waist: <strong>31"</strong></div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 6px', borderRadius: '6px' }}>Hip: <strong>42"</strong></div>
                  </div>
                </div>
              )}

              {activeTab === 'payment' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#E4D8C2', fontSize: '0.78rem', marginBottom: '0.3rem' }}>
                    <span>Total Fee: ₦65,000</span>
                    <span>Deposit Paid: ₦40,000</span>
                  </div>
                  <div style={{ color: '#4ade80', fontWeight: '700', fontSize: '0.85rem' }}>
                    Balance Owed: ₦25,000
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Trust & Network Bar */}
      <div style={{ maxWidth: '480px', margin: '-1rem auto 1.5rem', padding: '0 1.5rem', position: 'relative', zIndex: 2 }}>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '0.8rem 1rem', boxShadow: '0 4px 14px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', border: '1px solid #EFE6D5' }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.85rem', display: 'block' }}>📱</span>
            <span style={{ fontSize: '0.7rem', fontWeight: '600', color: '#1E3A5F' }}>WhatsApp Link</span>
          </div>
          <div style={{ width: '1px', background: '#EFE6D5' }}></div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.85rem', display: 'block' }}>🇳🇬</span>
            <span style={{ fontSize: '0.7rem', fontWeight: '600', color: '#1E3A5F' }}>Aso-Ebi Friendly</span>
          </div>
          <div style={{ width: '1px', background: '#EFE6D5' }}></div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.85rem', display: 'block' }}>⚡</span>
            <span style={{ fontSize: '0.7rem', fontWeight: '600', color: '#1E3A5F' }}>Fast on 3G</span>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '0 1.5rem 2rem' }}>
        
        {/* The Problem */}
        <div className="fade" style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 6px 20px rgba(30,58,95,0.08)', marginBottom: '1.3rem', borderLeft: '4px solid #C79A2B' }}>
          <h2 style={{ color: '#1E3A5F', fontSize: '1.15rem', margin: '0 0 0.8rem', fontWeight: '700' }}>The problem</h2>
          <p style={{ color: '#2B2620', fontSize: '0.92rem', lineHeight: '1.6', margin: 0 }}>
            Most Nigerian fashion designers run their business through notebooks and endless WhatsApp messages —
            "is my order ready?", lost measurements, no record of who paid what. It costs real time and real money.
          </p>
        </div>

        {/* What Cresoa Does */}
        <div className="fade" style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 6px 20px rgba(30,58,95,0.08)', marginBottom: '1.3rem' }}>
          <h2 style={{ color: '#1E3A5F', fontSize: '1.15rem', margin: '0 0 1rem', fontWeight: '700' }}>What Cresoa does</h2>
          {features.map((f) => (
            <div key={f.title} style={{ display: 'flex', gap: '0.9rem', marginBottom: '1.1rem', alignItems: 'flex-start' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#F6E9C8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                {f.icon}
              </div>
              <div>
                <p style={{ margin: '0 0 0.2rem', color: '#1E3A5F', fontWeight: '600', fontSize: '0.95rem' }}>{f.title}</p>
                <p style={{ margin: 0, color: '#6B6255', fontSize: '0.85rem', lineHeight: '1.5' }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* How It Works */}
        <div className="fade" style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 6px 20px rgba(30,58,95,0.08)', marginBottom: '1.3rem' }}>
          <h2 style={{ color: '#1E3A5F', fontSize: '1.15rem', margin: '0 0 1rem', fontWeight: '700' }}>How it works</h2>
          {steps.map((step, i) => (
            <div key={step} style={{ display: 'flex', gap: '0.8rem', marginBottom: '0.9rem', alignItems: 'flex-start' }}>
              <span style={{ background: 'linear-gradient(135deg, #C79A2B, #B4881E)', color: '#1E3A5F', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '700', flexShrink: 0, boxShadow: '0 2px 6px rgba(199,154,43,0.4)' }}>
                {i + 1}
              </span>
              <p style={{ margin: 0, color: '#2B2620', fontSize: '0.88rem', paddingTop: '0.15rem' }}>{step}</p>
            </div>
          ))}
        </div>

        {/* Beyond Fashion Teaser */}
        <div className="fade" style={{ background: '#FBF3EC', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 6px 20px rgba(174,74,52,0.1)', border: '1px dashed #AE4A34', marginBottom: '1.3rem' }}>
          <h2 style={{ color: '#AE4A34', fontSize: '1.05rem', margin: '0 0 0.6rem', fontWeight: '700' }}>🚀 Beyond fashion</h2>
          <p style={{ color: '#2B2620', fontSize: '0.88rem', lineHeight: '1.5', margin: 0 }}>
            Cresoa is built to serve more than one kind of business. <strong>Fashion & Custom Wear is live today.</strong> Repairs &
            Technical Services and Custom Products & Services are coming soon — sign up now and you'll be first to know when your
            sector is ready.
          </p>
        </div>

        <p style={{ textAlign: 'center', color: '#6B6255', fontSize: '0.78rem', marginTop: '1.5rem' }}>
          Built in Nigeria, for Nigerian businesses.
        </p>
      </div>

      {/* Floating Sticky CTA on Mobile */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#1E3A5F', padding: '0.75rem 1rem', boxShadow: '0 -4px 16px rgba(0,0,0,0.2)', borderTop: '1px solid rgba(199,154,43,0.3)', zIndex: 100 }}>
        <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.8rem' }}>
          <div>
            <p style={{ color: '#fff', fontSize: '0.82rem', fontWeight: '700', margin: 0 }}>Ready to organize?</p>
            <p style={{ color: '#E4D8C2', fontSize: '0.7rem', margin: 0 }}>Free account setup</p>
          </div>
          <a href="/signup" style={{ background: 'linear-gradient(135deg, #C79A2B, #B4881E)', color: '#1E3A5F', padding: '0.6rem 1.1rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '700', textDecoration: 'none', whitespace: 'nowrap' }}>
            Get Started →
          </a>
        </div>
      </div>

    </main>
  );
            }
