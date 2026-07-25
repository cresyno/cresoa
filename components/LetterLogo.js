export default function LetterLogo({ name, size = 48 }) {
  const initials = getInitials(name)
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: '#1E3A5F',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <span style={{ color: '#C79A2B', fontWeight: '700', fontSize: size * 0.4, fontFamily: 'serif' }}>
        {initials}
      </span>
    </div>
  )
}

function getInitials(name) {
  if (!name) return '?'
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
          }
