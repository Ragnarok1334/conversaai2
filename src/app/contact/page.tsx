import { Header } from "@/components/Header"
import { Footer } from "@/components/Footer"
import { ContactForm } from "@/components/contact/ContactForm"
import { ContactInfo } from "@/components/contact/ContactInfo"
import { ParticlesBackground } from "@/components/ParticlesBackground"
import { MessageCircle, Send, Mail } from "lucide-react"
import Link from "next/link"
import { CONTACT_INFO } from "@/lib/contact"

export const metadata = {
  title: "Contacto | ConversaAI",
  description: "Contacta con nosotros para automatizar las conversaciones de tu negocio con Inteligencia Artificial."
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#050816] flex flex-col font-sans">
      <Header />

      <main className="flex-1 relative pt-32 pb-24 overflow-hidden">
        <ParticlesBackground />
        
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.15),transparent_32%),radial-gradient(circle_at_80%_30%,rgba(6,182,212,0.12),transparent_30%),linear-gradient(135deg,#050816_0%,#0B1026_45%,#111C44_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#7C3AED]/20 rounded-full blur-[120px]" />

        <div className="container mx-auto px-4 md:px-6 relative z-10">
          
          {/* Hero Section */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-[-0.04em] mb-6">
              Contacta con <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A855F7] via-[#2563EB] to-[#06B6D4]">nosotros</span>
            </h1>
            <p className="text-lg md:text-xl text-[#CBD5E1] leading-relaxed">
              Estamos listos para ayudarte a automatizar conversaciones, captar leads y mejorar tu atención al cliente con IA.
            </p>
          </div>

          {/* Contact Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-6xl mx-auto mb-24">
            <div className="lg:col-span-7 xl:col-span-8">
              <ContactForm />
            </div>
            <div className="lg:col-span-5 xl:col-span-4">
              <ContactInfo />
            </div>
          </div>

          {/* Quick Contact Options */}
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-xl font-bold text-white mb-8">¿Prefieres una respuesta rápida?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              
              <Link 
                href={CONTACT_INFO.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-card-bg/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/[0.05] hover:border-[#25D366]/50 transition-all group shadow-lg"
              >
                <div className="w-12 h-12 rounded-full bg-[#25D366]/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <MessageCircle className="w-6 h-6 text-[#25D366]" />
                </div>
                <h4 className="text-white font-semibold mb-2">WhatsApp</h4>
                <p className="text-sm text-text-soft">Respuesta en minutos</p>
              </Link>

              <Link 
                href={CONTACT_INFO.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-card-bg/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/[0.05] hover:border-[#0088cc]/50 transition-all group shadow-lg"
              >
                <div className="w-12 h-12 rounded-full bg-[#0088cc]/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Send className="w-6 h-6 text-[#0088cc]" />
                </div>
                <h4 className="text-white font-semibold mb-2">Telegram</h4>
                <p className="text-sm text-text-soft">Escríbenos directo</p>
              </Link>

              <Link 
                href={`mailto:${CONTACT_INFO.email}`}
                className="bg-card-bg/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/[0.05] hover:border-brand-violet/50 transition-all group shadow-lg"
              >
                <div className="w-12 h-12 rounded-full bg-brand-violet/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Mail className="w-6 h-6 text-brand-violet" />
                </div>
                <h4 className="text-white font-semibold mb-2">Email</h4>
                <p className="text-sm text-text-soft">contacto@conversaai.store</p>
              </Link>

            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  )
}
