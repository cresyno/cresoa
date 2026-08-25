'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import { Navigation } from '../../../../components/Navigation'

// ─── Self-contained SVG icons ───
const Svg = ({ name, size = 20, stroke = 'currentColor' }) => {
  const icons = {
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    search: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
    tool: <><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></>,
    clock: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
    check: <polyline points="20 6 9 17 4 12" />,
    naira: <><path d="M6 3v18M18 3v18M6 8h12M6 16h12" /><path d="M6 3l6 9 6-9M6 21l6-9 6 9" /></>,
    arrowRight: <><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>,
    filter: <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}

const goldBtn = {
  background: '#D4A52A', color: '#fff', border: 'none', padding: '0.6rem 1.2rem',
  borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
  boxShadow: '0 2px 8px rgba(212,165,42,0.3)',
}

const formatMoney = (val) => `₦${Number(val || 0).toLocaleString('en-NG')}`

export default function RepairsJobsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')

  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const fetchJobs = async () => {
      if (!businessId) return
      setLoading(true)
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('business_id', businessId)
        .eq('sector', 'repairs')
        .order('created_at', { ascending: false })

      if (!error) setJobs(data || [])
      setLoading(false)
    }
    fetchJobs()
  }, [businessId])

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = (job.title || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter =
      filter === 'all' ? true :
      filter === 'active' ? !['Delivered', 'Cancelled'].includes(job.current_status) :
      filter === 'overdue' ? (job.due_date && new Date(job.due_date) < new Date() && job.current_status !== 'Delivered') :
      filter === 'ready' ? ['Ready', 'Ready for Pickup', 'Ready for Collection'].includes(job.current_status) :
      filter === 'awaiting' ? ['Awaiting Parts', 'Waiting Parts', 'In Progress'].includes(job.current_status) : true
    return matchesSearch && matchesFilter
  })

  const navigateTo = (path) => router.push(`${path}?business_id=${businessId}`)

  if (loading) return <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', background: '#F8F6F2' }}><Navigation businessId={businessId} /><p style={{ color: '#8A8A8A' }}>Loading jobs...</p></div>

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', background: '#F8F6F2', minHeight: '100vh' }}>
      <Navigation businessId={businessId} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ color: '#8A8A8A', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Repairs</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0', color: '#1A1A1A' }}>All Jobs</h1>
        </div>
        <button onClick={() => navigateTo('/dashboard/repairs/jobs/new')} style={goldBtn}><Svg name="plus" size={16} stroke="#fff" /> New Job</button>
      </div>

      {/* Search & Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #E5E0D8', borderRadius: '8px', padding: '0.4rem 0.8rem' }}>
          <Svg name="search" size={16} stroke="#8A8A8A" style={{ marginRight: '0.5rem' }} />
          <input type="text" placeholder="Search jobs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', color: '#1A1A1A', fontSize: '0.85rem' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['all', 'active', 'overdue', 'ready', 'awaiting'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '0.3rem 0.8rem', borderRadius: '20px', border: `1px solid ${filter === f ? '#D4A52A' : '#E5E0D8'}`, background: filter === f ? '#D4A52A' : '#fff', color: filter === f ? '#fff' : '#1A1A1A', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#8A8A8A' }}>
          <Svg name="tool" size={40} stroke="#D4A52A" />
          <p style={{ marginTop: '1rem' }}>No jobs found.</p>
          <button onClick={() => navigateTo('/dashboard/repairs/jobs/new')} style={goldBtn}>Create First Job</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredJobs.map(job => {
            const overdue = job.due_date && new Date(job.due_date) < new Date() && !['Delivered'].includes(job.current_status)
            const statusColor = job.current_status === 'Delivered' ? '#2E7D5E' : overdue ? '#D9534F' : '#D4A52A'
            return (
              <div key={job.id} onClick={() => navigateTo(`/dashboard/repairs/jobs/${job.id}`)} style={{ background: '#fff', borderRadius: '12px', padding: '1rem', border: '1px solid #E5E0D8', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#1A1A1A' }}>{job.title || 'Repair Job'}</div>
                    {job.description && <div style={{ fontSize: '0.8rem', color: '#8A8A8A' }}>{job.description}</div>}
                  </div>
                  <div style={{ fontWeight: 700, color: '#D4A52A' }}>{formatMoney(job.price)}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, background: statusColor === '#D9534F' ? '#FCEAEA' : '#FBF3E0', color: statusColor }}>{job.current_status || 'Pending'}</span>
                  {job.due_date && <span style={{ fontSize: '0.8rem', color: overdue ? '#D9534F' : '#8A8A8A' }}>Due {new Date(job.due_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: '2rem' }}><Navigation businessId={businessId} /></div>
    </div>
  )
    }
