import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'SpendWise — Personal Finance Manager',
  description: 'Track income, expenses, budgets and financial trends with SpendWise.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-surface-900 text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
