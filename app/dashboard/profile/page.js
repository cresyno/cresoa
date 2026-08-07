'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../lib/getBusinessId'
import { Icon } from '../../../components/Icon'

export default function ProfilePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [user, setUser] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
  })

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })

  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        setUser(user)

        // Get profile data from user metadata
        setFormData({
          full_name: user.user_metadata?.full_name || '',
          email: user.email || '',
        })

        // Get avatar from metadata
        if (user.user_metadata?.avatar_url) {
          setAvatarPreview(user.user_metadata.avatar_url)
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

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPasswordData({ ...passwordData, [name]: value })
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file size (1MB max)
    if (file.size > 1024 * 1024) {
      setError('Avatar must be less than 1MB')
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = (event) => {
      setAvatarPreview(event.target.result)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      let avatarUrl = user?.user_metadata?.avatar_url || ''

      // Upload avatar if a new file was selected
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop()
        const fileName = `${user.id}.${fileExt}`
        const filePath = `avatars/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { upsert: true })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          throw new Error('Failed to upload avatar')
        }

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath)

        avatarUrl = publicUrl
      }

      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          full_name: formData.full_name,
          avatar_url: avatarUrl,
        }
      })

      if (updateError) throw updateError

      setSuccess(true)
      setAvatarFile(null)
      setTimeout(() => setSuccess(false), 3000)

    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    // Validate password
    if (passwordData.new_password.length < 8) {
      setError('Password must be at least 8 characters')
      setSaving(false)
      return
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('Passwords do not match')
      setSaving(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new_password
      })

      if (error) throw error

      setSuccess(true)
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      })
      setTimeout(() => setSuccess(false), 3000)

    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to update password')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ width: '180px', height: '24px', background: 'var(--color-border)', borderRadius: '6px', marginBottom: '1rem' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ width: '100%', height: '56px', background: 'var(--color-border)', borderRadius: '8px', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
        <style>{`@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-danger)' }}>
        {error}
        <button onClick={() => window.location.reload()} style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', background: 'var(--color-accent)', color: '#0F2B4A', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Retry</button>
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', color: 'var(--color-text)' }}>
      <h1 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.25rem' }}>Profile & Settings</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
        Manage your personal account settings.
      </p>

      {success && (
        <div style={{ background: 'var(--color-success)', color: '#fff', padding: '0.8rem 1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          ✅ Profile updated successfully!
        </div>
      )}

      {/* ─── Avatar ─── */}
      <div style={{ background: 'var(--color-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>Profile Picture</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
          Upload a square image for your profile picture. Max 1MB.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', background: 'var(--color-bg)', border: '2px solid var(--color-border)', flexShrink: 0 }}>
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                <Icon name="user" size={32} stroke="var(--color-text-muted)" />
              </div>
            )}
          </div>
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              style={{ display: 'none' }}
              id="avatar-upload"
            />
            <label
              htmlFor="avatar-upload"
              style={{ padding: '0.4rem 1rem', background: 'var(--color-primary)', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', display: 'inline-block' }}
            >
              Choose Image
            </label>
            {avatarFile && <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{avatarFile.name}</span>}
            <p style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>Square image recommended (e.g., 200×200px)</p>
          </div>
        </div>
      </div>

      {/* ─── Personal Info ─── */}
      <form onSubmit={handleSubmit} style={{ background: 'var(--color-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>Personal Information</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '500', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Full Name *</label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '500', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              disabled
              style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-muted)', fontSize: '0.9rem', cursor: 'not-allowed', opacity: 0.7 }}
            />
            <p style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>Email cannot be changed. Contact support for assistance.</p>
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1.5rem',
            background: 'var(--color-accent)',
            color: '#0F2B4A',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: saving ? 'default' : 'pointer',
            opacity: saving ? 0.6 : 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}
        >
          <Icon name="check" size={16} stroke="#0F2B4A" /> {saving ? 'Saving...' : 'Update Profile'}
        </button>
      </form>

      {/* ─── Change Password ─── */}
      <form onSubmit={handlePasswordSubmit} style={{ background: 'var(--color-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>Change Password</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '500', fontSize: '0.85rem', marginBottom: '0.2rem' }}>New Password *</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="new_password"
                value={passwordData.new_password}
                onChange={handlePasswordChange}
                required
                minLength={8}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                <Icon name={showPassword ? 'eye-off' : 'eye'} size={20} stroke="currentColor" />
              </button>
            </div>
            <div style={{ marginTop: '0.3rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                <span>At least 8 characters</span>
                <span>•</span>
                <span>Contains a number</span>
              </div>
              <div style={{ marginTop: '0.2rem', height: '4px', width: '100%', background: 'var(--color-border)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: Math.min((passwordData.new_password.length / 8) * 100, 100), height: '100%', background: passwordData.new_password.length >= 8 ? 'var(--color-success)' : 'var(--color-danger)', transition: 'width 0.3s' }} />
              </div>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '500', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Confirm New Password *</label>
            <input
              type={showPassword ? 'text' : 'password'}
              name="confirm_password"
              value={passwordData.confirm_password}
              onChange={handlePasswordChange}
              required
              style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem' }}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving || !passwordData.new_password}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1.5rem',
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: saving || !passwordData.new_password ? 'default' : 'pointer',
            opacity: saving || !passwordData.new_password ? 0.6 : 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}
        >
          <Icon name="lock" size={16} stroke="#fff" /> {saving ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  )
}
