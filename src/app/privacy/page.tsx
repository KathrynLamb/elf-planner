import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | Elf on the Shelf Helper',
  description:
    'Privacy Policy for Elf on the Shelf Helper – how we collect, use, and protect your information.',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-16 md:py-24">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-slate-400">Last updated: 15 November 2025</p>

        <section className="mt-8 space-y-4 text-sm leading-relaxed text-slate-200">
          <p>
            This Privacy Policy explains how I collect, use, and protect your
            personal information when you use{' '}
            <span className="font-medium">Elf on the Shelf Helper</span> at{' '}
            <span className="font-mono text-slate-100">elfontheshelf.uk</span>.
          </p>

          <p>
            By using this site and purchasing an Elf plan, you agree to the
            collection and use of information in accordance with this policy.
          </p>
        </section>

        <section className="mt-8 space-y-2 text-sm leading-relaxed text-slate-200">
          <h2 className="text-lg font-semibold text-slate-50">Who I am</h2>
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
              href="mailto:aigifts.org"
              className="text-emerald-300 underline underline-offset-2"
            >
                aigifts.org
            </a>
          </p>
        </section>

        <section className="mt-8 space-y-2 text-sm leading-relaxed text-slate-200">
          <h2 className="text-lg font-semibold text-slate-50">
            What information I collect
          </h2>
          <p>I collect and process the following information:</p>
          <ul className="ml-5 list-disc space-y-1 text-slate-300">
            <li>
              <span className="font-medium">Checkout information</span> – when you
              purchase an Elf plan, Stripe (my payment provider) collects your
              name, email address, billing details and card information. I do
              not see or store your full card details.
            </li>
            <li>
              <span className="font-medium">Elf plan details</span> – the
              child&apos;s name, age range, Elf start date and Elf vibe that you
              enter so I can generate your personalised plan.
            </li>
            <li>
              <span className="font-medium">Email address</span> – used to send
              your full plan and, if you opt in, nightly reminder emails.
            </li>
            <li>
              <span className="font-medium">Technical information</span> – basic
              logs and usage data such as IP address, browser type, and pages
              visited, which help keep the service secure and improve it.
            </li>
          </ul>
        </section>

        <section className="mt-8 space-y-2 text-sm leading-relaxed text-slate-200">
          <h2 className="text-lg font-semibold text-slate-50">
            How your information is used
          </h2>
          <p>I use your information to:</p>
          <ul className="ml-5 list-disc space-y-1 text-slate-300">
            <li>Generate and deliver your personalised 30-day Elf plan.</li>
            <li>
              Send you your plan by email and provide optional nightly reminder
              emails.
            </li>
            <li>Process payments securely through Stripe.</li>
            <li>Operate, secure, and improve the website and service.</li>
            <li>
              Comply with legal obligations (for example, tax and accounting
              records).
            </li>
          </ul>
        </section>

        <section className="mt-8 space-y-2 text-sm leading-relaxed text-slate-200">
          <h2 className="text-lg font-semibold text-slate-50">
            Legal basis (UK / EU users)
          </h2>
          <p>
            If you are in the UK or EU, I process your personal data on the
            following legal bases:
          </p>
          <ul className="ml-5 list-disc space-y-1 text-slate-300">
            <li>
              <span className="font-medium">Contract:</span> to provide your Elf
              plan and related services after you place an order.
            </li>
            <li>
              <span className="font-medium">Legitimate interests:</span> to run
              and improve the service, prevent abuse, and keep things secure.
            </li>
            <li>
              <span className="font-medium">Consent:</span> where required, for
              things like optional nightly reminder emails. You can withdraw
              consent at any time by unsubscribing or contacting me.
            </li>
          </ul>
        </section>

        <section className="mt-8 space-y-2 text-sm leading-relaxed text-slate-200">
          <h2 className="text-lg font-semibold text-slate-50">
            Payment processing (Stripe)
          </h2>
          <p>
            I use <span className="font-medium">Stripe</span> to process
            payments. Your payment details are handled directly by Stripe and
            never pass through my servers in full.
          </p>
          <p className="text-slate-300">
            Stripe may process your data in accordance with its own privacy
            policy. You can learn more on Stripe&apos;s website.
          </p>
        </section>

        <section className="mt-8 space-y-2 text-sm leading-relaxed text-slate-200">
          <h2 className="text-lg font-semibold text-slate-50">
            Other services I use
          </h2>
          <p>
            To run this site, I may share limited data with carefully chosen
            service providers, for example:
          </p>
          <ul className="ml-5 list-disc space-y-1 text-slate-300">
            <li>Hosting and infrastructure providers (e.g. Vercel).</li>
            <li>
              Email delivery services to send your plan and reminders (e.g.
              Resend or similar providers).
            </li>
            <li>
              Database / storage providers to securely store your generated Elf
              plan and preferences (e.g. Upstash Redis).
            </li>
          </ul>
          <p className="text-slate-300">
            These providers only process your data on my behalf and in
            accordance with my instructions.
          </p>
        </section>

        <section className="mt-8 space-y-2 text-sm leading-relaxed text-slate-200">
          <h2 className="text-lg font-semibold text-slate-50">
            Data retention
          </h2>
          <p>
            I keep your Elf plan and basic order details so you can re-access
            your plan and for my records. I may retain some information for
            legal and accounting purposes even after you stop using the service.
          </p>
          <p className="text-slate-300">
            If you would like your data deleted sooner (where I am not required
            to keep it by law), please contact me.
          </p>
        </section>

        <section className="mt-8 space-y-2 text-sm leading-relaxed text-slate-200">
          <h2 className="text-lg font-semibold text-slate-50">
            Your rights (UK / EU)
          </h2>
          <p>
            If you are in the UK or EU, you have rights over your personal data,
            including:
          </p>
          <ul className="ml-5 list-disc space-y-1 text-slate-300">
            <li>Accessing the personal data I hold about you.</li>
            <li>Requesting correction of inaccurate data.</li>
            <li>
              Requesting deletion of your data, in some circumstances
              (subject to legal requirements).
            </li>
            <li>
              Objecting to certain types of processing or asking me to restrict
              processing.
            </li>
          </ul>
          <p className="text-slate-300">
            To exercise these rights, please email{' '}
            <a
              href="mailto:aigifts.org"
              className="text-emerald-300 underline underline-offset-2"
            >
