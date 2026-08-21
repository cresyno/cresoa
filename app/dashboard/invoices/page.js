'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../lib/getBusinessId'
import { Navigation } from '../../../components/Navigation'
import '../../globals.css'

// ─── SELF-CONTAINED SVGs (No imports) ───
const Svg = ({ name, size = 20, stroke = 'currentColor', style }) => {
  const icons = {
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    search: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
    arrowRight: <><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>,
    checkCircle: <><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="M9 12l2 2 4-4" /></>,
    alertCircle: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>,
    clock: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
    filter: <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>{icons[name]}</svg>
}

export default function InvoicesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [businessId, setBusinessId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState('all')

  // Fetch invoices on mount
  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/login')
          return
        }

        const bizId = getCurrentBusinessId()
        if (!bizId) {
          router.push('/dashboard')
          return
        }
        setBusinessId(bizId)

        const { data, error: invoicesError } = await supabase
          .from('invoices')
          .select(`
            *,
            customers (
              id,
              name,
              first_name,
              last_name,
              phone
            )
          `)
          .eq('business_id', bizId)
          .order('created_at', { ascending: false })

        if (invoicesError) throw invoicesError

        setInvoices(data || [])
      } catch (err) {
        console.error('Error fetching invoices:', err)
        setError('Could not load your invoices.')
      } finally {
        setLoading(false)
      }
    }

    fetchInvoices()
  }, [router])

  // Filter & Search Logic
  const filteredInvoices = invoices.filter((invoice) => {
    const customerName = invoice.customers?.name || invoice.customers?.first_name || 'Unknown'
    const invoiceNumber = invoice.invoice_number || ''
    
    const matchesSearch =
      customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())

    let matchesFilter = true
    if (filter === 'paid') matchesFilter = invoice.status === 'paid' || invoice.balance_due <= 0
    if (filter === 'unpaid') matchesFilter = invoice.status !== 'paid' && invoice.balance_due > 0
    if (filter === 'overdue') matchesFilter = invoice.status === 'overdue'

    return matchesSearch && matchesFilter
  })

  // Format money
  const formatMoney = (val) => `₦${Number(val || 0).toLocaleString('en-NG')}`
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  // Status badge color logic
  const getStatusBadge = (invoice) => {
    if (invoice.status === 'paid' || invoice.balance_due <= 0) {
      return { label: 'Paid', color: 'var(--cresoa-success)', bg: 'rgba(46,125,94,0.1)' }
    }
    if (invoice.status === 'overdue') {
      return { label: 'Overdue', color: 'var(--cresoa-danger)', bg: 'rgba(211,47,47,0.1)' }
    }
    return { label: 'Balance Due', color: 'var(--cresoa-accent)', bg: 'rgba(212,165,42,0.1)' }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cresoa-bg)' }}>
        <div className="cresoa-loading-spinner" />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
        <Svg name="alertCircle" size={30} stroke="var(--cresoa-danger)" />
        <h2 style={{ margin: '14px 0 7px', color: 'var(--cresoa-text)' }}>Couldn't load invoices</h2>
        <p style={{ maxWidth: '360px', margin: '0 0 18px', color: 'var(--cresoa-text-muted)' }}>{error}</p>
        <button onClick={() => window.location.reload()} className="cresoa-primary-button">Try again</button>
      </div>
    )
  }

  // EMPTY STATE
  if (invoices.length === 0) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
        <Navigation businessId={businessId} />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--cresoa-text)' }}>Invoices</h1>
          <button
            onClick={() => router.push(`/dashboard/invoices/new?business_id=${businessId}`)}
            className="cresoa-primary-button"
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            <Svg name="plus" size={14} stroke="#fff" style={{ marginRight: '0.3rem' }} /> New Invoice
          </button>
        </div>

        <div style={{
          minHeight: '50vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '2rem',
          background: 'var(--cresoa-surface)',
          borderRadius: '16px',
          border: '1px solid var(--cresoa-border)',
        }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '20px',
            background: 'rgba(212,165,42,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '1rem'
          }}>
            <Svg name="file" size={36} stroke="var(--cresoa-accent)" />
          </div>
          <h3 style={{ margin: '0 0 0.5rem', color: 'var(--cresoa-text)', fontSize: '1.2rem' }}>No invoices yet</h3>
          <p style={{ margin: '0 0 1.5rem', color: 'var(--cresoa-text-muted)', maxWidth: '320px', fontSize: '0.85rem' }}>
            Create your first invoice to start tracking payments and sending professional invoices to your customers.
          </p>
          <button
            onClick={() => router.push(`/dashboard/invoices/new?business_id=${businessId}`)}
            className="cresoa-primary-button"
          >
            <Svg name="plus" size={14} stroke="#fff" style={{ marginRight: '0.3rem' }} /> Create First Invoice
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
      <Navigation businessId={businessId} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--cresoa-text)' }}>Invoices</h1>
          <p style={{ margin: '0.2rem 0 0', color: 'var(--cresoa-text-muted)', fontSize: '0.85rem' }}>
            {invoices.length} total invoice{invoices.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => router.push(`/dashboard/invoices/new?business_id=${businessId}`)}
          className="cresoa-primary-button"
          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
        >
          <Svg name="plus" size={14} stroke="#fff" style={{ marginRight: '0.3rem' }} /> New Invoice
        </button>
      </div>

      {/* Search & Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', border: '1px solid var(--cresoa-border)', borderRadius: '8px', padding: '0.4rem 0.8rem', background: 'var(--cresoa-surface)' }}>
          <Svg name="search" size={16} stroke="var(--cresoa-text-muted)" style={{ marginRight: '0.5rem' }} />
          <input
            type="text"
            placeholder="Search by customer or invoice #"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', color: 'var(--cresoa-text)', fontSize: '0.85rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: 'All' },
            { key: 'paid', label: 'Paid' },
            { key: 'unpaid', label: 'Unpaid' },
            { key: 'overdue', label: 'Overdue' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              style={{
                padding: '0.4rem 0.9rem',
                borderRadius: '20px',
                border: `1px solid ${filter === tab.key ? 'var(--cresoa-accent)' : 'var(--cresoa-border)'}`,
                background: filter === tab.key ? 'rgba(212,165,42,0.1)' : 'transparent',
                color: filter === tab.key ? 'var(--cresoa-accent)' : 'var(--cresoa-text-muted)',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Table */}
      <div style={{ display: 'none', '@media (min-width: 768px)': { display: 'block' } }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--cresoa-surface)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--cresoa-border)' }}>
          <thead>
            <tr style={{ background: 'var(--cresoa-bg)', borderBottom: '1px solid var(--cresoa-border)' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Invoice #</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Customer</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 700, color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 700, color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map((invoice) => {
              const customerName = invoice.customers?.name || invoice.customers?.first_name || 'Unknown'
              const badge = getStatusBadge(invoice)
              return (
                <tr
                  key={invoice.id}
                  onClick={() => router.push(`/dashboard/invoices/${invoice.id}?business_id=${businessId}`)}
                  style={{ cursor: 'pointer', borderBottom: '1px solid var(--cresoa-border)', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--cresoa-bg)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--cresoa-text)' }}>{invoice.invoice_number}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--cresoa-text)' }}>{customerName}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--cresoa-text-muted)', fontSize: '0.85rem' }}>{formatDate(invoice.issue_date)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--cresoa-text)' }}>{formatMoney(invoice.total)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span style={{ padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: badge.bg, color: badge.color }}>
                      {badge.label}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--cresoa-text-muted)' }}>
                    <Svg name="arrowRight" size={16} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', '@media (min-width: 768px)': { display: 'none' } }}>
        {filteredInvoices.map((invoice) => {
          const customerName = invoice.customers?.name || invoice.customers?.first_name || 'Unknown'
          const badge = getStatusBadge(invoice)
          return (
            <div
              key={invoice.id}
              onClick={() => router.push(`/dashboard/invoices/${invoice.id}?business_id=${businessId}`)}
              style={{
                background: 'var(--cresoa-surface)',
                borderRadius: '12px',
                border: '1px solid var(--cresoa-border)',
                padding: '1rem',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <strong style={{ fontSize: '0.9rem', color: 'var(--cresoa-text)' }}>{invoice.invoice_number}</strong>
                <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700, background: badge.bg, color: badge.color }}>
                  {badge.label}
                </span>
              </div>
              <p style={{ margin: '0 0 0.5rem', color: 'var(--cresoa-text-muted)', fontSize: '0.85rem' }}>{customerName}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.75rem' }}>{formatDate(invoice.issue_date)}</span>
                <strong style={{ color: 'var(--cresoa-text)', fontSize: '0.9rem' }}>{formatMoney(invoice.total)}</strong>
              </div>
            </div>
          )
        })}
      </div>

      {/* No Results State */}
      {filteredInvoices.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--cresoa-text-muted)' }}>
          <Svg name="search" size={28} stroke="currentColor" style={{ marginBottom: '0.5rem' }} />
          <p>No invoices match your search.</p>
        </div>
      )}
    </div>
  )
    }
