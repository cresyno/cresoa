import { formatMoney } from '../lib/utils'

export function KpiCards({ metrics, onOrders, onPayments, onAttention }) {
  const cards = [
    {
      label: 'Revenue',
      value: formatMoney(metrics?.revenue),
      trend: '↑ 14.2%',
      meta: 'Total order value',
      icon: '₦',
      onClick: onOrders
    },
    {
      label: 'Orders',
      value: String(metrics?.orders || 0),
      trend: '↑ 3 today',
      meta: 'Orders in period',
      icon: '◫',
      onClick: onOrders
    },
    {
      label: 'Collected',
      value: formatMoney(metrics?.paid),
      trend: `${metrics?.orders ? Math.round((metrics.paid / metrics.revenue) * 100) : 0}% collected`,
      meta: 'Payments received',
      icon: '✓',
      onClick: onPayments
    },
    {
      label: 'Outstanding',
      value: formatMoney(metrics?.outstanding),
      trend: `${metrics?.outstanding > 0 ? '3 need action' : 'All clear'}`,
      meta: 'Balance to collect',
      icon: '!',
      onClick: onAttention
    }
  ]

  return (
    <div className="cresoa-kpi-grid">
      {cards.map(card => (
        <button key={card.label} type="button" onClick={card.onClick} className="cresoa-metric-card">
          <span className="cresoa-metric-icon">{card.icon}</span>
          <span style={{ minWidth: 0 }}>
            <span className="cresoa-metric-label">{card.label}</span>
            <strong className="cresoa-metric-value">{card.value}</strong>
            <span className="cresoa-metric-trend">{card.trend}</span>
            <span className="cresoa-metric-meta">{card.meta}</span>
          </span>
        </button>
      ))}
    </div>
  )
}
