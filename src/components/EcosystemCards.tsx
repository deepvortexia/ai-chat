'use client'

const tools = [
  { name: 'Emoticons',     icon: '😃', desc: 'Custom emoji creation',        href: 'https://emoticons.deepvortexai.com', isCurrent: false },
  { name: 'Image Gen',     icon: '🎨', desc: 'AI artwork',                   href: 'https://images.deepvortexai.com',    isCurrent: false },
  { name: 'Logo Gen',      icon: '🛡️', desc: 'AI logo creation',             href: 'https://logo.deepvortexai.com',      isCurrent: false },
  { name: 'Avatar Gen',    icon: '🎭', desc: 'AI portrait styles',            href: 'https://avatar.deepvortexai.com',    isCurrent: false },
  { name: 'Remove BG',     icon: '✂️', desc: 'Remove backgrounds instantly',  href: 'https://bgremover.deepvortexai.com', isCurrent: false },
  { name: 'Upscaler',      icon: '🔍', desc: 'Upscale images up to 4x',       href: 'https://upscaler.deepvortexai.com',  isCurrent: false },
  { name: '3D Generator',  icon: '🧊', desc: 'Image to 3D model',             href: 'https://3d.deepvortexai.com',        isCurrent: false },
  { name: 'Voice Gen',     icon: '🎙️', desc: 'AI Voice Generator',            href: 'https://voice.deepvortexai.com',     isCurrent: false },
  { name: 'Image → Video', icon: '🎬', desc: 'Animate images with AI',        href: 'https://video.deepvortexai.com',     isCurrent: false },
  { name: 'AI Chat',       icon: '💬', desc: '4 frontier AI models',          href: 'https://chat.deepvortexai.com',      isCurrent: true  },
]

export default function EcosystemCards() {
  return (
    <section style={{ width: '100%', padding: '1.2rem 0.5rem 0', marginTop: '1rem' }}>
      <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.7rem', fontWeight: 700, color: 'rgba(212,175,55,0.5)', textAlign: 'center', letterSpacing: '1.5px', marginBottom: '0.9rem' }}>
        COMPLETE AI ECOSYSTEM
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
        {tools.map((tool) => (
          <div
            key={tool.name}
            onClick={() => { if (!tool.isCurrent) window.location.href = tool.href }}
            role={tool.isCurrent ? 'presentation' : 'button'}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem',
              padding: '0.6rem 0.3rem',
              background: tool.isCurrent ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${tool.isCurrent ? 'rgba(212,175,55,0.45)' : 'rgba(255,255,255,0.07)'}`,
              borderRadius: '10px',
              cursor: tool.isCurrent ? 'default' : 'pointer',
              transition: 'border-color 0.2s, background 0.2s',
            }}
            onMouseEnter={e => { if (!tool.isCurrent) { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(212,175,55,0.4)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(212,175,55,0.07)'; } }}
            onMouseLeave={e => { if (!tool.isCurrent) { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'; } }}
          >
            <span style={{ fontSize: '1.1rem' }}>{tool.icon}</span>
            <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.58rem', fontWeight: 700, color: tool.isCurrent ? '#D4AF37' : 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 1.2 }}>{tool.name}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
