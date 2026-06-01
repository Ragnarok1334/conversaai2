'use client'

interface Props {
  password: string
}

function getStrength(pwd: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
  if (!pwd) return { level: 0, label: '', color: '' }
  let score = 0
  if (pwd.length >= 8) score++
  if (/[a-zA-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^a-zA-Z0-9]/.test(pwd)) score++

  if (score <= 1) return { level: 1, label: 'Débil', color: 'bg-red-500' }
  if (score === 2) return { level: 2, label: 'Media', color: 'bg-amber-400' }
  return { level: 3, label: 'Segura', color: 'bg-brand-success' }
}

export function PasswordStrength({ password }: Props) {
  const { level, label, color } = getStrength(password)

  if (!password) return null

  return (
    <div className="space-y-1.5 mt-1">
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= level ? color : 'bg-white/10'
            }`}
          />
        ))}
      </div>
      <p className={`text-[11px] font-medium transition-colors ${
        level === 1 ? 'text-red-400' : level === 2 ? 'text-amber-400' : 'text-brand-success'
      }`}>
        Contraseña {label}
        {level === 1 && ' — Agrega números o símbolos'}
        {level === 2 && ' — Agrega símbolos para mayor seguridad'}
      </p>
    </div>
  )
}
