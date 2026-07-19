import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { AppProviders } from '@/providers/app-providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const jbmono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jbmono', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'AI Employee — Hire AI teammates that actually work', template: '%s · AI Employee' },
  description:
    'Hire, train, and manage AI employees that answer email, book meetings, and talk to customers — no code required.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning: next-themes mutates the class before hydration.
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jbmono.variable}`}>
      <body className="min-h-screen">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
