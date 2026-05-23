import { Header } from "@/components/Header";
import { Pricing } from "@/components/Pricing";
import { Footer } from "@/components/Footer";
import { CursorGlow } from "@/components/CursorGlow";

export const metadata = {
  title: "Planes y Precios — ConversaAI",
  description: "Conoce nuestros planes y precios para automatizar tus conversaciones con IA. Cancela cuando quieras.",
};

export default function PreciosPage() {
  return (
    <main className="min-h-screen bg-dark-bg text-text-main font-sans selection:bg-brand-violet/30 selection:text-white flex flex-col">
      <CursorGlow />
      <Header />
      <div className="flex-1 pt-20">
        <Pricing />
      </div>
      <Footer />
    </main>
  );
}
