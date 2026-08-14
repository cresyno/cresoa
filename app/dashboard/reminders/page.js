'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../lib/getBusinessId'
import { Icon } from '../../../components/Icon'
import { Card } from '../../../components/Card'
import { SectionHeader } from '../../../components/SectionHeader'
import { StatusPill } from '../../../components/StatusPill'
import { Navigation } from '../../../components/Navigation'
import WhatsAppReminderModal from '../../../components/WhatsAppReminderModal'
import '../../../globals.css'

// ─── Helpers ────────────────────────────────────────────────

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function isOverdue(dueDate, status) {
  if (!dueDate || status === 'completed') return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  return due < today
}

export default function RemindersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = getCurrentBusinessId() || searchParams.get('business_id')

  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [businessName, setBusinessName] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // all, pending, completed, overdue
  const [sortBy, setSortBy] = useState('due_date') // due_date, title, created_at

  // ─── WhatsApp Modal ────────────────────────────────────────
  const [selectedReminder, setSelectedReminder] = useState(null)
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false)

  // ─── Navigation helper ────────────────────────────────────
  const navigateWithBusiness = (path) => {
    const separator = path.includes('?') ? '&' : '?'
    router.push(`${path}${separator}business_id=${businessId}`)
  }

  // ─── Load data ─────────────────────────────────────────────
  const loadReminders = async () => {
    if (!businessId) {
      setError('No business selected.')
      setLoading(false)
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Get business name
      const { data: biz } = await supabase
        .from('businesses')
        .select('name')
        .eq('id', businessId)
        .single()
      if (biz) setBusinessName(biz.name)

      const { data, error: fetchError } = await supabase
        .from('reminders')
        .select('*')
        .eq('business_id', businessId)
        .order('due_date', { ascending: true, nullsFirst: true })

      if (fetchError) throw fetchError
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
  }, [businessId])

  // ─── Computed stats ──────────────────────────────────────
  const pendingCount = useMemo(() => reminders.filter(r => r.status === 'pending').length, [reminders])
  const completedCount = useMemo(() => reminders.filter(r => r.status === 'completed').length, [reminders])
  const overdueCount = useMemo(() => reminders.filter(r => isOverdue(r.due_date, r.status)).length, [reminders])

  // ─── Filtering & Sorting ──────────────────────────────────
  const filteredReminders = useMemo(() => {
    let result = [...reminders]

    // Filter
    if (filter === 'pending') result = result.filter(r => r.status === 'pending')
    else if (filter === 'completed') result = result.filter(r => r.status === 'completed')
    else if (filter === 'overdue') result = result.filter(r => isOverdue(r.due_date, r.status))

    // Search
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(r => r.title?.toLowerCase().includes(q))
    }

    // Sort
    if (sortBy === 'due_date') {
      result.sort((a, b) => {
        const da = a.due_date ? new Date(a.due_date) : new Date(8640000000000000)
        const db = b.due_date ? new Date(b.due_date) : new Date(8640000000000000)
        return da - db
      })
    } else if (sortBy === 'title') {
      result.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
    } else if (sortBy === 'created_at') {
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    }

    return result
  }, [reminders, filter, search, sortBy])

  // ─── Actions ──────────────────────────────────────────────
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

  const openWhatsAppModal = (reminder) => {
    setSelectedReminder(reminder)
    setShowWhatsAppModal(true)
  }

  // ─── Loading skeleton ────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ width: '140px', height: '24px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
          <div style={{ width: '100px', height: '32px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: '0.8rem', marginBottom: '1rem' }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ background: 'var(--cresoa-surface)', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', animation: 'pulse 1.5s infinite' }}>
              <div style={{ width: '40%', height: '12px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
              <div style={{ width: '60%', height: '20px', background: 'var(--cresoa-border)', borderRadius: '6px', marginTop: '0.3rem' }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ background: 'var(--cresoa-surface)', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', animation: 'pulse 1.5s infinite' }}>
              <div style={{ width: '60%', height: '16px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
              <div style={{ width: '30%', height: '12px', background: 'var(--cresoa-border)', borderRadius: '6px', marginTop: '0.3rem' }} />
            </div>
          ))}
        </div>
        <style>{`@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }`}</style>
        <Navigation businessId={businessId} />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
        <Card style={{ padding: '2rem', textAlign: 'center' }}>
          <Icon name="alert-circle" size={32} stroke="var(--cresoa-danger)" />
          <h2 style={{ margin: '0.5rem 0' }}>Couldn't load reminders</h2>
          <p style={{ color: 'var(--cresoa-text-muted)' }}>{error}</p>
          <button onClick={loadReminders} className="cresoa-primary-button" style={{ marginTop: '1rem' }}>Retry</button>
        </Card>
        <Navigation businessId={businessId} />
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
      <Navigation businessId={businessId} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <div>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Schedule</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0', color: 'var(--cresoa-text)' }}>Reminders</h1>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', margin: 0 }}>
            {pendingCount} pending · {completedCount} completed · {overdueCount} overdue
          </p>
        </div>
        <button onClick={() => navigateWithBusiness('/dashboard/reminders/new')} className="cresoa-primary-button">
          <Icon name="plus" size={14} stroke="#fff" style={{ marginRight: '0.3rem' }} /> New Reminder
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px,1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
        <Card style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Pending</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--cresoa-warning)' }}>{pendingCount}</div>
        </Card>
        <Card style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Completed</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--cresoa-success)' }}>{completedCount}</div>
        </Card>
        <Card style={{ padding: '0.6rem 0.8rem', textAlign: 'center', borderColor: overdueCount > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-border)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Overdue</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: overdueCount > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-success)' }}>
            {overdueCount > 0 ? overdueCount : '✓'}
          </div>
        </Card>
      </div>

      {/* Search & Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div style={{ flex: '1 1 200px', display: 'flex', alignItems: 'center', gap: '8px', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)' }}>
          <Icon name="search" size={16} stroke="var(--cresoa-text-muted)" />
          <input
            type="text"
            placeholder="Search reminders..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, border: 0, outline: 'none', background: 'transparent', color: 'var(--cresoa-text)', fontSize: '0.85rem' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}>
              <Icon name="x" size={16} stroke="currentColor" />
            </button>
          )}
        </div>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.85rem' }}
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="overdue">Overdue</option>
        </select>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.85rem' }}
        >
          <option value="due_date">Sort by Due Date</option>
          <option value="title">Sort by Title</option>
          <option value="created_at">Sort by Created</option>
        </select>
      </div>

      {/* Reminders List */}
      <SectionHeader title={`${filteredReminders.length} reminder${filteredReminders.length !== 1 ? 's' : ''}`} />

      {filteredReminders.length === 0 ? (
        <Card style={{ padding: '2rem', textAlign: 'center' }}>
          <Icon name="bell" size={32} stroke="var(--cresoa-text-muted)" />
          <h3 style={{ margin: '0.5rem 0 0.2rem' }}>No reminders found</h3>
          <p style={{ color: 'var(--cresoa-text-muted)' }}>
            {search ? 'Try a different search term.' : 'Create your first reminder to stay on top of tasks.'}
          </p>
          {!search && (
            <button onClick={() => navigateWithBusiness('/dashboard/reminders/new')} className="cresoa-primary-button" style={{ marginTop: '0.5rem' }}>
              <Icon name="plus" size={14} stroke="#fff" style={{ marginRight: '0.3rem' }} /> New Reminder
            </button>
          )}
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {filteredReminders.map(reminder => {
            const overdue = isOverdue(reminder.due_date, reminder.status)
            const isCompleted = reminder.status === 'completed'

            return (
              <Card key={reminder.id} style={{ padding: '0.8rem 1rem', borderLeft: `4px solid ${isCompleted ? 'var(--cresoa-success)' : overdue ? 'var(--cresoa-danger)' : 'var(--cresoa-accent)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.95rem', color: isCompleted ? 'var(--cresoa-text-muted)' : 'var(--cresoa-text)' }}>
                        {reminder.title}
                      </span>
                      {isCompleted && <StatusPill status="Completed" />}
                      {!isCompleted && overdue && <StatusPill status="Overdue" />}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--cresoa-text-muted)', marginTop: '0.2rem' }}>
                      Due: {formatDate(reminder.due_date)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                      onClick={() => toggleStatus(reminder.id, reminder.status)}
                      style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '4px',
                        border: '1px solid var(--cresoa-border)',
                        background: isCompleted ? 'var(--cresoa-warning-soft)' : 'var(--cresoa-success-soft)',
                        color: isCompleted ? 'var(--cresoa-warning)' : 'var(--cresoa-success)',
                        cursor: 'pointer',
                        fontSize: '0.7rem',
                        fontWeight: 600
                      }}
                    >
                      {isCompleted ? 'Reopen' : 'Mark done'}
                    </button>
                    <button
                      onClick={() => openWhatsAppModal(reminder)}
                      style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '4px',
                        border: '1px solid #25D366',
                        background: 'transparent',
                        color: '#25D366',
                        cursor: 'pointer',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.2rem'
                      }}
                    >
                      <Icon name="send" size={12} stroke="#25D366" /> Send
                    </button>
                    <button
                      onClick={() => navigateWithBusiness(`/dashboard/reminders/${reminder.id}/edit`)}
                      style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '4px',
                        border: '1px solid var(--cresoa-border)',
                        background: 'transparent',
                        cursor: 'pointer',
                        fontSize: '0.7rem',
                        color: 'var(--cresoa-text-muted)'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteReminder(reminder.id)}
                      style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '4px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        fontSize: '0.7rem',
                        color: 'var(--cresoa-danger)'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={businessId} />
      </div>

      {/* ─── WhatsApp Modal ──────────────────────────────────── */}
      {showWhatsAppModal && selectedReminder && (
        <WhatsAppReminderModal
          reminder={selectedReminder}
          onClose={() => {
            setShowWhatsAppModal(false)
            setSelectedReminder(null)
          }}
          businessId={businessId}
        />
      )}
    </div>
  )
            }
