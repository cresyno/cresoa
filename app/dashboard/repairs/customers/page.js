'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'

export default function RepairsCustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState([])
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [business, setBusiness] = useState(null)

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: businessData, error: bizError } = await supabase
        .from('businesses')
        .select('id, name, sector')
        .eq('owner_id', user.id)
        .single()

      if (bizError || !businessData) {
        router.push('/onboarding')
        return
      }

      setBusiness(businessData)

      // Load customers
      const { data: customerData, error: custError } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', businessData.id)
        .order('created_at', { ascending: false })

      if (custError) {
        console.error('Error loading customers:', custError)
        setCustomers([])
      } else {
        setCustomers(customerData || [])
      }

      // Load jobs (to show repair history per customer)
      const { data: jobData, error: jobError } = await supabase
        .from('orders')
        .select('*, customers(name, phone)')
        .eq('business_id', businessData.id)
        .not('device_type', 'is', null)
        .order('created_at', { ascending: false })

      if (jobError) {
        console.error('Error loading jobs:', jobError)
        setJobs([])
      } else {
        setJobs(jobData || [])
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredCustomers = customers.filter(c => {
    const searchTerm = search.toLowerCase()
    return c.name?.toLowerCase().includes(searchTerm) || c.phone?.toLowerCase().includes(searchTerm)
  })

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8F6F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid #E5E0D8', borderTop: '4px solid #0F2B4A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // Get repair history for a customer
  const getCustomerRepairs = (customerId) => {
    return jobs.filter(j => j.customer_id === customerId)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8F6F2', padding: '1.2rem 1rem' }}>
      <style>{`
        .glass-card {
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(15,43,74,0.06);
          padding: 1rem;
          margin-bottom: 1rem;
        }
        .customer-card {
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(8px);
          border: 1px solid #E5E0D8;
          border-radius: 14px;
          padding: 1rem 1.2rem;
          margin-bottom: 0.8rem;
          transition: all 0.2s ease;
        }
        .customer-card:hover {
          border-color: #D4A52A;
          box-shadow: 0 4px 16px rgba(15,43,74,0.06);
        }
        .customer-card .top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .customer-card .name { font-weight: 600; color: #0F2B4A; font-size: 1rem; }
        .customer-card .phone { font-size: 0.8rem; color: #8A8A8A; }
        .customer-card .repair-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.3rem 0;
          border-bottom: 1px solid #F0EDE8;
          font-size: 0.8rem;
        }
        .customer-card .repair-item:last-child { border-bottom: none; }
        .customer-card .repair-item .device { font-weight: 500; color: #0F2B4A; }
        .customer-card .repair-item .status { font-size: 0.65rem; font-weight: 600; padding: 0.1rem 0.4rem; border-radius: 10px; }
        .customer-card .repair-item .status.overdue { background: #F1DBD3; color: #D9534F; }
        .customer-card .repair-item .status.ready { background: #DCEBE2; color: #2E7D5E; }
        .customer-card .repair-item .status.active { background: #F6E9C8; color: #D4A52A; }
        .customer-card .repair-item .status.done { background: #E5E0D8; color: #8A8A8A; }
        .search-bar {
          width: 100%;
          padding: 0.7rem;
          border-radius: 10px;
          border: 1px solid #E5E0D8;
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(4px);
          font-size: 0.95rem;
          margin-bottom: 1rem;
        }
        .search-bar:focus { outline: none; border-color: #D4A52A; }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .header h1 { color: #0F2B4A; font-size: 1.3rem; margin: 0; }
        .header .count { color: #8A8A8A; font-size: 0.8rem; }
        .back-link {
          display: inline-block;
          margin-bottom: 1rem;
          color: #0F2B4A;
          text-decoration: none;
          font-size: 0.85rem;
        }
        .back-link:hover { text-decoration: underline; }
        .empty-state { text-align: center; padding: 2rem 0; color: #8A8A8A; }
        .badge {
          display: inline-block;
          font-size: 0.55rem;
          font-weight: 600;
          padding: 0.1rem 0.4rem;
          border-radius: 10px;
          background: #F6E9C8;
          color: #0F2B4A;
        }
      `}</style>

      <a href="/dashboard/repairs" className="back-link">← Back to repairs</a>

      <div className="header">
        <div>
          <h1>🔧 Customers</h1>
          <div className="count">{customers.length} customers · {jobs.length} total repairs</div>
        </div>
        <a href="/dashboard/customers/new" style={{
          padding: '0.6rem 1.2rem',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #D4A52A, #C79A2B)',
          color: '#0F2B4A',
          fontWeight: '700',
          textDecoration: 'none',
          fontSize: '0.85rem',
          boxShadow: '0 4px 16px rgba(212,165,42,0.3)',
        }}>+ New Customer</a>
      </div>

      <input
        className="search-bar"
        type="text"
        placeholder="🔍 Search by name or phone..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filteredCustomers.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: '2.5rem' }}>🔧</div>
          <p>{search ? 'No customers match your search.' : 'No customers yet. Add your first customer!'}</p>
          {!search && <a href="/dashboard/customers/new" style={{ color: '#D4A52A', fontWeight: '600', textDecoration: 'none' }}>+ Add a customer</a>}
        </div>
      ) : (
        filteredCustomers.map((c) => {
          const repairs = getCustomerRepairs(c.id)
          const activeRepairs = repairs.filter(j => j.current_status !== 'Completed' && j.current_status !== 'Delivered')

          return (
            <div key={c.id} className="customer-card">
              <div className="top">
                <div>
                  <div className="name">{c.name}</div>
                  <div className="phone">{c.phone || 'No phone'}</div>
                  <div style={{ marginTop: '0.2rem', display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                    <span className="badge">{repairs.length} repair{repairs.length !== 1 ? 's' : ''}</span>
                    {activeRepairs.length > 0 && (
                      <span className="badge" style={{ background: '#F6E9C8', color: '#D4A52A' }}>{activeRepairs.length} active</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  <a href={`/dashboard/customers/${c.id}`} style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '6px',
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    border: '1px solid #E5E0D8',
                    background: '#fff',
                    color: '#0F2B4A',
                    textDecoration: 'none',
                  }}>👁️ View</a>
                  <a href={`/dashboard/customers/${c.id}/edit`} style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '6px',
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    border: '1px solid #E5E0D8',
                    background: '#0F2B4A',
                    color: '#fff',
                    textDecoration: 'none',
                  }}>✏️ Edit</a>
                </div>
              </div>

              {/* Repair history */}
              {repairs.length > 0 && (
                <div style={{ marginTop: '0.8rem', borderTop: '1px solid #E5E0D8', paddingTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.3rem' }}>Recent Repairs</div>
                  {repairs.slice(0, 3).map((j) => {
                    const device = j.device_type || 'Device'
                    const model = j.device_model || ''
                    const status = j.current_status || 'Received'
                    let statusClass = 'active'
                    if (status === 'Completed' || status === 'Delivered') statusClass = 'done'
                    if (status === 'Ready') statusClass = 'ready'
                    if (status === 'Overdue' || status === 'Awaiting Parts') statusClass = 'overdue'

                    return (
                      <div key={j.id} className="repair-item">
                        <span className="device">{device} {model}</span>
                        <span className={`status ${statusClass}`}>{status}</span>
                      </div>
                    )
                  })}
                  {repairs.length > 3 && (
                    <div style={{ fontSize: '0.65rem', color: '#8A8A8A', textAlign: 'center', marginTop: '0.3rem' }}>
                      + {repairs.length - 3} more repairs
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
          }
