export function EmptyState({ title, message }) {
  return (
    <div className="cresoa-empty-state">
      <span className="cresoa-empty-state-title">{title}</span>
      <span className="cresoa-empty-state-message">{message}</span>
    </div>
  )
}
