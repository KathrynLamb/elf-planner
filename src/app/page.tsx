// // src/app/page.tsx
// 'use client';

// import * as React from 'react';
// import Image from 'next/image';
// import Link from 'next/link';
// import {
//   ArrowRight,
//   Sparkles,
//   CheckCircle2,
//   Clock,
//   MessageCircle,
//   ShieldCheck,
// } from 'lucide-react';
// import { ElfCheckoutButton } from '@/components/ElfCheckoutButton';

// import { MiniChatSection } from '@/components/MiniChatSection';
// import { HowItWorksSection } from '@/components/HowItWorksSection';
// import { WhoItIsForSection } from '@/components/WhoItIsForSection';
// import SiteFooter from '@/components/SiteFooter';

// export default function HomePage() {

//   React.useEffect(() => {
//     const params = new URLSearchParams(window.location.search);
//     if (params.get('clearMiniSession') === '1') {
//       localStorage.removeItem('elf-mini-session-id');
//       params.delete('clearMiniSession');
//       const newUrl = window.location.pathname + '?' + params.toString();
//       window.history.replaceState({}, '', newUrl);
//     }
//   }, []);
  
//   return (


//     <main className="min-h-screen bg-slate-950 text-slate-50">

//     {/* Subtle background glow */}
//     <div className="pointer-events-none fixed inset-0 -z-10">
//       <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(236,72,153,0.16),_transparent_55%)]" />
//     </div>

//       {/* <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-10 pt-10 md:pt-16"> */}
//         <HeroSection />
//         <MiniChatSection />
//         {/* <HowItWorksSection /> */}
//         {/* <WhoItIsForSection /> */}
//  {/* Replace HowItWorksSection with full-width image */}
// {/* HOW IT WORKS IMAGE SECTION – MOBILE & DESKTOP FRIENDLY */}
// {/* FULL-WIDTH IMAGE SECTION */}
// <section id="how-it-works" className="relative w-screen mt-8">
//   <div className="relative w-full h-[480px] sm:h-[650px]">
//     <Image
//       src="https://img.dashhub.cc/nanobanana/1764340861091-us7cp70dl5.png"
//       alt="How it works – Merry the Elf explains the process"
//       fill
//       priority
//       className="object-cover object-center"
//     />
//   </div>
// </section>



  
//         <SiteFooter />
//       {/* </div> */}
//     </main>
//   );
// }
// export function HeroSection() {
//   function scrollToSection(id: string) {
//     const el = document.getElementById(id);
//     if (!el) return;
//     el.scrollIntoView({ behavior: 'smooth', block: 'start' });
//   }

//   return (
//     <section className="relative overflow-hidden min-h-[520px] sm:min-h-[600px] flex items-center">
//       {/* Background images */}
//       <div className="absolute inset-0">
//         {/* Desktop / tablet hero */}
//         <div className="hidden sm:block absolute inset-0">
//           <Image
//             src="/elf_plan4.png"
//             alt="Christmas elf working at a tiny desk, planning a wall full of Elf-on-the-Shelf ideas"
//             fill
//             priority
//             className="object-cover object-[75%_50%]"
//           />
//           <div className="absolute inset-0 bg-gradient-to-r from-[#020617]/95 via-[#020617]/80 to-[#020617]/10" />
//         </div>

//         {/* Mobile hero */}
//         <div className="sm:hidden absolute inset-0">
//           <Image
//             src="/elf_plan-mobile.png"
//             alt="Christmas elf in a cosy living room office, planning lots of elf ideas on a corkboard"
//             fill
//             priority
//             className="object-cover object-top"
//           />
//           {/* Darker at the bottom so text is readable */}
//           <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/40 via-[#020617]/75 to-[#020617]/95" />
//         </div>
//       </div>

//       {/* Content on top */}
//       <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
//         <div className="max-w-2xl">
//           <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#1B7D43]/80">
//             Elf magic, without the mental load!
//           </p>

