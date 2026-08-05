'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'

export default function TrackingSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [business, setBusiness] = useState(null)
  const [settings, setSettings] = useState({
    primaryColor: '#D4A52A',
    bgColor: '#F8F6F2',
    logoUrl: '',
    welcomeMessage: '',
    footerMessage: '',
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: businessData, error } = await supabase
      .from('businesses')
      .select('id, plan, tracking_primary_color, tracking_bg_color, tracking_logo_url, tracking_welcome_message, tracking_footer_message')
      .eq('owner_id', user.id)
      .single()

    if (error || !businessData) {
      router.push('/onboarding')
      return
    }

    setBusiness(businessData)

    // Check if Pro or Beta
    if (businessData.plan !== 'pro' && businessData.plan !== 'beta') {
      return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2 style={{ color: '#0F2B4A' }}>Upgrade Required</h2>
          <p style={{ color: '#8A8A8A' }}>Tracking page customisation is available for Pro and Beta users only.</p>
          <a href="/dashboard/subscription" style={{ color: '#D4A52A', fontWeight: '600' }}>Upgrade now →</a>
        </div>
      )
    }

    setSettings({
      primaryColor: businessData.tracking_primary_color || '#D4A52A',
      bgColor: businessData.tracking_bg_color || '#F8F6F2',
      logoUrl: businessData.tracking_logo_url || '',
      welcomeMessage: businessData.tracking_welcome_message || '',
      footerMessage: businessData.tracking_footer_message || '',
    })
    setLoading(false)
  }

  const saveSettings = async () => {
    setSaving(true)
    setMessage('')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setMessage('You are not logged in.')
      setSaving(false)
      return
    }

    const res = await fetch('/api/settings/tracking', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessToken: session.access_token,
        settings,
      }),
    })

    const data = await res.json()
    if (res.ok) {
      setMessage('✅ Settings saved successfully!')
    } else {
      setMessage('❌ Error: ' + (data.error || 'Unknown error'))
    }
    setSaving(false)
  }

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      <h1 style={{ color: '#0F2B4A', fontSize: '1.5rem' }}>🎨 Tracking Page Customisation</h1>
      <p style={{ color: '#8A8A8A', marginBottom: '1.5rem' }}>
        Customise the look and feel of your order tracking page. These changes will be visible to your customers.
      </p>

      {message && (
        <div style={{
          background: message.startsWith('✅') ? '#DCEBE2' : '#F1DBD3',
          color: message.startsWith('✅') ? '#2E7D5E' : '#D9534F',
          padding: '0.6rem',
          borderRadius: '8px',
          marginBottom: '1rem',
        }}>
          {message}
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', border: '1px solid #E5E0D8' }}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', color: '#0F2B4A' }}>
            Primary Colour
          </label>
          <input
            type="color"
            value={settings.primaryColor}
            onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
            style={{ width: '100%', padding: '0.3rem', borderRadius: '8px', border: '1px solid #E5E0D8' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', color: '#0F2B4A' }}>
            Background Colour
          </label>
          <input
            type="color"
            value={settings.bgColor}
            onChange={(e) => setSettings({ ...settings, bgColor: e.target.value })}
            style={{ width: '100%', padding: '0.3rem', borderRadius: '8px', border: '1px solid #E5E0D8' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', color: '#0F2B4A' }}>
            Logo URL (optional)
          </label>
          <input
            type="text"
            value={settings.logoUrl}
            onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
            placeholder="https://example.com/logo.png"
            style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #E5E0D8' }}
          />
          <p style={{ fontSize: '0.7rem', color: '#8A8A8A', marginTop: '0.2rem' }}>
            Enter a direct URL to your business logo (PNG or SVG).
          </p>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', color: '#0F2B4A' }}>
            Welcome Message
          </label>
          <input
            type="text"
            value={settings.welcomeMessage}
            onChange={(e) => setSettings({ ...settings, welcomeMessage: e.target.value })}
            placeholder="Track your order with us!"
            style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #E5E0D8' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', color: '#0F2B4A' }}>
            Footer Message
          </label>
          <input
            type="text"
            value={settings.footerMessage}
            onChange={(e) => setSettings({ ...settings, footerMessage: e.target.value })}
            placeholder="Thank you for choosing us!"
            style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #E5E0D8' }}
          />
        </div>

        <button
          onClick={saveSettings}
          disabled={saving}
          style={{
            width: '100%',
            padding: '0.8rem',
            borderRadius: '10px',
            border: 'none',
            background: 'linear-gradient(135deg, #D4A52A, #C79A2B)',
            color: '#0F2B4A',
            fontWeight: '700',
            fontSize: '1rem',
            cursor: saving ? 'default' : 'pointer',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Saving...' : '💾 Save Settings'}
        </button>
      </div>

      <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        <a href="/dashboard" style={{ color: '#8A8A8A', textDecoration: 'none', fontSize: '0.85rem' }}>
          ← Back to Dashboard
        </a>
      </div>
    </div>
  )
    }
