import { formatMoney, getInitials } from '../lib/utils'
import { StatusPill } from './StatusPill'

export function ActionCenter({ items, onActionClick, onViewAll }) {
  if (!items || items.length === 0) {
    return (
      <div className="cresoa-empty-state">
        <span className="cresoa-empty-state-message">✓ Nothing requires your attention</span>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'grid', gap: 8 }}>
        {items.slice(0, 4).map((item, index) => (
          <div key={item.id || index} className="cresoa-action-row">
            <div className="cresoa-avatar">{getInitials(item.customerName)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="cresoa-row-title">{item.customerName}</div>
              <div className="cresoa-row-meta">
                {item.amount ? formatMoney(item.amount) : ''}
                {item.amount && item.reason ? ' · ' : ''}
                {item.reason || item.status}
              </div>
            </div>
            <button
              type="button"
              className="cresoa-action-button"
              onClick={(e) => {
                e.stopPropagation()
                onActionClick?.(item)
              }}
            >
              {item.actionLabel || 'View'}
            </button>
            <span className="cresoa-row-arrow">›</span>
          </div>
        ))}
      </div>
      {items.length > 4 && (
        <button type="button" onClick={onViewAll} className="cresoa-view-all-link">
          View all {items.length} actions →
        </button>
      )}
    </div>
  )
}
