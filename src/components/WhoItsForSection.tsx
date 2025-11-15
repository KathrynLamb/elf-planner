// src/components/WhoItsForSection.tsx
export default function WhoItsForSection() {
    const cards = [
      {
        title: 'Busy working parents',
        body: 'You love the magic but your brain is fried by 9pm. Let the plan do the thinking so you can just set it up and sleep.',
      },
      {
        title: 'Families with more than one child',
        body: 'More kids, more eyes on the Elf. A plan keeps things fair and stops “I wanted a turn!” arguments.',
      },
      {
        title: 'Sensitive or anxious kiddos',
        body: 'Choose calmer, kinder Elf ideas so the magic feels cosy and safe rather than overwhelming.',
      },
    ];
  
    return (
      <section aria-labelledby="who-its-for-title" className="space-y-4">
        <h2
          id="who-its-for-title"
          className="text-center text-lg font-semibold text-slate-50 md:text-xl"
        >
          Made for real families
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {cards.map((c) => (
            <div
              key={c.title}
              className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-300"
            >
              <h3 className="mb-2 text-sm font-semibold text-slate-50">
                {c.title}
              </h3>
              <p>{c.body}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }
  