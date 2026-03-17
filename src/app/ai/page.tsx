import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'All Deep Vortex AI Tools — 9 Free AI Creative Tools | Deep Vortex AI',
  description:
    'Explore all 9 Deep Vortex AI tools: AI Image Generator, Emoticon Generator, Background Remover, Image Upscaler, 3D Generator, Voice Generator, Image to Video, Avatar Generator, and AI Chat. One account, one credit wallet.',
  keywords: [
    'Deep Vortex AI tools',
    'AI image generator',
    'AI avatar generator',
    'AI chat',
    'background remover',
    'image upscaler',
    'AI 3D model generator',
    'AI voice generator',
    'image to video AI',
    'AI emoticon generator',
    'free AI tools 2026',
  ],
  alternates: { canonical: 'https://chat.deepvortexai.art/ai' },
  openGraph: {
    title: 'All Deep Vortex AI Tools — 9 Free AI Creative Tools',
    description:
      'One account gives you access to 9 powerful AI tools: image generation, avatar creation, voice synthesis, 3D modeling, and more.',
    url: 'https://chat.deepvortexai.art/ai',
    siteName: 'Deep Vortex AI',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'All Deep Vortex AI Tools — 9 Free AI Creative Tools',
    description:
      'One account gives you access to 9 powerful AI tools: image generation, avatar creation, voice synthesis, 3D modeling, and more.',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': 'https://chat.deepvortexai.art/ai',
      url: 'https://chat.deepvortexai.art/ai',
      name: 'All Deep Vortex AI Tools',
      description:
        'Complete guide to all 9 Deep Vortex AI creative tools — image generation, avatars, voice, 3D, video, chat, and more.',
      isPartOf: { '@id': 'https://deepvortexai.art' },
      publisher: {
        '@type': 'Organization',
        name: 'Deep Vortex AI',
        url: 'https://deepvortexai.art',
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How many tools does Deep Vortex AI offer?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Deep Vortex AI currently offers 9 tools: AI Image Generator, AI Emoticon Generator, AI Background Remover, AI Image Upscaler, AI 3D Model Generator, AI Voice Generator, AI Image to Video, AI Avatar Generator, and AI Chat.',
          },
        },
        {
          '@type': 'Question',
          name: 'Do I need separate accounts for each Deep Vortex AI tool?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. One Deep Vortex AI account gives you access to all 9 tools. Sign in once at deepvortexai.art and your account, credits, and favorites are shared across the entire ecosystem.',
          },
        },
        {
          '@type': 'Question',
          name: 'Are the Deep Vortex AI tools free to use?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'New accounts receive 2 free credits with no credit card required. Additional credits are available via flexible plans starting at $4.99 for 10 credits, usable across any tool.',
          },
        },
        {
          '@type': 'Question',
          name: 'What can I create with Deep Vortex AI tools?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'You can generate images from text, create custom AI avatars from photos, remove backgrounds, upscale images up to 4x, generate 3D models from images, synthesize realistic voices, animate photos into videos, create custom emoji, and chat with multiple AI models.',
          },
        },
      ],
    },
  ],
}

const tools = [
  {
    name: 'AI Image Generator',
    url: 'https://images.deepvortexai.art',
    description:
      'Generate stunning images from text descriptions using Flux, one of the most capable text-to-image models available. Supports multiple aspect ratios and delivers professional-quality results in seconds.',
  },
  {
    name: 'AI Emoticon Generator',
    url: 'https://emoticons.deepvortexai.art',
    description:
      'Create custom AI-powered emoticons and emoji from any text prompt in seconds. Perfect for streamers, Discord servers, brands, and social media creators who want unique, expressive icons.',
  },
  {
    name: 'AI Background Remover',
    url: 'https://bgremover.deepvortexai.art',
    description:
      'Remove image backgrounds instantly with AI precision, producing clean transparent PNGs ready for any use case. Ideal for product photography, social media graphics, and design work.',
  },
  {
    name: 'AI Image Upscaler',
    url: 'https://upscaler.deepvortexai.art',
    description:
      'Upscale images up to 4x their original resolution while preserving and enhancing detail. Restore old photos, improve AI-generated art, or prepare assets for print-quality output.',
  },
  {
    name: 'AI 3D Model Generator',
    url: 'https://3d.deepvortexai.art',
    description:
      'Transform a single photo or image into a downloadable 3D model in GLB format using AI. Useful for game developers, 3D artists, product visualization, and augmented reality projects.',
  },
  {
    name: 'AI Voice Generator',
    url: 'https://voice.deepvortexai.art',
    description:
      'Convert text to realistic AI-generated speech across multiple voices, languages, and styles. Great for voiceovers, podcasts, e-learning content, and accessibility features.',
  },
  {
    name: 'AI Image to Video',
    url: 'https://video.deepvortexai.art',
    description:
      'Animate any image into a short AI-generated video with natural motion and cinematic quality. Bring artwork, product shots, and portraits to life for social media and creative projects.',
  },
  {
    name: 'AI Avatar Generator',
    url: 'https://avatar.deepvortexai.art',
    description:
      'Transform your photo into a stunning AI avatar in dozens of styles — Cyberpunk, Anime, Pixar, Dark Fantasy, and more — powered by Flux Kontext Pro. Perfect for profile pictures, gaming personas, and branded identities.',
  },
  {
    name: 'AI Chat',
    url: 'https://chat.deepvortexai.art',
    description:
      'Chat with multiple leading AI models — including GPT, Claude, Gemini, and DeepSeek — through a single interface. Get elite reasoning, fast responses, and multi-model flexibility for any task.',
  },
]

