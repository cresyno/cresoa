'use client';
import Link from 'next/link'
import { useEffect } from 'react'

const ICONS = {
  check: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  arrowRight: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  reply: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 17 4 12 9 7" />
      <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
    </svg>
  ),
}

export default function WelcomePage() {
  useEffect(() => {
    document.title = "You're in — Cresoa"
  }, [])

  return (
    <main className="welcome">
      <style jsx global>{`
        :root {
          --color-bg: #F8F6F2;
          --color-card: #FFFFFF;
          --color-text: #1A1A1A;
          --color-text-muted: #6B6B6B;
          --color-border: #E5E0D8;
          --color-primary: #0F2B4A;
          --color-accent: #D4A52A;
        }
        body { margin: 0; }
      `}</style>

      <style jsx>{`
        .welcome {
          min-height: 100vh;
          background: var(--color-bg);
          color: var(--color-text);
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2.5rem 1.5rem;
          -webkit-font-smoothing: antialiased;
        }

        .card {
          max-width: 620px;
          width: 100%;
          background: var(--color-card);
          border-radius: 24px;
          border: 1px solid var(--color-border);
          box-shadow: 0 24px 60px rgba(15, 43, 74, 0.08);
          padding: 3rem 2.4rem;
          position: relative;
          overflow: hidden;
          animation: rise 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes rise {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pop {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }

        .card::before {
          content: '';
          position: absolute;
          top: -60%;
          right: -20%;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(212, 165, 42, 0.10) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }

        .badge {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: var(--color-accent);
          color: var(--color-primary);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.6rem;
          box-shadow: 0 8px 24px rgba(212, 165, 42, 0.35);
          animation: pop 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
        }

        h1 {
          font-family: 'Fraunces', 'Georgia', serif;
          font-weight: 700;
          font-size: 2.4rem;
          line-height: 1.1;
          letter-spacing: -0.02em;
          margin: 0 0 0.8rem;
          color: var(--color-text);
          position: relative;
        }

        h1 span { color: var(--color-accent); }

        .lede {
          font-size: 1.02rem;
          color: var(--color-text-muted);
          line-height: 1.7;
          margin: 0 0 2rem;
          position: relative;
        }

        .divider {
          height: 1px;
          background: var(--color-border);
          margin: 2rem 0;
          position: relative;
        }

        .note-label {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--color-accent);
          margin-bottom: 0.8rem;
        }

        .note p {
          font-size: 0.97rem;
          line-height: 1.75;
          color: var(--color-text);
          margin: 0 0 1rem;
        }

        .note p.muted {
          color: var(--color-text-muted);
        }

        .question {
          background: rgba(212, 165, 42, 0.06);
          border-left: 3px solid var(--color-accent);
          padding: 1.1rem 1.3rem;
          border-radius: 0 12px 12px 0;
          margin: 1.6rem 0;
          display: flex;
          gap: 0.9rem;
          align-items: flex-start;
        }

        .question-icon {
          color: var(--color-accent);
          flex-shrink: 0;
          margin-top: 0.15rem;
        }

        .question p {
          margin: 0;
          font-size: 0.95rem;
          line-height: 1.65;
          color: var(--color-text);
        }

        .signature {
          font-family: 'Fraunces', serif;
          font-weight: 700;
          font-size: 1rem;
          color: var(--color-text);
          margin-top: 1.4rem;
        }

        .signature-title {
          font-size: 0.85rem;
          color: var(--color-text-muted);
          margin-top: 0.15rem;
        }

        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.7rem;
          margin-top: 2.2rem;
          position: relative;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.85rem 1.6rem;
          border-radius: 10px;
          font-size: 0.92rem;
          font-weight: 600;
          font-family: inherit;
          text-decoration: none;
          cursor: pointer;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s, background 0.2s;
          background: var(--color-accent);
          color: var(--color-primary);
          border: none;
          box-shadow: 0 6px 20px rgba(212, 165, 42, 0.3);
        }

        .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(212, 165, 42, 0.4);
          background: #C79A2B;
        }

        .btn-ghost {
          background: transparent;
          color: var(--color-text);
          border: 1px solid var(--color-border);
          box-shadow: none;
        }

        .btn-ghost:hover {
          background: rgba(212, 165, 42, 0.05);
          border-color: var(--color-accent);
          box-shadow: none;
        }

        .footer-note {
          font-size: 0.78rem;
          color: var(--color-text-muted);
          text-align: center;
          margin-top: 2rem;
          position: relative;
        }

        @media (max-width: 640px) {
          .card { padding: 2.2rem 1.5rem; border-radius: 20px; }
          h1 { font-size: 1.85rem; }
          .actions .btn { flex: 1; }
        }
      `}</style>

      <div className="card">
        <div className="badge">{ICONS.check}</div>

        <h1>
          You're in. <span>Welcome to Cresoa.</span>
        </h1>

        <p className="lede">
          You are now a Founding Member. You'll hear from me first, and you get 30 days of Pro features free at launch. No credit card. No catch.
        </p>

        <div className="divider" />

        <div className="note">
          <span className="note-label">A note from the founder</span>
          <p>
            Hi — I'm Taiwo. I'm building Cresoa for Nigerian businesses like yours. Fashion, Repairs, and Printing are ready. Launch is 6 months away, and I'm not shipping until it's right.
          </p>
          <p className="muted">
            I'll only email when there's something real to share. No weekly fluff. Just real progress.
          </p>

          <div className="question">
            <div className="question-icon">{ICONS.reply}</div>
            <p>
              One question, and I actually want to know: <strong>what's the hardest part of running your business right now?</strong> Just reply to my email and tell me. I read every one.
            </p>
          </div>

          <div className="signature">— Taiwo A. Feranmi</div>
          <div className="signature-title">Founder, Cresoa</div>
        </div>

        <div className="actions">
          <Link href="/" className="btn">
            Back to homepage {ICONS.arrowRight}
          </Link>
          <Link href="/fashion" className="btn btn-ghost">
            Explore Cresoa
          </Link>
        </div>

        <p className="footer-note">
          Cresoa · Built in Nigeria for Nigerian businesses
        </p>
      </div>
    </main>
  )
    }
