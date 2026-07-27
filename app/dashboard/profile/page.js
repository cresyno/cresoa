// app/dashboard/profile/page.js

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import LetterLogo from '../../../components/LetterLogo'
import { showToast } from '../../../lib/toast'
import { getPlanStatusMessage } from '../../../lib/planLimits'

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [business, setBusiness] = useState(null)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [location, setLocation] = useState('')
  const [savingInfo, setSavingInfo] = useState(false)

  const [newEmail, setNewEmail] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)
  const [emailMessage, setEmailMessage] = useState('')

  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')

  const [deactivating, setDeactivating] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      setNewEmail(user.email || '')

      const { data: businessData } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .single()

      if (businessData) {
        setBusiness(businessData)
        setName(businessData.name || '')
        setPhone(businessData.phone || '')
        setWhatsapp(businessData.whatsapp || '')
        setLocation(businessData.location || '')
      }

      setLoading(false)
    }

    load()
  }, [router])

  const handleSaveInfo = async (e) => {
    e.preventDefault()
    setSavingInfo(true)

    const { error } = await supabase
      .from('businesses')
      .update({ name, phone, whatsapp, location })
      .eq('id', business.id)

    if (error) {
      showToast('Error saving info', '#AE4A34')
    } else {
      showToast('✅ Business info updated!', '#4C7A5E')
      setBusiness({ ...business, name, phone, whatsapp, location })
    }
    setSavingInfo(false)
  }

  const handleChangeEmail = async (e) => {
    e.preventDefault()
    setSavingEmail(true)
    setEmailMessage('')

    const { error } = await supabase.auth.updateUser({ email: newEmail })

    if (error) {
      setEmailMessage('Error: ' + error.message)
    } else {
      setEmailMessage('✅ Check your new email to confirm the change.')
      showToast('Confirmation email sent!', '#4C7A5E')
    }
    setSavingEmail(false)
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPasswordMessage('')

    const hasMinLength = newPassword.length >= 8
    const hasNumber = /\d/.test(newPassword)

    if (!hasMinLength || !hasNumber) {
      setPasswordMessage('Password must be at least 8 characters and include a number.')
      return
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordMessage('Passwords do not match.')
      return
    }

    setSavingPassword(true)

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setPasswordMessage('Error: ' + error.message)
    } else {
      showToast('✅ Password updated!', '#4C7A5E')
      setNewPassword('')
      setConfirmNewPassword('')
    }
    setSavingPassword(false)
  }

  const handleDeactivate = async () => {
    const confirmed = window.confirm(
      '⚠️ Are you sure you want to deactivate your account? You will be logged out and will need to contact support to reactivate.'
    )
    if (!confirmed) return

    setDeactivating(true)

    await supabase
      .from('businesses')
      .update({ is_active: false })
      .eq('id', business.id)

    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: '#F5EFE2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          .cresoa-spinner {
            width: 40px; height: 40px;
            border: 4px solid #e4d8c2;
            border-top: 4px solid #1E3A5F;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
        `}</style>
        <div className="cresoa-spinner"></div>
        <p style={{ color: '#6B6255', fontSize: '0.85rem', marginTop: '1rem' }}>Loading profile...</p>
      </main>
    )
  }

  const inputStyle = {
    width: '100%', padding: '0.7rem', borderRadius: '8px',
    border: '1px solid #E8E0D5', fontSize: '1rem', boxSizing: 'border-box',
    background: '#fff', color: '#2B2620',
    transition: 'border-color 0.2s ease',
  }

  const labelStyle = { display: 'block', color: '#2B2620', marginBottom: '0.3rem', fontSize: '0.85rem', fontWeight: '500' }

  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
    setPhone(digits)
  }

  const handleWhatsAppChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
    setWhatsapp(digits)
  }

  const planStatus = business ? getPlanStatusMessage(business) : null

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '1.5rem 1.2rem' }}>
      <style>{`
        .profile-card {
          background: #fff;
          border-radius: 14px;
          padding: 1.5rem;
          border: 1px solid #E8E0D5;
          max-width: 480px;
          margin: 0 auto;
          margin-bottom: 1rem;
        }
        .profile-card .title {
          color: #1E3A5F;
          font-size: 1rem;
          font-weight: 700;
          margin: 0 0 1rem;
        }
        .profile-card .subtitle {
          color: #6B6255;
          font-size: 0.8rem;
          margin: -0.5rem 0 1rem;
        }
        .btn-primary {
          width: 100%;
          padding: 0.8rem;
          border-radius: 8px;
          border: none;
          background: linear-gradient(135deg, #C79A2B, #B4881E);
          color: #1E3A5F;
          font-size: 1rem;
          font-weight: 700;
          box-shadow: 0 4px 14px rgba(199,154,43,0.3);
          cursor: pointer;
          transition: transform 0.1s ease;
        }
        .btn-primary:active { transform: scale(0.98); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-secondary {
          width: 100%;
          padding: 0.8rem;
          border-radius: 8px;
          border: 1px solid #E8E0D5;
          background: #fff;
          color: #1E3A5F;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.1s ease;
        }
        .btn-secondary:hover { background: #F5EFE2; }
        .btn-secondary:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-danger {
          width: 100%;
          padding: 0.8rem;
          border-radius: 8px;
          border: 1px solid #AE4A34;
          background: #fff;
          color: #AE4A34;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.1s ease;
        }
        .btn-danger:hover { background: #F1DBD3; }
        .btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }
        .danger-zone {
          border: 2px solid #AE4A34;
          background: #FFF5F0;
        }
        .danger-zone .title { color: #AE4A34; }
        .back-link {
          background: none;
          border: none;
          color: #1E3A5F;
          font-size: 0.85rem;
          padding: 0;
          margin-bottom: 1rem;
          cursor: pointer;
        }
        .back-link:hover { text-decoration: underline; }
        .header-row {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }
        .header-row .info h1 {
          color: #1E3A5F;
          font-size: 1.3rem;
          font-weight: 700;
          margin: 0;
        }
        .header-row .info p {
          color: #6B6255;
          font-size: 0.85rem;
          margin: 0.1rem 0 0;
        }
        .stats-row {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }
        .stat-card {
          background: #fff;
          border-radius: 10px;
          padding: 0.7rem 0.5rem;
          border: 1px solid #E8E0D5;
          text-align: center;
          flex: 1;
          min-width: 70px;
        }
        .stat-card .value {
          font-size: 1.2rem;
          font-weight: 700;
          color: #1E3A5F;
          margin: 0;
        }
        .stat-card .label {
          color: #6B6255;
          font-size: 0.65rem;
          margin: 0.1rem 0 0;
        }
        .subscription-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
        .subscription-grid .item {
          padding: 0.3rem 0;
        }
        .subscription-grid .item .label {
          color: #6B6255;
          font-size: 0.75rem;
          margin: 0;
        }
        .subscription-grid .item .value {
          color: #1E3A5F;
          font-weight: 700;
          font-size: 0.9rem;
          margin: 0;
        }
        @media (max-width: 420px) {
          .profile-card { padding: 1rem; }
          .header-row { flex-direction: column; align-items: stretch; }
          .stats-row { flex-wrap: wrap; }
          .stat-card { min-width: 60px; }
          .subscription-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <button className="back-link" onClick={() => router.push('/dashboard')}>
        ← Back to dashboard
      </button>

      <div className="header-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <LetterLogo name={business?.name} size={48} />
          <div className="info">
            <h1>Profile & Settings</h1>
            <p>{business?.name || 'Your business'}</p>
          </div>
        </div>
      </div>

      {/* ===== SUBSCRIPTION CARD ===== */}
      <div className="profile-card" style={{ border: '1px solid #C79A2B' }}>
        <h2 className="title">💳 Subscription</h2>
        <div className="subscription-grid">
          <div className="item">
            <p className="label">Current Plan</p>
            <p className="value">
              {business?.plan?.charAt(0).toUpperCase() + business?.plan?.slice(1) || 'Free'}
              {business?.plan === 'beta' && <span style={{ fontSize: '0.6rem', background: '#D6E0EB', padding: '0.05rem 0.4rem', borderRadius: '8px', marginLeft: '0.3rem' }}>Beta</span>}
            </p>
          </div>
          <div className="item">
            <p className="label">Status</p>
            <p className="value" style={{ color: planStatus?.color || '#6B6255' }}>
              {planStatus?.message || 'Free'}
            </p>
          </div>
          <div className="item">
            <p className="label">Next Payment</p>
            <p className="value">
              {business?.subscription_expires_at
                ? new Date(business.subscription_expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : 'N/A'}
            </p>
          </div>
          <div className="item">
            <p className="label">Trial Ends</p>
            <p className="value">
              {business?.trial_ends_at
                ? new Date(business.trial_ends_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : 'N/A'}
            </p>
          </div>
        </div>
        <div style={{ marginTop: '0.8rem' }}>
          <a
            href="/dashboard/subscription"
            style={{
              display: 'inline-block',
              padding: '0.3rem 1rem',
              background: '#C79A2B',
              color: '#1E3A5F',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '0.8rem',
            }}
          >
            Manage Subscription →
          </a>
        </div>
      </div>

      {/* ===== BUSINESS INFO ===== */}
      <form onSubmit={handleSaveInfo} className="profile-card">
        <h2 className="title">🏢 Business Info</h2>

        <div style={{ marginBottom: '0.8rem' }}>
          <label style={labelStyle}>Business name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
        </div>

        <div style={{ marginBottom: '0.8rem' }}>
          <label style={labelStyle}>Phone number</label>
          <input type="tel" inputMode="numeric" value={phone} onChange={handlePhoneChange} placeholder="08012345678" style={inputStyle} />
          <p style={{ fontSize: '0.7rem', color: phone.length === 11 ? '#4C7A5E' : '#6B6255', marginTop: '0.2rem' }}>
            {phone.length}/11 digits
          </p>
        </div>

        <div style={{ marginBottom: '0.8rem' }}>
          <label style={labelStyle}>WhatsApp number <span style={{ fontWeight: '400', color: '#6B6255' }}>(optional)</span></label>
          <input type="tel" inputMode="numeric" value={whatsapp} onChange={handleWhatsAppChange} placeholder="If different from phone" style={inputStyle} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Location</label>
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Ibadan, Oyo State" style={inputStyle} />
        </div>

        <button type="submit" className="btn-primary" disabled={savingInfo}>
          {savingInfo ? 'Saving...' : '💾 Save business info'}
        </button>
      </form>

      {/* ===== CHANGE EMAIL ===== */}
      <form onSubmit={handleChangeEmail} className="profile-card">
        <h2 className="title">📧 Change Email</h2>
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>New email address</label>
          <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required style={inputStyle} />
        </div>
        <button type="submit" className="btn-secondary" disabled={savingEmail}>
          {savingEmail ? 'Updating...' : '✉️ Update email'}
        </button>
        {emailMessage && <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: emailMessage.startsWith('✅') ? '#4C7A5E' : '#AE4A34' }}>{emailMessage}</p>}
      </form>

      {/* ===== CHANGE PASSWORD ===== */}
      <form onSubmit={handleChangePassword} className="profile-card">
        <h2 className="title">🔒 Change Password</h2>
        <div style={{ marginBottom: '0.6rem' }}>
          <label style={labelStyle}>New password</label>
          <div style={{ position: 'relative' }}>
            <input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required style={{ ...inputStyle, paddingRight: '2.6rem' }} />
            <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} style={{ position: 'absolute', right: '0.7rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6B6255', fontSize: '0.8rem', cursor: 'pointer' }}>{showNewPassword ? 'Hide' : 'Show'}</button>
          </div>
          <div style={{ marginTop: '0.3rem', fontSize: '0.7rem', color: '#6B6255' }}>
            <span style={{ display: 'block' }}>{newPassword.length >= 8 ? '✅' : '○'} At least 8 characters</span>
            <span style={{ display: 'block' }}>{/\d/.test(newPassword) ? '✅' : '○'} Contains a number</span>
          </div>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Confirm new password</label>
          <input type={showNewPassword ? 'text' : 'password'} value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} required style={inputStyle} />
          {confirmNewPassword && <p style={{ marginTop: '0.2rem', fontSize: '0.75rem', color: newPassword === confirmNewPassword ? '#4C7A5E' : '#AE4A34' }}>{newPassword === confirmNewPassword ? '✅ Passwords match' : '✕ Passwords do not match'}</p>}
        </div>
        <button type="submit" className="btn-secondary" disabled={savingPassword}>
          {savingPassword ? 'Updating...' : '🔑 Update password'}
        </button>
        {passwordMessage && <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#AE4A34' }}>{passwordMessage}</p>}
      </form>

      {/* ===== DANGER ZONE ===== */}
      <div className="profile-card danger-zone">
        <h2 className="title">⚠️ Danger Zone</h2>
        <p style={{ color: '#6B6255', fontSize: '0.85rem', marginBottom: '1rem' }}>
          Deactivating your account will log you out immediately. You'll need to contact support to reactivate.
        </p>
        <button type="button" className="btn-danger" onClick={handleDeactivate} disabled={deactivating}>
          {deactivating ? 'Deactivating...' : '🗑️ Deactivate account'}
        </button>
      </div>
    </main>
  )
                 }
