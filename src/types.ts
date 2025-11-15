export type ElfDay = {
    day: number;
    title: string;
    setup: string;
    elfNote: string;
    effortLevel: 'very-low' | 'low' | 'medium';
    propsNeeded: string[];
    parentTips: string;        // “Set this up after X…”
    backupIdea: string;        // quicker version if knackered
    callbacks?: string;        // running joke / reference
  };
  