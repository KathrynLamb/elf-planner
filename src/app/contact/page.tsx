import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Contact | Elf on the Shelf Helper',
  description:
    'Get in touch about your Elf on the Shelf Helper plan – questions, issues, or feedback.',
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-2xl px-4 py-16 md:py-24">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Contact
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Got a question about your Elf plan, payment, or anything else? I&apos;d
          love to help.
        </p>

        <section className="mt-8 space-y-4 text-sm leading-relaxed text-slate-200">
          <p>
            The fastest way to reach me is by email. I usually reply within 1–2
            business days, and often much quicker during Elf season.
          </p>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-200">
            <h2 className="text-base font-semibold text-slate-50">
              Email support
            </h2>
            <p className="mt-2 text-slate-300">
              <span className="font-medium">Email:</span>{' '}
              <a
                href="mailto:aigifts.org"
                className="text-emerald-300 underline underline-offset-2"
              >
         aigifts.org
              </a>
            </p>
            <p className="mt-2 text-xs text-slate-400">
              If you&apos;re getting in touch about an order, please include the
              email address you used at checkout and (if you have it) your Stripe
              receipt or order ID.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-200">
            <h2 className="text-base font-semibold text-slate-50">
              Postal address
            </h2>
            <p className="mt-2 text-slate-300">
              Kathryn Lamb
              <br />
              Manor House
              <br />
              Eaglescliffe
              <br />
              TS16 0QT
              <br />
              United Kingdom
            </p>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Elf on the Shelf Helper is a small one-person project, so there&apos;s
            no call centre – just a real human doing their best to make December
            easier for tired parents.
          </p>
        </section>

        <div className="mt-10">
          <Link
            href="/"
            className="text-sm text-emerald-300 underline underline-offset-2"
          >
            ← Back to Elf on the Shelf Helper
          </Link>
        </div>
      </div>
    </main>
  );
}
