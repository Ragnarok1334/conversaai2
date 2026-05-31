'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronDown, Search, Utensils, Stethoscope, ShoppingBag, 
  Scissors, Home, Briefcase, Laptop, GraduationCap, 
  Car, HelpCircle, CheckCircle2 
} from 'lucide-react'

export interface BusinessTypeOption {
  id: string
  name: string
  description: string
  icon: React.ElementType
}

export const BUSINESS_TYPE_OPTIONS: BusinessTypeOption[] = [
  { id: 'Restaurante / Comida', name: 'Restaurante / Comida', description: 'Menús, reservas, pedidos y atención a clientes.', icon: Utensils },
  { id: 'Clínica / Salud', name: 'Clínica / Salud', description: 'Citas, horarios, servicios médicos y orientación general.', icon: Stethoscope },
  { id: 'Tienda online / E-commerce', name: 'Tienda online / E-commerce', description: 'Productos, precios, envíos, pedidos y soporte.', icon: ShoppingBag },
  { id: 'Barbería / Belleza', name: 'Barbería / Belleza', description: 'Reservas, servicios, precios y disponibilidad.', icon: Scissors },
  { id: 'Inmobiliaria', name: 'Inmobiliaria', description: 'Propiedades, visitas, requisitos y seguimiento de interesados.', icon: Home },
  { id: 'Servicios profesionales', name: 'Servicios profesionales', description: 'Consultas, cotizaciones, agenda y atención personalizada.', icon: Briefcase },
  { id: 'Tecnología / Software', name: 'Tecnología / Software', description: 'Soporte, demos, ventas y preguntas técnicas.', icon: Laptop },
  { id: 'Educación / Cursos', name: 'Educación / Cursos', description: 'Inscripciones, horarios, programas y seguimiento de alumnos.', icon: GraduationCap },
  { id: 'Automotriz', name: 'Automotriz', description: 'Servicios, citas, cotizaciones y atención postventa.', icon: Car },
  { id: 'Otro', name: 'Otro', description: 'Configura el asistente para un giro personalizado.', icon: HelpCircle },
]

interface Props {
  value: string
  onChange: (value: string) => void
  error?: string
}

export function BusinessTypeSelect({ value, onChange, error }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedOption = BUSINESS_TYPE_OPTIONS.find(o => o.id === value)

  const filteredOptions = BUSINESS_TYPE_OPTIONS.filter(o => 
    o.name.toLowerCase().includes(search.toLowerCase()) || 
    o.description.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSelect = (id: string) => {
    onChange(id)
    setIsOpen(false)
    setSearch('')
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-slate-950/50 border rounded-xl px-4 py-3 text-left transition-all flex items-center justify-between group ${
          isOpen 
            ? 'border-brand-cyan/60 ring-1 ring-brand-cyan/20' 
            : error 
              ? 'border-brand-pink/50 ring-1 ring-brand-pink/20' 
              : 'border-white/10 hover:border-white/20'
        }`}
      >
        {selectedOption ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-cyan/10 transition-colors">
              <selectedOption.icon className={`w-4 h-4 ${isOpen ? 'text-brand-cyan' : 'text-slate-400 group-hover:text-brand-cyan'}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{selectedOption.name}</p>
              <p className="text-xs text-slate-500 line-clamp-1">{selectedOption.description}</p>
            </div>
          </div>
        ) : (
          <span className="text-sm text-slate-600">Selecciona el rubro de tu empresa...</span>
        )}
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180 text-brand-cyan' : ''}`} />
      </button>

      {error && <p className="text-xs text-brand-pink mt-1.5 ml-1">{error}</p>}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-2 bg-[#0b1020]/95 backdrop-blur-xl border border-brand-cyan/30 rounded-2xl shadow-[0_10px_40px_-10px_rgba(34,211,238,0.15)] overflow-hidden"
          >
            <div className="p-3 border-b border-white/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar rubro..."
                  className="w-full bg-black/20 border border-white/5 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-cyan/40 focus:bg-black/40 transition-all"
                />
              </div>
            </div>

            <div className="max-h-[300px] overflow-y-auto p-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
              {filteredOptions.length === 0 ? (
                <div className="py-8 text-center px-4">
                  <p className="text-sm text-slate-400 mb-2">No encontramos ese rubro.</p>
                  <button
                    type="button"
                    onClick={() => handleSelect('Otro')}
                    className="text-xs font-medium text-brand-cyan hover:text-brand-cyan/80 bg-brand-cyan/10 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Seleccionar "Otro"
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredOptions.map((option) => {
                    const isSelected = value === option.id
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleSelect(option.id)}
                        className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all text-left ${
                          isSelected
                            ? 'bg-brand-cyan/10 border border-brand-cyan/20'
                            : 'border border-transparent hover:bg-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isSelected ? 'bg-brand-cyan/20' : 'bg-white/5'
                        }`}>
                          <option.icon className={`w-4 h-4 ${isSelected ? 'text-brand-cyan' : 'text-slate-400'}`} />
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-medium mb-0.5 ${isSelected ? 'text-brand-cyan' : 'text-white'}`}>
                            {option.name}
                          </p>
                          <p className={`text-xs ${isSelected ? 'text-brand-cyan/70' : 'text-slate-500'}`}>
                            {option.description}
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-brand-cyan flex-shrink-0 mt-1" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
