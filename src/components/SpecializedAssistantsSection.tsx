"use client"

import { BlurFade } from "@/components/magicui/blur-fade"
import { ShoppingCart, HeadphonesIcon, Calendar, MapPin, CheckCircle2 } from "lucide-react"

const areas = [
  {
    icon: <ShoppingCart className="w-5 h-5 text-brand-cyan" />,
    title: "Ventas",
    description: "Responde precios, promociones, disponibilidad y guía al cliente hacia la compra.",
    color: "border-brand-cyan/30 bg-brand-cyan/5",
    dot: "bg-brand-cyan",
  },
  {
    icon: <HeadphonesIcon className="w-5 h-5 text-brand-violet" />,
    title: "Soporte",
    description: "Resuelve dudas frecuentes, hace seguimiento a pedidos y deriva cuando es necesario.",
    color: "border-brand-violet/30 bg-brand-violet/5",
    dot: "bg-brand-violet",
  },
  {
    icon: <Calendar className="w-5 h-5 text-brand-blue" />,
    title: "Reservas",
    description: "Confirma horarios, agenda citas y recopila los datos del cliente automáticamente.",
    color: "border-brand-blue/30 bg-brand-blue/5",
    dot: "bg-brand-blue",
  },
  {
    icon: <MapPin className="w-5 h-5 text-brand-pink" />,
    title: "Sucursales",
    description: "Un asistente por ubicación: cada uno con sus propios horarios, precios y equipo.",
    color: "border-brand-pink/30 bg-brand-pink/5",
    dot: "bg-brand-pink",
  },
]

const benefits = [
  "Cada asistente con un objetivo claro",
  "Sin mezclar información de áreas distintas",
  "Respuestas más precisas por contexto",
  "Control y métricas separadas por área",
  "Mejor medición de leads y conversaciones",
]

export function SpecializedAssistantsSection() {
  return (
    <section className="py-24 bg-[#050816] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-brand-violet/5 to-transparent pointer-events-none" />
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <BlurFade delay={0.2}>
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-block text-xs font-semibold tracking-widest uppercase text-brand-cyan border border-brand-cyan/20 bg-brand-cyan/5 px-3 py-1 rounded-full mb-4">
              Múltiples asistentes
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Un asistente para cada necesidad
            </h2>
            <p className="text-text-secondary text-lg">
              No todos tus clientes preguntan lo mismo. ConversaAI te permite crear asistentes especializados
              para que cada área de tu negocio responda con mayor precisión.
            </p>
          </div>
        </BlurFade>

        <BlurFade delay={0.35}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {areas.map((area) => (
              <div
                key={area.title}
                className={`rounded-2xl border p-5 ${area.color} backdrop-blur-sm`}
              >
                <div className="mb-3">{area.icon}</div>
                <h3 className="text-white font-semibold text-base mb-1">{area.title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{area.description}</p>
              </div>
            ))}
          </div>
        </BlurFade>

        <BlurFade delay={0.5}>
          <div className="max-w-xl mx-auto bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6">
            <p className="text-xs font-semibold text-text-soft uppercase tracking-widest mb-4">
              Por qué funciona mejor así
            </p>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {benefits.map((b) => (
                <div key={b} className="flex items-start gap-2 text-sm text-text-secondary">
                  <CheckCircle2 className="w-4 h-4 text-brand-success mt-0.5 shrink-0" />
                  {b}
                </div>
              ))}
            </div>
          </div>
        </BlurFade>
      </div>
    </section>
  )
}
