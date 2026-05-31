'use client'

import { motion } from 'framer-motion'
import { Sparkles, FileText, CheckCircle2 } from 'lucide-react'
import { BuilderFormData } from './types'

interface Props {
  form: BuilderFormData
  setForm: (form: BuilderFormData) => void
}

const TEMPLATES: Record<string, string> = {
  'Barbería': 'Somos "Barbería Classic". Atendemos de Lunes a Sábado de 10:00 a 20:00 hrs. Nuestros servicios principales son: Corte Clásico ($15), Arreglo de Barba ($10) y Combo Corte+Barba ($22). Estamos ubicados en Av. Principal 123. Los clientes deben agendar su cita indicando su nombre, día, hora y el servicio que desean.',
  'Restaurante': 'Somos "Pizzería La Mamma". Nuestro horario es Martes a Domingo de 13:00 a 23:00 hrs. Especialidades: Pizza Margarita ($12), Pizza Pepperoni ($14) y Lasaña ($15). Aceptamos pedidos para retirar en el local o con delivery (costo extra $2). Para tomar un pedido necesitamos saber: Plato, cantidad, dirección de envío y método de pago (Efectivo o Tarjeta).',
  'Clínica': 'Somos "Centro Médico SaludVital". Atendemos de Lunes a Viernes de 8:00 a 18:00 hrs. Especialidades: Medicina General ($40), Pediatría ($50) y Odontología ($45). Aceptamos la mayoría de los seguros de salud. Para agendar una cita necesitamos el nombre completo del paciente, su RUT/DNI, especialidad requerida y su disponibilidad de horario.',
  'Tienda online': 'Somos "FashionStore". Vendemos ropa y accesorios de moda. Envíos a todo el país (3-5 días hábiles, costo $5). Tallas disponibles desde XS hasta XL. Medios de pago: Tarjetas de crédito/débito y transferencias. Política de cambios: 30 días con el producto en perfecto estado y boleta. Para compras, dirigir al cliente al catálogo web en www.fashionstore.com.',
  'Inmobiliaria': 'Somos "Inversiones Propiedades". Nos especializamos en arriendos y ventas de departamentos en el centro de la ciudad. Requisitos para arrendar: 3 últimas liquidaciones, certificado de cotizaciones y un aval. Para ventas: Ofrecemos asesoría hipotecaria. Preguntar siempre si el cliente busca arrendar o comprar, y su presupuesto aproximado para asignarle un ejecutivo.'
}

export function TrainingStep({ form, setForm }: Props) {
  const applyTemplate = (templateName: string) => {
    const text = TEMPLATES[templateName]
    if (text) {
      setForm({ ...form, instructions: text })
    }
  }

  const charCount = form.instructions.length
  const minChars = 80
  const isSufficient = charCount >= minChars

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-card-bg/60 backdrop-blur border border-white/10 rounded-3xl p-6 lg:p-8 space-y-6 shadow-xl">
        <div className="border-b border-white/[0.06] pb-4">
          <h2 className="font-semibold text-xl mb-1 text-white">Entrena a tu asistente</h2>
          <p className="text-sm text-slate-400">Agrega la información que tu asistente usará para responder sin inventar datos.</p>
        </div>

        <div className="space-y-4">
          <p className="text-sm font-medium text-slate-300 block">Plantillas rápidas por tipo de negocio</p>
          <div className="flex flex-wrap gap-2">
            {Object.keys(TEMPLATES).map(key => (
              <button
                key={key}
                onClick={() => applyTemplate(key)}
                className="px-3 py-1.5 rounded-full text-xs font-medium border border-white/10 bg-white/[0.03] text-slate-400 hover:border-brand-cyan/30 hover:text-white transition-all"
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-cyan" />
              Información del negocio <span className="text-brand-pink">*</span>
            </label>
            <span className={`text-xs ${isSufficient ? 'text-brand-success flex items-center gap-1' : 'text-slate-500'}`}>
              {isSufficient && <CheckCircle2 className="w-3 h-3" />}
              {charCount} / 5000
            </span>
          </div>
          
          <textarea
            value={form.instructions}
            onChange={(e) => setForm({ ...form, instructions: e.target.value })}
            placeholder="Escribe aquí los servicios, precios, horarios, ubicación, etc..."
            rows={10}
            className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/20 transition-all resize-y"
            maxLength={5000}
          />
          
          <div className="flex items-center justify-between mt-2">
            {!isSufficient ? (
              <p className="text-xs text-amber-500 flex items-center gap-1">
                Agrega al menos {minChars} caracteres de detalle para mejorar respuestas.
              </p>
            ) : (
              <p className="text-xs text-brand-success flex items-center gap-1">
                Información suficiente.
              </p>
            )}
            
            {/* The "Mejorar redacción" button doesn't do an OpenAI call to avoid unexpected costs. 
                In a real SaaS, this would open a modal confirming message usage. */}
            <button className="text-xs px-3 py-1.5 rounded-lg bg-brand-violet/10 text-brand-violet font-medium flex items-center gap-1 hover:bg-brand-violet/20 transition-colors">
              <Sparkles className="w-3 h-3" />
              Sugerir mejoras (Próximamente)
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-white/[0.06]">
          <h3 className="text-sm font-semibold text-white mb-3">Asegúrate de incluir:</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['Servicios y productos', 'Precios y promociones', 'Horarios de atención', 'Ubicación / Delivery'].map(card => (
              <div key={card} className="bg-white/[0.02] border border-white/5 rounded-xl p-3 text-center">
                <span className="text-xs text-slate-300 font-medium">{card}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
