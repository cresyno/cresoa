'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../lib/getBusinessId'
import { Icon } from '../../../components/Icon'

export default function RemindersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [businessName, setBusinessName] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // all, pending, completed

  const loadReminders = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      let businessId = getCurrentBusinessId()
      if (!businessId) {
        const { data: owned } = await supabase
          .from('businesses')
          .select('id, name')
          .eq('owner_id', user.id)
          .single()
        if (owned) {
          businessId = owned.id
          setBusinessName(owned.name)
        }
      } else {
        const { data: biz } = await supabase
          .from('businesses')
          .select('name')
          .eq('id', businessId)
          .single()
        if (biz) setBusinessName(biz.name)
      }

      if (!businessId) {
        router.push('/onboarding')
        return
      }

      // ─── Fetch reminders from the 'reminders' table ───
      // If you don't have this table yet, create it in Supabase:
      // CREATE TABLE reminders (
      //   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      //   business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
      //   title TEXT NOT NULL,
      //   due_date DATE,
      //   status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
      //   created_at TIMESTAMPTZ DEFAULT NOW()
      // );
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('business_id', businessId)
        .order('due_date', { ascending: true, nullsFirst: true })

      if (error) {
        // If table doesn't exist, show a friendly message
        if (error.code === '42P01') {
          setReminders([])
          setLoading(false)
          return
        }
        throw error
      }
      setReminders(data || [])
    } catch (err) {
      console.error('Error loading reminders:', err)
      setError('Failed to load reminders.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReminders()
  }, [router, searchParams])

  const filteredReminders = reminders.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return r.title?.toLowerCase().includes(q)
    }
    return true
  })

  const pendingCount = reminders.filter(r => r.status === 'pending').length
  const completedCount = reminders.filter(r => r.status === 'completed').length

  // ─── Handle status toggle ───
  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'pending' ? 'completed' : 'pending'
    const { error } = await supabase
      .from('reminders')
      .update({ status: newStatus })
      .eq('id', id)
    if (error) {
      alert('Failed to update reminder status.')
      return
    }
    loadReminders()
  }

  // ─── Handle delete ───
  const deleteReminder = async (id) => {
    if (!confirm('Delete this reminder?')) return
    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id)
    if (error) {
      alert('Failed to delete reminder.')
      return
    }
    loadReminders()
  }

  // ─── Skeleton ───
  if (loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ width: '140px', height: '24px', background: 'var(--color-border)', borderRadius: '6px' }} />
          <div style={{ width: '80px', height: '20px', background: 'var(--color-border)', borderRadius: '6px' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ background: 'var(--color-card)', padding: '1rem', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', animation: 'pulse 1.5s infinite' }}>
              <div style={{ width: '60%', height: '16px', background: 'var(--color-border)', borderRadius: '6px' }} />
              <div style={{ width: '40%', height: '12px', background: 'var(--color-border)', borderRadius: '6px', marginTop: '0.5rem' }} />
              <div style={{ width: '30%', height: '12px', background: 'var(--color-border)', borderRadius: '6px', marginTop: '0.5rem' }} />
            </div>
          ))}
        </div>
        <style>{`@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-danger)' }}>
        {error}
        <button onClick={loadReminders} style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Retry</button>
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', color: 'var(--color-text)' }}>
      {/* ─── Header ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0, color: 'var(--color-text)' }}>Reminders</h1>
          {businessName && <p style={{ color: 'var(--color-text-muted)', margin: '0.1rem 0 0', fontSize: '0.85rem' }}>{pendingCount} pending · {completedCount} completed</p>}
        </div>
        <a href={`/dashboard/reminders/new?business_id=${getCurrentBusinessId() || ''}`} style={{ padding: '0.4rem 1rem', background: 'var(--color-accent)', color: '#fff', borderRadius: '6px', fontWeight: '500', fontSize: '0.85rem', textDecoration: 'none' }}>
          <Icon name="plus" size={14} stroke="#fff" style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} /> New Reminder
        </a>
      </div>

      {/* ─── Search & Filter ─── */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Search reminders..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: '1 1 200px', padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.85rem' }}
        />
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          {['all', 'pending', 'completed'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                padding: '0.2rem 0.8rem',
                borderRadius: '20px',
                border: filter === s ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                background: filter === s ? 'var(--color-accent)' : 'var(--color-card)',
                color: filter === s ? '#fff' : 'var(--color-text)',
                cursor: 'pointer',
                fontSize: '0.7rem',
                fontWeight: '600'
              }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Reminders List ─── */}
      {filteredReminders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2.5rem', background: 'var(--color-card)', borderRadius: '12px', border: '1px dashed var(--color-border)' }}>
          <p style={{ color: 'var(--color-text-muted)', margin: '0 0 0.5rem' }}>No reminders found</p>
          <a href={`/dashboard/reminders/new?business_id=${getCurrentBusinessId() || ''}`} style={{ color: 'var(--color-accent)', fontWeight: '500', textDecoration: 'none' }}>Create first reminder →</a>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {filteredReminders.map(r => (
            <div key={r.id} style={{ background: 'var(--color-card)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontWeight: '500', fontSize: '0.95rem', color: 'var(--color-text)' }}>{r.title}</div>
                <span style={{ fontSize: '0.65rem', fontWeight: '600', padding: '0.1rem 0.6rem', borderRadius: '12px', background: r.status === 'pending' ? 'var(--color-accent)' : 'var(--color-success)', color: '#fff' }}>
                  {r.status}
                </span>
              </div>
              {r.due_date && (
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>
                  Due: {new Date(r.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              )}
              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => toggleStatus(r.id, r.status)}
                  style={{ fontSize: '0.7rem', background: r.status === 'pending' ? 'var(--color-success)' : 'var(--color-text-muted)', color: '#fff', border: 'none', padding: '0.1rem 0.6rem', borderRadius: '4px', cursor: 'pointer' }}
                >
                  {r.status === 'pending' ? 'Mark done' : 'Reopen'}
                </button>
                <a href={`/dashboard/reminders/${r.id}/edit?business_id=${getCurrentBusinessId() || ''}`} style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textDecoration: 'none', border: '1px solid var(--color-border)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Edit</a>
                <button onClick={() => deleteReminder(r.id)} style={{ fontSize: '0.7rem', color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
    }
