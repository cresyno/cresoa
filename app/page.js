export default function HomePage() {
  const workflowSteps = [
    {
      label: 'Customer',
      description: 'Save measurements and contact details once.',
    },
    {
      label: 'Order / Job',
      description: 'Create orders with deadlines, deposits, and stages.',
    },
    {
      label: 'Track Progress',
      description: 'Update production stages—Cutting → Sewing → Ready.',
    },
    {
      label: 'Payment & Completion',
      description: 'Record balances, send tracking links, and finish.',
    },
  ];

  const features = [
    {
      title: 'Measurements that stay with the customer',
      desc: 'Save full measurement profiles (bust, waist, shoulder, length, etc.) and reuse them for repeat orders. No more re-measuring every time.',
    },
    {
      title: 'Order timeline with production stages',
      desc: 'Every order moves through custom stages: Order Placed → Cutting → Sewing → Ready → Delivered. Know exactly what’s in progress.',
    },
    {
      title: 'Deposits, payments & balances at a glance',
      desc: 'Record deposits and track remaining balances in ₦. See who owes what without flipping through pages.',
    },
    {
      title: 'Private tracking links for customers',
      desc: 'Give each customer a unique link to check their order status. They stop calling you—they just check themselves.',
    },
    {
      title: 'Aso‑Ebi & group orders made simple',
      desc: 'Handle group orders (weddings, events) with one shared deadline. Manage members, their measurements, and payments together.',
    },
    {
      title: 'WhatsApp communication built in',
      desc: 'Share tracking links, payment reminders, and updates directly to your customers’ WhatsApp—no extra apps needed.',
    },
  ];

  const steps = [
    'Sign up free in under 2 minutes',
    'Add your first customer and their measurements',
    'Create an order and set a production deadline',
    'Share the tracking link and watch your business run itself',
  ];

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2' }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .fade { animation: fadeUp 0.7s ease-out both; }
        .slide { animation: slideIn 0.6s ease-out both; }
        .container {
          max-width: 520px;
          margin: 0 auto;
          padding: 0 1.5rem;
        }
        .divider {
          width: 40px;
          height: 3px;
          background: #C79A2B;
          border-radius: 2px;
          margin: 0.5rem 0 1.2rem;
        }
        .feature-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.8rem;
        }
        @media (max-width: 400px) {
          .feature-grid {
            grid-template-columns: 1fr;
          }
        }
        .workflow-arrow {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #C79A2B;
          font-size: 1rem;
          font-weight: 300;
          margin: 0.2rem 0;
        }
      `}</style>

      {/* ========== HERO ========== */}
      <div
        style={{
          background: 'linear-gradient(150deg, #1E3A5F 0%, #0A1628 100%)',
          padding: '2.5rem 0 3.5rem',
          borderRadius: '0 0 40px 40px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle background pattern (optional, adds texture) */}
        <div
          style={{
            position: 'absolute',
            top: '-30%',
            right: '-20%',
            width: '300px',
            height: '300px',
            background: 'radial-gradient(circle, rgba(199,154,43,0.05) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          {/* Logo + tagline */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '2.2rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <svg width="34" height="34" viewBox="0 0 64 64" fill="none">
                <rect width="64" height="64" rx="16" fill="#1E3A5F" />
                <line x1="44" y1="18" x2="20" y2="42" stroke="#C79A2B" strokeWidth="3" strokeLinecap="round" />
                <circle cx="44" cy="18" r="4.5" fill="none" stroke="#C79A2B" strokeWidth="2.5" />
                <path d="M20 42 C 13 38, 11 29, 18 24" stroke="#C79A2B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </svg>
              <span style={{ color: '#fff', fontSize: '1.3rem', fontWeight: '700', letterSpacing: '-0.5px' }}>
                Cresoa
              </span>
            </div>
            <span
              style={{
                color: '#C79A2B',
                fontSize: '0.6rem',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                border: '1px solid rgba(199,154,43,0.2)',
                padding: '0.2rem 0.6rem',
                borderRadius: '20px',
                background: 'rgba(199,154,43,0.08)',
              }}
            >
              For Fashion
            </span>
          </div>

          {/* Headline + sub */}
          <div className="fade" style={{ maxWidth: '440px' }}>
            <h1
              style={{
                color: '#fff',
                fontSize: '2.3rem',
                lineHeight: '1.15',
                margin: '0 0 0.5rem',
                fontWeight: '800',
                letterSpacing: '-0.5px',
              }}
            >
              Your fashion business. <br />
              <span style={{ color: '#C79A2B' }}>Finally, all in one place.</span>
            </h1>
            <p
              style={{
                color: '#C8D4E3',
                fontSize: '1rem',
                lineHeight: '1.6',
                margin: '0 0 1.8rem',
                maxWidth: '380px',
              }}
            >
              Stop juggling notebooks, WhatsApp, and spreadsheets. Cresoa brings your customers, measurements, orders, and payments together—so you can focus on sewing.
            </p>
          </div>

          {/* CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxWidth: '380px' }}>
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
                boxShadow: '0 6px 20px rgba(199,154,43,0.25)',
                transition: 'transform 0.1s ease',
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
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              Log in
            </a>
          </div>

          {/* Honest bottom line */}
          <p
            style={{
              color: '#8AA1B9',
              fontSize: '0.75rem',
              margin: '1.5rem 0 0',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              paddingTop: '1rem',
              textAlign: 'center',
            }}
          >
            Built for Nigerian fashion businesses • More service industries coming later
          </p>
        </div>
      </div>

      {/* ========== MAIN CONTENT ========== */}
      <div className="container" style={{ paddingTop: '2.8rem', paddingBottom: '3.5rem' }}>
        {/* === WORKFLOW VISUAL === */}
        <div style={{ marginBottom: '2.8rem' }}>
          <div className="slide">
            <p
              style={{
                color: '#1E3A5F',
                fontSize: '0.7rem',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                margin: '0 0 0.2rem',
              }}
            >
              The Cresoa workflow
            </p>
            <h2
              style={{
                color: '#1E3A5F',
                fontSize: '1.4rem',
                margin: '0 0 0.3rem',
                fontWeight: '700',
                letterSpacing: '-0.3px',
              }}
            >
              From customer to completion
            </h2>
            <div className="divider" />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '0.1rem',
              marginTop: '1.2rem',
            }}
          >
            {workflowSteps.map((step, i) => (
              <div key={step.label}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    background: '#fff',
                    padding: '0.9rem 1.2rem',
                    borderRadius: i === 0 ? '12px 12px 0 0' : i === workflowSteps.length - 1 ? '0 0 12px 12px' : '0',
                    border: '1px solid #E8E0D5',
                    borderBottom: i === workflowSteps.length - 1 ? '1px solid #E8E0D5' : 'none',
                    boxShadow: '0 1px 3px rgba(30,58,95,0.02)',
                  }}
                >
                  <span
                    style={{
                      background: '#1E3A5F',
                      color: '#fff',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                      fontWeight: '700',
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        margin: 0,
                        color: '#1E3A5F',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                      }}
                    >
                      {step.label}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        color: '#6B6255',
                        fontSize: '0.8rem',
                        lineHeight: '1.4',
                      }}
                    >
                      {step.description}
                    </p>
                  </div>
                  {i < workflowSteps.length - 1 && (
                    <span style={{ color: '#C79A2B', fontSize: '0.8rem' }}>→</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p
            style={{
              color: '#6B6255',
              fontSize: '0.75rem',
              margin: '0.6rem 0 0',
              textAlign: 'center',
              opacity: 0.7,
            }}
          >
            For fashion: this means measurements, Aso‑Ebi, production stages, and balances—all connected.
          </p>
        </div>

        {/* === FEATURES (2-col grid with a more premium feel) === */}
        <div style={{ marginBottom: '2.8rem' }}>
          <div className="slide">
            <p
              style={{
                color: '#1E3A5F',
                fontSize: '0.7rem',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                margin: '0 0 0.2rem',
              }}
            >
              Built for fashion businesses
            </p>
            <h2
              style={{
                color: '#1E3A5F',
                fontSize: '1.4rem',
                margin: '0 0 0.3rem',
                fontWeight: '700',
                letterSpacing: '-0.3px',
              }}
            >
              What you can do with Cresoa
            </h2>
            <div className="divider" />
          </div>

          <div className="feature-grid">
            {features.map((f) => (
              <div
                key={f.title}
                className="fade"
                style={{
                  background: '#fff',
                  padding: '1rem 1rem',
                  borderRadius: '12px',
                  border: '1px solid #E8E0D5',
                  boxShadow: '0 2px 8px rgba(30,58,95,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.2rem',
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    color: '#1E3A5F',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    lineHeight: '1.2',
                  }}
                >
                  {f.title}
                </h3>
                <p
                  style={{
                    margin: 0,
                    color: '#6B6255',
                    fontSize: '0.78rem',
                    lineHeight: '1.5',
                  }}
                >
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* === SIMPLE STEPS === */}
        <div
          style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '1.8rem 1.5rem',
            border: '1px solid #E8E0D5',
            boxShadow: '0 4px 12px rgba(30,58,95,0.04)',
            marginBottom: '2.8rem',
          }}
        >
          <h2
            style={{
              color: '#1E3A5F',
              fontSize: '1.2rem',
              margin: '0 0 1.2rem',
              fontWeight: '700',
            }}
          >
            Get your business running in 4 steps
          </h2>
          {steps.map((step, i) => (
            <div
              key={step}
              style={{
                display: 'flex',
                gap: '1rem',
                marginBottom: i < steps.length - 1 ? '1rem' : '0',
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
                  fontSize: '0.7rem',
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
                }}
              >
                {step}
              </p>
            </div>
          ))}
        </div>

        {/* === FINAL CTA (Premium navy banner with gold accent) === */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1E3A5F 0%, #0F1E30 100%)',
            borderRadius: '16px',
            padding: '2.2rem 1.5rem',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(30,58,95,0.2)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-40%',
              right: '-30%',
              width: '200px',
              height: '200px',
              background: 'radial-gradient(circle, rgba(199,154,43,0.08) 0%, transparent 70%)',
              borderRadius: '50%',
            }}
          />
          <h2
            style={{
              color: '#fff',
              fontSize: '1.4rem',
              margin: '0 0 0.5rem',
              fontWeight: '700',
              lineHeight: '1.3',
              position: 'relative',
            }}
          >
            Stop running your business <br />
            from your notebook.
          </h2>
          <p
            style={{
              color: '#C8D4E3',
              fontSize: '0.9rem',
              margin: '0 0 1.8rem',
              opacity: 0.9,
              position: 'relative',
            }}
          >
            Join Nigerian fashion designers who have switched to Cresoa.
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
              boxShadow: '0 4px 16px rgba(199,154,43,0.3)',
              position: 'relative',
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
            marginTop: '1.8rem',
            opacity: 0.6,
          }}
        >
          Cresoa is built in Nigeria for Nigerian service businesses. <br />
          Currently focused on fashion & custom wear — more industries coming.
        </p>
      </div>
    </main>
  );
            }
