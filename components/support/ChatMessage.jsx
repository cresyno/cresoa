export default function ChatMessage({ message, isUser }) {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div 
        className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser 
            ? 'bg-[var(--color-primary)] text-white rounded-br-none' 
            : 'bg-[var(--color-card)] text-[var(--color-text)] rounded-bl-none border border-[var(--color-border)]'
        }`}
      >
        <p>{message}</p>
      </div>
    </div>
  );
}
