import { showToast } from '../lib/toast'

export default function OrderCard({ order }) {
  const balance = order.price - order.amount_paid
  const isPaid = balance <= 0

  const getDueInfo = () => {
    if (!order.due_date) return null
    const due = new Date(order.due_date)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24))

    if (order.current_status === 'Delivered') return null
    if (diffDays < 0) return { text: `Overdue by ${Math.abs(diffDays)} day(s)`, color: '#AE4A34', bg: '#F1DBD3' }
    if (diffDays <= 3) return { text: diffDays === 0 ? 'Due today' : `Due in ${diffDays} day(s)`, color: '#C79A2B', bg: '#F6E9C8' }
    return null
  }

  const dueInfo = getDueInfo()

  const copyLink = () => {
    const link = `https://cresoa.vercel.app/track/${order.tracking_token}`
    navigator.clipboard.writeText(link)
    showToast('Tracking link copied!', '#1E3A5F')
  }

  return (
    <div style={{ background: '#fff', borderRadius: '10px', padding: '1rem', border: '1px solid #e4d8c2', marginBottom: '0.6rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <p style={{ margin: 0, color: '#1E3A5F', fontWeight: '600' }}>{order.title}</p>
        <span style={{ fontSize: '0.75rem', color: '#6B6255' }}>{order.current_status}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span
            title={isPaid ? 'Paid in full' : 'Balance owing'}
            style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: isPaid ? '#4C7A5E' : '#AE4A34', display: 'inline-block'
            }}
          />
          <p style={{ margin: 0, color: '#6B6255', fontSize: '0.85rem' }}>{order.customers?.name}</p>
        </div>
        {order.customers?.phone && (
          <a
            href={`tel:${order.customers.phone}`}
            style={{ color: '#1E3A5F', fontSize: '0.78rem', fontWeight: '600', textDecoration: 'none' }}
          >
            📞 Call
          </a>
        )}
      </div>

      {dueInfo && (
        <p style={{ display: 'inline-block', margin: '0.4rem 0 0', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '600', color: dueInfo.color, background: dueInfo.bg }}>
          {dueInfo.text}
        </p>
      )}

      <p style={{ margin: '0.4rem 0 0.6rem', fontSize: '0.85rem', color: balance > 0 ? '#AE4A34' : '#4C7A5E' }}>
        {balance > 0 ? `Balance: ₦${balance.toLocaleString()}` : 'Paid in full'}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
        <a
          href={`/dashboard/orders/${order.id}`}
          style={{ textAlign: 'center', padding: '0.5rem', borderRadius: '6px', border: '1px solid #1E3A5F', color: '#1E3A5F', fontSize: '0.8rem', fontWeight: '600', textDecoration: 'none' }}
        >
          View order
        </a>
        <a
          href={`/dashboard/orders/${order.id}?edit=true`}
          style={{ textAlign: 'center', padding: '0.5rem', borderRadius: '6px', background: '#1E3A5F', color: '#fff', fontSize: '0.8rem', fontWeight: '600', textDecoration: 'none' }}
        >
          Edit order
        </a>
      </div>
    </div>
  )
}
