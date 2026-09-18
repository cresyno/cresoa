import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Cresoa — Run your Nigerian business from one place'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(170deg, #0F2B4A 0%, #061A2E 100%)',
          padding: '80px',
          fontFamily: 'Georgia, serif',
        }}
      >
        {/* Top: wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '44px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-1.5px' }}>
            CRESO
          </span>
          <span style={{ fontSize: '44px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-1.5px' }}>
            A
          </span>
        </div>

        {/* Center: headline + subhead */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px' }}>
          <div
            style={{
              fontSize: '72px',
              fontWeight: 700,
              color: '#FFFFFF',
              lineHeight: 1.1,
              letterSpacing: '-2px',
              display: 'flex',
              flexWrap: 'wrap',
            }}
          >
            <span>Run your Nigerian business&nbsp;</span>
            <span style={{ color: '#E5B84B' }}>from one place.</span>
          </div>
          <div
            style={{
              fontSize: '26px',
              color: '#A8B8CE',
              lineHeight: 1.5,
              fontFamily: 'Arial, sans-serif',
              maxWidth: '760px',
            }}
          >
            Track orders, manage customers, and collect payments in one workspace. Built for Fashion, Repairs, and Printing businesses across Nigeria.
          </div>
        </div>

        {/* Bottom: url + call */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          <span style={{ fontSize: '22px', color: '#7C8CA5', letterSpacing: '0.5px' }}>
            cresoa.com.ng
          </span>
          <span
            style={{
              fontSize: '18px',
              color: '#0F2B4A',
              background: '#E5B84B',
              padding: '12px 28px',
              borderRadius: '100px',
              fontWeight: 700,
            }}
          >
            Join the Waitlist
          </span>
        </div>
      </div>
    ),
    { ...size }
  )
        }
