// src/components/FaqSection.tsx
const faqs = [
    {
      q: 'Do I need a printer?',
      a: 'No. You can keep your plan as a PDF or email it to yourself and open it on your phone. Printing is optional.',
    },
    {
      q: 'Can I use this for more than one child?',
      a: 'You can make one personalised plan per purchase. If you’d like different vibes or dates for siblings, you can generate another plan with their details.',
    },
    {
      q: 'What if our Elf arrives late or leaves early?',
      a: 'Just pick whatever start date you like. Use as many nights as you want and skip the rest – the ideas are flexible.',
    },
    {
      q: 'What if my Elf “forgets” to move?',
      a: 'The plan is designed so you can shuffle days or skip nights when life happens. The magic is in the moments, not ticking every box.',
    },
    {
      q: 'How do payments work?',
      a: 'Payments are handled securely by Stripe. We never see or store your card details.',
    },
    {
      q: 'Can I get a refund?',
      a: 'Yes. If your plan isn’t helpful, email me within 14 days and I’ll refund you. No awkward questions.',
    },
  ];
  
  export default function FaqSection() {
    return (
      <section aria-labelledby="faq-title" className="space-y-4">
        <h2
          id="faq-title"
          className="text-center text-lg font-semibold text-slate-50 md:text-xl"
        >
          Questions parents often ask
        </h2>
        <div className="mx-auto max-w-3xl space-y-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-5 text-sm">
          {faqs.map((item) => (
            <div key={item.q} className="border-b border-slate-800 pb-3 last:border-b-0 last:pb-0">
              <p className="text-sm font-semibold text-slate-50">{item.q}</p>
              <p className="mt-1 text-xs text-slate-300">{item.a}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }
  