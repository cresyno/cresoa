'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import LetterLogo from '../../../components/LetterLogo'

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [business, setBusiness] = useState(null)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [location, setLocation] = useState('')
  const [savingInfo, setSavingInfo] = useState(false)
  const [infoMessage, setInfoMessage] = useState('')

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
    setInfoMessage('')

    const { error } = await supabase
      .from('businesses')
      .update({ name, phone, whatsapp, location })
      .eq('id', business.id)

    if (error) {
      setInfoMessage('Error: ' + error.message)
    } else {
      setInfoMessage('Business info updated!')
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
      setEmailMessage('Check your new email address to confirm the change.')
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
      setPasswordMessage('Password updated!')
      setNewPassword('')
      setConfirmNewPassword('')
    }
    setSavingPassword(false)
  }

  const handleDeactivate = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to deactivate your account? You will be logged out and will need to contact support to reactivate.'
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
    border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box'
  }
  const labelStyle = { display: 'block', color: '#2B2620', marginBottom: '0.4rem', fontSize: '0.9rem' }
  const cardStyle = { background: '#fff', borderRadius: '14px', padding: '1.3rem', border: '1px solid #e4d8c2', marginBottom: '1.2rem' }
  const buttonStyle = { width: '100%', padding: '0.75rem', borderRadius: '8px', border: 'none', background: '#1E3A5F', color: '#fff', fontSize: '0.95rem', fontWeight: '600' }

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '420px', margin: '0 auto' }}>
        <button
          onClick={() => router.push('/dashboard')}
          style={{ background: 'none', border: 'none', color: '#1E3A5F', fontSize: '0.85rem', padding: 0, marginBottom: '1rem' }}
        >
          ← Back to dashboard
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
          <LetterLogo name={business?.name} size={48} />
          <h1 style={{ color: '#1E3A5F', fontSize: '1.4rem', margin: 0 }}>Profile & settings</h1>
        </div>

        <form onSubmit={handleSaveInfo} style={cardStyle}>
          <h2 style={{ color: '#1E3A5F', fontSize: '1rem', margin: '0 0 1rem' }}>Business info</h2>

          <div style={{ marginBottom: '0.8rem' }}>
            <label style={labelStyle}>Business name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: '0.8rem' }}>
            <label style={labelStyle}>Phone</label>
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: '0.8rem' }}>
            <label style={labelStyle}>WhatsApp number</label>
            <input type="text" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Location</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} style={inputStyle} />
          </div>

          <button type="submit" disabled={savingInfo} style={buttonStyle}>
            {savingInfo ? 'Saving...' : 'Save business info'}
          </button>
          {infoMessage && (
            <p style={{ marginTop: '0.8rem', fontSize: '0.85rem', color: infoMessage.startsWith('Error') ? '#AE4A34' : '#4C7A5E' }}>
              {infoMessage}
            </p>
          )}
        </form>

        <form onSubmit={handleChangeEmail} style={cardStyle}>
          <h2 style={{ color: '#1E3A5F', fontSize: '1rem', margin: '0 0 1rem' }}>Change email</h2>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>New email address</label>
            <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required style={inputStyle} />
          </div>
          <button type="submit" disabled={savingEmail} style={buttonStyle}>
            {savingEmail ? 'Updating...' : 'Update email'}
          </button>
          {emailMessage && (
            <p style={{ marginTop: '0.8rem', fontSize: '0.85rem', color: emailMessage.startsWith('Error') ? '#AE4A34' : '#4C7A5E' }}>
              {emailMessage}
            </p>
          )}
        </form>

        <form onSubmit={handleChangePassword} style={cardStyle}>
          <h2 style={{ color: '#1E3A5F', fontSize: '1rem', margin: '0 0 1rem' }}>Change password</h2>
          <div style={{ marginBottom: '0.6rem' }}>
            <label style={labelStyle}>New password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                style={{ ...inputStyle, paddingRight: '2.6rem' }}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                style={{ position: 'absolute', right: '0.7rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 0, color: '#6B6255', fontSize: '0.8rem' }}
              >
                {showNewPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Confirm new password</label>
            <input
              type={showNewPassword ? 'text' : 'password'}
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              required
              style={inputStyle}
            />
          </div>
          <button type="submit" disabled={savingPassword} style={buttonStyle}>
            {savingPassword ? 'Updating...' : 'Update password'}
          </button>
          {passwordMessage && (
            <p style={{ marginTop: '0.8rem', fontSize: '0.85rem', color: passwordMessage === 'Password updated!' ? '#4C7A5E' : '#AE4A34' }}>
              {passwordMessage}
            </p>
          )}
        </form>

        <div style={{ ...cardStyle, borderColor: '#AE4A34' }}>
          <h2 style={{ color: '#AE4A34', fontSize: '1rem', margin: '0 0 0.6rem' }}>Danger zone</h2>
          <p style={{ color: '#6B6255', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Deactivating logs you out immediately. Contact support to reactivate.
          </p>
          <button
            onClick={handleDeactivate}
            disabled={deactivating}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #AE4A34', background: '#fff', color: '#AE4A34', fontSize: '0.95rem', fontWeight: '600' }}
          >
            {deactivating ? 'Deactivating...' : 'Deactivate account'}
          </button>
        </div>
      </div>
    </main>
  )
            }