aigifts.org
            </a>
            .
          </p>
        </section>

        <section className="mt-8 space-y-2 text-sm leading-relaxed text-slate-200">
          <h2 className="text-lg font-semibold text-slate-50">
            Children&apos;s data
          </h2>
          <p>
            This service is aimed at parents and carers, not children. The
            child&apos;s first name and age range you provide are used only to
            personalise your Elf plan and are not used to contact the child
            directly.
          </p>
        </section>

        <section className="mt-8 space-y-2 text-sm leading-relaxed text-slate-200">
          <h2 className="text-lg font-semibold text-slate-50">
            Changes to this policy
          </h2>
          <p>
            I may update this Privacy Policy from time to time. When I do, I
            will update the &quot;Last updated&quot; date at the top of this
            page. If the changes are significant, I may also notify you by
            email.
          </p>
        </section>

        <section className="mt-8 space-y-2 text-sm leading-relaxed text-slate-200">
          <h2 className="text-lg font-semibold text-slate-50">Contact</h2>
          <p>
            If you have any questions about this Privacy Policy or how your
            data is handled, please contact:
          </p>
          <p className="text-slate-300">
            Kathryn Lamb
            <br />
            Manor House, Eaglescliffe, TS16 0QT, United Kingdom
            <br />
            Email:{' '}
            <a
              href="mailto:aigifts.org"
              className="text-emerald-300 underline underline-offset-2"
            >
             aigifts.org
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
