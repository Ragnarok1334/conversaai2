import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronDown, Search, Utensils, HeartPulse, ShoppingCart, 
  Scissors, Building, Briefcase, GraduationCap, Truck, 
  Monitor, Car, HelpCircle, CheckCircle2 
} from 'lucide-react'

export interface BusinessTypeItem {
  id: string
  label: string
  description: string
  icon: React.ElementType
}

const BUSINESS_TYPES_DATA: BusinessTypeItem[] = [
  { id: 'Restaurante / Comida', label: 'Restaurante / Comida', description: 'Menús, pedidos, reservas y atención a clientes.', icon: Utensils },
  { id: 'Clínica / Salud', label: 'Clínica / Salud', description: 'Citas, horarios, servicios y orientación general.', icon: HeartPulse },
  { id: 'Tienda online / E-commerce', label: 'Tienda online / E-commerce', description: 'Productos, envíos, precios y soporte de pedidos.', icon: ShoppingCart },
  { id: 'Barbería / Belleza', label: 'Barbería / Belleza', description: 'Agendamiento, tratamientos y recordatorios.', icon: Scissors },
  { id: 'Inmobiliaria', label: 'Inmobiliaria', description: 'Propiedades, citas, asesoría y precios.', icon: Building },
  { id: 'Servicios profesionales', label: 'Servicios profesionales', description: 'Consultorías, contabilidad, leyes y proyectos.', icon: Briefcase },
  { id: 'Educación', label: 'Educación', description: 'Cursos, matrículas, horarios y seguimiento.', icon: GraduationCap },
  { id: 'Logística / Transporte', label: 'Logística / Transporte', description: 'Seguimiento de paquetes, envíos y rutas.', icon: Truck },
  { id: 'Tecnología / Software', label: 'Tecnología / Software', description: 'Soporte técnico, ventas SaaS y demostraciones.', icon: Monitor },
  { id: 'Automotriz', label: 'Automotriz', description: 'Talleres, agendamientos, repuestos y venta.', icon: Car },
  { id: 'Otro', label: 'Otro', description: 'Configura tu asistente para un giro personalizado.', icon: HelpCircle },
]

interface BusinessTypeSelectProps {
  value: string
  onChange: (value: string) => void
  error?: string
}

export function BusinessTypeSelect({ value, onChange, error }: BusinessTypeSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedItem = BUSINESS_TYPES_DATA.find((item) => item.id === value)

  const filteredItems = BUSINESS_TYPES_DATA.filter((item) => 
    item.label.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Required for standard form submissions */}
      <input type="hidden" name="business_type" value={value} />
      
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-[#0a0f1e] border ${
          error ? 'border-brand-pink/50' : isOpen ? 'border-brand-violet/60' : 'border-white/[0.08]'
        } rounded-xl py-3 px-4 text-sm cursor-pointer transition-all flex items-center justify-between group ${
          isOpen ? 'ring-2 ring-brand-violet/20' : 'hover:border-white/20'
        }`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          {selectedItem ? (
            <>
              <selectedItem.icon className="w-4 h-4 text-brand-violet flex-shrink-0" />
              <span className="text-white truncate">{selectedItem.label}</span>
            </>
          ) : (
            <span className="text-slate-500">Selecciona el tipo de negocio</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180 text-brand-violet' : 'group-hover:text-slate-300'}`} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 w-full mt-2 bg-[#0d1326]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Search input */}
            <div className="p-3 border-b border-white/5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar rubro..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-violet/50 focus:bg-white/[0.05] transition-all"
                />
              </div>
            </div>

            {/* List */}
            <div className="max-h-[280px] overflow-y-auto p-2 custom-scrollbar">
              {filteredItems.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-slate-400 text-sm mb-3">No encontramos ese rubro.</p>
                  <button
                    type="button"
                    onClick={() => {
                      onChange('Otro')
                      setIsOpen(false)
                      setSearch('')
                    }}
                    className="px-4 py-2 bg-white/[0.05] hover:bg-brand-violet/20 border border-white/10 hover:border-brand-violet/30 rounded-lg text-white text-sm font-medium transition-all inline-flex items-center gap-2"
                  >
                    <HelpCircle className="w-4 h-4" /> Seleccionar "Otro"
                  </button>
                </div>
              ) : (
                <div className="grid gap-1">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        onChange(item.id)
                        setIsOpen(false)
                        setSearch('')
                      }}
                      className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                        value === item.id 
                          ? 'bg-brand-violet/20 border border-brand-violet/30' 
                          : 'bg-transparent border border-transparent hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                        value === item.id ? 'bg-brand-violet/30 text-white' : 'bg-white/[0.05] text-slate-400'
                      }`}>
                        <item.icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${value === item.id ? 'text-white' : 'text-slate-200'}`}>
                            {item.label}
                          </span>
                          {value === item.id && <CheckCircle2 className="w-4 h-4 text-brand-violet" />}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  )
}
