export default function ChatMessage({ message, isUser }) {
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: '0.5rem' }}>
      <div 
        style={{
          maxWidth: '80%',
          padding: '0.6rem 1rem',
          fontSize: '0.95rem',
          lineHeight: '1.5',
          backgroundColor: isUser ? 'var(--color-primary)' : 'var(--color-card)',
          color: isUser ? 'white' : 'var(--color-text)',
          border: isUser ? 'none' : '1px solid var(--color-border)',
          // Rounded corners with a "trim" to mimic the screenshot's bubble style
          borderRadius: isUser ? '16px 16px 2px 16px' : '16px 16px 16px 2px'
        }}
      >
        <p style={{ margin: 0 }}>{message}</p>
      </div>
    </div>
  );
}
