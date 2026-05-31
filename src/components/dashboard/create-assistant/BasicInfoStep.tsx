'use client'

import { motion } from 'framer-motion'
import { BuilderFormData } from './types'
import { BusinessTypeSelect } from './BusinessTypeSelect'

interface Props {
  form: BuilderFormData
  setForm: (form: BuilderFormData) => void
}

export function BasicInfoStep({ form, setForm }: Props) {
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
              className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/20 transition-all"
            />
            <p className="text-xs text-slate-500">Puedes crear asistentes diferentes para Ventas, Soporte, Reservas o Sucursal Centro.</p>
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
              className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/20 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300 block">
              Tipo de negocio <span className="text-brand-pink">*</span>
            </label>
            <BusinessTypeSelect
              value={form.business_type}
              onChange={(val) => setForm({ ...form, business_type: val })}
              error={!form.business_type ? 'Selecciona el rubro de tu empresa para continuar.' : undefined}
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
