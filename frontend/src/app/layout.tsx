import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "D'insight Dashboard - Predictive Maintenance Platform",
  description:
    'Advanced predictive maintenance analytics platform with real-time monitoring and anomaly detection',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body
        className={`${inter.className} antialiased bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
