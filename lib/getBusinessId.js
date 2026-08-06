export function getCurrentBusinessId() {
  if (typeof window === 'undefined') return null;
  // Try URL param first (highest priority)
  const params = new URLSearchParams(window.location.search);
  const id = params.get('business_id');
  if (id) return id;
  // Fallback to localStorage (set by the switcher)
  return localStorage.getItem('selectedBusinessId') || null;
}
