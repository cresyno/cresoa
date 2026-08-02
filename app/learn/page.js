'use client'

import Link from 'next/link'

export default function LearnPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#F8F6F2', padding: '2rem 1.5rem', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <Link href="/" style={{ color: '#0F2B4A', textDecoration: 'none', fontSize: '0.85rem' }}>← Back</Link>

        <h1 style={{ color: '#0F2B4A', fontSize: '2rem', marginTop: '1rem' }}>What is Cresoa? 🤔</h1>
        <p style={{ color: '#8A8A8A', fontSize: '1.05rem' }}>
          Cresoa is the simple operating system for Nigerian SMEs. Manage customers, orders, payments, and production – all in one place.
        </p>

        <div style={{ marginTop: '2rem' }}>
          <h2 style={{ color: '#0F2B4A', fontSize: '1.3rem' }}>🎯 How It Works</h2>
          <ul style={{ color: '#1A1A1A', lineHeight: '2' }}>
            <li>✅ Sign up and create your business profile</li>
            <li>✅ Add customers and track their orders</li>
            <li>✅ Record payments and track balances</li>
            <li>✅ Send tracking links to customers</li>
            <li>✅ Manage staff (Starter & Pro plans)</li>
          </ul>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <h2 style={{ color: '#0F2B4A', fontSize: '1.3rem' }}>🧪 What is the Beta Plan?</h2>
          <p style={{ color: '#1A1A1A' }}>
            The Beta plan gives you <strong>full Pro access for 90 days – completely free</strong>. It’s for early adopters who want to test Cresoa and help us improve.
          </p>
          <p style={{ color: '#8A8A8A', fontSize: '0.9rem' }}>
            After 90 days, you can choose to stay on the Free plan or upgrade to Starter (₦3,000/mo) or Pro (₦8,000/mo).
          </p>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <h2 style={{ color: '#0F2B4A', fontSize: '1.3rem' }}>📊 Plan Comparison</h2>
          <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #E5E0D8', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead style={{ background: '#F0EDE8' }}>
                <tr><th style={{ padding: '0.6rem', textAlign: 'left' }}>Feature</th><th style={{ padding: '0.6rem', textAlign: 'center' }}>Free</th><th style={{ padding: '0.6rem', textAlign: 'center' }}>Starter</th><th style={{ padding: '0.6rem', textAlign: 'center' }}>Pro</th></tr>
              </thead>
              <tbody>
                <tr><td style={{ padding: '0.5rem' }}>Customers</td><td style={{ textAlign: 'center' }}>20</td><td style={{ textAlign: 'center' }}>∞</td><td style={{ textAlign: 'center' }}>∞</td></tr>
                <tr><td style={{ padding: '0.5rem' }}>Orders</td><td style={{ textAlign: 'center' }}>50</td><td style={{ textAlign: 'center' }}>∞</td><td style={{ textAlign: 'center' }}>∞</td></tr>
                <tr><td style={{ padding: '0.5rem' }}>Staff accounts</td><td style={{ textAlign: 'center' }}>0</td><td style={{ textAlign: 'center' }}>2</td><td style={{ textAlign: 'center' }}>10</td></tr>
                <tr><td style={{ padding: '0.5rem' }}>WhatsApp integration</td><td style={{ textAlign: 'center' }}>✗</td><td style={{ textAlign: 'center' }}>✓</td><td style={{ textAlign: 'center' }}>✓</td></tr>
                <tr><td style={{ padding: '0.5rem' }}>Tracking links</td><td style={{ textAlign: 'center' }}>✗</td><td style={{ textAlign: 'center' }}>✓</td><td style={{ textAlign: 'center' }}>✓</td></tr>
                <tr><td style={{ padding: '0.5rem' }}>Analytics</td><td style={{ textAlign: 'center' }}>✗</td><td style={{ textAlign: 'center' }}>Basic</td><td style={{ textAlign: 'center' }}>Advanced</td></tr>
                <tr><td style={{ padding: '0.5rem' }}>Price</td><td style={{ textAlign: 'center' }}><strong>₦0</strong></td><td style={{ textAlign: 'center' }}><strong>₦3,000/mo</strong></td><td style={{ textAlign: 'center' }}><strong>₦8,000/mo</strong></td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <Link href="/signup" className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.9rem 2.5rem' }}>
            🚀 Start Using Cresoa
          </Link>
        </div>
      </div>
    </div>
  )
  }
