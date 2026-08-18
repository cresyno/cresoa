import { Icon } from '../../components/Icon';

export default function WhatsAppCard({ phoneNumber, businessName }) {
  const message = encodeURIComponent(`Hello, I need help with my ${businessName || 'Cresoa'} account.`);
  const whatsappLink = `https://wa.me/${phoneNumber}?text=${message}`;

  return (
    <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5 shadow-sm mt-0">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-[#25D366]/10 flex items-center justify-center flex-shrink-0">
          <Icon name="message-circle" className="w-5 h-5 text-[#25D366]" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-[var(--color-text)] text-sm mb-1">Need human help?</h3>
          <p className="text-[var(--color-text-muted)] text-xs mb-3">
            If Tessa can't solve your issue, speak directly with our support team.
          </p>
          <a 
            href={whatsappLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            <Icon name="message-circle" className="w-4 h-4" />
            Chat on WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
