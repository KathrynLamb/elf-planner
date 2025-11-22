// src/app/page.tsx
'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  MessageCircle,
  ShieldCheck,
} from 'lucide-react';
import { ElfCheckoutButton } from '@/components/ElfCheckoutButton';

import { GeneratePlanButton } from '@/components/GeneratePlanButton';

export default function HomePage() {

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('clearMiniSession') === '1') {
      localStorage.removeItem('elf-mini-session-id');
      params.delete('clearMiniSession');
      const newUrl = window.location.pathname + '?' + params.toString();
      window.history.replaceState({}, '', newUrl);
    }
  }, []);
  
  return (
    // <main className="min-h-screen bg-slate-950 text-slate-50">
    //   {/* Subtle background glow */}
    //   <div className="pointer-events-none fixed inset-0 -z-10">
    //     <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(236,72,153,0.16),_transparent_55%)]" />
    //   </div>

    <main className="min-h-screen bg-slate-950 text-slate-50">

    {/* Subtle background glow */}
    <div className="pointer-events-none fixed inset-0 -z-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(236,72,153,0.16),_transparent_55%)]" />
    </div>

      {/* <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-10 pt-10 md:pt-16"> */}
        <HeroSection />
        <MiniChatSection />
        <HowItWorksSection />

        {/* <AiPreviewSection /> */}
        <WhatYouGetSection />
        <SocialProofSection />
        <FaqSection />
        <SiteFooter />
      {/* </div> */}
    </main>
  );
}

// export function HeroSection() {
//   // simple helper to smooth-scroll to a section by id
//   function scrollToSection(id: string) {
//     const el = document.getElementById(id);
//     if (!el) return;
//     el.scrollIntoView({ behavior: 'smooth', block: 'start' });
//   }
  
//     return (
//       <section
//         className="relative bg-cover bg-center bg-no-repeat min-h-screen"
//         style={{ backgroundImage: "url('/bg1.png')" }}
//       >
//         {/* Dark festive overlay so text stays readable */}
//         {/* <div className="absolute inset-0 bg-[rgba(0,0,0,0.55)] backdrop-blur-[1px]" /> */}

//         <AuthButtons />
  
//         <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:flex-row lg:items-center">
//           {/* Left: copy */}
//           <div className="flex-1 text-center lg:text-left">
//             <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-300 drop-shadow">
//               Elf-on-the-Shelf, without the mental load
//             </p>
  
//             <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white drop-shadow-lg sm:text-4xl md:text-5xl">
//               Wake up to Elf magic,
//               <span className="block text-[#f4d27a] drop-shadow-[0_0_8px_rgba(0,0,0,0.4)]">
//                 not parent panic.
//               </span>
//             </h1>
  
//             <p className="mt-4 max-w-xl text-base text-slate-200 sm:text-lg drop-shadow">
//               Every evening, Merry emails you a simple, personalised Elf-on-the-Shelf
//               setup to do after bedtime – plus a tiny note for your child to discover in
//               the morning. Built for knackered parents, kind to sensitive kids, and
//               tailored to your time, mess tolerance, and family traditions.
//             </p>
  
//             <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row sm:justify-start sm:gap-4">
//               <button
//                 type="button"
//                 onClick={() => scrollToSection('mini-chat')}
//                 className="inline-flex items-center justify-center rounded-full bg-[#d43c2f] hover:bg-[#bf3328] px-7 py-2.5 text-sm font-semibold text-white shadow-lg shadow-black/40 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f4d27a]"
//               >
//                 Meet Merry &amp; get your plan
//               </button>
  
//               <button
//                 type="button"
//                 onClick={() => scrollToSection('what-you-get')}
//                 className="text-sm font-medium text-slate-200 underline-offset-4 hover:underline"
//               >
//                 See a sample night
//               </button>
//             </div>
  
