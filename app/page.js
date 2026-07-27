export default function HomePage() {
  const features = [
    {
      title: 'Customer measurements',
      desc: 'Save every customer\'s measurements once. Reuse them for every future order—no need to measure twice.',
    },
    {
      title: 'Order production stages',
      desc: 'Know exactly where every job stands. Move orders from Cutting → Sewing → Ready → Delivered.',
    },
    {
      title: 'Payments & balances',
      desc: 'Record deposits and track outstanding balances. No more guessing who paid what.',
    },
    {
      title: 'Customer tracking links',
      desc: 'Share a private link with each customer so they can check their own order status anytime.',
    },
    {
      title: 'Group & Aso-Ebi orders',
      desc: 'Manage group orders with one shared deadline. Keep everyone on the same page without the chaos.',
    },
  ];

  const steps = [
    'Create your free account in under 2 minutes',
    'Add your customers and their measurements',
    'Create orders and track each production stage',
    'Share tracking links with customers via WhatsApp',
  ];

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2' }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade { animation: fadeUp 0.7s ease-out both; }
        .container {
          max-width: 480px;
          margin: 0 auto;
          padding: 0 1.5rem;
        }
      `}</style>

      {/* ===== HERO ===== */}
      <div
        style={{
          background: 'linear-gradient(150deg, #1E3A5F 0%, #0F1E30 100%)',
          padding: '2.8rem 0 3.5rem',
          borderRadius: '0 0 32px 32px',
        }}
      >
        <div className="container fade">
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '2.5rem' }}>
            <svg width="36" height="36" viewBox="0 0 64 64" fill="none">
              <rect width="64" height="64" rx="16" fill="#1E3A5F" />
              <line x1="44" y1="18" x2="20" y2="42" stroke="#C79A2B" strokeWidth="3" strokeLinecap="round" />
              <circle cx="44" cy="18" r="4.5" fill="none" stroke="#C79A2B" strokeWidth="2.5" />
              <path d="M20 42 C 13 38, 11 29, 18 24" stroke="#C79A2B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            </svg>
            <span style={{ color: '#fff', fontSize: '1.4rem', fontWeight: '700', letterSpacing: '-0.5px' }}>Cresoa</span>
          </div>

          {/* Positioning Tagline */}
          <p
            style={{
              color: '#C79A2B',
              fontSize: '0.75rem',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              margin: '0 0 0.5rem',
            }}
          >
            The simple operating system for Nigerian fashion businesses
          </p>

          {/* Headline */}
          <h1
            style={{
              color: '#fff',
              fontSize: '2.1rem',
              lineHeight: '1.2',
              margin: '0 0 0.75rem',
              fontWeight: '800',
              letterSpacing: '-0.5px',
            }}
          >
            Your fashion business. <br style={{ display: 'block' }} />
            Finally, all in one place.
          </h1>

          {/* Sub-headline */}
          <p
            style={{
              color: '#C8D4E3',
              fontSize: '1rem',
              lineHeight: '1.6',
              margin: '0 0 2rem',
              fontWeight: '400',
            }}
          >
            Stop losing measurements, forgetting orders, and chasing payment balances across notebooks and WhatsApp chats.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.8rem' }}>
            <a
              href="/signup"
              style={{
                background: '#C79A2B',
                color: '#1E3A5F',
                padding: '0.95rem',
                borderRadius: '10px',
                fontSize: '1rem',
                fontWeight: '700',
                textDecoration: 'none',
                display: 'block',
                textAlign: 'center',
                boxShadow: '0 4px 14px rgba(199,154,43,0.3)',
              }}
            >
              Start free — no credit card
            </a>
            <a
              href="/login"
              style={{
                background: 'transparent',
                color: '#fff',
                padding: '0.85rem',
                borderRadius: '10px',
                fontSize: '0.95rem',
                fontWeight: '500',
                textDecoration: 'none',
                display: 'block',
                textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              Log in
            </a>
          </div>

          {/* Honest context (replaces fake social proof) */}
          <p
            style={{
              color: '#A0B4C9',
              fontSize: '0.8rem',
              textAlign: 'center',
              margin: 0,
              borderTop: '1px solid rgba(255,255,255,0.06)',
              paddingTop: '1.2rem',
            }}
          >
            Built for the way Nigerian fashion businesses actually work.
          </p>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '3rem' }}>

        {/* ===== FEATURES ===== */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h2
            style={{
              color: '#1E3A5F',
              fontSize: '1.3rem',
              margin: '0 0 0.3rem',
              fontWeight: '700',
              letterSpacing: '-0.3px',
            }}
          >
            What Cresoa helps you do
          </h2>
          <p
            style={{
              color: '#6B6255',
              fontSize: '0.9rem',
              margin: '0 0 1.5rem',
            }}
          >
            No more scattered tools. Just one place for everything.
          </p>

          {/* Clean, border-based feature list — no emojis, no heavy shadows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {features.map((f) => (
              <div
                key={f.title}
                className="fade"
                style={{
                  background: '#fff',
                  padding: '1rem 1.2rem',
                  borderRadius: '12px',
                  border: '1px solid #E8E0D5',
                  boxShadow: '0 2px 6px rgba(30,58,95,0.04)',
                }}
              >
                <h3
                  style={{
                    margin: '0 0 0.2rem',
                    color: '#1E3A5F',
                    fontSize: '0.9rem',
                    fontWeight: '700',
                  }}
                >
                  {f.title}
                </h3>
                <p
                  style={{
                    margin: 0,
                    color: '#6B6255',
                    fontSize: '0.85rem',
                    lineHeight: '1.5',
                  }}
                >
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ===== HOW IT WORKS ===== */}
        <div
          style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '1.5rem',
            border: '1px solid #E8E0D5',
            boxShadow: '0 2px 6px rgba(30,58,95,0.04)',
            marginBottom: '2.5rem',
          }}
        >
          <h2
            style={{
              color: '#1E3A5F',
              fontSize: '1.1rem',
              margin: '0 0 1.2rem',
              fontWeight: '700',
            }}
          >
            Get started in four steps
          </h2>

          {steps.map((step, i) => (
            <div
              key={step}
              style={{
                display: 'flex',
                gap: '0.9rem',
                marginBottom: i < steps.length - 1 ? '1.1rem' : '0',
                alignItems: 'flex-start',
              }}
            >
              <span
                style={{
                  background: '#1E3A5F',
                  color: '#fff',
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  flexShrink: 0,
                  marginTop: '1px',
                }}
              >
                {i + 1}
              </span>
              <p
                style={{
                  margin: 0,
                  color: '#2B2620',
                  fontSize: '0.9rem',
                  lineHeight: '1.5',
                  paddingTop: '1px',
                }}
              >
                {step}
              </p>
            </div>
          ))}
        </div>

        {/* ===== FINAL CTA (Solid Navy) ===== */}
        <div
          style={{
            background: '#1E3A5F',
            borderRadius: '16px',
            padding: '2rem 1.5rem',
            textAlign: 'center',
            boxShadow: '0 6px 24px rgba(30,58,95,0.2)',
          }}
        >
          <h2
            style={{
              color: '#fff',
              fontSize: '1.3rem',
              margin: '0 0 0.4rem',
              fontWeight: '700',
              lineHeight: '1.3',
            }}
          >
            Run your business the <br style={{ display: 'block' }} />
            simple way.
          </h2>
          <p
            style={{
              color: '#C8D4E3',
              fontSize: '0.9rem',
              margin: '0 0 1.5rem',
              opacity: 0.9,
            }}
          >
            Join fashion designers who have left their notebooks behind.
          </p>
          <a
            href="/signup"
            style={{
              background: '#C79A2B',
              color: '#1E3A5F',
              padding: '0.9rem',
              borderRadius: '10px',
              fontSize: '1rem',
              fontWeight: '700',
              textDecoration: 'none',
              display: 'block',
              boxShadow: '0 4px 14px rgba(199,154,43,0.3)',
            }}
          >
            Create your free account
          </a>
        </div>

        {/* Footer */}
        <p
          style={{
            textAlign: 'center',
            color: '#6B6255',
            fontSize: '0.7rem',
            marginTop: '1.5rem',
            opacity: 0.6,
          }}
        >
          Built in Nigeria, for Nigerian fashion businesses.
        </p>
      </div>
    </main>
  );
        }
