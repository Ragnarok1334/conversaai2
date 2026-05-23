import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Stats } from "@/components/Stats";
import { Benefits } from "@/components/Benefits";
import { HowItWorks } from "@/components/HowItWorks";
import { UseCases } from "@/components/UseCases";
import { Pricing } from "@/components/Pricing";
import { Testimonials } from "@/components/Testimonials";
import { FAQ } from "@/components/FAQ";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";
import { CursorGlow } from "@/components/CursorGlow";

export default function Home() {
  return (
    <main className="min-h-screen bg-dark-bg text-text-main font-sans selection:bg-brand-violet/30 selection:text-white">
      <CursorGlow />
      <Header />
      <Hero />
      <Stats />
      <Benefits />
      <HowItWorks />
      <UseCases />
      <Pricing />
      <Testimonials />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  );
}

