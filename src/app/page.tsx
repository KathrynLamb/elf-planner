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

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      {/* Subtle background glow */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(236,72,153,0.16),_transparent_55%)]" />
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-24 px-4 pb-20 pt-10 md:pt-16">
        <HeroSection />
        <HowItWorksSection />
        <MiniChatSection />
        {/* <AiPreviewSection /> */}
        <WhatYouGetSection />
        <SocialProofSection />
        <FaqSection />
        <SiteFooter />
      </div>
    </main>
  );
}

function HeroSection() {
  return (
    <section
      id="top"
      className="grid items-center gap-12 rounded-3xl border border-slate-800/70 bg-slate-900/60 p-6 shadow-[0_0_60px_rgba(15,23,42,0.8)] md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:p-10"
    >
      <div className="space-y-6">
        <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
          <Sparkles className="h-3 w-3" />
          Elf Planner
        </p>

        <div className="space-y-3">
          <h1 className="text-balance text-3xl font-semibold leading-tight text-slate-50 sm:text-4xl md:text-5xl">
            30 nights of Elf-on-the-Shelf magic,
            <span className="block text-emerald-300">
              planned for tired grown-ups.
            </span>
          </h1>
          <p className="max-w-xl text-pretty text-sm text-slate-200/80 sm:text-base">
            Merry the Elf (our friendly AI) chats with you like a cosy hotline,
            then conjures a personalised 30-night Elf plan for your child:
            simple nightly setups, tiny notes you can copy-paste, and almost no
            weekday mess.
          </p>
        </div>

        <div className="space-y-3 text-sm text-slate-300">
          <p>Here’s how it works:</p>
          <ul className="space-y-1 text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" />
              <span>
                Chat to Merry for a free mini preview of your Elf December.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" />
              <span>
                Love it? Unlock your full 30-night plan instantly with secure
                PayPal checkout.
              </span>
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <a
            href="#ai-mini-chat"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-400/30 transition hover:bg-emerald-300"
          >
            Get a free mini Elf plan
            <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href="#how-it-works"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-700 bg-slate-900/60 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-900"
          >
            See how it works
          </a>
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" />
            <span>Plan ready in about 2–3 minutes</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
            <span>Secure PayPal checkout</span>
          </div>
        </div>
      </div>

      <div className="relative flex items-center justify-center">
        {/* Glow behind elf */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_30%_20%,rgba(52,211,153,0.4),transparent_55%),radial-gradient(circle_at_80%_80%,rgba(59,130,246,0.35),transparent_55%)] opacity-80" />
        <div className="relative w-full max-w-xs rounded-3xl bg-gradient-to-b from-slate-900/80 via-slate-900 to-slate-900/90 p-4 shadow-[0_30px_80px_rgba(15,23,42,0.9)]">
          <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950">
            <Image
              src="/elf-pose.png"
              alt="Cheeky Elf on the Shelf posing on a stool"
              width={800}
              height={1200}
              className="h-auto w-full object-cover"
              priority
            />
          </div>
          <div className="mt-4 space-y-1 text-xs text-slate-300">
            <p className="font-medium text-emerald-300">
              Meet Merry, your Elf planner.
            </p>
            <p>
              Your Elf’s “face” on the site – friendly, cheeky, and here to
              help you fake being the organised one.
            </p>
          </div>
        </div>
      </div>
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
      title: '30 Elf setups',
      body: 'Simple, low-prep ideas that mostly use things you already have at home – plus optional weekend “big” nights.',
    },
    {
      title: '30 Elf notes in Elf voice',
      body: 'Short, playful messages written in a warm, gentle Elf tone. Copy-paste or tweak – no staring at a blank page.',
    },
    {
      title: 'Personalised to your child',
      body: 'We weave in their name, age range, worries and Elf vibe so it feels like their Elf, not a generic list.',
    },
    {
      title: 'Instant access, any device',
      body: 'View your plan online, email it to yourself, or download a clean, printer-friendly PDF.',
    },
    {
      title: 'Built for knackered parents',
      body: 'Ideas that take minutes to set up and don’t assume you have a Cricut, a glue gun, and unlimited glitter.',
    },
    {
      title: 'One simple price',
      body: 'Full 30-night personalised plan for £9, paid securely via PayPal. No subscriptions, no upsells.',
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

function MiniChatSection() {
  // 👉 For now, use a generated sessionId and some defaults.
  // Later you can replace these with real values from your hero form / context.

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
  

  const childName = 'your child';        // TODO: wire up real child name
  const ageRange = '4–6 years';          // TODO: real age range
  const startDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const vibe: 'silly' | 'kind' | 'calm' = 'silly';

  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: 'm-1',
      role: 'assistant',
      content:
        "Ho ho hello! I’m Merry, your low-mess Elf helper. Tell me your kiddo’s name, age, and what December feels like for your family – I’ll sketch a tiny preview of your Elf month. 🎄",
    },
  ]);
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [hasPreview, setHasPreview] = React.useState(false); // ← triggers CTA

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

    try {
      const res = await fetch('/api/elf-mini-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          messages: newHistory.map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!res.ok) {
        throw new Error('Something went wrong. Please try again in a sec.');
      }

      const data = await res.json();

      const assistantMessage: ChatMessage = {
        id: `m-${Date.now()}-a`,
        role: 'assistant',
        content: data.reply,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setHasPreview(true); // ← show CTA once we’ve given at least one preview
    } catch (err: any) {
      console.error(err);
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
      id="ai-mini-chat"
      className="grid gap-8 rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:p-10"
    >
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-50 md:text-2xl">
          Try a free mini chat with Merry
        </h2>
        <p className="text-sm text-slate-300">
          Tell Merry about your child and your energy levels, and she’ll conjure
          a short, personalised snippet of your 30-night plan. If you like the
          feel of it, you can unlock the full plan for £9 with PayPal.
        </p>
        <ul className="space-y-2 text-sm text-slate-300">
          <li className="flex items-start gap-2">
            <MessageCircle className="mt-0.5 h-4 w-4 text-emerald-300" />
            <span>Get 2–3 sample Elf nights tailored to your kid.</span>
          </li>
          <li className="flex items-start gap-2">
            <MessageCircle className="mt-0.5 h-4 w-4 text-emerald-300" />
            <span>See the exact style of Elf notes you’ll receive.</span>
          </li>
          <li className="flex items-start gap-2">
            <MessageCircle className="mt-0.5 h-4 w-4 text-emerald-300" />
            <span>Only pay if you want the complete 30-night plan.</span>
          </li>
        </ul>

        <p className="mt-3 text-xs text-slate-400">
          Tip: For the best preview, mention your child’s name, age range, and
          anything they’re worried about (monsters, school, bedtime, etc.)
        </p>
      </div>

      {/* Chat UI + CTA */}
      <div className="relative">
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-emerald-400/40 via-sky-400/30 to-pink-400/40 opacity-70 blur-2xl" />
        <div className="relative flex h-full flex-col rounded-3xl border border-slate-800 bg-slate-950/95 p-4 text-xs text-slate-100 shadow-[0_20px_70px_rgba(0,0,0,0.8)]">
          <header className="mb-3 flex items-center justify-between rounded-2xl bg-slate-900/90 px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-red-400 to-rose-500" />
              <div>
                <p className="text-xs font-semibold">Merry the Elf</p>
                <p className="text-[10px] text-emerald-300">
                  {isLoading ? 'Thinking up ideas…' : 'Ask me anything about your Elf!'}
                </p>
              </div>
            </div>
            <span className="text-[9px] text-slate-400">
              Free preview · No login
            </span>
          </header>

          <div className="flex-1 space-y-2 overflow-y-auto rounded-2xl bg-slate-900/80 p-3">
            {messages.map((msg) =>
              msg.role === 'assistant' ? (
                <div
                  key={msg.id}
                  className="max-w-[90%] rounded-2xl bg-slate-800/80 px-3 py-2 text-[11px] text-slate-50"
                >
                  {msg.content}
                </div>
              ) : (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl bg-emerald-400/90 px-3 py-2 text-[11px] text-slate-950">
                    {msg.content}
                  </div>
                </div>
              )
            )}
            {messages.length === 1 && (
              <p className="text-[10px] italic text-slate-500">
                Try: “She’s Sophia, 6, loves silly jokes but can get nervous at
                bedtime. We’re exhausted and need 5-minute setups on school
                nights.”
              </p>
            )}
          </div>

          {error && (
            <p className="mt-2 text-[10px] text-rose-300">
              {error}
            </p>
          )}

          <form onSubmit={handleSend} className="mt-3 flex gap-2">
            <input
              className="flex-1 rounded-full border border-slate-700 bg-slate-900/70 px-3 py-2 text-[11px] text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
              placeholder="Type your message to Merry…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="inline-flex items-center justify-center gap-1 rounded-full bg-emerald-400 px-3 py-2 text-[11px] font-semibold text-slate-950 shadow-md shadow-emerald-400/30 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:shadow-none"
            >
              {isLoading ? 'Sending…' : 'Send'}
              {!isLoading && <ArrowRight className="h-3 w-3" />}
            </button>
          </form>

          {/* CTA: appears after first real preview */}
          {hasPreview && (
            <div className="mt-4 rounded-2xl border border-emerald-400/40 bg-emerald-400/5 p-3 text-[11px] text-slate-100">
              <p className="mb-2 text-[11px] font-semibold text-emerald-200">
                Ready for the full magic?
              </p>
              <p className="mb-2 text-[11px] text-slate-200">
                Unlock your personalised 30-night Elf plan with all the simple
                setups and Elf notes mapped out for you. View it on your phone
                or download a printer-friendly PDF.
              </p>
              <ul className="mb-3 list-disc space-y-1 pl-4 text-[11px] text-slate-300">
                <li>30 low-prep Elf setups that fit your energy levels</li>
                <li>30 ready-to-use Elf notes in a warm, gentle voice</li>
                <li>Instant access after a quick, secure PayPal checkout</li>
              </ul>
          
          <ElfCheckoutButton
                sessionId={sessionId}
                childName={childName}
                ageRange={ageRange}
                startDate={startDate}
                vibe={vibe}
                amount={9}
                currency="GBP"
                className="inline-flex w-full items-center justify-center gap-1 rounded-full bg-emerald-400 px-3 py-2 text-[11px] font-semibold text-slate-950 shadow-md shadow-emerald-400/30 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:shadow-none"
              />

            </div>
          )}
        </div>
      </div>
    </section>
  );
}


