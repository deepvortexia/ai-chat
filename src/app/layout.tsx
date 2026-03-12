import type { Metadata, Viewport } from "next";
import { Orbitron, Inter } from "next/font/google";
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
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Deep Vortex AI — Chat",
  description:
    "Chat with GPT-5, Claude 4.5 Sonnet, Gemini 2.5 Flash & DeepSeek v3.1 in one place.",
  icons: { icon: "/logo-real.webp", apple: "/logo-real.webp" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${orbitron.variable} ${inter.variable}`}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
