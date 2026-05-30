'use client'

import { useState } from 'react'
import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  MessageSquareText,
  Magnet,
  Users,
  Share2,
  BarChart3,
  Settings,
} from 'lucide-react'
import { FeatureCard } from './FeatureCard'
import { FeatureModal } from './FeatureModal'

/**
 * FeatureData — Interfaz exportada para compartir entre Card y Modal.
 * Incluye todos los campos opcionales para el detalle del modal.
 */
export interface FeatureData {
  slug: string
  icon: ReactNode
  iconBg?: string
  glowColor?: string
  title: string
  description: string
  longDescription?: string
  benefits?: string[]
}

/**
 * FeaturesSection — Grid de 6 features con modal de detalle.
 *
 * Layout:
 *   - Mobile: 1 columna
 *   - Tablet (≥768px): 2 columnas
 *   - Desktop (≥1024px): 3 columnas
 *
 * Estado:
 *   - selectedFeature: feature activo para el modal (null = cerrado)
 */
const FEATURES: FeatureData[] = [
  {
    slug: 'respuestas-automaticas',
    icon: <MessageSquareText className="w-6 h-6 text-[#A855F7]" />,
    iconBg: '#0B1026',
    glowColor: 'rgba(168,85,247,0.2)',
    title: 'Respuestas automáticas con IA',
    description:
      'Entiende el contexto y responde de forma natural a las dudas de tus clientes al instante.',
    longDescription:
      'Nuestro motor de IA conversacional analiza el contexto completo de cada conversación y genera respuestas precisas, empáticas y personalizadas según el tono y las reglas de tu negocio. Sin tiempos de espera, las 24 horas del día.',
    benefits: [
      'Responde en menos de 2 segundos en cualquier canal',
      'Personaliza el tono: formal, amigable o técnico',
      'Aprende de preguntas frecuentes para mejorar con el tiempo',
      'Soporte en español proximamente en otros idiomas',
      'Fallback automático a agente humano si no sabe responder',
    ],
  },
  {
    slug: 'captura-leads',
    icon: <Magnet className="w-6 h-6 text-[#06B6D4]" />,
    iconBg: '#060F26',
    glowColor: 'rgba(6,182,212,0.2)',
    title: 'Captura inteligente de leads',
    description:
      'Identifica clientes potenciales y solicita sus datos de contacto en el momento adecuado.',
    longDescription:
      'ConversaAI detecta automáticamente el nivel de interés del visitante durante la conversación y solicita nombre, correo o teléfono en el momento exacto en que hay mayor probabilidad de conversión, sin interrumpir el flujo natural del chat.',
    benefits: [
      'Solicita datos solo cuando el cliente muestra interés real',
      'Formulario conversacional integrado en el chat',
      'Exporta leads a tu CRM o Google Sheets',
      'Notificaciones en tiempo real al equipo de ventas',
      'Tasa de conversión promedio 3× mayor que formularios tradicionales',
    ],
  },
  {
    slug: 'seguimiento-clientes',
    icon: <Users className="w-6 h-6 text-[#2563EB]" />,
    iconBg: '#060E20',
    glowColor: 'rgba(37,99,235,0.2)',
    title: 'Seguimiento de clientes',
    description:
      'Mantén un registro de cada interacción y haz seguimiento automático para cerrar ventas.',
    longDescription:
      'Cada conversación queda registrada con contexto completo, historial y etiquetas. Tu equipo puede retomar cualquier chat desde donde quedó, y el sistema puede enviar recordatorios o mensajes de seguimiento de forma automática.',
    benefits: [
      'Historial completo de todas las conversaciones',
      'Etiquetas automáticas: interesado, en proceso, cerrado',
      'Recordatorios automáticos por WhatsApp o email',
      'Panel de seguimiento por agente o asistente',
      'Integración con calendarios para agendar visitas',
    ],
  },
  {
    slug: 'integraciones',
    icon: <Share2 className="w-6 h-6 text-[#EC4899]" />,
    iconBg: '#0F0818',
    glowColor: 'rgba(236,72,153,0.2)',
    title: 'Integración con tus canales',
    description:
      'Conecta tu asistente con WhatsApp, Telegram, Instagram y tu sitio web fácilmente.',
    longDescription:
      'Un solo asistente de IA que atiende simultáneamente en todos tus canales de comunicación. Configura la integración en minutos con tokens y webhooks, sin necesidad de código.',
    benefits: [
      'WhatsApp Business API oficial',
      'Telegram Bot con comandos personalizados',
      'Widget Web Chat para cualquier sitio web',
      'Instagram DMs (próximamente)',
      'Webhook para integración con cualquier sistema',
    ],
  },
  {
    slug: 'panel-estadisticas',
    icon: <BarChart3 className="w-6 h-6 text-[#22C55E]" />,
    iconBg: '#050F0D',
    glowColor: 'rgba(34,197,94,0.18)',
    title: 'Panel de estadísticas',
    description:
      'Mide el rendimiento de tus conversaciones, leads captados y tiempos de respuesta.',
    longDescription:
      'Visualiza en tiempo real las métricas que importan: cuántas conversaciones se resolvieron automáticamente, cuántos leads se capturaron, cuál es el tiempo promedio de respuesta y en qué horarios hay más actividad.',
    benefits: [
      'Dashboard en tiempo real con gráficos interactivos',
      'Métricas por canal, asistente y período de tiempo',
      'Tasa de resolución automática vs. escalada a humano',
      'Reporte semanal automático por email',
      'Exportación de datos en CSV o PDF',
    ],
  },
  {
    slug: 'personalizacion',
    icon: <Settings className="w-6 h-6 text-[#7C3AED]" />,
    iconBg: '#0B0B1A',
    glowColor: 'rgba(124,58,237,0.2)',
    title: 'Personalización del asistente',
    description:
      'Dale a tu IA la personalidad, el tono y las reglas exactas de tu negocio.',
    longDescription:
      'Define el nombre, avatar, idioma, tono de voz y las reglas de comportamiento de tu asistente desde el panel de configuración. Sin programar, sin fricción. Tu asistente aprende la información de tu negocio y responde como un empleado experto.',
    benefits: [
      'Editor de instrucciones en lenguaje natural',
      'Define reglas de comportamiento paso a paso',
      'Configura preguntas frecuentes y respuestas exactas',
      'Personaliza mensajes de bienvenida y despedida',
      'Modo sandbox para probar antes de publicar',
    ],
  },
]

