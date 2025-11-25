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
      title: "You just copy tonight’s idea",
      body: "Each night you get a tiny, clear prompt for what to set up after bedtime so you can stop doom-scrolling Pinterest at 11.30pm.",
    },
  ];

  const benefits = [
    {
      title: "Tonight’s plan in your inbox",
      body: "A clear, step-by-step Elf setup plus what your child will discover in the morning, ready when you finally sit down.",
    },
    {
      title: "Truly personalised to your family",
      body: "Merry weaves in your kid’s name, age, passions, siblings and December chaos level so it feels like your Elf, not a generic list.",
    },
    {
      title: "Fits your energy and mess tolerance",
      body: "Choose between micro 2-minute ideas, quick 5-minute setups, or the odd big weekend show-stopper – always with low-mess options.",
    },
  ];

  return (
    <section
      id="how-it-works"
      className="space-y-8 rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 md:p-10"
    >
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-slate-50 md:text-2xl">
          How Merry works (in about three minutes)
        </h2>
        <p className="max-w-2xl text-sm text-slate-300">
          Designed for one-handed, late-night parents. No crafting degree
          required, no 3am panic scrolls on Pinterest.
        </p>
      </div>

      {/* Steps */}
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

      {/* What you get – condensed */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-semibold text-slate-50 md:text-base">
          What you get for $14.99
        </h3>
        <p className="max-w-2xl text-xs text-slate-300 md:text-sm">
          A whole Elf season you don’t have to think up from scratch – from
          arrival to Christmas Eve.
        </p>

        <div className="grid gap-5 md:grid-cols-3">
          {benefits.map((item) => (
            <div
              key={item.title}
              className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-5"
            >
              <h4 className="text-sm font-semibold text-slate-50">
                {item.title}
              </h4>
              <p className="text-xs text-slate-300">{item.body}</p>
            </div>
          ))}
        </div>

        <p className="pt-1 text-[11px] text-slate-400">
          One simple price, paid securely via PayPal. No subscriptions, no
          upsells, no faff.
        </p>
      </div>
    </section>
  );
}
