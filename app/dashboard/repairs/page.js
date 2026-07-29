'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import LetterLogo from '../../../components/LetterLogo'

export default function RepairsDashboardPage() {
  const router = useRouter()
  const [business, setBusiness] = useState(null)
  const [jobs, setJobs] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    awaitingParts: 0,
    ready: 0,
    received: 0,
    diagnosing: 0,
    awaitingApproval: 0,
    repairing: 0,
    testing: 0,
    overdue: 0,
    totalOwing: 0,
    dueToday: 0,
    dueTomorrow: 0,
  })
  const [alerts, setAlerts] = useState([])
  const [readyOverdueAlerts, setReadyOverdueAlerts] = useState([])
  const [readyJobs, setReadyJobs] = useState([])

  const loadDashboard = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: businessData } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', user.id)
      .single()

    if (!businessData) {
      router.push('/onboarding')
      return
    }

    setBusiness(businessData)

    const { data: jobData } = await supabase
      .from('orders')
      .select('*, customers(name, phone)')
      .eq('business_id', businessData.id)
      .not('device_type', 'is', null)
      .order('created_at', { ascending: false })

    setJobs(jobData || [])

    const { data: customerData } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', businessData.id)
      .order('created_at', { ascending: false })

    setCustomers(customerData || [])

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayStr = today.toISOString().split('T')[0]
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    const total = jobData?.length || 0
    const active = jobData?.filter(j => 
      j.current_status !== 'Completed' && j.current_status !== 'Delivered'
    ).length || 0
    const awaitingParts = jobData?.filter(j => j.current_status === 'Awaiting Parts').length || 0
    const ready = jobData?.filter(j => j.current_status === 'Ready').length || 0
    const received = jobData?.filter(j => j.current_status === 'Received').length || 0
    const diagnosing = jobData?.filter(j => j.current_status === 'Diagnosing').length || 0
    const awaitingApproval = jobData?.filter(j => j.current_status === 'Awaiting Approval').length || 0
    const repairing = jobData?.filter(j => j.current_status === 'Repairing').length || 0
    const testing = jobData?.filter(j => j.current_status === 'Testing').length || 0

    const overdue = jobData?.filter(j => {
      if (!j.due_date || j.current_status === 'Delivered' || j.current_status === 'Completed') return false
      const due = new Date(j.due_date)
      due.setHours(0, 0, 0, 0)
      return due < today
    }).length || 0

    const dueToday = jobData?.filter(j => {
      if (!j.due_date || j.current_status === 'Delivered' || j.current_status === 'Completed') return false
      return j.due_date === todayStr
    }).length || 0

    const dueTomorrow = jobData?.filter(j => {
      if (!j.due_date || j.current_status === 'Delivered' || j.current_status === 'Completed') return false
      return j.due_date === tomorrowStr
    }).length || 0

    const totalOwing = jobData?.reduce((sum, j) => sum + Math.max(0, j.price - j.amount_paid), 0) || 0

    setStats({ total, active, awaitingParts, ready, received, diagnosing, awaitingApproval, repairing, testing, overdue, totalOwing, dueToday, dueTomorrow })

    // Pipeline stages (for mobile: horizontal scroll)
    const stages = [
      { key: 'Received', label: 'Received', count: received, icon: '📥' },
      { key: 'Diagnosing', label: 'Diagnosing', count: diagnosing, icon: '🔍' },
      { key: 'Awaiting Approval', label: 'Awaiting Approval', count: awaitingApproval, icon: '⏳' },
      { key: 'Repairing', label: 'Repairing', count: repairing, icon: '🔧' },
      { key: 'Testing', label: 'Testing', count: testing, icon: '🧪' },
      { key: 'Ready', label: 'Ready for Pickup', count: ready, icon: '✅' },
    ]
    // We'll render directly

    // Ready jobs for pickup
    const readyJobsList = jobData?.filter(j => j.current_status === 'Ready') || []
    setReadyJobs(readyJobsList)

    const newAlerts = []
    if (overdue > 0) newAlerts.push({ type: 'overdue', message: `${overdue} job${overdue > 1 ? 's' : ''} overdue`, count: overdue })
    if (awaitingParts > 0) newAlerts.push({ type: 'awaiting_parts', message: `${awaitingParts} job${awaitingParts > 1 ? 's' : ''} awaiting parts`, count: awaitingParts })
    if (ready > 0) newAlerts.push({ type: 'ready', message: `${ready} job${ready > 1 ? 's' : ''} ready for pickup`, count: ready })
    setAlerts(newAlerts)

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const longReady = jobData?.filter(j => j.current_status === 'Ready' && new Date(j.updated_at || j.created_at) < sevenDaysAgo) || []
    setReadyOverdueAlerts(longReady)

    setLoading(false)
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const getStatusInfo = (status) => {
    const map = {
      'Received': { label: 'Received', color: '#6B6255', bg: '#F0EDE8' },
      'Diagnosing': { label: 'Diagnosing', color: '#6B6255', bg: '#F0EDE8' },
      'Awaiting Approval': { label: 'Awaiting Approval', color: '#B4881E', bg: '#F6E9C8' },
      'Awaiting Parts': { label: 'Awaiting Parts', color: '#B4881E', bg: '#F6E9C8' },
      'Repairing': { label: 'Repairing', color: '#1E3A5F', bg: '#D6E0EB' },
      'Testing': { label: 'Testing', color: '#1E3A5F', bg: '#D6E0EB' },
      'Ready': { label: 'Ready for Pickup', color: '#4C7A5E', bg: '#DCEBE2' },
      'Completed': { label: 'Completed', color: '#4C7A5E', bg: '#DCEBE2' },
      'Delivered': { label: 'Delivered', color: '#6B6255', bg: '#E8E0D5' },
    }
    return map[status] || { label: status || 'Received', color: '#6B6255', bg: '#F0EDE8' }
  }

  // Fix: clean device name to avoid duplication
  const getDeviceDisplay = (job) => {
    let type = job.device_type || ''
    let model = job.device_model || ''
    // Remove leading brand if already in model
    if (type && model.toLowerCase().startsWith(type.toLowerCase())) {
      return model // e.g., "Samsung" + "Samsung A16" → "Samsung A16"
    }
    if (type && model) {
      return `${type} ${model}`
    }
    if (type) return type
    return job.title || 'Device'
  }

  const formatDate = (d) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  const isOverdue = (dueDate) => {
    if (!dueDate) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(dueDate)
    due.setHours(0, 0, 0, 0)
    return due < today
  }

  const isToday = (dueDate) => {
    if (!dueDate) return false
    const today = new Date().toISOString().split('T')[0]
    return dueDate === today
  }

  const isTomorrow = (dueDate) => {
    if (!dueDate) return false
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    return dueDate === tomorrowStr
  }

  const getDueDisplay = (dueDate) => {
    if (!dueDate) return null
    if (isOverdue(dueDate)) return { label: '⚠️ Overdue', color: '#AE4A34' }
    if (isToday(dueDate)) return { label: '📅 Due today', color: '#C79A2B' }
    if (isTomorrow(dueDate)) return { label: '📅 Due tomorrow', color: '#1E3A5F' }
    return { label: `Due ${formatDate(dueDate)}`, color: '#6B6255' }
  }

  const formatPhone = (phone) => {
    if (!phone) return ''
    return phone.startsWith('0') ? '234' + phone.slice(1) : phone
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5EFE2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          .spinner {
            width: 40px; height: 40px;
            border: 4px solid #e4d8c2;
            border-top: 4px solid #1E3A5F;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
        `}</style>
        <div className="spinner"></div>
      </div>
    )
  }

  const previewJobs = jobs.slice(0, 5)
  const previewCustomers = customers.slice(0, 5)
  const awaitingPartsJobs = jobs.filter(j => j.current_status === 'Awaiting Parts').slice(0, 5)

  // Stats filters mapping
  const statsFilters = {
    total: '/dashboard/repairs/jobs',
    active: '/dashboard/repairs/jobs?filter=active',
    awaitingParts: '/dashboard/repairs/jobs?filter=awaiting_parts',
    ready: '/dashboard/repairs/jobs?filter=ready',
    totalOwing: '/dashboard/repairs/jobs?filter=owing',
  }

  // Pipeline status filter mapping
  const statusFilterMap = {
    'Received': 'received',
    'Diagnosing': 'diagnosing',
    'Awaiting Approval': 'awaiting_approval',
    'Repairing': 'repairing',
    'Testing': 'testing',
    'Ready': 'ready',
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '1.5rem 1.2rem', paddingBottom: '3rem' }}>
      <style>{`
        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.2rem;
        }
        .header-brand {
          display: flex;
          align-items: center;
          gap: 0.7rem;
        }
        .header-brand .greeting {
          color: #2B2620;
          font-size: 0.8rem;
          margin: 0;
        }
        .header-brand .business-name {
          color: #1E3A5F;
          font-size: 1.2rem;
          font-weight: 700;
          margin: 0;
        }
        .header-brand .badge {
          display: inline-block;
          background: #F6E9C8;
          color: #1E3A5F;
          padding: 0.05rem 0.5rem;
          border-radius: 10px;
          font-size: 0.55rem;
          font-weight: 600;
          margin-left: 0.3rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 0.4rem;
          margin-bottom: 1rem;
        }
        .stat-card {
          background: #fff;
          border-radius: 10px;
          padding: 0.6rem 0.3rem;
          border: 1px solid #E8E0D5;
          text-align: center;
          box-shadow: 0 2px 4px rgba(30,58,95,0.04);
          text-decoration: none;
          transition: all 0.15s ease;
          cursor: pointer;
        }
        .stat-card:hover {
          border-color: #C79A2B;
          box-shadow: 0 4px 12px rgba(199,154,43,0.1);
          transform: translateY(-1px);
        }
        .stat-card .number {
          font-size: 1.1rem;
          font-weight: 700;
          margin: 0;
          line-height: 1.2;
        }
        .stat-card .number.navy { color: #1E3A5F; }
        .stat-card .number.gold { color: #C79A2B; }
        .stat-card .number.red { color: #AE4A34; }
        .stat-card .number.green { color: #4C7A5E; }
        .stat-card .number.purple { color: #6C5B7B; }
        .stat-card .label {
          color: #6B6255;
          font-size: 0.5rem;
          margin: 0.1rem 0 0;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .pipeline-section {
          margin-bottom: 1.2rem;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .pipeline-section::-webkit-scrollbar { display: none; }
        .pipeline-scroll {
          display: flex;
          gap: 0.4rem;
          padding: 0.2rem 0;
          min-width: max-content;
        }
        .pipeline-item {
          flex: 0 0 auto;
          min-width: 70px;
          background: #fff;
          border-radius: 8px;
          padding: 0.4rem 0.5rem;
          border: 1px solid #E8E0D5;
          text-align: center;
          cursor: pointer;
          transition: all 0.15s ease;
          text-decoration: none;
        }
        .pipeline-item:hover {
          border-color: #C79A2B;
        }
        .pipeline-item .icon { font-size: 0.8rem; display: block; }
        .pipeline-item .count {
          font-weight: 700;
          font-size: 0.85rem;
          color: #1E3A5F;
          margin: 0;
        }
        .pipeline-item .label {
          font-size: 0.5rem;
          color: #6B6255;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .alert-strip {
          display: flex;
          gap: 0.4rem;
          flex-wrap: wrap;
          margin-bottom: 1rem;
        }
        .alert-item {
          flex: 1;
          min-width: 70px;
          padding: 0.4rem 0.5rem;
          border-radius: 8px;
          text-align: center;
          font-size: 0.65rem;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.15s ease;
        }
        .alert-item:hover { opacity: 0.8; }
        .alert-item .count {
          font-size: 0.95rem;
          font-weight: 800;
          display: block;
        }
        .alert-item.overdue { background: #F1DBD3; color: #AE4A34; }
        .alert-item.awaiting_parts { background: #F6E9C8; color: #B4881E; }
        .alert-item.ready { background: #DCEBE2; color: #4C7A5E; }

        .quick-actions {
          display: flex;
          gap: 0.4rem;
          flex-wrap: wrap;
          margin-bottom: 1.5rem;
        }
        .action-btn {
          padding: 0.5rem 0.9rem;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 600;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          border: none;
          cursor: pointer;
          transition: transform 0.1s ease;
        }
        .action-btn:active { transform: scale(0.97); }
        .action-btn-primary {
          background: linear-gradient(135deg, #C79A2B, #B4881E);
          color: #1E3A5F;
          box-shadow: 0 4px 14px rgba(199,154,43,0.3);
        }
        .action-btn-primary:hover { box-shadow: 0 6px 20px rgba(199,154,43,0.4); }
        .action-btn-secondary {
          background: #1E3A5F;
          color: #fff;
        }
        .action-btn-secondary:hover { background: #0F1E30; }
        .action-btn-outline {
          background: #fff;
          color: #1E3A5F;
          border: 1px solid #E8E0D5;
        }
        .action-btn-outline:hover { border-color: #C79A2B; }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        .section-header h2 {
          color: #1E3A5F;
          font-size: 0.95rem;
          font-weight: 700;
          margin: 0;
        }
        .section-header a {
          color: #6B6255;
          font-size: 0.7rem;
          font-weight: 500;
          text-decoration: none;
        }
        .section-header a:hover { text-decoration: underline; }

        .job-card {
          background: #fff;
          border-radius: 12px;
          padding: 0.8rem 1rem;
          border: 1px solid #E8E0D5;
          margin-bottom: 0.5rem;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          box-shadow: 0 2px 4px rgba(30,58,95,0.03);
        }
        .job-card:hover {
          border-color: #C79A2B;
          box-shadow: 0 4px 12px rgba(199,154,43,0.08);
        }
        .job-card .top-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.5rem;
        }
        .job-card .device {
          font-weight: 600;
          color: #1E3A5F;
          font-size: 0.9rem;
          margin: 0;
        }
        .job-card .status-badge {
          display: inline-block;
          padding: 0.1rem 0.5rem;
          border-radius: 20px;
          font-size: 0.55rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          flex-shrink: 0;
        }
        .job-card .customer {
          color: #6B6255;
          font-size: 0.75rem;
          margin: 0.1rem 0 0;
        }
        .job-card .customer .phone {
          color: #A89888;
        }
        .job-card .issue {
          color: #6B6255;
          font-size: 0.7rem;
          margin: 0.1rem 0 0;
          font-style: italic;
        }
        .job-card .divider {
          border: none;
          border-top: 1px solid #F0EDE8;
          margin: 0.4rem 0;
        }
        .job-card .details-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.3rem 0.8rem;
          align-items: center;
        }
        .job-card .details-row .price {
          font-size: 0.75rem;
          color: #6B6255;
        }
        .job-card .details-row .price strong { color: #1E3A5F; }
        .job-card .details-row .balance {
          font-weight: 700;
          font-size: 0.8rem;
          color: #AE4A34;
        }
        .job-card .details-row .balance.paid { color: #4C7A5E; }
        .job-card .details-row .due {
          font-size: 0.7rem;
          font-weight: 600;
        }
        .job-card .details-row .due.overdue { color: #AE4A34; }
        .job-card .details-row .due.today { color: #C79A2B; }
        .job-card .details-row .due.tomorrow { color: #1E3A5F; }
        .job-card .bottom-actions {
          display: flex;
          gap: 0.3rem;
          margin-top: 0.4rem;
          flex-wrap: wrap;
        }
        .job-card .bottom-actions .btn {
          padding: 0.2rem 0.6rem;
          border-radius: 6px;
          font-size: 0.6rem;
          font-weight: 600;
          text-decoration: none;
          border: 1px solid #E8E0D5;
          background: #fff;
          color: #1E3A5F;
          cursor: pointer;
          transition: all 0.1s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.2rem;
        }
        .job-card .bottom-actions .btn:hover { background: #F5EFE2; }
        .job-card .bottom-actions .btn-whatsapp {
          background: #25D366;
          border-color: #25D366;
          color: #fff;
        }
        .job-card .bottom-actions .btn-whatsapp:hover { background: #1DA851; }
        .job-card .bottom-actions .btn-add-deadline {
          background: #f0edE8;
          border-color: #D6D0C5;
          color: #6B6255;
          font-size: 0.55rem;
        }

        .customer-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.6rem 0.9rem;
          background: #fff;
          border-radius: 8px;
          border: 1px solid #E8E0D5;
          text-decoration: none;
          margin-bottom: 0.4rem;
          transition: border-color 0.15s ease;
          box-shadow: 0 1px 3px rgba(30,58,95,0.03);
        }
        .customer-row:hover { border-color: #C79A2B; }
        .customer-row .name {
          color: #1E3A5F;
          font-weight: 600;
          font-size: 0.85rem;
          margin: 0;
        }
        .customer-row .phone {
          color: #6B6255;
          font-size: 0.7rem;
          margin: 0;
        }
        .customer-row .badges {
          display: flex;
          gap: 0.3rem;
          flex-wrap: wrap;
          margin-top: 0.1rem;
        }
        .customer-row .badge {
          font-size: 0.55rem;
          font-weight: 600;
          padding: 0.05rem 0.4rem;
          border-radius: 10px;
          background: #F6E9C8;
          color: #1E3A5F;
        }
        .customer-row .badge.owing {
          background: #F1DBD3;
          color: #AE4A
           }
        .customer-row .arrow { color: #C79A2B; font-size: 0.7rem; }

        .empty-state {
          background: #fff;
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid #E8E0D5;
          text-align: center;
          color: #6B6255;
          box-shadow: 0 2px 4px rgba(30,58,95,0.03);
        }
        .empty-state .icon { font-size: 2rem; display: block; margin-bottom: 0.3rem; }
        .empty-state h4 { color: #1E3A5F; font-size: 1rem; margin: 0 0 0.2rem; }
        .empty-state p { margin: 0 0 0.6rem; font-size: 0.8rem; }
        .empty-state .btn { display: inline-block; padding: 0.4rem 1rem; border-radius: 8px; background: linear-gradient(135deg, #C79A2B, #B4881E); color: #1E3A5F; font-weight: 600; text-decoration: none; font-size: 0.8rem; }

        .red-alert {
          background: #F1DBD3;
          border: 1px solid #AE4A34;
          border-radius: 8px;
          padding: 0.5rem 0.8rem;
          margin-bottom: 1rem;
          color: #AE4A34;
          font-weight: 600;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          flex-wrap: wrap;
        }
        .ready-pickup-section {
          margin-bottom: 1.5rem;
        }
        .ready-pickup-section .ready-banner {
          background: #DCEBE2;
          border: 1px solid #4C7A5E;
          border-radius: 8px;
          padding: 0.5rem 0.8rem;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.3rem;
        }
        .ready-pickup-section .ready-banner .label {
          font-weight: 700;
          color: #1E3A5F;
          font-size: 0.85rem;
        }
        .ready-pickup-section .ready-banner .count {
          background: #4C7A5E;
          color: #fff;
          padding: 0.1rem 0.5rem;
          border-radius: 20px;
          font-size: 0.7rem;
        }

        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 0.3rem;
          }
          .stat-card { padding: 0.4rem 0.2rem; }
          .stat-card .number { font-size: 0.9rem; }
          .stat-card .label { font-size: 0.4rem; }
          .pipeline-item { min-width: 55px; padding: 0.3rem 0.4rem; }
          .pipeline-item .count { font-size: 0.7rem; }
          .pipeline-item .label { font-size: 0.4rem; }
          .job-card .top-row { flex-wrap: wrap; }
          .job-card .details-row { gap: 0.2rem 0.5rem; }
          .quick-actions .action-btn {
            flex: 1;
            justify-content: center;
            font-size: 0.65rem;
            padding: 0.4rem 0.5rem;
          }
          .alert-item { min-width: 55px; padding: 0.3rem 0.4rem; font-size: 0.55rem; }
          .alert-item .count { font-size: 0.8rem; }
          .customer-row { flex-wrap: wrap; gap: 0.3rem; }
          .ready-pickup-section .ready-banner { flex-direction: column; align-items: stretch; }
        }
      `}</style>

      {/* HEADER */}
      <div className="header-top">
        <div className="header-brand">
          <LetterLogo name={business?.name} size={40} />
          <div>
            <p className="greeting">Welcome back,</p>
            <p className="business-name">
              {business ? business.name : 'Your business'}
              <span className="badge">🔧 Repairs</span>
            </p>
          </div>
        </div>
      </div>

      {/* STATS — Clickable */}
      <div className="stats-grid">
        <a href={statsFilters.total} className="stat-card">
          <p className="number navy">{stats.total}</p>
          <p className="label">Total Jobs</p>
        </a>
        <a href={statsFilters.active} className="stat-card">
          <p className="number gold">{stats.active}</p>
          <p className="label">Active</p>
        </a>
        <a href={statsFilters.awaitingParts} className="stat-card">
          <p className="number red">{stats.awaitingParts}</p>
          <p className="label">Awaiting Parts</p>
        </a>
        <a href={statsFilters.ready} className="stat-card">
          <p className="number green">{stats.ready}</p>
          <p className="label">Ready for Pickup</p>
        </a>
        <a href={statsFilters.totalOwing} className="stat-card">
          <p className="number red">₦{stats.totalOwing.toLocaleString()}</p>
          <p className="label">Outstanding</p>
        </a>
      </div>

      {/* PIPELINE — Responsive horizontal scroll */}
      <div className="pipeline-section">
        <div className="pipeline-scroll">
          {[
            { key: 'Received', label: 'Received', count: stats.received, icon: '📥' },
            { key: 'Diagnosing', label: 'Diagnosing', count: stats.diagnosing, icon: '🔍' },
            { key: 'Awaiting Approval', label: 'Awaiting Approval', count: stats.awaitingApproval, icon: '⏳' },
            { key: 'Repairing', label: 'Repairing', count: stats.repairing, icon: '🔧' },
            { key: 'Testing', label: 'Testing', count: stats.testing, icon: '🧪' },
            { key: 'Ready', label: 'Ready for Pickup', count: stats.ready, icon: '✅' },
          ].map((stage) => (
            <a
              key={stage.key}
              href={`/dashboard/repairs/jobs?filter=${stage.key.toLowerCase().replace(' ', '_')}`}
              className="pipeline-item"
            >
              <span className="icon">{stage.icon}</span>
              <p className="count">{stage.count}</p>
              <p className="label">{stage.label}</p>
            </a>
          ))}
        </div>
      </div>

      {/* ALERTS */}
      {readyOverdueAlerts.length > 0 && (
        <div className="red-alert">
          <span>🚨</span>
          <span>{readyOverdueAlerts.length} job{readyOverdueAlerts.length > 1 ? 's' : ''} ready for over 7 days — waiting on customer!</span>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="alert-strip">
          {alerts.map((alert, i) => (
            <a
              key={i}
              href={`/dashboard/repairs/jobs?filter=${alert.type}`}
              className={`alert-item ${alert.type}`}
            >
              <span className="count">{alert.count}</span>
              {alert.message}
            </a>
          ))}
        </div>
      )}

      {/* QUICK ACTIONS */}
      <div className="quick-actions">
        <a href="/dashboard/repairs/jobs/new" className="action-btn action-btn-primary">
          🔧 + New Repair Job
        </a>
        <a href="/dashboard/customers/new" className="action-btn action-btn-secondary">
          👤 + Customer
        </a>
        <a href="/dashboard/repairs/parts" className="action-btn action-btn-outline">
          📦 Parts
        </a>
      </div>
{/* RECENT JOBS */}
<div style={{ marginBottom: '1.5rem' }}>
  <div className="section-header">
    <h2>Recent Jobs</h2>
    <a href="/dashboard/repairs/jobs">View all →</a>
  </div>

  {jobs.length === 0 ? (
    <div className="empty-state">
      <span className="icon">🔧</span>
      <h4>No repair jobs yet</h4>
      <p>Create your first repair job and start tracking it from diagnosis to pickup.</p>
      <a href="/dashboard/repairs/jobs/new" className="btn">Create First Job</a>
    </div>
  ) : (
    previewJobs.map((job) => {
      const status = getStatusInfo(job.current_status)
      const device = getDeviceDisplay(job)
      const balance = job.price - job.amount_paid
      const isOverdueStatus = isOverdue(job.due_date) && job.current_status !== 'Delivered' && job.current_status !== 'Completed'
      const deposit = job.amount_paid || 0
      const issue = job.customer_notes || ''
      const dueInfo = getDueDisplay(job.due_date)
      const phone = job.customers?.phone || ''

      return (
        <div key={job.id} className="job-card">
          <div className="top-row">
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="device">{device}</p>
              <p className="customer">
                {job.customers?.name || 'No customer'}
                {phone && <span className="phone"> · {phone}</span>}
              </p>
              {issue && <p className="issue">Issue: {issue}</p>}
            </div>
            <span
              className="status-badge"
              style={{
                background: isOverdueStatus ? '#F1DBD3' : status.bg,
                color: isOverdueStatus ? '#AE4A34' : status.color,
              }}
            >
              {isOverdueStatus ? '⚠️ Overdue' : status.label}
            </span>
          </div>

          <hr className="divider" />

          <div className="details-row">
            <span className="price">
              <strong>₦{job.price.toLocaleString()}</strong> total
            </span>
            {deposit > 0 && (
              <span className="price">Deposit ₦{deposit.toLocaleString()}</span>
            )}
            <span className={`balance ${balance <= 0 ? 'paid' : ''}`}>
              {balance > 0 ? `Balance ₦${balance.toLocaleString()}` : '✓ Paid in full'}
            </span>
          </div>

          <div className="details-row" style={{ marginTop: '0.2rem' }}>
            {dueInfo ? (
              <span className={`due ${dueInfo.color === '#AE4A34' ? 'overdue' : dueInfo.color === '#C79A2B' ? 'today' : dueInfo.color === '#1E3A5F' ? 'tomorrow' : ''}`}>
                {dueInfo.label}
              </span>
            ) : (
              <span className="due" style={{ color: '#A89888' }}>
                No deadline
                <a
                  href={`/dashboard/repairs/jobs/${job.id}/edit`}
                  style={{ marginLeft: '0.4rem', color: '#1E3A5F', textDecoration: 'underline', fontSize: '0.6rem' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  + Add
                </a>
              </span>
            )}
          </div>

          <div className="bottom-actions">
            <a
              href={`/dashboard/repairs/jobs/${job.id}`}
              className="btn"
              onClick={(e) => e.stopPropagation()}
            >
              👁️ View Job
            </a>
            {phone && (
              <button
                className="btn btn-whatsapp"
                onClick={(e) => {
                  e.stopPropagation()
                  const formattedPhone = phone.startsWith('0') ? '234' + phone.slice(1) : phone
                  const msg = `Hi ${job.customers?.name || ''}, your ${device} repair is ${status.label}. ${job.due_date ? `Expected by ${formatDate(job.due_date)}.` : ''}`
                  window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, '_blank')
                }}
              >
                💬 WhatsApp
              </button>
            )}
          </div>
        </div>
      )
    })
  )}
</div>
      {/* READY FOR PICKUP — Enhanced */}
      {readyJobs.length > 0 && (
        <div className="ready-pickup-section">
          <div className="ready-banner">
            <span className="label">🔔 {readyJobs.length} repair{readyJobs.length > 1 ? 's' : ''} ready for pickup</span>
            <span className="count">Ready</span>
          </div>

          {readyJobs.slice(0, 3).map((job) => {
            const device = getDeviceDisplay(job)
            const phone = job.customers?.phone || ''
            const formattedPhone = phone.startsWith('0') ? '234' + phone.slice(1) : phone

            return (
              <div key={job.id} className="job-card" style={{ borderColor: '#4C7A5E' }}>
                <div className="top-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="device">{device}</p>
                    <p className="customer">
                      {job.customers?.name || 'No customer'}
                      {phone && <span className="phone"> · {phone}</span>}
                    </p>
                  </div>
                  <span className="status-badge" style={{ background: '#DCEBE2', color: '#4C7A5E' }}>
                    ✅ Ready
                  </span>
                </div>
                <div className="bottom-actions">
                  <a
                    href={`/dashboard/repairs/jobs/${job.id}`}
                    className="btn"
                    onClick={(e) => e.stopPropagation()}
                  >
                    👁️ View
                  </a>
                  {phone && (
                    <button
                      className="btn btn-whatsapp"
                      onClick={(e) => {
                        e.stopPropagation()
                        const msg = `Hi ${job.customers?.name || ''}, your ${device} repair is ready for pickup!`
                        window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, '_blank')
                      }}
                    >
                      💬 Notify Customer
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {readyJobs.length > 3 && (
            <a
              href="/dashboard/repairs/jobs?filter=ready"
              style={{
                display: 'block',
                textAlign: 'center',
                fontSize: '0.75rem',
                color: '#6B6255',
                marginTop: '0.3rem',
                textDecoration: 'none',
              }}
            >
              + {readyJobs.length - 3} more ready for pickup
            </a>
          )}
        </div>
      )}

      {/* PARTS NEEDED */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div className="section-header">
          <h2>🔩 Parts Needed</h2>
          <a href="/dashboard/repairs/parts">View inventory →</a>
        </div>

        {awaitingPartsJobs.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.2rem' }}>
            <span className="icon" style={{ fontSize: '1.5rem' }}>✅</span>
            <p style={{ margin: 0, fontSize: '0.8rem' }}>All parts available. No jobs awaiting parts.</p>
          </div>
        ) : (
          awaitingPartsJobs.map((job) => {
            const device = getDeviceDisplay(job)
            const partNames = job.parts_used && job.parts_used.length > 0
              ? job.parts_used.map(p => p.name).join(', ')
              : 'Unknown part'
            return (
              <div
                key={job.id}
                className="job-card"
                onClick={() => router.push(`/dashboard/repairs/jobs/${job.id}`)}
              >
                <div className="top-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="device">{device}</p>
                    <p className="customer">{job.customers?.name || 'No customer'}</p>
                    <p className="issue" style={{ fontStyle: 'normal', color: '#B4881E' }}>
                      Part: {partNames}
                    </p>
                  </div>
                  <span className="status-badge" style={{ background: '#F6E9C8', color: '#B4881E' }}>
                    ⏳ Awaiting Parts
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* RECENT CUSTOMERS */}
      <div>
        <div className="section-header">
          <h2>Recent Customers</h2>
          <a href="/dashboard/customers">View all →</a>
        </div>

        {customers.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.2rem' }}>
            <span className="icon" style={{ fontSize: '1.5rem' }}>👤</span>
            <p style={{ margin: 0, fontSize: '0.8rem' }}>No customers yet. Add your first customer to start tracking repairs.</p>
          </div>
        ) : (
          previewCustomers.map((c) => {
            const customerJobs = jobs.filter(j => j.customer_id === c.id)
            const activeJobs = customerJobs.filter(j => j.current_status !== 'Completed' && j.current_status !== 'Delivered')
            const totalOwing = customerJobs.reduce((sum, j) => sum + Math.max(0, j.price - j.amount_paid), 0)

            return (
              <a key={c.id} href={`/dashboard/customers/${c.id}`} className="customer-row">
                <div>
                  <p className="name">{c.name}</p>
                  <p className="phone">{c.phone || 'No phone'}</p>
                  <div className="badges">
                    {activeJobs.length > 0 && (
                      <span className="badge">{activeJobs.length} active repair{activeJobs.length > 1 ? 's' : ''}</span>
                    )}
                    {totalOwing > 0 && (
                      <span className="badge owing">₦{totalOwing.toLocaleString()} owing</span>
                    )}
                  </div>
                </div>
                <span className="arrow">→</span>
              </a>
            )
          })
        )}
      </div>
    </main>
  )
                  }
