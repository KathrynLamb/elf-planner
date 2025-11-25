
export function WhoItIsForSection() {
  const personas = [
    {
      title: "Busy working parents",
      body: "You’re wiped by 9pm but still want the magic. Merry keeps the ideas coming so you can just set it up and sleep.",
    },
    {
      title: "Families with more than one child",
      body: "Ideas that work for siblings and keep things feeling fair, so you spend less time refereeing Elf drama.",
    },
    {
      title: "Sensitive or anxious kids",
      body: "Dial up the cosy, dial down the chaos. Choose calmer, kinder ideas so the Elf feels like a friend, not a spy.",
    },
  ];

  const faqs = [
    {
      q: "Do I need a printer?",
      a: "No. You can keep your plan as a link on your phone, email it to yourself, or download a PDF if you like paper.",
    },
    {
      q: "Can I use this for more than one child?",
      a: "Yes. Tell Merry about siblings and we’ll write ideas that include everyone.",
    },
    {
      q: "What if I miss a night?",
      a: "Life happens. You can skip, shuffle or double up on a weekend – the plan won’t break.",
    },
    {
      q: "Is this just a generic list?",
      a: "No. Each plan is generated from your child’s age, Elf vibe, dates and your energy level, so no two families get the same month.",
    },
  ];

  return (
    <section
      id="why-merry"
      className="space-y-8 rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 md:p-10"
    >
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-slate-50 md:text-2xl">
          Is this right for your family?
        </h2>
        <p className="max-w-2xl text-sm text-slate-300">
          Elf Planner is for parents who still want the magic, but also want to
          sleep – whether your December is quiet and cosy or full-tilt chaos.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-[1.1fr,1fr]">
        {/* Personas */}
        <div className="space-y-4">
          {personas.map((item) => (
            <div
              key={item.title}
              className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-5 text-sm text-slate-300"
            >
              <h3 className="text-sm font-semibold text-slate-50">
                {item.title}
              </h3>
              <p className="text-xs text-slate-300">{item.body}</p>
            </div>
          ))}
        </div>

        {/* FAQs – top 4 only */}
        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
          <h3 className="text-sm font-semibold text-slate-50">
            Quick questions, answered
          </h3>
          <div className="space-y-3">
            {faqs.map((item) => (
              <div key={item.q}>
                <p className="text-xs font-semibold text-slate-100">
                  {item.q}
                </p>
                <p className="mt-1 text-xs text-slate-300">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}