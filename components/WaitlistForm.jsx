'use client'

import { useState, useCallback } from 'react'

const ICONS = {
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  arrowRight: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function WaitlistForm({ defaultBusinessType = '' }) {
  const [status, setStatus] = useState('idle')
  const [errors, setErrors] = useState({})

  const validate = (form) => {
    const errs = {}
    const email = form.querySelector('input[name="email_address"]')?.value?.trim() || ''
    const firstName = form.querySelector('input[name="fields[first_name]"]')?.value?.trim() || ''
    const businessType = form.querySelector('select[name="tags[]"]')?.value || ''

    if (!email) errs.email = 'Email address is required.'
    else if (!EMAIL_REGEX.test(email)) errs.email = 'Please enter a valid email address.'

    if (!firstName) errs.firstName = 'First name is required.'

    if (!businessType) errs.businessType = 'Please select your business type.'

    return errs
  }

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    const form = e.target
    const errs = validate(form)

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      const order = ['email', 'firstName', 'businessType']
      const sel = {
        email: 'input[name="email_address"]',
        firstName: 'input[name="fields[first_name]"]',
        businessType: 'select[name="tags[]"]',
      }
      const first = order.find((f) => errs[f])
      if (first) form.querySelector(sel[first])?.focus()
      return
    }

    setErrors({})
    setStatus('sending')
    const data = new FormData(form)

    try {
      const res = await fetch('/api/waitlist', { method: 'POST', body: data })
      const json = await res.json()
      if (json.ok) {
        setStatus('success')
        form.reset()
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }, [])

  const clearError = (field) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  if (status === 'success') {
    return (
      <div className="wl-form">
        <div className="wl-success">
          <div className="wl-success-icon">{ICONS.check}</div>
          <p className="wl-success-title">You&apos;re on the list.</p>
          <p className="wl-success-sub">Check your inbox to confirm. If it&apos;s not in Primary, check Promotions and drag it there.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        .wl-form { width: 100%; max-width: 440px; margin: 0 auto; }
        .wl-fields { display: grid; gap: 0.85rem; }
        .wl-field { display: flex; flex-direction: column; gap: 0.35rem; }

        .wl-input, .wl-select {
          width: 100%; padding: 0.95rem 1rem; border-radius: 10px;
          font-family: inherit; font-size: 0.95rem; color: #fff;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.14);
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
          -webkit-appearance: none; appearance: none;
        }
        .wl-input::placeholder { color: rgba(168,184,206,0.6); }
        .wl-input:focus, .wl-select:focus {
          outline: none;
          border-color: var(--gold-bright, #E5B84B);
          background: rgba(255,255,255,0.08);
          box-shadow: 0 0 0 3px rgba(201,155,43,0.18);
        }
        .wl-input.wl-input--error,
        .wl-select.wl-select--error {
          border-color: #FF8B6F;
          background: rgba(255,139,111,0.06);
        }
        .wl-input.wl-input--error:focus,
        .wl-select.wl-select--error:focus {
          box-shadow: 0 0 0 3px rgba(255,139,111,0.20);
          border-color: #FF8B6F;
        }

        .wl-select-wrap { position: relative; }
        .wl-select-wrap::after {
          content: '';
          position: absolute; top: 50%; right: 1rem;
          width: 7px; height: 7px;
          border-right: 2px solid currentColor;
          border-bottom: 2px solid currentColor;
          transform: translateY(-70%) rotate(45deg);
          pointer-events: none; opacity: 0.5; color: #fff;
        }
        .wl-select { padding-right: 2.4rem; cursor: pointer; }
        .wl-select option { color: #1A1A1A; background: #fff; }

        .wl-error-msg {
          color: #FF8B6F; font-size: 0.78rem; font-weight: 500;
          line-height: 1.4; padding-left: 0.2rem;
          animation: wlErrIn 0.25s ease;
        }
        @keyframes wlErrIn {
          from { opacity: 0; transform: translateY(-3px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .wl-submit {
          width: 100%; padding: 1rem 1.5rem; border-radius: 10px;
          background: var(--gold, #C99B2B); color: var(--bg-dark, #0F2B4A);
          font-weight: 700; font-size: 0.95rem; font-family: inherit;
          border: none; cursor: pointer; margin-top: 0.3rem;
          display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
          transition: background 0.2s, transform 0.25s, box-shadow 0.25s;
        }
        .wl-submit:hover:not(:disabled) {
          background: var(--gold-bright, #E5B84B);
          transform: translateY(-1px);
          box-shadow: 0 14px 30px rgba(201,155,43,0.35);
        }
        .wl-submit:disabled { opacity: 0.7; cursor: wait; }

        .wl-note {
          color: rgba(168,184,206,0.65); font-size: 0.78rem;
          line-height: 1.5; margin-top: 1rem; text-align: center;
        }
        .wl-error { color: #FF8B6F; font-size: 0.82rem; margin-top: 0.6rem; text-align: center; }

        .wl-success {
          background: rgba(201,155,43,0.08);
          border: 1px solid rgba(201,155,43,0.25);
          border-radius: 14px; padding: 1.8rem 1.4rem;
          text-align: center; animation: wlFadeUp 0.5s ease;
        }
        @keyframes wlFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .wl-success-icon {
          width: 40px; height: 40px; border-radius: 50%;
          background: var(--gold, #C99B2B); color: var(--bg-dark, #0F2B4A);
          display: inline-flex; align-items: center; justify-content: center;
          margin-bottom: 0.8rem;
        }
        .wl-success-title {
          color: #fff; font-size: 1.1rem; font-weight: 700;
          margin: 0 0 0.4rem; font-family: 'Fraunces', serif;
        }
        .wl-success-sub {
          color: rgba(168,184,206,0.9); font-size: 0.88rem;
          margin: 0; line-height: 1.6;
        }
      `}</style>

      <form onSubmit={handleSubmit} className="wl-form" noValidate>
        <div className="wl-fields">
          <div className="wl-field">
            <input
              type="email"
              name="email_address"
              placeholder="Email address"
              aria-label="Email address"
              autoComplete="email"
              className={`wl-input ${errors.email ? 'wl-input--error' : ''}`}
              aria-invalid={!!errors.email}
              onChange={() => clearError('email')}
            />
            {errors.email && <span className="wl-error-msg">{errors.email}</span>}
          </div>

          <div className="wl-field">
            <input
              type="text"
              name="fields[first_name]"
              placeholder="First name"
              aria-label="First name"
              autoComplete="given-name"
              className={`wl-input ${errors.firstName ? 'wl-input--error' : ''}`}
              aria-invalid={!!errors.firstName}
              onChange={() => clearError('firstName')}
            />
            {errors.firstName && <span className="wl-error-msg">{errors.firstName}</span>}
          </div>

          <div className="wl-field">
            <div className="wl-select-wrap">
              <select
                name="tags[]"
                aria-label="Business type"
                className={`wl-select ${errors.businessType ? 'wl-select--error' : ''}`}
                defaultValue={defaultBusinessType}
                aria-invalid={!!errors.businessType}
                onChange={() => clearError('businessType')}
              >
                <option value="" disabled>What do you do?</option>
                <option value="23510464">Fashion & Tailoring</option>
                <option value="23510466">Repairs & Technical</option>
                <option value="23510467">Printing & Signage</option>
                <option value="other">Other</option>
              </select>
            </div>
            {errors.businessType && <span className="wl-error-msg">{errors.businessType}</span>}
          </div>

          <button type="submit" className="wl-submit" disabled={status === 'sending'}>
            {status === 'sending' ? 'Joining…' : <>Join the Waitlist {ICONS.arrowRight}</>}
          </button>
        </div>

        <p className="wl-note">Founding Members get Beta access free for 30 days at launch.</p>
        {status === 'error' && <p className="wl-error">Something went wrong. Please try again.</p>}
      </form>
    </>
  )
}
