import { Toaster } from 'sonner';
import type { Metadata } from 'next';
import { geist, geistMono } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://chat.vercel.ai'),
  title: 'AI Graph Team',
  description: 'A DAG Editor with Temporal Runs',
};

export const viewport = {
  maximumScale: 1, // Disable auto-zoom on mobile Safari
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable}`}
    >
      <head>
      </head>
      <body className="antialiased">
        <Toaster position="top-center" />
        {children}
      </body>
    </html>
  );
}
