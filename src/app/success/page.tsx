import { Suspense } from 'react';
import SuccessClient from './SuccessClient';
// import { getCurrentSession } from '@/lib/auth';
import { getCurrentUser } from '@/lib/auth';

export default async function SuccessPage() {
  const session = await getCurrentUser();
  console.log("session", session)
  // const email = session?.user?.email;
  // console.log("email ==> ", email)
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-3xl rounded-2xl bg-slate-900/80 border border-slate-700 shadow-xl p-6 md:p-8 space-y-4 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">
              Loading
            </p>
            <h1 className="text-2xl md:text-3xl font-semibold">
              Getting your Elf plan ready…
            </h1>
            <p className="text-sm text-slate-300">
              Just a moment while we prepare your Elf-on-the-Shelf page.
            </p>
          </div>
        </main>
      }
    >
      <SuccessClient />
    </Suspense>
  );
}
