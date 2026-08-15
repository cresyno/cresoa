'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../lib/getBusinessId'
import { Icon } from '../../../components/Icon'
import { Card } from '../../../components/Card'
import { SectionHeader } from '../../../components/SectionHeader'
import { Navigation } from '../../../components/Navigation'
import '../../../globals.css'

// ─── Password strength helper ─────────────────────────────
function getPasswordStrength(password) {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  return score // 0-6
}

function getStrengthLabel(strength) {
  if (strength <= 1) return 'Weak'
  if (strength <= 3) return 'Fair'
  if (strength <= 4) return 'Good'
  return 'Strong'
}

function getStrengthColor(strength) {
  if (strength <= 1) return 'var(--cresoa-danger)'
  if (strength <= 3) return 'var(--cresoa-warning)'
  if (strength <= 4) return 'var(--cresoa-accent)'
  return 'var(--cresoa-success)'
}

export default function ProfilePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = getCurrentBusinessId() || searchParams.get('business_id')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState('')
  const [user, setUser] = useState(null)

  // ─── Profile state ────────────────────────────────────────
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    phone: '',
    timezone: 'Africa/Lagos',
    notifications: {
      email: true,
      whatsapp: true,
    },
  })

  // ─── Avatar state ─────────────────────────────────────────
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // ─── Password state ───────────────────────────────────────
  const [password, setPassword] = useState({
    current: '',
    new: '',
    confirm: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)

  // ─── Navigation helper ────────────────────────────────────
  const navigateWithBusiness = (path) => {
    const separator = path.includes('?') ? '&' : '?'
    router.push(`${path}${separator}business_id=${businessId}`)
  }

  // ─── Load user data ───────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }
        setUser(user)

        const metadata = user.user_metadata || {}
        setProfile({
          full_name: metadata.full_name || '',
          email: user.email || '',
          phone: metadata.phone || '',
          timezone: metadata.timezone || 'Africa/Lagos',
          notifications: {
            email: metadata.email_notifications !== false,
            whatsapp: metadata.whatsapp_notifications !== false,
          },
        })

        if (metadata.avatar_url) {
          setAvatarPreview(metadata.avatar_url)
        }
      } catch (err) {
        console.error(err)
        setError('Failed to load profile.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  // ─── Update password strength ─────────────────────────────
  useEffect(() => {
    setPasswordStrength(getPasswordStrength(password.new))
  }, [password.new])

  // ─── Avatar handlers ──────────────────────────────────────
  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 1024 * 1024) {
      setError('Avatar must be less than 1MB')
      return
    }

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = (event) => setAvatarPreview(event.target.result)
    reader.readAsDataURL(file)
  }

  const handleAvatarUpload = async () => {
    if (!avatarFile || !user) return

    setUploadingAvatar(true)
    setError(null)

    try {
      const fileExt = avatarFile.name.split('.').pop()
      const filePath = `avatars/${user.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      })

      if (updateError) throw updateError

      setAvatarFile(null)
      setSuccess('Avatar updated successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error(err)
      setError('Failed to upload avatar.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleRemoveAvatar = async () => {
    if (!confirm('Remove your profile picture?')) return

    try {
      const { error } = await supabase.auth.updateUser({
        data: { avatar_url: null }
      })

      if (error) throw error

      setAvatarPreview(null)
      setAvatarFile(null)
      setSuccess('Avatar removed!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error(err)
      setError('Failed to remove avatar.')
    }
  }

  // ─── Profile submit ───────────────────────────────────────
  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess('')

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          full_name: profile.full_name,
          phone: profile.phone,
          timezone: profile.timezone,
          email_notifications: profile.notifications.email,
          whatsapp_notifications: profile.notifications.whatsapp,
        }
      })

      if (updateError) throw updateError

      setSuccess('Profile updated successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  // ─── Password submit ──────────────────────────────────────
  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess('')

    if (password.new.length < 8) {
      setError('Password must be at least 8 characters')
      setSaving(false)
      return
    }

    if (password.new !== password.confirm) {
      setError('Passwords do not match')
      setSaving(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password.new
      })

      if (error) throw error

      setSuccess('Password updated successfully!')
      setPassword({ current: '', new: '', confirm: '' })
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to update password')
    } finally {
      setSaving(false)
    }
  }

  // ─── Loading skeleton ────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ width: '140px', height: '24px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
          <div style={{ width: '100px', height: '32px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ background: 'var(--cresoa-surface)', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', animation: 'pulse 1.5s infinite' }}>
              <div style={{ width: '60%', height: '16px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
              <div style={{ width: '40%', height: '12px', background: 'var(--cresoa-border)', borderRadius: '6px', marginTop: '0.3rem' }} />
            </div>
          ))}
        </div>
        <style>{`@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }`}</style>
        <Navigation businessId={businessId} />
      </div>
    )
  }

  if (error && !user) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '80px' }}>
        <Card style={{ padding: '2rem', textAlign: 'center' }}>
          <Icon name="alert-circle" size={32} stroke="var(--cresoa-danger)" />
          <h2 style={{ margin: '0.5rem 0' }}>Couldn't load profile</h2>
          <p style={{ color: 'var(--cresoa-text-muted)' }}>{error}</p>
          <button onClick={() => window.location.reload()} className="cresoa-primary-button" style={{ marginTop: '1rem' }}>Retry</button>
        </Card>
        <Navigation businessId={businessId} />
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '80px' }}>
      <Navigation businessId={businessId} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <div>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Account</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0', color: 'var(--cresoa-text)' }}>Profile & Settings</h1>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', margin: 0 }}>Manage your personal account settings</p>
        </div>
      </div>

      {/* Success / Error toasts */}
      {success && (
        <div style={{ padding: '0.6rem 1rem', borderRadius: '8px', background: 'var(--cresoa-success-soft)', color: 'var(--cresoa-success)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Icon name="check-circle" size={16} stroke="var(--cresoa-success)" /> {success}
        </div>
      )}
      {error && (
        <div style={{ padding: '0.6rem 1rem', borderRadius: '8px', background: 'var(--cresoa-danger-soft)', color: 'var(--cresoa-danger)', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* ─── Avatar Card ────────────────────────────────────── */}
      <Card style={{ padding: '1.5rem', marginBottom: '1rem' }}>
        <SectionHeader title="Profile Picture" subtitle="Upload a square image for your profile" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ width: '96px', height: '96px', borderRadius: '50%', overflow: 'hidden', background: 'var(--cresoa-bg)', border: '3px solid var(--cresoa-border)', flexShrink: 0, position: 'relative' }}>
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cresoa-text-muted)' }}>
                <Icon name="user" size={40} stroke="var(--cresoa-text-muted)" />
              </div>
            )}
          </div>
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
                id="avatar-upload"
              />
              <label htmlFor="avatar-upload" className="cresoa-primary-button" style={{ cursor: 'pointer', padding: '0.3rem 1rem', fontSize: '0.8rem', background: 'var(--cresoa-primary)' }}>
                <Icon name="upload" size={14} stroke="#fff" style={{ marginRight: '0.3rem' }} /> Upload
              </label>
              {avatarFile && (
                <button onClick={handleAvatarUpload} disabled={uploadingAvatar} className="cresoa-primary-button" style={{ padding: '0.3rem 1rem', fontSize: '0.8rem' }}>
                  {uploadingAvatar ? 'Uploading...' : 'Save Avatar'}
                </button>
              )}
              {avatarPreview && (
                <button onClick={handleRemoveAvatar} style={{ padding: '0.3rem 1rem', borderRadius: '6px', border: '1px solid var(--cresoa-danger)', background: 'transparent', color: 'var(--cresoa-danger)', cursor: 'pointer', fontSize: '0.8rem' }}>
                  Remove
                </button>
              )}
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--cresoa-text-muted)', marginTop: '0.3rem' }}>
              PNG, JPG or GIF · Max 1MB · Square recommended
            </p>
          </div>
        </div>
      </Card>

      {/* ─── Profile Info ───────────────────────────────────── */}
      <Card style={{ padding: '1.5rem', marginBottom: '1rem' }}>
        <SectionHeader title="Personal Information" />
        <form onSubmit={handleProfileSubmit}>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>Full Name</label>
              <input
                type="text"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.95rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>Email Address</label>
              <input
                type="email"
                value={profile.email}
                disabled
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text-muted)', fontSize: '0.95rem', cursor: 'not-allowed', opacity: 0.7 }}
              />
              <p style={{ fontSize: '0.7rem', color: 'var(--cresoa-text-muted)', marginTop: '0.2rem' }}>Email cannot be changed. Contact support for assistance.</p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>Phone Number</label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="e.g. 08012345678"
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.95rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>Timezone</label>
              <select
                value={profile.timezone}
                onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.95rem' }}
              >
                <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
                <option value="Africa/Cairo">Africa/Cairo (CAT)</option>
                <option value="Africa/Johannesburg">Africa/Johannesburg (SAST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="America/New_York">America/New_York (EST)</option>
              </select>
            </div>

            {/* ─── Notifications ────────────────────────────── */}
            <div style={{ marginTop: '0.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--cresoa-text)' }}>Notification Preferences</label>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={profile.notifications.email} onChange={(e) => setProfile({ ...profile, notifications: { ...profile.notifications, email: e.target.checked } })} />
                  Email
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={profile.notifications.whatsapp} onChange={(e) => setProfile({ ...profile, notifications: { ...profile.notifications, whatsapp: e.target.checked } })} />
                  WhatsApp
                </label>
              </div>
            </div>

            <button type="submit" disabled={saving} className="cresoa-primary-button" style={{ alignSelf: 'flex-start' }}>
              <Icon name="check" size={14} stroke="#fff" style={{ marginRight: '0.3rem' }} /> {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </Card>

      {/* ─── Change Password ────────────────────────────────── */}
      <Card style={{ padding: '1.5rem', marginBottom: '1rem' }}>
        <SectionHeader title="Change Password" />
        <form onSubmit={handlePasswordSubmit}>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>New Password</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password.new}
                  onChange={(e) => setPassword({ ...password, new: e.target.value })}
                  placeholder="Minimum 8 characters"
                  minLength={8}
                  style={{ flex: 1, padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.95rem' }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}>
                  <Icon name={showPassword ? 'eye-off' : 'eye'} size={20} stroke="currentColor" />
                </button>
              </div>
                                {/* Strength indicator */}
              {password.new && (
                <div style={{ marginTop: '0.3rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <div style={{ flex: 1, height: '4px', background: 'var(--cresoa-border)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${(passwordStrength / 6) * 100}%`, height: '100%', background: getStrengthColor(passwordStrength), transition: 'width 0.3s' }} />
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: getStrengthColor(passwordStrength) }}>
                      {getStrengthLabel(passwordStrength)}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>Confirm New Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password.confirm}
                onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
                placeholder="Confirm your new password"
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.95rem' }}
              />
              {password.confirm && password.new && password.confirm !== password.new && (
                <p style={{ fontSize: '0.7rem', color: 'var(--cresoa-danger)', marginTop: '0.2rem' }}>Passwords do not match</p>
              )}
            </div>
            <button type="submit" disabled={saving || !password.new || password.new !== password.confirm} className="cresoa-primary-button" style={{ alignSelf: 'flex-start', background: 'var(--cresoa-primary)' }}>
              <Icon name="lock" size={14} stroke="#fff" style={{ marginRight: '0.3rem' }} /> {saving ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </Card>

      {/* ─── Logout ──────────────────────────────────────────── */}
      <Card style={{ padding: '1.5rem', borderColor: 'var(--cresoa-danger)' }}>
        <SectionHeader title="Account Actions" subtitle="Manage your session" />
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
          <button
            onClick={async () => {
              if (confirm('Are you sure you want to log out?')) {
                await supabase.auth.signOut()
                router.push('/login')
              }
            }}
            style={{ padding: '0.5rem 1.5rem', borderRadius: '8px', border: '1px solid var(--cresoa-danger)', background: 'transparent', color: 'var(--cresoa-danger)', cursor: 'pointer', fontWeight: 500 }}
          >
            <Icon name="log-out" size={14} stroke="var(--cresoa-danger)" style={{ marginRight: '0.3rem' }} /> Logout
          </button>
        </div>
      </Card>

      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={businessId} />
      </div>
    </div>
  )
}
