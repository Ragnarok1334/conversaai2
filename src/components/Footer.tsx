"use client";

import {
  Sparkles,
  ArrowUpRight,
  MessageCircle,
  Send,
  Mail,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { CONTACT_INFO } from "@/lib/contact";

export function Footer() {
  const productLinks = [
    { name: "Funciones", href: "#funciones" },
    { name: "Precios", href: "#precios" },
    { name: "FAQ", href: "#faq" },
    { name: "Contacto", href: "/contact" },
  ];

  const socialLinks = [
    {
      icon: <MessageCircle className="w-5 h-5" />,
      href: CONTACT_INFO.whatsapp,
      label: "WhatsApp",
    },
    {
      icon: <Send className="w-5 h-5" />,
      href: CONTACT_INFO.telegram,
      label: "Telegram",
    },
    {
      icon: <Mail className="w-5 h-5" />,
      href: `mailto:${CONTACT_INFO.email}`,
      label: "Email",
    },
  ];

  return (
    <footer className="relative overflow-hidden bg-[#050816] pt-24 pb-10 border-t border-white/10">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(124,58,237,0.16),transparent_30%),radial-gradient(circle_at_90%_70%,rgba(6,182,212,0.12),transparent_28%)]" />

      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-[#7C3AED]/10 blur-[120px] rounded-full" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        {/* Main footer card */}
        <div className="rounded-[2rem] bg-white/[0.04] backdrop-blur-2xl border border-white/10 p-8 md:p-10 shadow-[0_0_60px_rgba(124,58,237,0.08)] mb-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            {/* Brand */}
            <div className="col-span-1 md:col-span-3">
              <Link href="/" className="flex items-center gap-3 mb-6 group w-fit">
                <div className="relative w-11 h-11 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(124,58,237,0.45)] group-hover:scale-105 transition-transform duration-300">
                  <Image src="/logo.png" alt="ConversaAI logo" width={44} height={44} className="rounded-2xl" />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] blur-xl opacity-40 -z-10" />
                </div>

                <span className="text-2xl font-bold text-white tracking-tight">
                  Conversa<span className="text-[#06B6D4]">AI</span>
                </span>
              </Link>

              <p className="text-[#94A3B8] max-w-md mb-8 leading-relaxed">
                Automatiza tus conversaciones con inteligencia artificial.
                Atiende clientes las 24 horas, organiza prospectos y aumenta tus
                ventas con asistentes inteligentes.
              </p>

              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/10 text-[#CBD5E1] text-sm mb-8">
                <Sparkles className="w-4 h-4 text-[#06B6D4]" />
                IA para ventas, soporte y automatización
              </div>

              <div className="flex items-center gap-4">
                {socialLinks.map((item) => {
                  if (!item.href) return null;
                  return (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={item.label}
                      className="w-11 h-11 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-[#94A3B8] hover:text-white hover:border-[#06B6D4]/50 hover:bg-white/[0.08] hover:-translate-y-1 transition-all duration-300"
                    >
                      {item.icon}
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold text-white mb-6">Producto</h4>

              <ul className="space-y-4">
                {productLinks.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="group inline-flex items-center gap-2 text-[#94A3B8] hover:text-[#06B6D4] transition-colors"
                    >
                      {link.name}
                      <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <p className="text-[#94A3B8]">
            © {new Date().getFullYear()} ConversaAI. Todos los derechos
            reservados.
          </p>

          <div className="flex items-center gap-6">
            <Link
              href="/privacy"
              className="text-[#94A3B8] hover:text-white transition-colors"
            >
              Privacidad
            </Link>

            <Link
              href="/terms"
              className="text-[#94A3B8] hover:text-white transition-colors"
            >
              Términos
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}