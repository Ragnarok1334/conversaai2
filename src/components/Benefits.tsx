"use client";

import { BlurFade } from "@/components/magicui/blur-fade";
import { BentoGrid, BentoCard } from "@/components/magicui/bento-grid";
import { 
  Clock, 
  MessageSquare, 
  Users, 
  BarChart, 
  History, 
  Settings, 
  Palette, 
  FileText 
} from "lucide-react";

const features = [
  {
    Icon: Clock,
    name: "Atención automática 24/7",
    description: "Responde preguntas frecuentes, atiende clientes y evita perder oportunidades fuera de horario.",
    href: "/",
    cta: "Saber más",
    className: "md:col-span-2",
    background: <div className="absolute inset-0 bg-gradient-to-br from-brand-violet/10 to-transparent" />,
  },
  {
    Icon: Users,
    name: "Captura de leads",
    description: "Guarda nombre, teléfono, correo y necesidades del cliente para dar seguimiento comercial.",
    href: "/",
    cta: "Saber más",
    className: "md:col-span-1",
    background: <div className="absolute inset-0 bg-gradient-to-br from-brand-cyan/10 to-transparent" />,
  },
  {
    Icon: MessageSquare,
    name: "Web Chat, Telegram y WhatsApp",
    description: "Conecta los canales donde tus clientes ya conversan con tu negocio.",
    href: "/",
    cta: "Saber más",
    className: "md:col-span-1",
    background: <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(34,197,94,0.1)_0%,transparent_50%)]" />,
  },
  {
    Icon: BarChart,
    name: "Analytics avanzados",
    description: "Consulta métricas de mensajes, conversaciones, clientes potenciales y rendimiento.",
    href: "/",
    cta: "Saber más",
    className: "md:col-span-2",
    background: <div className="absolute inset-0 bg-gradient-to-bl from-brand-blue/10 to-transparent" />,
  },
  {
    Icon: History,
    name: "Historial de conversaciones",
    description: "Revisa interacciones anteriores para entender mejor a cada cliente.",
    href: "/",
    cta: "Saber más",
    className: "md:col-span-1",
    background: <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.1)_0%,transparent_50%)]" />,
  },
  {
    Icon: Settings,
    name: "API y Webhooks",
    description: "Conecta ConversaAI con tus herramientas internas, CRM o procesos personalizados.",
    href: "/",
    cta: "Saber más",
    className: "md:col-span-1",
    background: <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent" />,
  },
  {
    Icon: Palette,
    name: "Branding personalizado",
    description: "Adapta colores, mensajes y personalidad del asistente a tu marca.",
    href: "/",
    cta: "Saber más",
    className: "md:col-span-1",
    background: <div className="absolute inset-0 bg-gradient-to-br from-brand-pink/5 to-transparent" />,
  },
  {
    Icon: FileText,
    name: "Entrenamiento con documentos",
    description: "Entrena tu asistente con información propia de tu negocio para respuestas más precisas.",
    href: "/",
    cta: "Saber más",
    className: "md:col-span-3",
    background: <div className="absolute inset-0 bg-gradient-to-b from-brand-cyan/5 to-transparent" />,
  },
];

export function Benefits() {
  return (
    <section id="beneficios" className="relative py-28 bg-[#050816] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_45%,rgba(124,58,237,0.1),transparent_32%),radial-gradient(circle_at_15%_85%,rgba(6,182,212,0.08),transparent_28%)]" />

      <div className="container mx-auto px-4 md:px-6 relative z-10 max-w-7xl">
        <BlurFade delay={0.1}>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-[-0.03em] leading-tight">
              Beneficios de automatizar con{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A855F7] via-[#2563EB] to-[#06B6D4]">
                ConversaAI
              </span>
            </h2>
            <p className="text-[#CBD5E1] text-lg">
              No dejes que los clientes se enfríen por falta de respuesta.
              ConversaAI mantiene el interés y guía a tus usuarios hacia la compra en todo momento.
            </p>
          </div>
        </BlurFade>

        <BlurFade delay={0.3}>
          <BentoGrid className="lg:grid-rows-3 auto-rows-[20rem]">
            {features.map((feature, idx) => (
              <BentoCard key={idx} {...feature} />
            ))}
          </BentoGrid>
        </BlurFade>
      </div>
    </section>
  );
}