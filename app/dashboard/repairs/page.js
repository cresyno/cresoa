'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { Navigation } from '../../../components/Navigation'

// ─── Self-contained SVG Icons ───
const Svg = ({ name, size = 20, stroke = 'currentColor' }) => {
  const icons = {
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    tool: <><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></>,
    package: <><path d="M20.91 8.84L12 13 3.09 8.84" /><line x1="12" y1="22" x2="12" y2="13" /><line x1="2" y1="4" x2="12" y2="9" /><line x1="22" y1="4" x2="12" y2="9" /></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
    check: <polyline points="20 6 9 17 4 12" />,
    alert: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>,
    money: <><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>,
    arrowRight: <><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}

// ─── Gold Button Style ───
const goldBtn = {
  background: '#D4A52A',
  color: '#fff',
  border: 'none',
  padding: '0.6rem 1.2rem',
  borderRadius: '8px',
  fontWeight: 700,
  cursor: 'pointer',
  fontSize: '0.9rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.4rem',
  boxShadow: '0 2px 8px rgba(212,165,42,0.3)',
}

export default function RepairsDashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')

  const [stats, setStats] = useState({ activeJobs: 0, overdueJobs: 0, parts: 0, revenue: 0 })
  const [recentJobs, setRecentJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboard = async () => {
      if (!businessId) return
      setLoading(true)
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData?.session?.access_token

        // Fetch Jobs (for repairs)
        const { data: jobs, error: jobError } = await supabase
          .from('orders')
          .select('*')
          .eq('business_id', businessId)
          .eq('sector', 'repairs')
          .order('created_at', { ascending: false })
          .limit(10)

        if (jobError) throw jobError

        // Fetch Parts (for repairs)
        const { data: parts, error: partError } = await supabase
          .from('inventory_items')
          .select('*')
          .eq('business_id', businessId)
          .eq('sector', 'repairs')

        if (partError) throw partError

        // Calculate Stats
        const activeJobs = jobs?.filter(j => !['Delivered', 'Cancelled'].includes(j.current_status)).length || 0
        const overdueJobs = jobs?.filter(j => j.due_date && new Date(j.due_date) < new Date() && j.current_status !== 'Delivered').length || 0
        const totalRevenue = jobs?.reduce((sum, j) => sum + Number(j.price || 0), 0) || 0

        setStats({
          activeJobs,
          overdueJobs,
          parts: parts?.length || 0,
          revenue: totalRevenue
        })
        setRecentJobs(jobs || [])
      } catch (e) {
        console.error('Error fetching repairs dashboard:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [businessId])

  const navigateTo = (path) => {
    router.push(`${path}?business_id=${businessId}`)
  }

  if (loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', background: '#F8F6F2', minHeight: '100vh' }}>
        <Navigation businessId={businessId} />
        <p style={{ color: '#8A8A8A' }}>Loading repairs dashboard...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', background: '#F8F6F2', minHeight: '100vh' }}>
      <Navigation businessId={businessId} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ color: '#8A8A8A', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Repairs Dashboard</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0', color: '#1A1A1A' }}>Good day, Engineer! 👋</h1>
        </div>
        <button onClick={() => navigateTo('/dashboard/repairs/jobs/new')} style={goldBtn}>
          <Svg name="plus" size={16} stroke="#fff" /> New Job
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '1rem', border: '1px solid #E5E0D8', textAlign: 'center' }}>
          <Svg name="tool" size={20} stroke="#D4A52A" style={{ marginBottom: '0.3rem' }} />
          <div style={{ fontSize: '0.7rem', color: '#8A8A8A', textTransform: 'uppercase' }}>Active Jobs</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1A1A1A' }}>{stats.activeJobs}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '1rem', border: '1px solid #E5E0D8', textAlign: 'center' }}>
          <Svg name="alert" size={20} stroke="#D9534F" style={{ marginBottom: '0.3rem' }} />
          <div style={{ fontSize: '0.7rem', color: '#8A8A8A', textTransform: 'uppercase' }}>Overdue Jobs</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: stats.overdueJobs > 0 ? '#D9534F' : '#1A1A1A' }}>{stats.overdueJobs}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '1rem', border: '1px solid #E5E0D8', textAlign: 'center' }}>
          <Svg name="package" size={20} stroke="#2E7D5E" style={{ marginBottom: '0.3rem' }} />
          <div style={{ fontSize: '0.7rem', color: '#8A8A8A', textTransform: 'uppercase' }}>Parts</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1A1A1A' }}>{stats.parts}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '1rem', border: '1px solid #E5E0D8', textAlign: 'center' }}>
          <Svg name="money" size={20} stroke="#D4A52A" style={{ marginBottom: '0.3rem' }} />
          <div style={{ fontSize: '0.7rem', color: '#8A8A8A', textTransform: 'uppercase' }}>Revenue</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#D4A52A' }}>₦{stats.revenue.toLocaleString()}</div>
        </div>
      </div>

      {/* Pipeline / Quick Actions */}
      <div style={{ background: '#fff', borderRadius: '12px', padding: '1rem', border: '1px solid #E5E0D8', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600, color: '#1A1A1A' }}>Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem' }}>
          <button onClick={() => navigateTo('/dashboard/repairs/jobs/new')} style={{ ...goldBtn, fontSize: '0.8rem', padding: '0.5rem' }}>
            <Svg name="plus" size={14} stroke="#fff" /> New Job
          </button>
          <button onClick={() => navigateTo('/dashboard/repairs/inventory')} style={{ ...goldBtn, fontSize: '0.8rem', padding: '0.5rem', background: '#2E7D5E' }}>
            <Svg name="package" size={14} stroke="#fff" /> Parts
          </button>
          <button onClick={() => navigateTo('/dashboard/repairs/customers')} style={{ ...goldBtn, fontSize: '0.8rem', padding: '0.5rem', background: '#0F2B4A' }}>
            <Svg name="user" size={14} stroke="#fff" /> Customers
          </button>
        </div>
      </div>

      {/* Recent Jobs */}
      <div style={{ background: '#fff', borderRadius: '12px', padding: '1rem', border: '1px solid #E5E0D8' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600, color: '#1A1A1A' }}>Recent Jobs</h3>
        {recentJobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#8A8A8A' }}>
            <Svg name="tool" size={32} stroke="#D4A52A" />
            <p style={{ marginTop: '0.5rem' }}>No jobs yet. Create your first repair job!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recentJobs.map(job => (
              <div key={job.id} onClick={() => navigateTo(`/dashboard/repairs/jobs/${job.id}`)} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: '#FBF3E0', borderRadius: '8px', cursor: 'pointer' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: '#1A1A1A' }}>{job.title || 'Repair Job'}</div>
                  <div style={{ fontSize: '0.8rem', color: '#8A8A8A' }}>{job.current_status || 'Pending'}</div>
                </div>
                <div style={{ fontWeight: 700, color: '#D4A52A' }}>₦{Number(job.price || 0).toLocaleString()}</div>
                <Svg name="arrowRight" size={16} stroke="#8A8A8A" />
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={businessId} />
      </div>
    </div>
  )
    }
