import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import AuthProvider from "./components/AuthProvider";
import CursorGlow from "./components/CursorGlow";
import ScrollProgress from "./components/ScrollProgress";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Distinctive display face for headings — geometric, technical, not generic.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "DevCouncil AI — Multi-Agent Code Review Platform",
  description:
    "Submit your GitHub repository and get expert-level code analysis from a panel of specialized AI agents. Architecture, security, and code quality — reviewed in parallel, debated in real-time.",
  keywords: [
    "code review",
    "AI",
    "multi-agent",
    "security analysis",
    "architecture review",
    "GitHub",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <ScrollProgress />
        <CursorGlow />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
