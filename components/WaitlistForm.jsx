'use client'

import { useState, useCallback } from 'react'

const ICONS = {
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  arrowRight: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  mail: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  user: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  phone: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  briefcase: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
  sparkles: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z"/></svg>,
  lock: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^(?:\+?234|0)[789]\d{9}$/

const OTHER_TAG_ID = '23521383'

export default function WaitlistForm({ defaultBusinessType = '' }) {
  const [status, setStatus] = useState('idle')
  const [errors, setErrors] = useState({})
  const [businessType, setBusinessType] = useState(defaultBusinessType)
  const [debugError, setDebugError] = useState(null)
  const isOther = businessType === OTHER_TAG_ID

  const validate = (form) => {
    const errs = {}
    const email = form.querySelector('input[name="email_address"]')?.value?.trim() || ''
    const firstName = form.querySelector('input[name="fields[first_name]"]')?.value?.trim() || ''
    const phone = form.querySelector('input[name="fields[phone]"]')?.value?.trim() || ''
    const businessTypeVal = form.querySelector('select[name="tags[]"]')?.value || ''

    if (!email) errs.email = 'Email address is required.'
    else if (!EMAIL_REGEX.test(email)) errs.email = 'Please enter a valid email address.'

    if (!firstName) errs.firstName = 'First name is required.'

    const cleanedPhone = phone.replace(/[\s\-()]/g, '')
    if (!phone) errs.phone = 'WhatsApp number is required.'
    else if (!PHONE_REGEX.test(cleanedPhone)) errs.phone = 'Enter a valid WhatsApp number.'

    if (!businessTypeVal) errs.businessType = 'Please select your business type.'

    if (businessTypeVal === OTHER_TAG_ID) {
      const otherIndustry = form.querySelector('input[name="fields[other_industry]"]')?.value?.trim() || ''
      if (!otherIndustry) errs.otherIndustry = 'Please specify your industry.'
    }

    return errs
  }

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    const form = e.target
    const errs = validate(form)

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      const order = ['email', 'firstName', 'phone', 'businessType', 'otherIndustry']
      const sel = {
        email: 'input[name="email_address"]',
        firstName: 'input[name="fields[first_name]"]',
        phone: 'input[name="fields[phone]"]',
        businessType: 'select[name="tags[]"]',
        otherIndustry: 'input[name="fields[other_industry]"]',
      }
      const first = order.find((f) => errs[f])
      if (first) form.querySelector(sel[first])?.focus()
      return
    }

    setErrors({})
    setDebugError(null)
    setStatus('sending')
    const data = new FormData(form)

    try {
      const res = await fetch('/api/waitlist', { method: 'POST', body: data })
      const json = await res.json()

      if (json.ok) {
        setStatus('success')
        form.reset()
        setBusinessType(defaultBusinessType)
      } else {
        setStatus('error')
        setDebugError({
          status: json.status || res.status,
          message: json.kitMessage || 'Unknown error',
        })
      }
    } catch (err) {
      setStatus('error')
      setDebugError({
        status: 'network',
        message: err?.message || 'Could not reach the server.',
      })
    }
  }, [defaultBusinessType])

  const clearError = (field) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const handleBusinessTypeChange = (e) => {
    setBusinessType(e.target.value)
    clearError('businessType')
    if (e.target.value !== OTHER_TAG_ID) clearError('otherIndustry')
  }

  if (status === 'success') {
    return (
      <>
        <style jsx global>{`
          .wl-form { width: 100%; max-width: 460px; margin: 0 auto; }
          .wl-success {
            position: relative;
            overflow: hidden;
            background: linear-gradient(160deg, rgba(201,155,43,0.14) 0%, rgba(201,155,43,0.04) 100%);
            border: 1px solid rgba(201,155,43,0.3);
            border-radius: 20px;
            padding: 2.4rem 2rem 2.2rem;
            text-align: center;
            animation: wlSuccessIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .wl-success::before {
            content: '';
            position: absolute;
            top: -60%;
            left: 50%;
            transform: translateX(-50%);
            width: 400px;
            height: 400px;
            background: radial-gradient(circle, rgba(201,155,43,0.22), transparent 65%);
            border-radius: 50%;
            pointer-events: none;
          }
          @keyframes wlSuccessIn {
            from { opacity: 0; transform: translateY(14px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          .wl-success-icon {
            position: relative;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: var(--gold, #C99B2B);
            color: var(--bg-dark, #0F2B4A);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 1.2rem;
            box-shadow: 0 12px 32px rgba(201,155,43,0.45);
            animation: wlSuccessPop 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both;
          }
          @keyframes wlSuccessPop {
            0% { transform: scale(0); opacity: 0; }
            60% { transform: scale(1.12); }
            100% { transform: scale(1); opacity: 1; }
          }
          .wl-success-title {
            position: relative;
            color: #fff;
            font-size: 1.35rem;
            font-weight: 700;
            margin: 0 0 0.55rem;
            font-family: 'Fraunces', serif;
            letter-spacing: -0.02em;
          }
          .wl-success-sub {
            position: relative;
            color: rgba(168,184,206,0.92);
            font-size: 0.92rem;
            margin: 0 auto;
            line-height: 1.65;
            max-width: 340px;
          }
        `}</style>
        <div className="wl-form">
          <div className="wl-success">
            <div className="wl-success-icon">{ICONS.check}</div>
            <p className="wl-success-title">You&apos;re on the list.</p>
            <p className="wl-success-sub">
              If you&apos;ve signed up before, you&apos;re already on our list. Either way, we&apos;ll be in touch when there&apos;s something worth sharing.
            </p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <style jsx global>{`
        .wl-form { width: 100%; max-width: 460px; margin: 0 auto; }

        /* Card wrapper */
        .wl-card {
          position: relative;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 20px;
          padding: 1.75rem 1.6rem 1.5rem;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          box-shadow: 0 24px 60px rgba(0,0,0,0.28);
        }

        .wl-card-header {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin-bottom: 1.4rem;
          padding-bottom: 1.2rem;
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .wl-card-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--gold-bright, #E5B84B);
          padding: 0.28rem 0.7rem;
          border-radius: 100px;
          background: rgba(201,155,43,0.1);
          border: 1px solid rgba(201,155,43,0.22);
        }

        .wl-fields { display: grid; gap: 0.75rem; }
        .wl-field { display: flex; flex-direction: column; gap: 0.35rem; position: relative; }

        .wl-field--animate { animation: wlSlideIn 0.32s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes wlSlideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Input wrapper with icon */
        .wl-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .wl-input-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(168,184,206,0.55);
          display: flex;
          align-items: center;
          pointer-events: none;
          transition: color 0.2s;
        }
        .wl-input-wrap:focus-within .wl-input-icon { color: var(--gold-bright, #E5B84B); }

        .wl-input, .wl-select {
          width: 100%;
          padding: 0.95rem 1rem 0.95rem 2.85rem;
          border-radius: 12px;
          font-family: inherit;
          font-size: 0.95rem;
          color: #fff;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.13);
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
          -webkit-appearance: none;
          appearance: none;
        }
        .wl-input::placeholder { color: rgba(168,184,206,0.5); }
        .wl-input:focus, .wl-select:focus {
          outline: none;
          border-color: var(--gold-bright, #E5B84B);
          background: rgba(255,255,255,0.08);
          box-shadow: 0 0 0 3px rgba(201,155,43,0.16);
        }
        .wl-input.wl-input--error,
        .wl-select.wl-select--error {
          border-color: #FF8B6F;
          background: rgba(255,139,111,0.06);
        }
        .wl-input.wl-input--error:focus,
        .wl-select.wl-select--error:focus {
          box-shadow: 0 0 0 3px rgba(255,139,111,0.2);
          border-color: #FF8B6F;
        }

        .wl-select-wrap { position: relative; }
        .wl-select-wrap::after {
          content: '';
          position: absolute;
          top: 50%;
          right: 1rem;
          width: 7px;
          height: 7px;
          border-right: 2px solid rgba(255,255,255,0.6);
          border-bottom: 2px solid rgba(255,255,255,0.6);
          transform: translateY(-70%) rotate(45deg);
          pointer-events: none;
        }
        .wl-select { padding-right: 2.4rem; cursor: pointer; }
        .wl-select option { color: #1A1A1A; background: #fff; }

        .wl-error-msg {
          color: #FF8B6F;
          font-size: 0.76rem;
          font-weight: 500;
          line-height: 1.4;
          padding-left: 0.2rem;
          animation: wlErrIn 0.25s ease;
        }
        @keyframes wlErrIn {
          from { opacity: 0; transform: translateY(-3px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .wl-submit {
          position: relative;
          width: 100%;
          padding: 1.05rem 1.5rem;
          border-radius: 12px;
          background: var(--gold, #C99B2B);
          color: var(--bg-dark, #0F2B4A);
          font-weight: 700;
          font-size: 0.95rem;
          font-family: inherit;
          border: none;
          cursor: pointer;
          margin-top: 0.35rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.55rem;
          transition: background 0.2s, transform 0.25s, box-shadow 0.25s;
          box-shadow: 0 8px 24px rgba(201,155,43,0.28);
          overflow: hidden;
        }
        .wl-submit::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent);
          transition: left 0.55s ease;
        }
        .wl-submit:hover:not(:disabled) {
          background: var(--gold-bright, #E5B84B);
          transform: translateY(-1px);
          box-shadow: 0 16px 34px rgba(201,155,43,0.4);
        }
        .wl-submit:hover:not(:disabled)::before { left: 100%; }
        .wl-submit:disabled { opacity: 0.75; cursor: wait; }

        .wl-footnote {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          color: rgba(168,184,206,0.62);
          font-size: 0.76rem;
          line-height: 1.5;
          margin-top: 1.1rem;
          text-align: center;
        }
        .wl-footnote svg { color: rgba(201,155,43,0.75); flex-shrink: 0; }

        .wl-debug {
          margin-top: 0.9rem;
          padding: 0.9rem 1rem;
          border-radius: 10px;
          background: rgba(255,139,111,0.08);
          border: 1px solid rgba(255,139,111,0.3);
          color: #FFB4A0;
          font-size: 0.76rem;
          line-height: 1.5;
          font-family: ui-monospace, 'SF Mono', Menlo, monospace;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .wl-debug-label {
          display: block;
          font-weight: 700;
          color: #FF8B6F;
          margin-bottom: 0.4rem;
          font-family: inherit;
        }
      `}</style>

      <form onSubmit={handleSubmit} className="wl-form" noValidate>
        <div className="wl-card">
          <div className="wl-card-header">
            <span className="wl-card-badge">
              {ICONS.sparkles} Founding Member
            </span>
          </div>

          <div className="wl-fields">
            <div className="wl-field">
              <div className="wl-input-wrap">
                <span className="wl-input-icon">{ICONS.mail}</span>
                <input
                  type="email"
                  name="email_address"
                  placeholder="Email address *"
                  aria-label="Email address (required)"
                  autoComplete="email"
                  required
                  aria-required="true"
                  className={`wl-input ${errors.email ? 'wl-input--error' : ''}`}
                  aria-invalid={!!errors.email}
                  onChange={() => clearError('email')}
                />
              </div>
              {errors.email && <span className="wl-error-msg">{errors.email}</span>}
            </div>

            <div className="wl-field">
              <div className="wl-input-wrap">
                <span className="wl-input-icon">{ICONS.user}</span>
                <input
                  type="text"
                  name="fields[first_name]"
                  placeholder="First name *"
                  aria-label="First name (required)"
                  autoComplete="given-name"
                  required
                  aria-required="true"
                  className={`wl-input ${errors.firstName ? 'wl-input--error' : ''}`}
                  aria-invalid={!!errors.firstName}
                  onChange={() => clearError('firstName')}
                />
              </div>
              {errors.firstName && <span className="wl-error-msg">{errors.firstName}</span>}
            </div>

            {/* Phone field label is now "WhatsApp number".
                name stays `fields[phone]` so the Kit dashboard mapping is unchanged. */}
            <div className="wl-field">
              <div className="wl-input-wrap">
                <span className="wl-input-icon">{ICONS.phone}</span>
                <input
                  type="tel"
                  name="fields[phone]"
                  placeholder="WhatsApp number *"
                  aria-label="WhatsApp number (required)"
                  autoComplete="tel"
                  inputMode="tel"
                  required
                  aria-required="true"
                  className={`wl-input ${errors.phone ? 'wl-input--error' : ''}`}
                  aria-invalid={!!errors.phone}
                  onChange={() => clearError('phone')}
                />
              </div>
              {errors.phone && <span className="wl-error-msg">{errors.phone}</span>}
            </div>

            <div className="wl-field">
              <div className="wl-input-wrap">
                <span className="wl-input-icon">{ICONS.briefcase}</span>
                <div className="wl-select-wrap" style={{ width: '100%' }}>
                  <select
                    name="tags[]"
                    aria-label="Business type (required)"
                    className={`wl-select ${errors.businessType ? 'wl-select--error' : ''}`}
                    value={businessType}
                    required
                    aria-required="true"
                    aria-invalid={!!errors.businessType}
                    onChange={handleBusinessTypeChange}
                  >
                    <option value="" disabled>What do you do? *</option>
                    <option value="23510464">Fashion &amp; Tailoring</option>
                    <option value="23510466">Repairs &amp; Technical</option>
                    <option value="23510467">Printing &amp; Signage</option>
                    <option value={OTHER_TAG_ID}>Other</option>
                  </select>
                </div>
              </div>
              {errors.businessType && <span className="wl-error-msg">{errors.businessType}</span>}
            </div>

            {isOther && (
              <div className="wl-field wl-field--animate">
                <div className="wl-input-wrap">
                  <span className="wl-input-icon">{ICONS.briefcase}</span>
                  <input
                    type="text"
                    name="fields[other_industry]"
                    placeholder="Specify your industry *"
                    aria-label="Specify your industry (required)"
                    required
                    aria-required="true"
                    className={`wl-input ${errors.otherIndustry ? 'wl-input--error' : ''}`}
                    aria-invalid={!!errors.otherIndustry}
                    onChange={() => clearError('otherIndustry')}
                    autoFocus
                  />
                </div>
                {errors.otherIndustry && <span className="wl-error-msg">{errors.otherIndustry}</span>}
              </div>
            )}

            <button type="submit" className="wl-submit" disabled={status === 'sending'}>
              {status === 'sending' ? 'Joining…' : <>Join the Waitlist {ICONS.arrowRight}</>}
            </button>
          </div>

          <p className="wl-footnote">
                 {ICONS.lock} Beta access free for 30 days at launch. No card required.
          </p>
        </div>

        {status === 'error' && debugError && (
          <div className="wl-debug">
            <span className="wl-debug-label">Submission failed — Status {debugError.status}</span>
            {debugError.message}
          </div>
        )}
      </form>
    </>
  )
}
