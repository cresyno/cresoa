export default function TessaLogo({ size = 24 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width={size} height={size} fill="none" aria-hidden="true">
      {/* AI Sparkle Top Right */}
      <path d="M46 12 L48 18 L54 20 L48 22 L46 28 L44 22 L38 20 L44 18 Z" fill="#FDB515" />
      
      {/* Main 'T' Shape */}
      <path d="M14 20 H50 C48 26 44 28 38 28 H36 V48 C36 52 32 54 28 50 V28 H26 C18 28 14 26 14 20 Z" fill="#FDB515" />
      
      {/* Bottom Wings / Base */}
      <path d="M16 38 C10 42 10 50 16 54 C20 57 26 56 28 52 C22 54 18 50 18 44 Z" fill="#FDB515" opacity="0.8" />
      <path d="M48 38 C54 42 54 50 48 54 C44 57 38 56 36 52 C42 54 46 50 46 44 Z" fill="#FDB515" opacity="0.8" />
    </svg>
  );
}
