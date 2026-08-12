import { formatMoney, getInitials } from '../lib/utils'

export function ActionCenter({ items, onActionClick, onViewAll }) {
  if (!items || items.length === 0) {
    return <div className="cresoa-empty-state"><span className="cresoa-empty-state-message">✓ Nothing requires your attention</span></div>
  }

  return (
    <div>
      <div style={{ display: 'grid', gap: 8 }}>
        {items.slice(0, 4).map((item, index) => (
          <div key={item.id || index} className="cresoa-list-row">
            <span className="cresoa-avatar">{getInitials(item.customerName)}</span>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
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
              style={{
                padding: '4px 12px',
                borderRadius: 8,
                border: '1px solid var(--cresoa-accent)',
                background: 'transparent',
                color: 'var(--cresoa-accent)',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer'
              }}
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
        <button type="button" onClick={onViewAll} className="cresoa-section-header-action" style={{ marginTop: 8 }}>
          View all {items.length} actions →
        </button>
      )}
    </div>
  )
}
