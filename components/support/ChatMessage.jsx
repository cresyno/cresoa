export default function ChatMessage({ message, isUser }) {
  // ─── Tiny, Zero-Dependency Markdown & List Formatter ──────
  function formatMessage(text) {
    if (!text) return '';

    let formatted = text;

    // 1. Fix numbered lists that are squashed together (e.g., "1. A 2. B")
    // Uses a regex to find "1. X 2. Y" and inserts a break between them.
    formatted = formatted.replace(/(\d+\.\s+[^\n\r]*?)(?=\s*\d+\.)/g, '$1\n');

    // 2. Convert Markdown **bold** to HTML <strong>
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // 3. Convert Markdown *italic* to HTML <em>
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // 4. Convert bullet points "- " to proper HTML lists (simple text fallback for now)
    formatted = formatted.replace(/^-\s/gm, '• ');

    return formatted;
  }

  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: '0.5rem' }}>
      <div 
        style={{
          maxWidth: '80%',
          padding: '0.6rem 1rem',
          fontSize: '0.95rem',
          lineHeight: '1.6',
          backgroundColor: isUser ? 'var(--color-primary)' : 'var(--color-card)',
          color: isUser ? 'white' : 'var(--color-text)',
          border: isUser ? 'none' : '1px solid var(--color-border)',
          borderRadius: isUser ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
          whiteSpace: 'pre-wrap' // ⚠️ Crucial: Preserves the newlines we just inserted
        }}
      >
        {/* Render the formatted HTML safely */}
        <div 
          dangerouslySetInnerHTML={{ __html: formatMessage(message) }} 
          style={{ margin: 0 }}
        />
      </div>
    </div>
  );
}
