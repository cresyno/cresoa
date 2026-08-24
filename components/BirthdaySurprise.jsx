'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function BirthdaySurprise() {
  const [visible, setVisible] = useState(false)
  const [showButton, setShowButton] = useState(false)
  const [hearts, setHearts] = useState([])

  useEffect(() => {
    // Check if the surprise has already been seen
    const seen = localStorage.getItem('cresoa_birthday_seen')
    if (!seen) {
      setVisible(true)

      // Generate floating hearts
      const newHearts = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 5,
        duration: 4 + Math.random() * 4,
        size: 20 + Math.random() * 30,
        emoji: ['❤️', '💖', '💕', '💗', '💘', '💝'][Math.floor(Math.random() * 6)],
      }))
      setHearts(newHearts)

      // Show button after 2.5 seconds
      const timer = setTimeout(() => setShowButton(true), 2500)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleContinue = () => {
    localStorage.setItem('cresoa_birthday_seen', 'true')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, overflow: 'hidden', background: 'linear-gradient(135deg, #0F2B4A 0%, #1A3F66 40%, #D4A52A 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontFamily: "'Inter', sans-serif" }}>
      
      {/* Floating Hearts */}
      {hearts.map(heart => (
        <div key={heart.id} style={{ position: 'absolute', left: `${heart.left}%`, top: '100%', fontSize: heart.size, animation: `floatUp ${heart.duration}s linear ${heart.delay}s infinite`, opacity: 0, pointerEvents: 'none' }}>
          {heart.emoji}
        </div>
      ))}

      {/* Sparkles */}
      <div style={{ position: 'absolute', top: '10%', left: '10%', fontSize: '2rem', color: '#fff', animation: 'twinkle 2s infinite' }}>✨</div>
      <div style={{ position: 'absolute', top: '20%', right: '15%', fontSize: '3rem', color: '#FFD966', animation: 'twinkle 2.5s infinite' }}>🌟</div>
      <div style={{ position: 'absolute', bottom: '30%', left: '20%', fontSize: '2.5rem', color: '#fff', animation: 'twinkle 1.8s infinite' }}>💫</div>

      {/* Main Content */}
      <div style={{ position: 'relative', zIndex: 2, padding: '2rem', maxWidth: '600px', background: 'rgba(255,255,255,0.1)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(10px)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem', animation: 'heartbeat 1.5s infinite' }}>💖</div>
        <h1 style={{ fontSize: '2.2rem', color: '#fff', margin: '0 0 0.5rem', fontWeight: 800, textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
          Aya mhi 😍, come see what I have for you
        </h1>
        <p style={{ fontSize: '1.1rem', color: '#FFD966', margin: '0 0 2rem', letterSpacing: '0.5px' }}>
          Happy Birthday, my love! 🎂
        </p>

        {!showButton ? (
          <div style={{ color: '#fff', fontSize: '1.2rem', animation: 'pulseGlow 1.5s infinite' }}>
            Getting something ready...
          </div>
        ) : (
          <Link href="https://todayisfordolly.vercel.app/" target="_blank" rel="noopener noreferrer" onClick={handleContinue} style={{ display: 'inline-block', padding: '1rem 2.5rem', background: '#D4A52A', color: '#0F2B4A', fontWeight: 800, fontSize: '1.2rem', borderRadius: '50px', textDecoration: 'none', boxShadow: '0 4px 16px rgba(212,165,42,0.5)', transition: 'transform 0.2s ease', animation: 'pulseButton 2s infinite' }}>
            CONTINUE →
          </Link>
        )}
      </div>

      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(0.8); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100vh) scale(1.2); opacity: 0; }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          25% { transform: scale(1.2); }
          50% { transform: scale(1); }
          75% { transform: scale(1.1); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes pulseButton {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  )
      }
