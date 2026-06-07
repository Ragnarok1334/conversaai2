import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Stats } from "@/components/Stats";

import { HowItWorks } from "@/components/HowItWorks";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { UseCases } from "@/components/UseCases";
import { SpecializedAssistantsSection } from "@/components/SpecializedAssistantsSection";
import { Pricing } from "@/components/Pricing";
import { ReviewsSection } from "@/components/ReviewsSection";
import { FAQ } from "@/components/FAQ";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";
import { CursorGlow } from "@/components/CursorGlow";

export default function Home() {
  return (
    <main className="min-h-screen bg-dark-bg text-text-main font-sans selection:bg-brand-violet/30 selection:text-white overflow-x-hidden">
      <CursorGlow />
      <Header />
      <Hero />
      <Stats />

      <HowItWorks />
      {/* FeaturesSection: modular, con modal de detalle por feature */}
      <FeaturesSection />
      <UseCases />
      <SpecializedAssistantsSection />
      <Pricing />
      <ReviewsSection />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  );
}
