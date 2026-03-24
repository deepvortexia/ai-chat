import type { Metadata, Viewport } from "next";
import { Orbitron, Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-orbitron",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "800"],
  variable: "--font-inter",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Deep Vortex AI Chat | The Ultimate Multi-Model Conversational AI",
  description:
    "Experience the most powerful AI chat on the web. Deep Vortex AI delivers elite reasoning, multiple LLM access, and lightning-fast responses. Free, secure, and advanced.",
  keywords: [
    "best AI chat 2026",
    "Deep Vortex AI",
    "premium AI assistant",
    "multi-model AI",
    "chatbot online",
    "advanced reasoning AI",
  ],
  alternates: { canonical: "https://chat.deepvortexai.com/" },
  robots: { index: true, follow: true },
  verification: { google: "76BAsq1e-Ol7tA8HmVLi9LgMDXpjyBIQvdAx6bZXF7Q" },
  other: {
    "theme-color": "#D4AF37",
    "revisit-after": "7 days",
    "ai-content-declaration": "This page contains AI-generated content.",
  },
  openGraph: {
    title: "Deep Vortex AI Chat | The Ultimate Multi-Model Conversational AI",
    description:
      "Experience the most powerful AI chat on the web. Elite reasoning, multiple LLM access, lightning-fast responses. Free and secure.",
    url: "https://chat.deepvortexai.com/",
    siteName: "Deep Vortex AI",
    images: [
      {
        url: "https://chat.deepvortexai.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Deep Vortex AI Chat",
      },
    ],
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    site: "@deepvortexart",
    creator: "@deepvortexart",
    title: "Deep Vortex AI Chat | The Ultimate Multi-Model Conversational AI",
    description:
      "Elite multi-model AI chat with GPT, Claude, Gemini and more. Free, fast and powerful.",
    images: ["https://chat.deepvortexai.com/og-image.png"],
  },
  icons: {
    icon: [
      { url: "https://chat.deepvortexai.com/favicon.ico?v=4" },
      { url: "https://chat.deepvortexai.com/favicon.svg?v=4", type: "image/svg+xml" },
    ],
    apple: "https://chat.deepvortexai.com/apple-touch-icon.png?v=4",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Deep Vortex AI Chat",
  "url": "https://chat.deepvortexai.com/",
  "applicationCategory": "AIApplication",
  "operatingSystem": "Web",
  "description": "Multi-model AI chat platform with GPT-5, Claude 4.5, Gemini 2.5 Flash, and DeepSeek v3.1. Elite reasoning, lightning-fast responses, free and secure.",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
  },
  "author": {
    "@type": "Organization",
    "name": "Deep Vortex AI",
    "url": "https://deepvortexai.com",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${orbitron.variable} ${inter.variable} ${jakarta.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
