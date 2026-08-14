import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono, Sora } from 'next/font/google';
import { identity } from '@/lib/profile';
import './globals.css';

const sora = Sora({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

const title = `${identity.name} — AI Interview Persona`;
const description = `Interview ${identity.name}, ${identity.title} at ${identity.company}. Ask by voice or text and get answers grounded in his real projects and experience.`;

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
};

export const viewport: Viewport = {
  themeColor: '#05060b',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
