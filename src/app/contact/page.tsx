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
                href={CONTACT_INFO.whatsapp || "#"}
                target={CONTACT_INFO.whatsapp ? "_blank" : undefined}
                rel="noopener noreferrer"
                className={`bg-card-bg/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/[0.05] hover:border-[#25D366]/50 transition-all group shadow-lg ${!CONTACT_INFO.whatsapp && 'opacity-60 pointer-events-none'}`}
              >
                <div className="w-12 h-12 rounded-full bg-[#25D366]/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="w-6 h-6 fill-[#25D366]">
                    <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
                  </svg>
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
                href={`https://mail.google.com/mail/?view=cm&fs=1&to=${CONTACT_INFO.email}&su=Consulta%20sobre%20ConversaAI`}
                target="_blank"
                rel="noopener noreferrer"
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
