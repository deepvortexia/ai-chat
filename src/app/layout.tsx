import type { Metadata, Viewport } from "next";
import { Orbitron, Inter, Plus_Jakarta_Sans } from "next/font/google";
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
  alternates: { canonical: "https://chat.deepvortexai.art/" },
  icons: {
    icon: "https://chat.deepvortexai.art/favicon.ico?v=4",
    apple: "https://chat.deepvortexai.art/apple-touch-icon.png?v=4",
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
  "url": "https://chat.deepvortexai.art/",
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
    "url": "https://deepvortexai.art",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${orbitron.variable} ${inter.variable} ${jakarta.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