//           <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl md:text-5xl">
//             Wake up to Elf magic,
//             <span className="block text-[#1B7D43]">not parent panic.</span>
//           </h1>

//           <p className="mt-4 max-w-xl text-base text-slate-200/95 sm:text-lg">
//               Starting December 1st, I'll email every morning,  
//               you a complete setup up plan for that evening,
//               personalised to your kid, your energy, and your mess tolerance.
//               For just $14.99
//             </p>

//           <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:gap-4">
//             <button
//               type="button"
//               onClick={() => scrollToSection('mini-chat')}
//               className="inline-flex items-center justify-center rounded-xl bg-[#DD3A33] px-7 py-2.5 text-sm font-semibold text-white shadow-lg shadow-black/40 transition hover:bg-[#DD3A33]/70"
//             >
//               Chat about your plan
//             </button>

//           </div>

//           <div className="mt-3 flex flex-wrap items-start gap-2 text-[11px] font-medium text-slate-200/80">
//             <span>One-off $14.99 · Pay securely via PayPal</span>
//             <span className="hidden sm:inline">•</span>
//             <span>No subscriptions, no upsells</span>
//             <span className="hidden sm:inline">•</span>
//             <span>Tiny 2-minute ideas or big show-stoppers – you choose</span>
//           </div>
//         </div>
//       </div>
//     </section>
//   );
// }


// src/app/page.tsx
'use client';

import * as React from 'react';
import Image from 'next/image';
import { MiniChatSection } from '@/components/MiniChatSection';
import SiteFooter from '@/components/SiteFooter';

export default function HomePage() {
  // support clearing between test flows
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('clearMiniSession') === '1') {
      localStorage.removeItem('elf-mini-session-id');
      params.delete('clearMiniSession');
      const newUrl =
        window.location.pathname +
        (params.toString() ? `?${params.toString()}` : '');
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  const scrollToChat = React.useCallback(() => {
    const el = document.getElementById('mini-chat');
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      {/* global background glow */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(236,72,153,0.16),_transparent_55%)]" />
      </div>

      {/* HERO + CHAT WRAPPER */}
      <div className="mx-auto flex w-full max-w-6xl flex-col px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:pt-16">
        <HeroSection onChatClick={scrollToChat} />
        {/* chat overlaps the hero slightly on larger screens */}
        <div className="-mt-6 sm:-mt-10 lg:-mt-14">
          <MiniChatSection />
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}

type HeroProps = {
  onChatClick: () => void;
};

export function HeroSection({ onChatClick }: HeroProps) {
  return (
    <section className="relative mb-16 h-[420px] overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 sm:h-[460px] lg:h-[520px]">
      {/* background image */}
      <Image
        src="/elf_plan4.png"
        alt="Christmas elf helper planning December at a cosy desk"
        fill
        priority
        className="object-cover object-[75%_50%]"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#020617]/95 via-[#020617]/85 to-[#020617]/30" />

      {/* hero content */}
      <div className="relative z-10 flex h-full items-center px-5 py-6 sm:px-8">
        <div className="max-w-xl space-y-4 sm:space-y-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-300/80">
            Elf magic, without the mental load
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl lg:text-5xl">
            Wake up to Elf magic,
            <span className="block text-[#1B7D43]">not parent panic.</span>
          </h1>

          <p className="max-w-lg text-sm text-slate-200/95 sm:text-base">
            Tell Merry the Elf about your kids in a quick chat and she’ll brew a
            personalised 24-night Elf plan that fits your energy, your mess
            tolerance and your kid’s obsessions.
          </p>

          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:gap-4">
            <button
              type="button"
              onClick={onChatClick}
              className="inline-flex items-center justify-center rounded-full bg-[#DD3A33] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-black/40 transition hover:bg-[#e35b56]"
            >
              Start chatting with Merry
            </button>

            <p className="text-[11px] text-slate-300 sm:text-xs">
              One-off $14.99 · Pay securely via PayPal · No subscriptions
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
