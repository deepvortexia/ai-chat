import type { Metadata } from "next";
import { Orbitron } from "next/font/google";
import "./globals.css";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-orbitron",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Deep Vortex AI — Chat",
  description:
    "Chat with GPT-5, Claude 4.5 Sonnet, Gemini 2.5 Flash & DeepSeek v3.1 in one place.",
  icons: { icon: "/favicon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={orbitron.variable}>
      <body>{children}</body>
    </html>
  );
}
