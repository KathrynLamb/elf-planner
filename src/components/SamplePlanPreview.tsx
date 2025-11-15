// src/components/SamplePlanPreview.tsx
export default function SamplePlanPreview() {
    return (
      <section aria-labelledby="sample-plan-title" className="space-y-4">
        <h2
          id="sample-plan-title"
          className="text-center text-lg font-semibold text-slate-50 md:text-xl"
        >
          Peek at a sample Elf plan
        </h2>
        <p className="text-center text-xs text-slate-300">
          Here’s a little taste of what a 30-day Elf plan looks like (this example is for a
          “Silly” Elf vibe, age 4–6):
        </p>
  
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-800 bg-slate-950/70 p-5 text-sm text-slate-50">
          <DayBlock
            title="Day 1: Hello, [Name]!"
            setup="Sit your Elf on a shelf or table with a little paper sign that says “Hi [Name]!”."
            note="Hi [Name]! I’m your silly Elf, here to keep you giggling all month long. Ready for fun?"
          />
          <DayBlock
            title="Day 2: Book Buddy"
            setup="Prop the Elf inside your child’s favourite storybook, peeking out."
            note="I picked your favourite book! Want to read it together today?"
          />
          <DayBlock
            title="Day 3: Sneaky Sock"
            setup="Put the Elf inside one of your child’s clean socks on their dresser."
            note="Socks are cosy, and I’m cosy too! Bet I’ll keep your toes warm in spirit."
          />
        </div>
  
        <p className="text-center text-xs text-slate-300">
          Ready for your own personalised plan? Scroll back up to get started – it only takes
          a minute or two.
        </p>
      </section>
    );
  }
  
  type DayBlockProps = {
    title: string;
    setup: string;
    note: string;
  };
  
  function DayBlock({ title, setup, note }: DayBlockProps) {
    return (
      <div className="mb-4 last:mb-0">
        <p className="text-sm font-semibold text-slate-50">{title}</p>
        <p className="mt-1 text-xs text-slate-200">
          <span className="font-semibold">Setup:</span> {setup}
        </p>
        <p className="mt-1 text-xs text-slate-300">
          <span className="font-semibold">Elf note:</span> {note}
        </p>
      </div>
    );
  }
  