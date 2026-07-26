export function showToast(message, color = '#1E3A5F') {
  const existing = document.getElementById('cresoa-toast')
  if (existing) existing.remove()

  const toast = document.createElement('div')
  toast.id = 'cresoa-toast'
  toast.textContent = message
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: ${color};
    color: #fff;
    padding: 0.8rem 1.4rem;
    border-radius: 10px;
    font-size: 0.9rem;
    font-weight: 600;
    z-index: 9999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    max-width: 85%;
    text-align: center;
    animation: cresoaToastIn 0.25s ease-out;
  `

  const style = document.createElement('style')
  style.textContent = `
    @keyframes cresoaToastIn {
      from { opacity: 0; transform: translate(-50%, 10px); }
      to { opacity: 1; transform: translate(-50%, 0); }
    }
  `
  document.head.appendChild(style)
  document.body.appendChild(toast)

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s'
    toast.style.opacity = '0'
    setTimeout(() => toast.remove(), 300)
  }, 2200)
}
