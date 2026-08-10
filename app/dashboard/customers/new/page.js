'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import { Icon } from '../../../../components/Icon'

const STEPS = [
  {
    id: 'basic',
    label: 'Basic'
  },
  {
    id: 'contact',
    label: 'Contact'
  },
  {
    id: 'notes',
    label: 'Notes'
  }
]

export default function NewCustomerPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [businessId, setBusinessId] = useState(null)
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    gender: '',
    age_category: '',
    address: '',
    notes: ''
  })

  useEffect(() => {
    resolveBusiness()
  }, [])

  const resolveBusiness = async () => {
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      const {
        data: { user }
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      let resolvedBusinessId =
        searchParams.get('business_id')

      if (!resolvedBusinessId) {
        const { data: business } =
          await supabase
            .from('businesses')
            .select('id')
            .eq('owner_id', user.id)
            .maybeSingle()

        if (business?.id) {
          resolvedBusinessId = business.id
        }
      }

      if (!resolvedBusinessId) {
        const { data: membership } =
          await supabase
            .from('business_memberships')
            .select('business_id')
            .eq('user_id', user.id)
            .maybeSingle()

        if (membership?.business_id) {
          resolvedBusinessId =
            membership.business_id
        }
      }

      if (!resolvedBusinessId) {
        router.push('/onboarding')
        return
      }

      setBusinessId(resolvedBusinessId)
    } catch (err) {
      console.error(
        'Business resolution error:',
        err
      )

      setError(
        'We could not prepare your customer form.'
      )
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field, value) => {
    setForm(current => ({
      ...current,
      [field]: value
    }))

    if (error) {
      setError('')
    }
  }

  const validateStep = () => {
    if (step === 0) {
      if (!form.first_name.trim()) {
        return 'Enter the customer’s first name.'
      }

      if (!form.last_name.trim()) {
        return 'Enter the customer’s last name.'
      }

      if (!form.phone.trim()) {
        return 'Enter a phone number for this customer.'
      }
    }

    return ''
  }

  const goNext = () => {
    const validationError = validateStep()

    if (validationError) {
      setError(validationError)
      return
    }

    setError('')
    setStep(current =>
      Math.min(current + 1, STEPS.length - 1)
    )
  }

  const goBack = () => {
    if (step === 0) {
      router.push(
        businessId
          ? `/dashboard/customers?business_id=${businessId}`
          : '/dashboard/customers'
      )
      return
    }

    setError('')
    setStep(current => current - 1)
  }

  const handleSubmit = async event => {
    event.preventDefault()

    if (step < STEPS.length - 1) {
      goNext()
      return
    }

    const validationError = validateStep()

    if (validationError) {
      setError(validationError)
      return
    }

    if (!businessId) {
      setError(
        'Your business could not be identified.'
      )
      return
    }

    setSaving(true)
    setError('')

    try {
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      const response = await fetch(
        '/api/customers',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization:
              `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            business_id: businessId,
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim(),
            phone: form.phone.trim(),
            email: form.email.trim() || null,
            gender: form.gender || null,
            age_category:
              form.age_category || null,
            address: form.address.trim() || null,
            notes: form.notes.trim() || null
          })
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ||
            'Unable to create customer.'
        )
      }

      const customerId =
        result.customer?.id ||
        result.data?.id

      setSuccess(true)

      setTimeout(() => {
        if (customerId) {
          router.push(
            `/dashboard/customers/${customerId}`
          )
        } else {
          router.push(
            `/dashboard/customers?business_id=${businessId}`
          )
        }
      }, 450)
    } catch (err) {
      console.error(
        'Create customer error:',
        err
      )

      setError(
        err?.message ||
          'Something went wrong. Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="new-customer-page">
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Preparing customer profile...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="new-customer-page">
      <div className="new-customer-shell">

        <header className="new-customer-header">
          <button
            type="button"
            className="back-button"
            onClick={goBack}
            aria-label={
              step === 0
                ? 'Back to customers'
                : 'Previous step'
            }
          >
            <Icon
              name="arrow-left"
              size={19}
              stroke="currentColor"
            />
          </button>

          <div className="header-copy">
            <span className="eyebrow">
              CUSTOMER
            </span>

            <h1>Add customer</h1>

            <p>
              Create a profile you can reuse
              for orders and fittings.
            </p>
          </div>
        </header>

        <section
          className="progress-section"
          aria-label="Customer creation progress"
        >
          <div className="progress-topline">
            <span>
              STEP {step + 1} OF {STEPS.length}
            </span>

            <strong>
              {STEPS[step].label}
            </strong>
          </div>

          <div className="progress-bar">
            <div
              className="progress-value"
              style={{
                width: `${
                  ((step + 1) / STEPS.length) *
                  100
                }%`
              }}
            />
          </div>

          <div className="step-labels">
            {STEPS.map((item, index) => (
              <span
                key={item.id}
                className={
                  index === step
                    ? 'active'
                    : index < step
                      ? 'complete'
                      : ''
                }
              >
                <i>
                  {index < step ? '✓' : index + 1}
                </i>

                {item.label}
              </span>
            ))}
          </div>
        </section>

        {error && (
          <div
            className="error-banner"
            role="alert"
          >
            <Icon
              name="alert-circle"
              size={18}
              stroke="currentColor"
            />

            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError('')}
              aria-label="Dismiss error"
            >
              <Icon
                name="x"
                size={16}
                stroke="currentColor"
              />
            </button>
          </div>
        )}

        {success && (
          <div className="success-banner">
            <Icon
              name="check-circle"
              size={19}
              stroke="currentColor"
            />

            <span>
              Customer created successfully.
            </span>
          </div>
        )}

        <form
          className="customer-form"
          onSubmit={handleSubmit}
        >
          {step === 0 && (
            <section className="form-card">
              <div className="section-heading">
                <div className="section-icon">
                  <Icon
                    name="user"
                    size={19}
                    stroke="currentColor"
                  />
                </div>

                <div>
                  <span className="section-kicker">
                    BASIC INFORMATION
                  </span>

                  <h2>
                    Who is this customer?
                  </h2>

                  <p>
                    Start with the details you'll
                    use to identify them.
                  </p>
                </div>
              </div>

              <div className="field-grid">
                <label className="field">
                  <span>
                    First name
                    <b>*</b>
                  </span>

                  <input
                    type="text"
                    value={form.first_name}
                    onChange={event =>
                      updateField(
                        'first_name',
                        event.target.value
                      )
                    }
                    placeholder="e.g. Amaka"
                    autoComplete="given-name"
                    autoFocus
                  />
                </label>

                <label className="field">
                  <span>
                    Last name
                    <b>*</b>
                  </span>

                  <input
                    type="text"
                    value={form.last_name}
                    onChange={event =>
                      updateField(
                        'last_name',
                        event.target.value
                      )
                    }
                    placeholder="e.g. Okafor"
                    autoComplete="family-name"
                  />
                </label>
              </div>

              <label className="field">
                <span>
                  Phone number
                  <b>*</b>
                </span>

                <div className="input-with-icon">
                  <Icon
                    name="phone"
                    size={17}
                    stroke="currentColor"
                  />

                  <input
                    type="tel"
                    value={form.phone}
                    onChange={event =>
                      updateField(
                        'phone',
                        event.target.value
                      )
                    }
                    placeholder="0803 123 4567"
                    autoComplete="tel"
                    inputMode="tel"
                  />
                </div>

                <small>
                  Use the number you normally use
                  to contact this customer.
                </small>
              </label>

              <div className="optional-divider">
                <span>OPTIONAL</span>
              </div>

              <div className="field-grid">
  <label className="field">
    <span>Gender</span>

    <select
      value={form.gender}
      onChange={event =>
        updateField(
          'gender',
          event.target.value
        )
      }
    >
      <option value="">
        Not specified
      </option>

      <option value="female">
        Female
      </option>

      <option value="male">
        Male
      </option>

      <option value="other">
        Other
      </option>
    </select>
  </label>

  <label className="field">
    <span>Age category</span>

    <select
      value={form.age_category}
      onChange={event =>
        updateField(
          'age_category',
          event.target.value
        )
      }
    >
      <option value="">
        Not specified
      </option>

      <option value="child">
        Child
      </option>

      <option value="adult">
        Adult
      </option>
    </select>
  </label>
</div>
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="form-card">
              <div className="section-heading">
                <div className="section-icon">
                  <Icon
                    name="phone"
                    size={19}
                    stroke="currentColor"
                  />
                </div>

                <div>
                  <span className="section-kicker">
                    CONTACT
                  </span>

                  <h2>
                    How can you reach them?
                  </h2>

                  <p>
                    Add extra contact information
                    if you have it.
                  </p>
                </div>
              </div>

              <label className="field">
                <span>Email address</span>

                <div className="input-with-icon">
                  <Icon
                    name="mail"
                    size={17}
                    stroke="currentColor"
                  />

                  <input
                    type="email"
                    value={form.email}
                    onChange={event =>
                      updateField(
                        'email',
                        event.target.value
                      )
                    }
                    placeholder="customer@example.com"
                    autoComplete="email"
                    inputMode="email"
                  />
                </div>

                <small>
                  Optional. Their phone number is
                  already saved.
                </small>
              </label>

              <label className="field">
                <span>Address</span>

                <textarea
                  value={form.address}
                  onChange={event =>
                    updateField(
                      'address',
                      event.target.value
                    )
                  }
                  placeholder="e.g. 12 Allen Avenue, Ikeja, Lagos"
                  rows={4}
                  autoComplete="street-address"
                />

                <small>
                  Useful for deliveries and home
                  fittings.
                </small>
              </label>

              <div className="info-card">
                <div className="info-card-icon">
                  <Icon
                    name="info"
                    size={17}
                    stroke="currentColor"
                  />
                </div>

                <p>
                  You can always update these details
                  later from the customer profile.
                </p>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="form-card">
              <div className="section-heading">
                <div className="section-icon">
                  <Icon
                    name="notebook"
                    size={19}
                    stroke="currentColor"
                  />
                </div>

                <div>
                  <span className="section-kicker">
                    ADDITIONAL DETAILS
                  </span>

                  <h2>
                    Anything worth remembering?
                  </h2>

                  <p>
                    Keep useful private notes about
                    this customer.
                  </p>
                </div>
              </div>

              <label className="field">
                <span>Customer notes</span>

                <textarea
                  value={form.notes}
                  onChange={event =>
                    updateField(
                      'notes',
                      event.target.value
                    )
                  }
                  placeholder={
                    'e.g. Prefers loose fitting.\nUsually picks up orders herself.'
                  }
                  rows={7}
                />

                <small>
                  These notes are for your business
                  and won't be sent to the customer.
                </small>
              </label>

              <div className="finish-preview">
                <div className="preview-avatar">
                  {(
                    form.first_name
                      .charAt(0) +
                    form.last_name
                      .charAt(0)
                  ).toUpperCase() || '?'}
                </div>

                <div>
                  <span>
                    CUSTOMER PROFILE
                  </span>

                  <strong>
                    {`${form.first_name} ${form.last_name}`.trim() ||
                      'New customer'}
                  </strong>

                  <small>
                    {form.phone ||
                      'Phone number not entered'}
                  </small>
                </div>
              </div>
            </section>
          )}

          <div className="form-actions">
            {step > 0 && (
              <button
                type="button"
                className="secondary-action"
                onClick={goBack}
                disabled={saving}
              >
                Back
              </button>
            )}

            <button
              type="submit"
              className="primary-action"
              disabled={saving || success}
            >
              {saving ? (
                <>
                  <span className="button-spinner" />
                  Saving...
                </>
              ) : step ===
                STEPS.length - 1 ? (
                <>
                  Save customer
                  <Icon
                    name="check"
                    size={18}
                    stroke="currentColor"
                  />
                </>
              ) : (
                <>
                  Continue
                  <Icon
                    name="arrow-right"
                    size={18}
                    stroke="currentColor"
                  />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .new-customer-page {
          min-height: 100vh;
          padding: 0 16px 100px;
          background: var(--color-bg);
          color: var(--color-text);
        }

        .new-customer-shell {
          width: 100%;
          max-width: 620px;
          margin: 0 auto;
        }

        .new-customer-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 20px 0 18px;
        }

        .back-button {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--color-border);
          border-radius: 13px;
          background: var(--color-card);
          color: var(--color-primary);
          cursor: pointer;
        }

        .header-copy {
          min-width: 0;
        }

        .eyebrow,
        .section-kicker {
          display: block;
          color: var(--color-text-muted);
          font-size: 9px;
          line-height: 1.2;
          font-weight: 900;
          letter-spacing: .11em;
        }

        .header-copy h1 {
          margin: 4px 0 5px;
          color: var(--color-primary);
          font-size: 25px;
          line-height: 1.15;
          font-weight: 900;
        }

        .header-copy p {
          max-width: 330px;
          margin: 0;
          color: var(--color-text-muted);
          font-size: 12px;
          line-height: 1.5;
        }

        .progress-section {
          padding: 15px;
          margin-bottom: 16px;
          border: 1px solid var(--color-border);
          border-radius: 17px;
          background: var(--color-card);
        }

        .progress-topline {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 9px;
        }

        .progress-topline span {
          color: var(--color-text-muted);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .08em;
        }

        .progress-topline strong {
          color: var(--color-primary);
          font-size: 11px;
          font-weight: 900;
        }

        .progress-bar {
          height: 5px;
          overflow: hidden;
          border-radius: 10px;
          background: #ebe7df;
        }

        .progress-value {
          height: 100%;
          border-radius: inherit;
          background: var(--color-accent);
          transition: width .25s ease;
        }

        .step-labels {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 4px;
          margin-top: 10px;
        }

        .step-labels span {
          display: flex;
          align-items: center;
          gap: 5px;
          color: var(--color-text-muted);
          font-size: 9px;
          font-weight: 700;
        }

        .step-labels span:nth-child(2) {
          justify-content: center;
        }

        .step-labels span:last-child {
          justify-content: flex-end;
        }

        .step-labels span.active {
          color: var(--color-primary);
          font-weight: 900;
        }

        .step-labels span.complete {
          color: var(--color-secondary);
        }

        .step-labels i {
          width: 18px;
          height: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 18px;
          border: 1px solid var(--color-border);
          border-radius: 50%;
          background: var(--color-bg);
          color: var(--color-text-muted);
          font-size: 8px;
          font-style: normal;
          font-weight: 900;
        }

        .step-labels .active i {
          border-color: var(--color-primary);
          background: var(--color-primary);
          color: #fff;
        }

        .step-labels .complete i {
          border-color: var(--color-secondary);
          background: var(--color-secondary);
          color: #fff;
        }

        .error-banner,
        .success-banner {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 14px;
          padding: 12px 13px;
          border-radius: 13px;
          font-size: 12px;
          line-height: 1.4;
        }

        .error-banner {
          border: 1px solid rgba(180, 60, 60, .18);
          background: rgba(180, 60, 60, .07);
          color: #9c3333;
        }

        .success-banner {
          border: 1px solid rgba(46, 125, 94, .18);
          background: rgba(46, 125, 94, .09);
          color: var(--color-secondary);
          font-weight: 800;
        }

        .error-banner span,
        .success-banner span {
          flex: 1;
        }

        .error-banner button {
          width: 25px;
          height: 25px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          border: 0;
          border-radius: 50%;
          background: transparent;
          color: currentColor;
          cursor: pointer;
        }

        .customer-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .form-card {
          padding: 18px;
          border: 1px solid var(--color-border);
          border-radius: 20px;
          background: var(--color-card);
          box-shadow: var(--shadow-sm);
        }

        .section-heading {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          margin-bottom: 22px;
        }

        .section-icon {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 38px;
          border-radius: 12px;
          background: rgba(15,43,74,.08);
          color: var(--color-primary);
        }

        .section-heading h2 {
          margin: 4px 0 4px;
          color: var(--color-primary);
          font-size: 17px;
          line-height: 1.25;
          font-weight: 900;
        }

        .section-heading p {
          margin: 0;
          color: var(--color-text-muted);
          font-size: 11px;
          line-height: 1.5;
        }

        .field-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 7px;
          margin-bottom: 15px;
        }

        .field > span {
          color: var(--color-primary);
          font-size: 11px;
          font-weight: 800;
        }

        .field > span b {
          margin-left: 3px;
          color: #b33c3c;
          font-weight: 900;
        }

        .field input,
        .field select,
        .field textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid var(--color-border);
          border-radius: 12px;
          outline: none;
          background: #fff;
          color: var(--color-text);
          font-family: inherit;
          font-size: 13px;
          transition:
            border-color .18s ease,
            box-shadow .18s ease;
        }

        .field input,
        .field select {
          height: 47px;
          padding: 0 12px;
        }

        .field textarea {
          min-height: 105px;
          padding: 12px;
          resize: vertical;
          line-height: 1.5;
        }

        .field input::placeholder,
        .field textarea::placeholder {
          color: #aaa59c;
        }

        .field input:focus,
        .field select:focus,
        .field textarea:focus {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(15,43,74,.08);
        }

        .input-with-icon {
          position: relative;
        }

        .input-with-icon > svg {
          position: absolute;
          top: 50%;
          left: 13px;
          transform: translateY(-50%);
          color: var(--color-text-muted);
          pointer-events: none;
        }

        .input-with-icon input {
          padding-left: 40px;
        }

        .field small {
          color: var(--color-text-muted);
          font-size: 10px;
          line-height: 1.45;
        }

        .optional-divider {
          position: relative;
          display: flex;
          align-items: center;
          margin: 4px 0 15px;
        }

        .optional-divider::before {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          height: 1px;
          background: var(--color-border);
        }

        .optional-divider span {
          position: relative;
          padding-right: 9px;
          background: var(--color-card);
          color: var(--color-text-muted);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .08em;
        }

        .info-card {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          padding: 12px;
          border-radius: 13px;
          background: rgba(15,43,74,.05);
        }

        .info-card-icon {
          flex: 0 0 auto;
          color: var(--color-primary);
        }

        .info-card p {
          margin: 0;
          color: var(--color-text-muted);
          font-size: 10px;
          line-height: 1.5;
        }

        .finish-preview {
          display: flex;
          align-items: center;
          gap: 11px;
          margin-top: 5px;
          padding: 13px;
          border: 1px solid var(--color-border);
          border-radius: 15px;
          background: var(--color-bg);
        }

        .preview-avatar {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 44px;
          border-radius: 50%;
          background: var(--color-primary);
          color: #fff;
          font-size: 13px;
          font-weight: 900;
        }

        .finish-preview > div:last-child {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .finish-preview span {
          color: var(--color-text-muted);
          font-size: 8px;
          font-weight: 900;
          letter-spacing: .08em;
        }

        .finish-preview strong {
          overflow: hidden;
          color: var(--color-primary);
          font-size: 13px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .finish-preview small {
          color: var(--color-text-muted);
          font-size: 10px;
        }

        .form-actions {
          display: flex;
          gap: 10px;
          padding-top: 2px;
        }

        .primary-action,
        .secondary-action {
          height: 50px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 14px;
          font-family: inherit;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
        }

        .primary-action {
          flex: 1;
          border: 0;
          background: var(--color-accent);
          color: var(--color-primary);
          box-shadow: var(--shadow-sm);
        }

        .secondary-action {
          min-width: 90px;
          padding: 0 18px;
          border: 1px solid var(--color-border);
          background: var(--color-card);
          color: var(--color-primary);
        }

        .primary-action:disabled,
        .secondary-action:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .button-spinner,
        .loading-spinner {
          width: 17px;
          height: 17px;
          border: 2px solid rgba(15,43,74,.2);
          border-top-color: var(--color-primary);
          border-radius: 50%;
          animation: spin .7s linear infinite;
        }

        .loading-state {
          min-height: 80vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: var(--color-text-muted);
          font-size: 12px;
        }

        .loading-spinner {
          width: 24px;
          height: 24px;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .back-button:focus-visible,
        .primary-action:focus-visible,
        .secondary-action:focus-visible,
        .error-banner button:focus-visible {
          outline: 3px solid rgba(212,165,42,.35);
          outline-offset: 2px;
        }

        @media (max-width: 430px) {
          .new-customer-page {
            padding-left: 12px;
            padding-right: 12px;
          }

          .new-customer-header {
            padding-top: 15px;
          }

          .header-copy h1 {
            font-size: 23px;
          }

          .form-card {
            padding: 15px;
          }

          .field-grid {
            grid-template-columns: 1fr;
            gap: 0;
          }

          .step-labels span {
            font-size: 8px;
          }

          .step-labels i {
            width: 17px;
            height: 17px;
            flex-basis: 17px;
          }
        }

        @media (min-width: 640px) {
          .new-customer-page {
            padding-top: 20px;
          }

          .new-customer-header {
            padding-top: 10px;
          }
        }
      `}</style>
    </main>
  )
}
