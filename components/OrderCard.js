export default function OrderCard({ order }) {
  const balance = order.price - order.amount_paid
  return (
    <div style={{ background: '#fff', borderRadius: '10px', padding: '1rem', border: '1px solid #e4d8c2', marginBottom: '0.6rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <p style={{ margin: 0, color: '#1E3A5F', fontWeight: '600' }}>{order.title}</p>
        <span style={{ fontSize: '0.75rem', color: '#6B6255' }}>{order.current_status}</span>
      </div>
      <p style={{ margin: '0.2rem 0 0', color: '#6B6255', fontSize: '0.85rem' }}>{order.customers?.name}</p>
      <p style={{ margin: '0.3rem 0 0.6rem', fontSize: '0.85rem', color: balance > 0 ? '#AE4A34' : '#4C7A5E' }}>
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
