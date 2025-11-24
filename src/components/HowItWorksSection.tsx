// src/components/HowItWorksSection.tsx
export default function HowItWorksSection() {
    const items = [
      {
        title: '1. Tell us about your Elf',
        body: 'Pop in your child’s name, age range, start date and Elf vibe (silly, kind or calm).',
      },
      {
        title: '2. We conjure your 24-day plan',
        body: 'Our Elf Helper uses AI to spin up 30 nights of setups and short notes, tailored to your child and your dates.',
      },
      {
        title: '3. Print, email or save',
        body: 'View your plan online, download a printer-friendly PDF, or email the full plan to yourself so it’s always handy on your phone.',
      },
    ];
  
    return (
      <section aria-labelledby="how-it-works-title" className="space-y-6">
        <h2
          id="how-it-works-title"
          className="text-center text-lg font-semibold text-slate-50 md:text-xl"
        >
          How it works
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {items.map((item, index) => (
            <div
              key={item.title}
              className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-200"
            >
              <div className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 text-[11px] font-semibold text-emerald-300">
                {index + 1}
              </div>
              <h3 className="mb-1 text-sm font-semibold text-slate-50">
                {item.title}
              </h3>
              <p className="text-xs text-slate-300">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }
  