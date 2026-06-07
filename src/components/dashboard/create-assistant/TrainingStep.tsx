'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, FileText, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { BuilderFormData } from './types'

interface Props {
  form: BuilderFormData
  setForm: (form: BuilderFormData) => void
}

const TEMPLATES: Record<string, string> = {
  'E-commerce / Tienda online': 'Negocio: "FashionStore", tienda online de ropa.\nServicios: Vendemos ropa y accesorios de moda. Envíos a todo el país (3-5 días hábiles, costo $5).\nHorarios: Atención online 24/7. Soporte de L-V de 9:00 a 18:00.\nUbicación: 100% online.\nPrecios: Tallas disponibles desde XS hasta XL. Poleras desde $15, Pantalones desde $30.\nFormas de pago: Tarjetas de crédito/débito y transferencias.\nDatos que debe solicitar: Número de pedido para reclamos o seguimiento.\nReglas importantes: Política de cambios de 30 días con el producto en perfecto estado. Para compras, dirigir al catálogo web.',
  'Restaurante / Comida': 'Negocio: "Pizzería La Mamma".\nServicios: Pizzas artesanales, lasañas y bebidas.\nHorarios: Martes a Domingo de 13:00 a 23:00 hrs.\nUbicación: Av. Principal 123.\nPrecios: Pizza Margarita ($12), Pizza Pepperoni ($14), Lasaña ($15).\nFormas de pago: Efectivo o Tarjeta.\nDatos que debe solicitar: Plato, cantidad, dirección de envío y método de pago.\nReglas importantes: Delivery tiene costo extra de $2. Tiempo de espera aprox 45 min.',
  'Clínica / Salud': 'Negocio: "Centro Médico SaludVital".\nServicios: Consultas médicas generales y especialidades.\nHorarios: Lunes a Viernes de 8:00 a 18:00 hrs.\nUbicación: Calle Salud 456, Piso 2.\nPrecios: Medicina General ($40), Pediatría ($50), Odontología ($45).\nFormas de pago: Efectivo, Tarjeta y bonos de salud.\nDatos que debe solicitar: Nombre completo, RUT/DNI, especialidad y disponibilidad.\nReglas importantes: No dar diagnósticos médicos por chat. Derivar a emergencias si es necesario.',
  'Inmobiliaria': 'Negocio: "Inversiones Propiedades".\nServicios: Arriendos y ventas de departamentos y casas.\nHorarios: L-V de 9:00 a 18:30.\nUbicación: Centro Financiero, Of 101.\nPrecios: Departamentos desde $300,000 en arriendo.\nFormas de pago: Transferencia para reservas.\nDatos que debe solicitar: Presupuesto aproximado, preferencia (comprar o arrendar).\nReglas importantes: Requisitos para arrendar: 3 últimas liquidaciones, certificado de cotizaciones y aval.',
  'Belleza / Barbería': 'Negocio: "Barbería Classic".\nServicios: Cortes de cabello, arreglo de barba, tratamientos capilares.\nHorarios: Lunes a Sábado de 10:00 a 20:00 hrs.\nUbicación: Av. Estilo 789.\nPrecios: Corte Clásico ($15), Arreglo de Barba ($10), Combo Corte+Barba ($22).\nFormas de pago: Efectivo o Tarjeta.\nDatos que debe solicitar: Nombre, día, hora y servicio.\nReglas importantes: Citas con 15 minutos de tolerancia.',
  'Servicios profesionales': 'Negocio: "Asesorías Legales Expertos".\nServicios: Consultoría laboral, redacción de contratos y defensa legal.\nHorarios: Lunes a Viernes de 9:00 a 17:00.\nUbicación: Edificio Centro, Of 402.\nPrecios: Consulta inicial $50 (se descuenta del servicio final).\nFormas de pago: Transferencia bancaria.\nDatos que debe solicitar: Nombre, motivo de la consulta, teléfono.\nReglas importantes: Las consultas requieren pago previo para agendar.',
  'Educación / Cursos': 'Negocio: "Academia de Inglés FastTrack".\nServicios: Cursos de inglés online y presenciales (Básico, Intermedio, Avanzado).\nHorarios: Clases L-V (tarde) y Sábados (mañana).\nUbicación: Sede Central o Vía Zoom.\nPrecios: Matrícula $30, Mensualidad $60.\nFormas de pago: Tarjeta de crédito con pago automático.\nDatos que debe solicitar: Nivel de inglés actual, edad, modalidad preferida.\nReglas importantes: Las inscripciones cierran el día 5 de cada mes.',
  'Automotriz / Taller': 'Negocio: "Taller Mecánico MotorPro".\nServicios: Mantención por kilometraje, frenos, cambio de aceite y escáner.\nHorarios: L-V de 8:30 a 18:30, Sábados 9:00 a 14:00.\nUbicación: Ruta 5 Norte, Km 12.\nPrecios: Cambio de aceite desde $40, Escáner $20.\nFormas de pago: Efectivo y Tarjetas.\nDatos que debe solicitar: Marca, modelo, año del vehículo y problema presentado.\nReglas importantes: Se requiere agendar para revisiones completas.',
  'Logística / Transporte': 'Negocio: "Envíos Express Courier".\nServicios: Transporte de paquetes y documentos a nivel nacional.\nHorarios: Recepción L-V de 9:00 a 19:00.\nUbicación: Red de sucursales a nivel nacional.\nPrecios: Envíos urbanos desde $4, Regiones desde $8.\nFormas de pago: Efectivo o Tarjeta al origen o destino.\nDatos que debe solicitar: Ciudad de origen, destino, peso y medidas aproximadas.\nReglas importantes: No transportamos líquidos inflamables.',
  'Hotel / Turismo': 'Negocio: "Hotel Vista Mar".\nServicios: Habitaciones con vista al mar, restaurante, piscina y spa.\nHorarios: Check-in 15:00, Check-out 12:00. Recepción 24hrs.\nUbicación: Av. Costanera 1000.\nPrecios: Hab. Standard $80/noche, Suite $150/noche.\nFormas de pago: Tarjeta de crédito (garantía obligatoria).\nDatos que debe solicitar: Fechas de viaje, cantidad de personas, tipo de habitación.\nReglas importantes: Cancelación gratuita hasta 48 horas antes.'
}

