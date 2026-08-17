// components/support/ChatMessage.jsx
export default function ChatMessage({ message, isUser }) {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div 
        className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
          isUser 
            ? 'bg-[var(--cresoa-primary)] text-white rounded-br-none' 
            : 'bg-[var(--cresoa-surface-secondary)] text-[var(--cresoa-text)] rounded-bl-none border border-[var(--cresoa-border)]'
        }`}
      >
        <p className="leading-relaxed">{message}</p>
      </div>
    </div>
  );
}
