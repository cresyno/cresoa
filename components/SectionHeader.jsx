export function SectionHeader({ title, subtitle, action, onAction }) {
  return (
    <div className="cresoa-section-header">
      <div style={{ minWidth: 0 }}>
        <h2 className="cresoa-section-header-title">{title}</h2>
        {subtitle && <p className="cresoa-section-header-subtitle">{subtitle}</p>}
      </div>
      {action && (
        <button type="button" onClick={onAction} className="cresoa-section-header-action">
          {action} →
        </button>
      )}
    </div>
  )
}
