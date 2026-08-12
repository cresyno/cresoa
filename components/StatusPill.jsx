export function StatusPill({ status }) {
  const value = String(status || 'Order placed')
  const lower = value.toLowerCase()
  const tone = lower.includes('deliver') || lower.includes('ready')
    ? 'success'
    : lower.includes('fitting') || lower.includes('alter')
    ? 'warning'
    : lower.includes('cancel')
    ? 'danger'
    : 'info'

  return <span className={`cresoa-status cresoa-status-${tone}`}>{value}</span>
}
