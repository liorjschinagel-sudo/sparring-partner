import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sparring Partner — AE objection handling on LiveKit',
  description:
    'Talk to a synthetic prospect evaluating LiveKit, then get scored on how you handled their objections.',
};

export const viewport: Viewport = {
  themeColor: '#08090c',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="page-glow min-h-dvh antialiased">
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
