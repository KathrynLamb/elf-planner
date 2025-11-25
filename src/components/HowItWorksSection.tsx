export function HowItWorksSection() {
  const steps = [
    {
      number: "1",
      title: "Tell Merry about your Elf & kiddo",
      body: "Share your child’s name, age, December dates and what kind of Elf vibe you want – silly, calm, or kind – plus any big worries we should tread gently around.",
    },
    {
      number: "2",
      title: "Merry brews your 24-night plan",
      body: "Our Elf helper uses your answers to spin up nightly setups and ready-to-use notes in Elf voice, tuned to your child, your evenings, and your mess tolerance.",
    },
    {
      number: "3",
      title: "You copy tonight’s idea after bedtime",
      body: "Each morning you’ll get an email with that evening’s Elf setup and note, so you’ve got all day to grab any bits you need and then set it up in 2–10 minutes.",
    },
  ];

  const benefits = [
    {
      title: "Tonight’s plan in your inbox (each morning)",
      body: "A clear, step-by-step Elf setup plus what your child will discover in the morning, sent at the start of the day so you’re never scrambling for materials at 11.30pm.",
    },
    {
      title: "Truly personalised to your family",
      body: "Merry weaves in your kid’s name, age, passions, siblings and December chaos level so it feels like your Elf, not a generic list from Pinterest.",
    },
    {
      title: "Fits your energy and mess tolerance",
      body: "Choose between micro 2-minute ideas, quick 5-minute setups, or the odd big weekend show-stopper – always with low-mess options and an emergency “I’m wiped” fallback.",
    },
  ];

  return (
    <section
      id="how-it-works"
      className="space-y-8 rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 md:p-10"
    >
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-slate-50 md:text-2xl">
          How it works (and what you actually get)
        </h2>
        <p className="max-w-2xl text-sm text-slate-300">
          Designed for one-handed, late-night parents. No crafting degree
          required, no 3am panic scrolls on Pinterest.
        </p>
      </div>

      {/* Steps row */}
      <div className="grid gap-6 md:grid-cols-3">
        {steps.map((step) => (
          <div
            key={step.number}
            className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-5"
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

      {/* Benefits row */}
      <div className="grid gap-5 md:grid-cols-3">
        {benefits.map((item) => (
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
