'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'

const Svg = ({ name, size = 20, stroke = 'currentColor' }) => {
  const icons = {
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    search: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>,
    chevronRight: <polyline points="9 18 15 12 9 6" />,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}

const formatMoney = (val) => `₦${Number(val || 0).toLocaleString('en-NG')}`
const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

const STATUS_COLORS = {
  draft: 'var(--cresoa-text-muted)',
  sent: 'var(--cresoa-info)',
  approved: 'var(--cresoa-success)',
  rejected: 'var(--cresoa-danger)',
  converted: 'var(--cresoa-accent)',
}

export default function QuotationsListPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')

  const [quotations, setQuotations] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const fetchQuotations = async () => {
      if (!businessId) return
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('quotations')
          .select('*, customers(name, first_name, last_name)')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false })

        if (error) throw error
        setQuotations(data || [])
      } catch (err) {
        console.error('Error fetching quotations:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchQuotations()
  }, [businessId])

  const filtered = useMemo(() => {
    let result = quotations
    const query = search.toLowerCase()
    if (query) {
      result = result.filter(q =>
        (q.quote_number || '').toLowerCase().includes(query) ||
        (q.customers?.name || q.customers?.first_name || '').toLowerCase().includes(query)
      )
    }
    if (filter !== 'all') result = result.filter(q => q.status === filter)
    return result
  }, [quotations, search, filter])

  if (loading) {
    return (
      <div style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto', background: 'var(--cresoa-bg)', minHeight: '100vh' }}>
        <div className="cresoa-skeleton-card" style={{ marginBottom: '1rem' }}>
          <div className="cresoa-skeleton medium" />
          <div className="cresoa-skeleton short" />
        </div>
        <div className="cresoa-loading-grid">
          {[1, 2, 3].map(i => <div key={i} className="cresoa-skeleton-card"><div className="cresoa-skeleton short" /><div className="cresoa-skeleton long" /></div>)}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto', background: 'var(--cresoa-bg)', minHeight: '100vh', paddingBottom: '80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Printing</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0 0', color: 'var(--cresoa-text)' }}>Quotations</h1>
        </div>
        <button onClick={() => router.push(`/dashboard/printing/quotations/new?business_id=${businessId}`)} className="cresoa-primary-button">
          <Svg name="plus" size={16} stroke="#fff" /> New Quotation
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {['all', 'draft', 'sent', 'approved', 'rejected', 'converted'].map(tab => (
          <button key={tab} onClick={() => setFilter(tab)} style={{ padding: '0.4rem 0.9rem', borderRadius: '20px', border: `1px solid ${filter === tab ? 'var(--cresoa-accent)' : 'var(--cresoa-border)'}`, background: filter === tab ? 'var(--cresoa-accent-soft)' : 'var(--cresoa-surface)', color: filter === tab ? 'var(--cresoa-accent)' : 'var(--cresoa-text-muted)', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--cresoa-surface)', border: '1px solid var(--cresoa-border)', borderRadius: '8px', padding: '0.4rem 0.8rem', marginBottom: '1rem' }}>
        <Svg name="search" size={16} stroke="var(--cresoa-text-muted)" style={{ marginRight: '0.5rem' }} />
        <input type="text" placeholder="Search quotes..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', color: 'var(--cresoa-text)' }} />
      </div>

      {filtered.length === 0 ? (
        <div className="cresoa-empty-state">
          <Svg name="file" size={40} stroke="var(--cresoa-accent)" />
          <span className="cresoa-empty-state-title">No quotations yet</span>
          <span className="cresoa-empty-state-message">Create your first quotation to get started.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filtered.map(q => {
            const custName = q.customers?.name || q.customers?.first_name || 'Customer'
            return (
              <div key={q.id} onClick={() => router.push(`/dashboard/printing/quotations/${q.id}?business_id=${businessId}`)} className="cresoa-card" style={{ padding: '0.8rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--cresoa-text)' }}>{q.quote_number} · {custName}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--cresoa-text-muted)' }}>{formatDate(q.created_at)} · {formatMoney(q.total)}</div>
                </div>
                <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, background: `${STATUS_COLORS[q.status] || '#666'}20`, color: STATUS_COLORS[q.status] || '#666' }}>{q.status}</span>
                <Svg name="chevronRight" size={16} stroke="var(--cresoa-text-muted)" />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
    }