export default function AIToolsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#fff',
        fontFamily: 'Inter, sans-serif',
        padding: '4rem 1.5rem',
        maxWidth: '860px',
        margin: '0 auto',
      }}>
        <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
          <h1 style={{
            fontFamily: 'Orbitron, sans-serif',
            fontSize: 'clamp(1.6rem, 4vw, 2.6rem)',
            fontWeight: 900,
            background: 'linear-gradient(135deg, #E8C87C 0%, #D4AF37 50%, #B8960C 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '1rem',
            lineHeight: 1.2,
          }}>
            All Deep Vortex AI Tools
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.1rem', lineHeight: 1.7, maxWidth: '620px', margin: '0 auto' }}>
            One account. One credit wallet. Nine powerful AI creative tools — from image generation
            and voice synthesis to 3D modeling and multi-model chat.
          </p>
        </header>

        <section style={{ marginBottom: '4rem' }}>
          {tools.map((tool) => (
            <article key={tool.url} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(212,175,55,0.15)',
              borderRadius: '12px',
              padding: '1.5rem 1.75rem',
              marginBottom: '1rem',
            }}>
              <h2 style={{
                fontFamily: 'Orbitron, sans-serif',
                fontSize: '1rem',
                fontWeight: 700,
                color: '#D4AF37',
                marginBottom: '0.5rem',
              }}>
                <a href={tool.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                  {tool.name} ↗
                </a>
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.7, margin: 0 }}>
                {tool.description}
              </p>
            </article>
          ))}
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1.1rem', fontWeight: 700, color: '#D4AF37', marginBottom: '1.5rem' }}>
            Frequently Asked Questions
          </h2>
          {[
            {
              q: 'Do I need separate accounts for each tool?',
              a: 'No. One Deep Vortex AI account gives you access to all 9 tools. Sign in once at deepvortexai.art and your credits and favorites are shared across every tool.',
            },
            {
              q: 'Are the tools free to use?',
              a: 'New accounts receive 2 free credits with no credit card required. Additional credits start at $4.99 for 10 credits and never expire — use them on any tool at any time.',
            },
            {
              q: 'What can I create with Deep Vortex AI?',
              a: 'Images, avatars, 3D models, AI voices, animated videos, transparent cutouts, upscaled photos, custom emoji, and multi-model AI chat conversations — all from one ecosystem.',
            },
          ].map(({ q, a }) => (
            <div key={q} style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff', marginBottom: '0.4rem' }}>{q}</h3>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>{a}</p>
            </div>
          ))}
        </section>

        <footer style={{ textAlign: 'center', borderTop: '1px solid rgba(212,175,55,0.1)', paddingTop: '2rem' }}>
          <a href="https://deepvortexai.art" style={{
            display: 'inline-block',
            padding: '0.75rem 2rem',
            background: 'linear-gradient(135deg, #B8860B, #D4AF37)',
            color: '#0a0a0a',
            borderRadius: '50px',
            fontWeight: 700,
            fontSize: '0.95rem',
            textDecoration: 'none',
          }}>
            Go to Deep Vortex AI Hub →
          </a>
        </footer>
      </main>
    </>
  )
}
