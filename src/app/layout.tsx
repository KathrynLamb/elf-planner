// src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

import { getCurrentUser } from '@/lib/auth';
import { AuthSessionProvider } from '@/components/AuthSessionProvider';
import { AuthButtons } from '@/components/AuthButtons';

export const metadata: Metadata = {
  title: 'Elf Planner',
  description: 'Wake up to Elf magic, not parent panic.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // purely for debugging; safe if it returns null
  const user = await getCurrentUser();
  console.log('session in RootLayout', user);

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-50">
        {/* Client-side SessionProvider wrapper */}
        <AuthSessionProvider>
          {/* If you want auth buttons in a global header, you can render them here */}
          {/* <header className="p-4 border-b border-slate-800 flex justify-end">
            <AuthButtons />
          </header> */}
          {children}
        </AuthSessionProvider>
      </body>
    </html>
  );
}