export function FeaturesSection() {
  const [selectedFeature, setSelectedFeature] = useState<FeatureData | null>(null)

  return (
    <>
      <section
        id="beneficios"
        className="relative py-28 overflow-hidden bg-[#050816]"
        aria-labelledby="features-heading"
      >
        {/* Glows decorativos de fondo */}
        <div
          className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(124,58,237,0.12), transparent 70%)',
            filter: 'blur(80px)',
          }}
          aria-hidden="true"
        />
        <div
          className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(6,182,212,0.10), transparent 70%)',
            filter: 'blur(80px)',
          }}
          aria-hidden="true"
        />

        <div className="container mx-auto px-4 md:px-6 relative z-10">

          {/* Encabezado de la sección */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] backdrop-blur-xl border border-white/10 mb-6 shadow-[0_0_30px_rgba(124,58,237,0.15)]">
              <span className="w-2 h-2 rounded-full bg-[#06B6D4]" aria-hidden="true" />
              <span className="text-sm text-[#CBD5E1] font-medium">
                Funciones inteligentes
              </span>
            </div>

            <h2
              id="features-heading"
              className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-[-0.03em]"
            >
              Funciones diseñadas para{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A855F7] via-[#2563EB] to-[#06B6D4]">
                vender, atender y dar seguimiento
              </span>
            </h2>

            <p className="text-[#94A3B8] text-lg leading-relaxed">
              ConversaAI reúne las herramientas esenciales para responder al instante,
              capturar leads, medir resultados y mantener cada conversación organizada.
            </p>
          </motion.div>

          {/* Grid de tarjetas — 1 col mobile, 2 tablet, 3 desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, index) => (
              <FeatureCard
                key={feature.slug}
                feature={feature}
                index={index}
                onOpenModal={setSelectedFeature}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Modal global — fuera del section para evitar overflow:hidden */}
      <FeatureModal
        feature={selectedFeature}
        onClose={() => setSelectedFeature(null)}
      />
    </>
  )
}
