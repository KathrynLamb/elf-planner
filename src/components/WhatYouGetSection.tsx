// src/components/WhatYouGetSection.tsx
export default function WhatYouGetSection() {
    const bullets = [
      {
        title: '30 Elf setups',
        body: 'Simple, low-prep ideas that work with things you probably already have at home.',
      },
      {
        title: '30 Elf notes',
        body: 'Short, playful messages written in Elf voice, tuned to your child’s age.',
      },
      {
        title: 'Personalised to your child',
        body: 'We use their name, age range and chosen Elf vibe so it feels like it’s their Elf.',
      },
      {
        title: 'Instant access',
        body: 'View your plan right away, download it as a clean PDF, or email it to yourself.',
      },
      {
        title: 'Guilt-free guidance',
        body: 'Designed so you can skip nights, shuffle days around and still keep the magic.',
      },
    ];
  
    return (
      <section aria-labelledby="what-you-get-title" className="space-y-4">
        <h2
          id="what-you-get-title"
          className="text-center text-lg font-semibold text-slate-50 md:text-xl"
        >
          What you get for £9
        </h2>
        <div className="mx-auto max-w-3xl space-y-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-5 text-sm">
          <ul className="space-y-2 text-slate-200">
            {bullets.map((b) => (
              <li key={b.title} className="flex gap-3">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                <div>
                  <span className="font-semibold text-slate-50">{b.title}</span>
                  <span className="text-slate-300"> – {b.body}</span>
                </div>
              </li>
            ))}
          </ul>
          <p className="pt-2 text-xs text-slate-400">
            Each idea takes minutes to set up – no crafting degree or Pinterest-perfect props
            required.
          </p>
        </div>
      </section>
    );
  }
  