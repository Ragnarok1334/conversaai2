'use client'

import { Check } from 'lucide-react'

interface Props {
  currentStep: number
  setCurrentStep: (step: number) => void
}

const steps = [
  { id: 1, label: 'Información' },
  { id: 2, label: 'Entrenamiento' },
  { id: 3, label: 'Comportamiento' },
  { id: 4, label: 'Canales' },
  { id: 5, label: 'Prueba y guardar' },
]

export function BuilderProgress({ currentStep, setCurrentStep }: Props) {
  return (
    <div className="flex items-center justify-between max-w-3xl mx-auto w-full mb-8 relative">
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-white/[0.05] -z-10" />
      <div 
        className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-brand-cyan -z-10 transition-all duration-500 ease-out" 
        style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
      />
      
      {steps.map((step) => {
        const isCompleted = step.id < currentStep
        const isCurrent = step.id === currentStep
        
        return (
          <div key={step.id} className="flex flex-col items-center gap-2 relative">
            <button
              onClick={() => step.id < currentStep && setCurrentStep(step.id)}
              disabled={step.id > currentStep}
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 ${
                isCompleted 
                  ? 'bg-brand-cyan text-[#050816] shadow-[0_0_15px_rgba(34,211,238,0.4)] cursor-pointer' 
                  : isCurrent
                  ? 'bg-[#050816] border-2 border-brand-cyan text-brand-cyan shadow-[0_0_15px_rgba(34,211,238,0.2)]'
                  : 'bg-[#050816] border-2 border-white/10 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isCompleted ? <Check className="w-5 h-5" /> : step.id}
            </button>
            <span className={`text-xs font-medium absolute -bottom-6 whitespace-nowrap transition-colors duration-300 ${
              isCurrent ? 'text-white' : isCompleted ? 'text-slate-300' : 'text-slate-500'
            }`}>
              {step.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
