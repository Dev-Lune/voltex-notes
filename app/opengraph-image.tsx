import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Voltex Notes — Open-Source Knowledge Base with Graph View & Cloud Sync'
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
          background: 'linear-gradient(135deg, #0A0A0F 0%, #111118 50%, #0A0A0F 100%)',
          padding: '60px 80px',
          position: 'relative',
        }}
      >
        {/* Subtle glow */}
        <div
          style={{
            position: 'absolute',
            top: 100,
            left: 100,
            width: 500,
            height: 500,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(25,118,210,0.12) 0%, transparent 70%)',
          }}
        />

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20, zIndex: 1 }}>
          {/* Logo + Title row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            {/* Crystal logo */}
            <svg width="80" height="112" viewBox="0 0 82 116" fill="none">
              <polygon points="10,47 72,38 41,80" fill="#40C4FF"/>
              <polygon points="72,38 80,82 41,113 41,80" fill="#0D47A1"/>
              <polygon points="10,47 41,80 41,113 2,84" fill="#1976D2"/>
              <path d="M 47 2 L 35 2 L 27 17 L 38 17 L 29 33 L 55 33 L 59 17 L 46 17 Z" fill="#FFD600"/>
            </svg>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 72, fontWeight: 700, color: '#E8E8F0', letterSpacing: '-2px', lineHeight: 1 }}>
                Voltex Notes
              </div>
              <div style={{ fontSize: 28, color: '#8888A0', lineHeight: 1.2 }}>
                Open-Source Knowledge Base
              </div>
            </div>
          </div>

          {/* Feature pills */}
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            {['Graph View', 'Markdown', 'Cloud Sync', 'Plugins', 'Wikilinks'].map((label) => (
              <div
                key={label}
                style={{
                  padding: '8px 20px',
                  borderRadius: 20,
                  background: 'rgba(25,118,210,0.15)',
                  border: '1px solid rgba(25,118,210,0.3)',
                  color: '#40C4FF',
                  fontSize: 16,
                  fontWeight: 500,
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* URL + DevLune */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 24 }}>
            <div style={{ fontSize: 18, color: '#555566' }}>
              voltex.devlune.in
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="9" height="9" viewBox="0 0 14 14" fill="none">
                <path d="M13 7.5C12.1 10.6 9.2 12.9 5.8 12.9 2.2 12.9 -0.2 10 0 6.5 0.3 3.1 3 0.5 6.4 0.3 6.1 1.2 6 2.2 6 3.2 6 7.5 9.5 11 13.8 11 13.5 9.9 13.3 8.7 13 7.5Z" fill="#555566"/>
              </svg>
              <span style={{ fontSize: 14, color: '#555566', fontWeight: 500 }}>
                A DevLune Studios project
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
