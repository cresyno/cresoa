export default function ChatMessage({ message, isUser }) {
  function formatMessage(text) {
    if (!text) return '';

    let formatted = text;

    // 1. Convert Markdown Tables (| Header | --- | --- |)
    const tableRegex = /((^\|.+\|(?:\r?\n\|[-:| ]+\|)*(?:\r?\n\|.+\|)*)+)/gm;
    formatted = formatted.replace(tableRegex, (tableBlock) => {
      const rows = tableBlock.trim().split('\n').map(row => 
        row.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim())
      );
      if (rows.length === 0) return tableBlock;

      let html = '<table style="width:100%; border-collapse:collapse; margin:1rem 0; font-size:0.85rem;">';
      rows.forEach((row, rowIndex) => {
        if (row.every(cell => /^:?-{2,}:?$/.test(cell))) return; // Skip separator row
        html += '<tr>';
        row.forEach((cell, colIndex) => {
          const tag = rowIndex === 0 ? 'th' : 'td';
          const style = rowIndex === 0 
            ? 'text-align:left; padding:0.5rem; background:var(--color-bg); border-bottom:2px solid var(--color-accent); font-weight:600;'
            : 'text-align:left; padding:0.5rem; border-bottom:1px solid var(--color-border);';
          html += `<${tag} style="${style}">${cell.replace(/\*\*/g, '<strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>')}</${tag}>`;
        });
        html += '</tr>';
      });
      html += '</table>';
      return html;
    });

    // 2. Convert Headers (###, ##, #)
    formatted = formatted.replace(/^###\s+(.+)$/gm, '<h3 style="margin:1rem 0 0.5rem; font-size:1.1rem; color:var(--color-text);">$1</h3>');
    formatted = formatted.replace(/^##\s+(.+)$/gm, '<h2 style="margin:1rem 0 0.5rem; font-size:1.25rem; color:var(--color-text);">$1</h2>');
    formatted = formatted.replace(/^#\s+(.+)$/gm, '<h1 style="margin:1rem 0 0.5rem; font-size:1.5rem; color:var(--color-text);">$1</h1>');

    // 3. Convert Bold & Italic
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // 4. Convert Bullet Lists (- Item)
    formatted = formatted.replace(/^-\s+(.+)$/gm, '<li style="margin:0.25rem 0;">$1</li>');
    formatted = formatted.replace(/(<li.*<\/li>)/gms, '<ul style="padding-left:1.2rem; margin:0.5rem 0;">$1</ul>');

    // 5. Convert Numbered Lists (1. Item)
    formatted = formatted.replace(/^(\d+)\.\s+(.+)$/gm, '<li style="margin:0.25rem 0;">$2</li>');
    formatted = formatted.replace(/(<li.*<\/li>)/gms, '<ol style="padding-left:1.2rem; margin:0.5rem 0;">$1</ol>');

    // 6. Preserve line breaks (but not in tables)
    formatted = formatted.replace(/(?<!<table>)(?<!<\/table>)(\n)+/g, '<br/>');

    // 7. Prevent XSS: Escape HTML except our formatted tags
    formatted = formatted.replace(/<script[\s\S]*?<\/script>/gi, '');
    formatted = formatted.replace(/<iframe[\s\S]*?<\/iframe>/gi, '');

    return formatted;
  }

  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: '0.5rem' }}>
      <div 
        style={{
          maxWidth: '85%',
          padding: '0.6rem 1rem',
          fontSize: '0.9rem',
          lineHeight: '1.6',
          backgroundColor: isUser ? 'var(--color-primary)' : 'var(--color-card)',
          color: isUser ? 'white' : 'var(--color-text)',
          border: isUser ? 'none' : '1px solid var(--color-border)',
          borderRadius: isUser ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
          whiteSpace: 'pre-wrap',
          overflowWrap: 'break-word'
        }}
      >
        <div 
          dangerouslySetInnerHTML={{ __html: formatMessage(message) }} 
          style={{ margin: 0 }}
        />
      </div>
    </div>
  );
          }
