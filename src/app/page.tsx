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


const DESKTOP_HERO_SRC =
  'https://img.dashhub.cc/nanobanana/1764354013733-0zj22bj54ekf.png';
const MOBILE_HERO_SRC =
  'https://img.dashhub.cc/nanobanana/1764354013733-0zj22bj54ekf.png'; // or your mobile-specific asset

export function HeroSection({ onChatClick }: HeroProps) {
  return (
    <section
      className="
        relative mb-16 overflow-hidden
        rounded-3xl border border-slate-800
        bg-slate-950 shadow-[0_24px_80px_rgba(15,23,42,0.9)]
        h-[520px] sm:h-[460px] lg:h-[520px]   /* 👈 taller on mobile */
      "
    >
      {/* Background images */}
      <div className="absolute inset-0">
        {/* Desktop / tablet */}
        <div className="hidden sm:block absolute inset-0">
          <Image
            src={DESKTOP_HERO_SRC}
            alt="Merry the Elf planning a detailed December Elf plan on a corkboard"
            fill
            priority
            className="object-cover object-center"
          />
        </div>

        {/* Mobile */}
        <div className="sm:hidden absolute inset-0">
          <Image
            src={MOBILE_HERO_SRC}
            alt="Merry the Elf planning December Elf magic in a cosy room"
            fill
            priority
            // 👇 focus slightly below the very top so headline + Merry both fit
            className="object-cover object-[50%_30%]"
          />
          {/* Gentle darken at the bottom for the CTA */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#020617]/40 to-[#020617]/90" />
        </div>
      </div>

      {/* Bottom-left CTA area */}
      <div className="relative z-10 flex h-full items-end">
        <div className="w-full px-5 pb-7 sm:px-8 sm:pb-7 lg:pb-9">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
            <button
              type="button"
              onClick={onChatClick}
              className="
                inline-flex items-center justify-center
                rounded-full bg-[#C93227] px-6 py-2.5
                text-sm font-semibold text-white
                shadow-lg shadow-black/40
                transition hover:bg-[#e35b56]
                max-w-[260px]          /* 👈 don’t span the whole width */
              "
            >
              Start chatting with Merry
            </button>

            <p className="text-[11px] text-slate-200/90 sm:text-xs">
              One-off $14.99 · Pay securely via PayPal · No subscriptions
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
