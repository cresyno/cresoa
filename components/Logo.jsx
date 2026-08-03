'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'

export default function Logo({ variant = 'primary', size = 'medium', className = '' }) {
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    const savedTheme = localStorage.getItem('cresoa-theme')
    if (savedTheme) {
      setTheme(savedTheme)
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark')
    }
  }, [])

  // ✅ Using your exact filenames from the upload
  let logoSrc

  if (variant === 'primary') {
    logoSrc = '/logos/file_00000000dd648246bfe3205cb852e890.png'
  } else if (variant === 'dark-bg') {
    logoSrc = '/logos/file_00000000587c824687b5471c929f1fc2.png'
  } else if (variant === 'icon') {
    logoSrc = '/logos/file_00000000f69c820ab00c704b429eb572.png'
  } else if (variant === 'wordmark') {
    logoSrc = '/logos/file_0000000047fc81f49a6abed2174f0b63.png'
  } else if (variant === 'app-icon') {
    logoSrc = '/logos/file_00000000bb3481f4990f1bfdcf0fca75.png'
  } else if (variant === 'monochrome-dark') {
    logoSrc = '/logos/file_000000003d6881f49f751a2a7ad88a4b.png'
  } else if (variant === 'monochrome-light') {
    logoSrc = '/logos/file_0000000038a081f49e94e3a28d95e09e.png'
  } else {
    logoSrc = '/logos/file_00000000dd648246bfe3205cb852e890.png'
  }

  const sizeMap = {
    small: { width: 80, height: 30 },
    medium: { width: 140, height: 50 },
    large: { width: 200, height: 70 },
  }

  const { width, height } = sizeMap[size] || sizeMap.medium

  return (
    <Image
      src={logoSrc}
      alt="Cresoa – Smarter Work. Seamless Growth."
      width={width}
      height={height}
      className={className}
      priority
    />
  )
}
