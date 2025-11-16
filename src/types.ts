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

  export type ElfPlanDay = {
    dayNumber?: number;
    title?: string;
    description?: string;
    noteFromElf?: string;
    date?: string;
  };

  export type ElfPlanObject = {
    planOverview?: string;
    days?: ElfPlanDay[];
  };


  // Whatever you already have:
export type ChatTurn = { role: 'user' | 'assistant'; content: string };

export type StoredElfPlan = {
  sessionId: string;
  childName: string | null;
  ageRange: string | null;
  startDate: string | null;
  vibe: 'silly' | 'kind' | 'calm' | null;

  userEmail: string | null;
  payerEmail: string | null;

  // NEW-ish / used for mini chat
  miniPreview: string | null;              // last “preview” reply from Merry
  introChatTranscript: ChatTurn[];         // mini-chat turns
  // existing hotline:
  hotlineTranscript: ChatTurn[];

  plan: ElfPlanObject | null;
  planGeneratedAt: number | null;
  pdfUrl: string | null;

  createdAt: number;
  updatedAt: number;
};



  