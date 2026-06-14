'use client'

import { motion } from 'framer-motion'
import { BuilderFormData } from './types'
import { BusinessTypeSelect } from './BusinessTypeSelect'
import { AlertCircle } from 'lucide-react'

interface Props {
  form: BuilderFormData
  setForm: (form: BuilderFormData) => void
  errors?: Record<string, string>
}

export function BasicInfoStep({ form, setForm, errors = {} }: Props) {
  const setField = (key: keyof BuilderFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [key]: e.target.value })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-card-bg/60 backdrop-blur border border-white/10 rounded-3xl p-6 lg:p-8 space-y-6 shadow-xl">
        <div className="border-b border-white/[0.06] pb-4">
          <h2 className="font-semibold text-xl mb-1 text-white">Información básica</h2>
          <p className="text-sm text-slate-400">Comencemos por identificar a tu asistente y el negocio que representa.</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300 block">
              Nombre del asistente <span className="text-brand-pink">*</span>
            </label>
            <input
              type="text"
              value={form.assistant_name}
              onChange={setField('assistant_name')}
              placeholder="Ej: Asistente de Ventas"
              className={`w-full bg-slate-950/50 border rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 transition-all ${
                errors.assistant_name 
                  ? 'border-brand-pink focus:border-brand-pink focus:ring-brand-pink/20' 
                  : 'border-white/10 focus:border-cyan-400/60 focus:ring-cyan-400/20'
              }`}
            />
            {errors.assistant_name ? (
              <p className="text-xs text-brand-pink flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3" />{errors.assistant_name}</p>
            ) : (
              <p className="text-xs text-slate-500">Puedes crear asistentes diferentes para Ventas, Soporte, Reservas o Sucursal Centro.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300 block">
              Nombre del negocio <span className="text-brand-pink">*</span>
            </label>
            <input
              type="text"
              value={form.business_name}
              onChange={setField('business_name')}
              placeholder="Ej: Clínica San Rafael"
              className={`w-full bg-slate-950/50 border rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 transition-all ${
                errors.business_name 
                  ? 'border-brand-pink focus:border-brand-pink focus:ring-brand-pink/20' 
                  : 'border-white/10 focus:border-cyan-400/60 focus:ring-cyan-400/20'
              }`}
            />
            {errors.business_name && (
              <p className="text-xs text-brand-pink flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3" />{errors.business_name}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300 block">
              Tipo de negocio <span className="text-brand-pink">*</span>
            </label>
            <BusinessTypeSelect
              value={form.business_type}
              onChange={(val) => setForm({ ...form, business_type: val })}
              error={errors.business_type || undefined}
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