export function TrainingStep({ form, setForm }: Props) {
  const applyTemplate = (templateName: string) => {
    const text = TEMPLATES[templateName]
    if (text) {
      setForm({ ...form, instructions: text })
    }
  }

  const [isImproving, setIsImproving] = useState(false)
  const [improvedText, setImprovedText] = useState<string | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)

  const charCount = form.instructions.length
  const minChars = 80
  const isSufficient = charCount >= minChars

  const handleImproveText = async () => {
    if (!isSufficient || isImproving) return
    setIsImproving(true)
    setAiError(null)
    try {
      const res = await fetch('/api/ai/improve-business-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: form.instructions })
      })
      const data = await res.json()
      if (res.ok && data.improvedText) {
        setImprovedText(data.improvedText)
      } else {
        setAiError(data.error || 'Error al mejorar el texto')
      }
    } catch (err) {
      setAiError('Error de conexión')
    } finally {
      setIsImproving(false)
    }
  }

  const applyImprovedText = () => {
    if (improvedText) {
      setForm({ ...form, instructions: improvedText })
      setImprovedText(null)
    }
  }

  const discardImprovedText = () => {
    setImprovedText(null)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-card-bg/60 backdrop-blur border border-white/10 rounded-3xl p-6 lg:p-8 space-y-6 shadow-xl">
        <div className="border-b border-white/[0.06] pb-4">
          <h2 className="font-semibold text-xl mb-1 text-white">Entrena a tu asistente con información real del negocio</h2>
          <p className="text-sm text-slate-400">Mientras más claros sean tus servicios, precios, horarios y reglas, mejores respuestas dará tu asistente.</p>
        </div>

        {/* Tip: estructura y asistentes separados */}
        <div className="flex gap-3 bg-brand-cyan/5 border border-brand-cyan/20 rounded-xl p-3.5">
          <span className="text-lg shrink-0">💡</span>
          <div>
            <p className="text-xs font-semibold text-white mb-0.5">Ordena la información para obtener mejores respuestas</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              No mezcles toda la información del negocio sin estructura. Separa servicios, precios, horarios, ubicación y políticas.
              Si necesitas atender áreas muy diferentes (ventas, soporte, sucursales), crea asistentes separados en lugar de uno solo con todo.
            </p>
          </div>
        </div>


        <div className="space-y-4">
          <p className="text-sm font-medium text-slate-300 block">Plantillas populares por tipo de negocio</p>
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
            placeholder="Ejemplo: Somos una tienda online de ropa. Vendemos playeras, chamarras y accesorios. Enviamos a todo el país…"
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
            
            {/* AI Improvement section */}
            <div className="flex flex-col items-end gap-2">
              <button 
                type="button"
                onClick={handleImproveText}
                disabled={!isSufficient || isImproving}
                className="text-xs px-3 py-1.5 rounded-lg bg-brand-violet/10 border border-brand-violet/20 text-brand-violet font-medium flex items-center gap-1.5 hover:bg-brand-violet/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative"
              >
                {isImproving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Sugerir mejoras con IA
                <span className="absolute -top-6 right-0 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-slate-800 text-white text-[10px] px-2 py-1 rounded">
                  Consume 1 mensaje de tu plan
                </span>
              </button>
              {aiError && (
                <p className="text-[10px] text-brand-pink flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {aiError}
                </p>
              )}
            </div>
          </div>
          
          {improvedText && (
            <div className="mt-4 bg-brand-violet/5 border border-brand-violet/20 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-violet" /> Vista previa de mejora
              </h4>
              <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed bg-black/20 p-3 rounded-lg border border-white/[0.05] mb-3 max-h-60 overflow-y-auto">
                {improvedText}
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={discardImprovedText}
                  className="px-3 py-1.5 rounded-lg border border-white/10 text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.05] transition-all"
                >
                  Mantener mi texto
                </button>
                <button
                  type="button"
                  onClick={applyImprovedText}
                  className="px-3 py-1.5 rounded-lg bg-brand-violet text-white text-xs font-semibold hover:bg-brand-violet/90 transition-all"
                >
                  Aplicar mejora
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-white/[0.06]">
          <h3 className="text-sm font-semibold text-white mb-3">Información recomendada para mejores respuestas:</h3>
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
