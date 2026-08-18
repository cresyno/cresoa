export default function ChatMessage({ message, isUser }) {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
      <div 
        className={`
          max-w-[80%] px-4 py-2.5 text-sm leading-relaxed 
          ${isUser 
            ? 'bg-[var(--color-primary)] text-white rounded-2xl rounded-tr-sm' // User (Right side)
            : 'bg-[var(--color-card)] text-[var(--color-text)] border border-[var(--color-border)] rounded-2xl rounded-tl-sm' // Tessa (Left side)
          }
        `}
      >
        <p>{message}</p>
      </div>
    </div>
  );
}
