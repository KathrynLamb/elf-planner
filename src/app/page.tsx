// src/app/page.tsx
import HeroSection from '@/components/HeroSection';
import HowItWorksSection from '@/components/HowItWorksSection';
import WhatYouGetSection from '@/components/WhatYouGetSection';
import SamplePlanPreview from '@/components/SamplePlanPreview';
import WhoItsForSection from '@/components/WhoItsForSection';
import FaqSection from '@/components/FaqSection';
import SiteFooter from '@/components/SiteFooter';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-16 px-4 pb-16 pt-10 md:pt-16">
        <HeroSection />
        <HowItWorksSection />
        <WhatYouGetSection />
        <SamplePlanPreview />
        <WhoItsForSection />
        <FaqSection />
        <SiteFooter />
      </div>
    </main>
  );
}
