import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms & Conditions | Elf on the Shelf Helper',
  description:
    'Terms and conditions for using Elf on the Shelf Helper and purchasing Elf plans.',
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-16 md:py-24">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Terms &amp; Conditions
        </h1>
        <p className="mt-2 text-sm text-slate-400">Last updated: 15 November 2025</p>

        <section className="mt-8 space-y-4 text-sm leading-relaxed text-slate-200">
          <p>
            These Terms &amp; Conditions (&quot;Terms&quot;) govern your use of the{' '}
            <span className="font-medium">Elf on the Shelf Helper</span> website at{' '}
            <span className="font-mono text-slate-100">elfontheshelf.uk</span> and
            any Elf plans purchased through the site.
          </p>
          <p>
            By using this site or placing an order, you agree to these Terms. If
            you do not agree, please do not use the site or purchase a plan.
          </p>
        </section>

        <section className="mt-8 space-y-2 text-sm leading-relaxed text-slate-200">
          <h2 className="text-lg font-semibold text-slate-50">Who we are</h2>
          <p>
            Elf on the Shelf Helper is operated by{' '}
            <span className="font-medium">Kathryn Lamb</span>, a sole trader
            based in the United Kingdom.
          </p>
          <p className="text-slate-300">
            <span className="font-medium">Business name:</span> Elf on the Shelf
            Helper (sole trader)
            <br />
            <span className="font-medium">Address:</span> Manor House, Eaglescliffe,
            TS16 0QT, United Kingdom
            <br />
            <span className="font-medium">Contact email:</span>{' '}
            <a
              href="mailto:support@aigifts.org"
              className="text-emerald-300 underline underline-offset-2"
            >
    	support@aigifts.org
            </a>
          </p>
        </section>

        <section className="mt-8 space-y-2 text-sm leading-relaxed text-slate-200">
          <h2 className="text-lg font-semibold text-slate-50">
            Service description
          </h2>
          <p>
            Elf on the Shelf Helper provides a personalised 30-day Elf plan,
            including nightly setup ideas and short &quot;notes&quot; from your
            Elf, tailored to the details you provide (such as your child&apos;s
            first name, age range, start date and Elf vibe).
          </p>
          <p className="text-slate-300">
            Plans are delivered as:
          </p>
          <ul className="ml-5 list-disc space-y-1 text-slate-300">
            <li>An on-screen plan after checkout</li>
            <li>A downloadable, printer-friendly PDF</li>
            <li>An email copy of the full plan</li>
            <li>
              Optional nightly reminder emails (if you choose to receive them)
            </li>
          </ul>
        </section>

        <section className="mt-8 space-y-2 text-sm leading-relaxed text-slate-200">
          <h2 className="text-lg font-semibold text-slate-50">Pricing &amp; payment</h2>
          <p>
            The current price for a 30-day Elf plan is clearly shown on the
            checkout button (e.g. <span className="font-medium">£9</span>). This
            is a <span className="font-medium">one-off payment</span> for a
            single personalised plan. There is no subscription.
          </p>
          <p className="text-slate-300">
            Payments are processed securely by{' '}
            <span className="font-medium">Stripe</span>. Your card information is
            handled by Stripe and not stored by me.
          </p>
        </section>

        <section className="mt-8 space-y-2 text-sm leading-relaxed text-slate-200">
          <h2 className="text-lg font-semibold text-slate-50">
            Refunds &amp; &quot;not for us&quot; promise
          </h2>
          <p>
            I want this to be genuinely helpful for you. If, after purchasing,
            you feel the plan is not a good fit for your family, you can request
            a refund within <span className="font-medium">14 days</span> of your
            purchase.
          </p>
          <p className="text-slate-300">
            To request a refund, simply reply to your plan email or contact me at{' '}
            <a
              href="mailto:support@aigifts.org"
              className="text-emerald-300 underline underline-offset-2"
            >
	support@aigifts.org
            </a>{' '}
            with your order details. Refunds are processed to the original
            payment method where possible.
          </p>
        </section>

        <section className="mt-8 space-y-2 text-sm leading-relaxed text-slate-200">
          <h2 className="text-lg font-semibold text-slate-50">
            Digital content &amp; access
          </h2>
          <p>
            Your Elf plan is a digital product. Once payment is complete, you
            will be redirected to the site to view your plan and download the
            PDF. A copy is also emailed to you.
          </p>
          <p className="text-slate-300">
            Please download and save your plan for your own records. While I aim
            to keep plans available, I cannot guarantee permanent storage or
            access in all circumstances.
          </p>
        </section>

        <section className="mt-8 space-y-2 text-sm leading-relaxed text-slate-200">
          <h2 className="text-lg font-semibold text-slate-50">
            Fair use &amp; personal use only
          </h2>
          <p>
            Your purchase is for <span className="font-medium">personal use</span>{' '}
            in your own household. You may print your plan and reuse ideas in
            future years, but you must not resell, redistribute, or publish the
            plan or its contents as your own product.
          </p>
        </section>

        <section className="mt-8 space-y-2 text-sm leading-relaxed text-slate-200">
          <h2 className="text-lg font-semibold text-slate-50">
            Nightly reminder emails
          </h2>
          <p>
            As an optional extra, you can choose to receive nightly reminder
            emails with that evening&apos;s Elf setup. You can unsubscribe from
            these at any time using the link in the email or by contacting me.
          </p>
        </section>

        <section className="mt-8 space-y-2 text-sm leading-relaxed text-slate-200">
          <h2 className="text-lg font-semibold text-slate-50">
            Availability &amp; changes
          </h2>
          <p>
            I try to keep the site available and running smoothly, but I cannot
            guarantee uninterrupted access. I may update or change the service
            from time to time, for example to improve the plans or fix issues.
          </p>
          <p className="text-slate-300">
            I may also update these Terms occasionally. When I do, I will change
            the &quot;Last updated&quot; date at the top of this page. If the
            changes are significant, I may also let you know by email.
          </p>
        </section>

        <section className="mt-8 space-y-2 text-sm leading-relaxed text-slate-200">
          <h2 className="text-lg font-semibold text-slate-50">
            Liability &amp; disclaimers
          </h2>
          <p>
            The Elf ideas are suggestions only. You are responsible for ensuring
            that any setups you use are safe and appropriate for your home and
            your child. Always supervise children around small objects,
            breakable items, food, or anything that could pose a risk.
          </p>
          <p className="text-slate-300">
            To the extent permitted by law, I am not liable for any indirect or
            consequential loss arising from use of the site or plans. Nothing in
            these Terms limits your statutory rights under UK consumer law.
          </p>
        </section>

        <section className="mt-8 space-y-2 text-sm leading-relaxed text-slate-200">
          <h2 className="text-lg font-semibold text-slate-50">
            Governing law
          </h2>
          <p>
            These Terms are governed by the laws of England and Wales. Any
            disputes will be subject to the exclusive jurisdiction of the courts
            of England and Wales.
          </p>
        </section>

        <section className="mt-8 space-y-2 text-sm leading-relaxed text-slate-200">
          <h2 className="text-lg font-semibold text-slate-50">Contact</h2>
          <p>
            If you have any questions about these Terms or your order, please
            contact:
          </p>
          <p className="text-slate-300">
            Kathryn Lamb
            <br />
            Manor House, Eaglescliffe, TS16 0QT, United Kingdom
            <br />
            Email:{' '}
            <a
              href="mailto:support@aigifts.org"
              className="text-emerald-300 underline underline-offset-2"
            >
 	support@aigifts.org
            </a>
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
