'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { Card } from '../../../components/Card'
import { SectionHeader } from '../../../components/SectionHeader'
import { Icon } from '../../../components/Icon'
import { Navigation } from '../../../components/Navigation'

export default function RepairsDashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')

  const navigateWithBusiness = (path) => {
    const separator = path.includes('?') ? '&' : '?'
    router.push(`${path}${separator}business_id=${businessId}`)
  }

  const [stats, setStats] = useState({
    active: 0,
    diagnosis: 0,
    waiting: 0,
    ready: 0,
    total: 0
  })
  const [stages, setStages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!businessId) return

    const fetchData = async () => {
      try {
        // 1. Fetch custom workflow stages from business_workflows
        const stagesRes = await fetch(`/api/settings/workflow?business_id=${businessId}`)
        const stagesData = await stagesRes.json()
        if (stagesData.stages && stagesData.stages.length > 0) {
          setStages(stagesData.stages.map(s => s.stage_name))
        } else {
          // Fallback default stages for repairs
          setStages(['Received', 'Diagnosing', 'Waiting for Parts', 'In Repair', 'Ready for Pickup'])
        }

        // 2. Fetch repair job stats
        const { data: jobs, error } = await supabase
          .from('repair_jobs')
          .select('status')
          .eq('business_id', businessId)

        if (error) throw error

        const total = jobs?.length || 0
        const active = jobs?.filter(j => j.status === 'In Repair').length || 0
        const diagnosis = jobs?.filter(j => j.status === 'Diagnosing').length || 0
        const waiting = jobs?.filter(j => j.status === 'Waiting for Parts').length || 0
        const ready = jobs?.filter(j => j.status === 'Ready for Pickup').length || 0

        setStats({ active, diagnosis, waiting, ready, total })
      } catch (error) {
        console.error('Failed to load repair dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [businessId])

  if (loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
        <Navigation businessId={businessId} />
        <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ height: '80px', background: 'var(--cresoa-border)', borderRadius: '12px', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
        <div style={{ height: '200px', background: 'var(--cresoa-border)', borderRadius: '12px', marginTop: '1.5rem', animation: 'pulse 1.5s infinite' }} />
        <style>{`@keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }`}</style>
        <div style={{ marginTop: '2rem' }}>
          <Navigation businessId={businessId} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px', background: 'var(--cresoa-bg)' }}>
      <Navigation businessId={businessId} />

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <div>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Repairs</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0', color: 'var(--cresoa-text)' }}>Dashboard</h1>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', margin: 0 }}>Monitor your repair jobs and workshop progress.</p>
        </div>
        <button 
          onClick={() => navigateWithBusiness('/dashboard/repairs/jobs/new')}
          style={{ background: 'var(--cresoa-primary)', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <Icon name="plus" size={16} stroke="#fff" /> New Repair Job
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <Card style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>In Repair</div>
          <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--cresoa-text)' }}>{stats.active}</div>
        </Card>
        <Card style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Diagnosing</div>
          <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--cresoa-text)' }}>{stats.diagnosis}</div>
        </Card>
        <Card style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Waiting for Parts</div>
          <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--cresoa-text)' }}>{stats.waiting}</div>
        </Card>
        <Card style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Ready for Pickup</div>
          <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--cresoa-text)' }}>{stats.ready}</div>
        </Card>
      </div>

      {/* Production Pipeline */}
      <Card style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <SectionHeader 
          title="Production Pipeline" 
          subtitle="How your repair jobs are moving through the workshop" 
        />
        {stages.length === 0 ? (
          <p style={{ color: 'var(--cresoa-text-muted)', textAlign: 'center', padding: '1rem 0' }}>
            No stages defined yet. Configure your workflow in Settings.
          </p>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', paddingTop: '1rem' }}>
            {stages.map((stage, index) => (
              <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: '60px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: index === 0 ? 'var(--cresoa-accent)' : 'var(--cresoa-card)',
                  border: '2px solid var(--cresoa-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  color: index === 0 ? '#0F2B4A' : 'var(--cresoa-text-muted)',
                  marginBottom: '0.3rem'
                }}>
                  {index + 1}
                </div>
                <div style={{ fontSize: '0.6rem', color: 'var(--cresoa-text-muted)', textAlign: 'center' }}>
                  {stage}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={businessId} />
      </div>
    </div>
  )
            }
