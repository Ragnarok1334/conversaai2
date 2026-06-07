'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export interface SelectOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
  badge?: string
}

interface CustomSelectProps {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  searchable?: boolean
  className?: string
  disabled?: boolean
}

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  searchable = false,
  className = '',
  disabled = false
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  // Clear search when opened
  useEffect(() => {
    if (isOpen) setSearch('')
  }, [isOpen])

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(search.toLowerCase()) || 
    (opt.description && opt.description.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border flex items-center justify-between text-left transition-all ${
          isOpen ? 'border-brand-blue/50 ring-1 ring-brand-blue/30' : 'border-white/[0.1] hover:border-white/[0.2]'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${!selectedOption ? 'text-text-soft' : 'text-white'}`}
      >
        <span className="truncate text-sm flex-1">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-text-soft transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-2 rounded-xl bg-[#0b1229] border border-white/10 shadow-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: '300px' }}
          >
            {searchable && (
              <div className="p-2 border-b border-white/[0.05] shrink-0 sticky top-0 bg-[#0b1229] z-10">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-soft" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar..."
                    className="w-full bg-white/[0.04] border border-white/[0.05] rounded-lg pl-9 pr-3 py-1.5 text-sm text-white focus:outline-none focus:border-brand-blue/50"
                  />
                </div>
              </div>
            )}
            
            <div className="overflow-y-auto custom-scrollbar p-1 flex-1">
              {filteredOptions.length === 0 ? (
                <div className="p-3 text-center text-sm text-text-soft">
                  No hay resultados
                </div>
              ) : (
                filteredOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => {
                      if (!opt.disabled) {
                        onChange(opt.value)
                        setIsOpen(false)
                      }
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between group transition-colors ${
                      opt.value === value 
                        ? 'bg-brand-blue/10 text-brand-blue' 
                        : opt.disabled 
                          ? 'opacity-50 cursor-not-allowed' 
                          : 'hover:bg-white/[0.04] text-white'
                    }`}
                  >
                    <div className="flex flex-col pr-2 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium truncate ${opt.value === value ? 'text-brand-blue' : (opt.disabled ? 'text-text-soft' : 'text-white')}`}>
                          {opt.label}
                        </span>
                        {opt.badge && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/70 whitespace-nowrap">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.description && (
                        <span className={`text-xs truncate mt-0.5 ${opt.value === value ? 'text-brand-blue/70' : 'text-text-soft'}`}>
                          {opt.description}
                        </span>
                      )}
                    </div>
                    {opt.value === value && (
                      <Check className="w-4 h-4 shrink-0 text-brand-blue" />
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
