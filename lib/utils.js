export function safeAmount(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

export function formatMoney(value) {
  return `₦${safeAmount(value).toLocaleString('en-NG')}`
}

export function formatShortDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
}

export function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function getInitials(name = '') {
  return name.trim().split(' ').slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || 'C'
}
