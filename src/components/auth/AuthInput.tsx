'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface AuthInputProps {
  id: string
  name: string
  type?: 'text' | 'email' | 'password' | 'tel'
  label: string
  placeholder?: string
  required?: boolean
  error?: string
  icon?: React.ReactNode
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
  autoComplete?: string
  accentColor?: 'violet' | 'cyan'
}

export function AuthInput({
  id,
  name,
  type = 'text',
  label,
  placeholder,
  required,
  error,
  icon,
  value,
  onChange,
  onBlur,
  autoComplete,
  accentColor = 'violet',
}: AuthInputProps) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

  const accentClass = accentColor === 'cyan'
    ? 'focus:border-brand-cyan/60 focus:ring-brand-cyan/20'
    : 'focus:border-brand-violet/60 focus:ring-brand-violet/20'

  const borderClass = error
    ? 'border-brand-pink/60 focus:border-brand-pink/80 focus:ring-brand-pink/20'
    : accentClass

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-300" htmlFor={id}>
        {label}
        {required && <span className="text-brand-pink ml-0.5">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          id={id}
          name={name}
          type={inputType}
          placeholder={placeholder}
          required={required}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          autoComplete={autoComplete}
          className={`w-full bg-[#0a0f1e] border rounded-xl py-3 ${icon ? 'pl-11' : 'pl-4'} ${isPassword ? 'pr-11' : 'pr-4'} text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 transition-all text-sm ${borderClass}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error && (
        <p className="text-xs text-brand-pink flex items-center gap-1 mt-1">
          {error}
        </p>
      )}
    </div>
  )
}
