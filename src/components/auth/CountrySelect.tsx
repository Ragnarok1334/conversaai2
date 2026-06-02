import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Search, MapPin, CheckCircle2 } from 'lucide-react'

export interface CountryItem {
  id: string
  label: string
  dialCode: string
}

const COUNTRIES_DATA: CountryItem[] = [
  { id: 'Argentina', label: 'Argentina', dialCode: '+54' },
  { id: 'Bolivia', label: 'Bolivia', dialCode: '+591' },
  { id: 'Brasil', label: 'Brasil', dialCode: '+55' },
  { id: 'Chile', label: 'Chile', dialCode: '+56' },
  { id: 'Colombia', label: 'Colombia', dialCode: '+57' },
  { id: 'Costa Rica', label: 'Costa Rica', dialCode: '+506' },
  { id: 'Cuba', label: 'Cuba', dialCode: '+53' },
  { id: 'Ecuador', label: 'Ecuador', dialCode: '+593' },
  { id: 'El Salvador', label: 'El Salvador', dialCode: '+503' },
  { id: 'España', label: 'España', dialCode: '+34' },
  { id: 'Estados Unidos', label: 'Estados Unidos', dialCode: '+1' },
  { id: 'Guatemala', label: 'Guatemala', dialCode: '+502' },
  { id: 'Honduras', label: 'Honduras', dialCode: '+504' },
  { id: 'México', label: 'México', dialCode: '+52' },
  { id: 'Nicaragua', label: 'Nicaragua', dialCode: '+505' },
  { id: 'Panamá', label: 'Panamá', dialCode: '+507' },
  { id: 'Paraguay', label: 'Paraguay', dialCode: '+595' },
  { id: 'Perú', label: 'Perú', dialCode: '+51' },
  { id: 'Puerto Rico', label: 'Puerto Rico', dialCode: '+1' },
  { id: 'República Dominicana', label: 'República Dominicana', dialCode: '+1' },
  { id: 'Uruguay', label: 'Uruguay', dialCode: '+598' },
  { id: 'Venezuela', label: 'Venezuela', dialCode: '+58' },
  { id: 'Otro', label: 'Otro', dialCode: '' },
]

interface CountrySelectProps {
  value: string
  onChange: (countryId: string, dialCode: string) => void
  error?: string
}

export function CountrySelect({ value, onChange, error }: CountrySelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedItem = COUNTRIES_DATA.find((item) => item.id === value)

  const filteredItems = COUNTRIES_DATA.filter((item) => 
    item.label.toLowerCase().includes(search.toLowerCase()) || 
    item.dialCode.includes(search)
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
      <input type="hidden" name="country" value={value} />
      
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-[#0a0f1e] border ${
          error ? 'border-brand-pink/50' : isOpen ? 'border-brand-cyan/60' : 'border-white/[0.08]'
        } rounded-xl py-3 px-4 text-sm cursor-pointer transition-all flex items-center justify-between group ${
          isOpen ? 'ring-2 ring-brand-cyan/20' : 'hover:border-white/20'
        }`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <MapPin className={`w-4 h-4 flex-shrink-0 ${value ? 'text-brand-cyan' : 'text-slate-500'}`} />
          {selectedItem ? (
            <span className="text-white truncate">
              {selectedItem.label} {selectedItem.dialCode && <span className="text-slate-400 ml-1">({selectedItem.dialCode})</span>}
            </span>
          ) : (
             <span className="text-slate-500">Selecciona tu país</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180 text-brand-cyan' : 'group-hover:text-slate-300'}`} />
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
                  placeholder="Buscar país o código..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-cyan/50 focus:bg-white/[0.05] transition-all"
                />
              </div>
            </div>

            {/* List */}
            <div className="max-h-[280px] overflow-y-auto p-2 custom-scrollbar">
              {filteredItems.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-slate-400 text-sm mb-3">No encontramos resultados.</p>
                  <button
                    type="button"
                    onClick={() => {
                      onChange('Otro', '')
                      setIsOpen(false)
                      setSearch('')
                    }}
                    className="px-4 py-2 bg-white/[0.05] hover:bg-brand-cyan/20 border border-white/10 hover:border-brand-cyan/30 rounded-lg text-white text-sm font-medium transition-all"
                  >
                    Seleccionar "Otro"
                  </button>
                </div>
              ) : (
                <div className="grid gap-1">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        onChange(item.id, item.dialCode)
                        setIsOpen(false)
                        setSearch('')
                      }}
                      className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                        value === item.id 
                          ? 'bg-brand-cyan/15 border border-brand-cyan/30' 
                          : 'bg-transparent border border-transparent hover:bg-white/[0.04]'
                      }`}
                    >
                      <span className={`text-sm font-medium ${value === item.id ? 'text-white' : 'text-slate-200'}`}>
                        {item.label}
                      </span>
                      <div className="flex items-center gap-2">
                        {item.dialCode && (
                          <span className={`text-xs font-mono px-2 py-1 rounded bg-white/[0.05] ${value === item.id ? 'text-brand-cyan font-bold' : 'text-slate-400'}`}>
                            {item.dialCode}
                          </span>
                        )}
                        {value === item.id && <CheckCircle2 className="w-4 h-4 text-brand-cyan" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