//             <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[11px] font-medium text-slate-300 sm:justify-start drop-shadow">
//               <span>One-off £9 · Pay securely via PayPal</span>
//               <span className="hidden sm:inline">•</span>
//               <span>No subscriptions, no upsells</span>
//               <span className="hidden sm:inline">•</span>
//               <span>Tiny 2-minute ideas or big show-stoppers – you choose</span>
//             </div>
//           </div>
  

    
//         </div>
//       </section>
//     );
//   }
export function HeroSection() {
  function scrollToSection(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <section
      className="relative overflow-hidden"
      style={{
        backgroundImage: "url('/bg_blend.png')",
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right center',
        backgroundColor: '#020617', // fallback midnight navy
      }}
    >
      {/* Fade to midnight sky on the left for text */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#020617] via-[#020617] to-transparent" />

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:flex-row lg:items-center">
        {/* LEFT: copy */}
        <div className="flex-1 text-center lg:text-left">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-300/80">
            Elf-on-the-Shelf, without the mental load
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl md:text-5xl">
            Wake up to Elf magic,
            <span className="block text-emerald-300">not parent panic.</span>
          </h1>

          <p className="mt-4 max-w-xl text-base text-slate-200/95 sm:text-lg">
            Every evening, Merry emails you a simple, personalised Elf-on-the-Shelf
            setup to do after bedtime – plus a tiny note for your child to discover
            in the morning. Built for knackered parents, kind to sensitive kids, and
            tailored to your time, mess tolerance, and family traditions.
          </p>

          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row sm:justify-start sm:gap-4">
            <button
              type="button"
              onClick={() => scrollToSection('mini-chat')}
              className="inline-flex items-center justify-center rounded-full bg-[#d43c2f] px-7 py-2.5 text-sm font-semibold text-white shadow-lg shadow-black/40 transition hover:bg-[#bf3328]"
            >
              Meet Merry and get your plan
            </button>

            <button
              type="button"
              onClick={() => scrollToSection('what-you-get')}
              className="text-sm font-medium text-slate-100 underline-offset-4 hover:underline"
            >
              See a sample night
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[11px] font-medium text-slate-200/80 sm:justify-start">
            <span>One-off £9 · Pay securely via PayPal</span>
            <span className="hidden sm:inline">•</span>
            <span>No subscriptions, no upsells</span>
            <span className="hidden sm:inline">•</span>
            <span>Tiny 2-minute ideas or big show-stoppers – you choose</span>
          </div>
        </div>

        {/* RIGHT: video */}
        <div className="flex-1 flex justify-center">
          <div className="relative w-full max-w-sm">
            {/* subtle glow around the video card */}
            <div className="pointer-events-none absolute -inset-[3px] rounded-[32px] bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.55),transparent_55%),radial-gradient(circle_at_bottom,rgba(52,211,153,0.5),transparent_55%)] opacity-80" />

            <div className="relative rounded-[30px] overflow-hidden bg-[#020617]/70 backdrop-blur-[1px] shadow-[0_25px_80px_rgba(0,0,0,0.9)]">
              <video
                className="block h-full w-full object-cover"
                src="/elf_vid.mp4"
                autoPlay
                muted
                loop
                playsInline
                // poster="/elf-hero-poster.jpg"
              />
            </div>
          </div>
        </div>
      </div>

      <p className="relative z-10 mt-2 pb-6 text-center text-[11px] text-slate-300/80">
        A real example of the Merry-style Elf you’ll meet in your plan.
      </p>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      number: '1',
      title: 'Tell us about your Elf & kiddo',
      body: 'Share your child’s name, age range, dates, and the Elf “vibe” you want – silly, calm, or kind. Add any big worries (bedtime, monsters, school nerves) so we can keep the magic gentle.',
    },
    {
      number: '2',
      title: 'Merry conjures your plan with AI',
      body: 'Our Elf helper uses your answers to spin up 30 nights of ideas, setups and ready-to-use notes in Elf voice, all tuned to your child and your energy levels.',
    },
    {
      number: '3',
      title: 'Unlock the full plan with PayPal',
      body: 'Preview a mini plan for free. When you’re ready, pay securely via PayPal to unlock your full 30-night plan, view it online, or download a printer-friendly PDF.',
    },
  ];

  return (
    <section
      id="how-it-works"
      className="space-y-6 rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 md:p-10"
    >
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-slate-50 md:text-2xl">
          How it works in about three minutes
        </h2>
        <p className="max-w-2xl text-sm text-slate-300">
          Designed for one-handed, late-night parents. No crafting degree
          required, no 3am panic scrolls on Pinterest.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {steps.map((step) => (
          <div
            key={step.number}
            className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400/15 text-xs font-semibold text-emerald-300">
                {step.number}
              </div>
              <h3 className="text-sm font-semibold text-slate-50">
                {step.title}
              </h3>
            </div>
            <p className="text-xs text-slate-300">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function AiPreviewSection() {
  return (
    <section
      id="ai-preview"
      className="grid gap-10 rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 md:grid-cols-2 md:p-10"
    >
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-50 md:text-2xl">
          Chat to Merry for a free mini Elf plan
        </h2>
        <p className="text-sm text-slate-300">
          Before you buy anything, you can chat to our Elf helper like a cosy
          hotline. Share your chaos level, your kid’s vibe, and what December
          actually looks like for you – and Merry will sketch out a little taste
          of your Elf month.
        </p>
        <ul className="space-y-2 text-sm text-slate-300">
          <li className="flex items-start gap-2">
            <MessageCircle className="mt-0.5 h-4 w-4 text-emerald-300" />
            <span>See 2–3 sample nights tailored to your child.</span>
          </li>
          <li className="flex items-start gap-2">
            <MessageCircle className="mt-0.5 h-4 w-4 text-emerald-300" />
            <span>Get a feel for Merry’s tone and Elf notes.</span>
          </li>
          <li className="flex items-start gap-2">
            <MessageCircle className="mt-0.5 h-4 w-4 text-emerald-300" />
            <span>Only pay if you want the full 30-night plan.</span>
          </li>
        </ul>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <a
            href="#top"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-400/30 transition hover:bg-emerald-300"
          >
            Start my free mini plan
            <ArrowRight className="h-4 w-4" />
          </a>
          <p className="text-xs text-slate-400">
            No login required. We’ll only ask for email when you want to save or
            buy your plan.
          </p>
        </div>
      </div>

      {/* Chat mockup */}
      <div className="relative">
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-emerald-400/40 via-sky-400/30 to-pink-400/40 opacity-80 blur-2xl" />
        <div className="relative rounded-3xl border border-slate-800 bg-slate-950/90 p-4 text-xs text-slate-100 shadow-[0_20px_70px_rgba(0,0,0,0.75)]">
          <header className="mb-3 flex items-center justify-between rounded-2xl bg-slate-900/90 px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-red-400 to-rose-500" />
              <div>
                <p className="text-xs font-semibold">Merry the Elf</p>
                <p className="text-[10px] text-emerald-300">Typing…</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[9px] text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Live preview
            </div>
          </header>

          <div className="space-y-2">
            <ElfBubble>
              Ho ho hello! I’m Merry, your low-mess Elf helper. Tell me your
              kiddo’s name, age, and how much energy you actually have this
              December. 🎄
            </ElfBubble>
            <ParentBubble>
              She’s Sophia, 6. We’re excited but exhausted and I need
              5-minute-max setups on school nights.
            </ParentBubble>
            <ElfBubble>
              Got it! Here’s a sneak peek at Sophia’s Elf December:
              <ul className="mt-1 list-disc pl-4">
                <li>
                  <span className="font-semibold">Night 1 – Hello, Sophia!</span>{' '}
                  Elf arrives with a tiny note and a cocoa sachet for you to
                  share.
                </li>
                <li>
                  <span className="font-semibold">Night 3 – Book Buddy</span> –
                  Elf hugs her favourite bedtime book, inviting a cosy read.
                </li>
                <li>
                  <span className="font-semibold">Night 6 – Sock Surprise</span>{' '}
                  – Elf peeks out of a spare sock in her drawer with a silly
                  rhyme.
                </li>
              </ul>
              Want me to spin the full 30-night plan?
            </ElfBubble>
          </div>
        </div>
      </div>
    </section>
  );
}

function ElfBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[90%] rounded-2xl bg-slate-800/80 px-3 py-2 text-[11px] text-slate-50">
      {children}
    </div>
  );
}

function ParentBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl bg-emerald-400/90 px-3 py-2 text-[11px] text-slate-950">
        {children}
      </div>
    </div>
  );
}

function WhatYouGetSection() {
  const items = [
    {
      title: 'Tonight’s plan in your inbox',
      body: 'Every evening Merry emails you a clear, step-by-step Elf setup for tonight – plus what your child will discover in the morning. No more lying in bed thinking “oh god, I forgot the elf.”',
    },
    {
      title: 'Up to 30 mornings of Elf magic',
      body: 'From arrival to Christmas Eve, Merry keeps the story going with fresh, non-repeating ideas so your kids wake up to something new each morning.',
    },
    {
      title: 'Truly personalised to your family',
      body: 'Merry learns your child’s name, age, passions, worries, siblings, birthdays and Elf “vibe”, then weaves them into the notes and setups so it feels like their Elf – not a generic list from Pinterest.',
    },
    {
      title: 'Fits your energy and mess tolerance',
      body: 'Tell Merry if you want tiny 2-minute ideas, quick 5-minute setups, or big weekend show-stoppers. You’ll always get low-mess options using things you already have, plus an emergency “I’m exhausted” fallback idea.',
    },
    {
      title: 'Kind, gentle Elf behaviour',
      body: 'Choose whether your Elf is a gentle guardian, classic Santa helper, or kindness-only Elf. No creepy “spying”, no guilt trips – just cozy, confidence-building moments for your child.',
    },
    {
      title: 'One simple price',
      body: 'Your whole month of personalised Elf plans and nightly reminder emails for £9, paid securely via PayPal. No subscriptions, no upsells, no faff.',
    },
  ];

  return (
    <section
      id="what-you-get"
      className="space-y-6 rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 md:p-10"
    >
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-slate-50 md:text-2xl">
          What you get for £9
        </h2>
        <p className="max-w-2xl text-sm text-slate-300">
          Everything you need for a magical, manageable Elf season – and
          nothing that’ll have you cursing at 11.30pm.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.title}
            className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-5"
          >
            <h3 className="text-sm font-semibold text-slate-50">
              {item.title}
            </h3>
            <p className="text-xs text-slate-300">{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SocialProofSection() {
  return (
    <section className="space-y-6 rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 md:p-10">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-slate-50 md:text-2xl">
          Made for real families, not Pinterest
        </h2>
        <p className="max-w-2xl text-sm text-slate-300">
          Elf Planner is for parents who still want the magic, but also want to
          sleep. Whether you’re juggling shift work, homework battles, or
          sensitive kiddos, Merry can adapt your plan.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <PillCard title="Busy working parents">
          Brain fried by 9pm? Let the plan do the thinking so you can just set
          it up and sleep.
        </PillCard>
        <PillCard title="Families with more than one child">
          Keep things fair with ideas that work for siblings and avoid the “I
          wanted a turn!” drama.
        </PillCard>
        <PillCard title="Sensitive or anxious kids">
          Choose calmer, kinder ideas so the magic feels cosy and safe rather
          than overwhelming.
        </PillCard>
      </div>
    </section>
  );
}

function PillCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-5 text-sm text-slate-300">
      <h3 className="text-sm font-semibold text-slate-50">{title}</h3>
      <p className="text-xs text-slate-300">{children}</p>
    </div>
  );
}

function FaqSection() {
  const faqs = [
    {
      q: 'Do I need a printer?',
      a: 'No. You can keep your plan as a link on your phone, email it to yourself, or download a PDF if you like paper. Printing is optional.',
    },
    {
      q: 'Can I use this plan for more than one child?',
      a: 'Yes. One purchase = one personalised plan. You can tell Merry about siblings and we’ll write ideas that work for more than one child.',
    },
    {
      q: 'What if I miss a night?',
      a: 'Life happens. Your plan is flexible – you can skip nights, shuffle ideas around, or double up on a weekend and the magic still works.',
    },
    {
      q: 'When do I pay?',
      a: 'You can chat to Merry and see a free mini preview first. You only pay via PayPal when you decide to unlock your full 30-night plan.',
    },
    {
      q: 'Is this just a generic list?',
      a: 'No. The plan is generated based on your child’s age, Elf vibe, dates and your energy level, so no two plans are exactly the same.',
    },
    {
      q: 'Can I reuse it next year?',
      a: 'You’re welcome to keep your plan, but kids grow fast! Next year you can generate a fresh plan that fits their new age and interests.',
    },
  ];

  return (
    <section
      id="faq"
      className="space-y-6 rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 md:p-10"
    >
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-slate-50 md:text-2xl">
          Questions parents often ask
        </h2>
        <p className="max-w-2xl text-sm text-slate-300">
          If you’re still on the fence, these might help. Or just start a free
          mini plan and see how it feels.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {faqs.map((item) => (
          <div
            key={item.q}
            className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5"
          >
            <h3 className="text-sm font-semibold text-slate-50">{item.q}</h3>
            <p className="mt-2 text-xs text-slate-300">{item.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="flex flex-col items-start justify-between gap-4 border-t border-slate-800 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center">
      <p>© {new Date().getFullYear()} Elf Planner. Made for knackered parents.</p>
      <div className="flex flex-wrap gap-4">
        <span className="text-slate-500">Secure checkout with PayPal.</span>
        <Link href="#faq" className="hover:text-slate-300">
          FAQs
        </Link>
      </div>
    </footer>
  );
}
export function MiniChatSection() {
  type ChatMessage = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
  };

  const [sessionId] = React.useState(() => {
    if (typeof window === 'undefined') return '';
    const existing = window.localStorage.getItem('elf-mini-session-id');
    if (existing) return existing;
    const id = crypto.randomUUID();
    window.localStorage.setItem('elf-mini-session-id', id);
    return id;
  });

  const childName = 'your child';
  const ageRange = '4–7 years';
  const startDate = new Date().toISOString().slice(0, 10);
  const vibe: 'silly' | 'kind' | 'calm' = 'silly';

  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: 'm-1',
      role: 'assistant',
      content:
        "Ho ho hello! I’m Merry, your December Elf helper. 🎄",
    },
  ]);

  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [hasPreview, setHasPreview] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);

  const latestAssistant = messages.filter((m) => m.role === 'assistant').at(-1);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `m-${Date.now()}`,
      role: 'user',
      content: input.trim(),
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);
    setError(null);
    setIsExpanded(false);

    try {
      const res = await fetch('/api/elf-mini-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          messages: newHistory.map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!res.ok) throw new Error('Something went wrong. Please try again.');
      const data = await res.json();

      const assistantMessage: ChatMessage = {
        id: `m-${Date.now()}-a`,
        role: 'assistant',
        content: data.reply,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setHasPreview(true);
    } catch (err: any) {
      setError(
        err?.message ||
          'Oops, the North Pole wifi dropped. Please try again in a moment.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
<section
  id="mini-chat"
  className="
    relative min-h-screen w-full flex items-center justify-center
    px-4 sm:px-6 lg:px-8"
    style={{ backgroundImage: "url('/bg_blend.png')" }}
    
>
  {/* Soft festive edges */}
  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,226,150,0.12),transparent_70%)]" />
  <div className="pointer-events-none absolute inset-0 bg-[url('/bg_blend.png')] bg-cover bg-center opacity-[0.18]" />

  <div className="relative w-full max-w-3xl mx-auto text-center py-16">
    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white drop-shadow-lg">
      Try a free mini chat with Merry
    </h2>

    <p className="mt-4 max-w-xl mx-auto text-slate-200 leading-relaxed">
      Type one or two sentences about your kid and Merry will sketch a tiny preview of a few Elf mornings she’d plan just for you.
    </p>

    {/* CHAT CARD */}
    <div className="relative mt-10 w-full max-w-2xl mx-auto">
      <div className="absolute -inset-4 rounded-[30px] bg-red-500/20 blur-2xl" />

      <div className="relative rounded-[28px] bg-black/20 backdrop-blur-xl border border-white/10 px-6 py-8 shadow-[0_25px_80px_rgba(0,0,0,0.7)]">

        {/* Assistant bubble */}
        {latestAssistant && (
          <div className="rounded-2xl bg-white/10 px-5 py-4 text-left text-[15px] leading-relaxed text-slate-100 border border-white/10 shadow-inner">
            <p className={isExpanded ? "" : "max-h-40 overflow-hidden relative"}>
              {latestAssistant.content}
            </p>

            {!isExpanded && latestAssistant.content.length > 260 && (
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
            )}

            {latestAssistant.content.length > 260 && (
              <button
                type="button"
                onClick={() => setIsExpanded((v) => !v)}
                className="mt-2 text-xs font-medium text-yellow-300 hover:underline"
              >
                {isExpanded ? "Show less" : "Show full preview"}
              </button>
            )}
          </div>
        )}

        {/* User bubble */}
        {messages.filter((m) => m.role === "user").length > 0 && (
          <div className="mt-4 flex justify-end">
            <div className="rounded-2xl bg-yellow-300 px-5 py-3 text-right text-[14px] text-slate-900 shadow-lg shadow-yellow-300/40">
              {messages.filter((m) => m.role === "user").at(-1)?.content}
            </div>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSend} className="mt-6 flex gap-3">
          <input
            className="
              flex-1 rounded-full 
              bg-white/10 border border-white/20 
              px-4 py-3 
              text-sm text-white placeholder:text-slate-300
              focus:border-yellow-300 focus:ring-1 focus:ring-yellow-300 focus:outline-none
            "
            placeholder="Tell Merry about your kid and December…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="
              rounded-full bg-green-300 px-6 py-3
              text-sm font-semibold text-white shadow-lg shadow-yellow-300/40
              hover:bg-green-200 transition
              disabled:bg-green-600

            "
          >
            {isLoading ? "Sending…" : "Send"}
          </button>
        </form>

        {/* Upsell */}
        {hasPreview && (
          <div className="mt-6 rounded-2xl border border-yellow-300/30 bg-yellow-300/10 p-4 text-left text-sm text-slate-100 backdrop-blur-md">
            <p className="mb-1 font-semibold text-yellow-200">Like this vibe?</p>
            <p className="mb-2 text-slate-200">
              Let Merry plan the whole Elf season for you.
            </p>

            <GeneratePlanButton
                sessionId={sessionId} 
            />
          </div>
        )}
      </div>
    </div>
  </div>
</section>

  );
}
